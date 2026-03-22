// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/BatchDEX.sol";
import "../src/RevenueRouter.sol";
import "../src/YieldRegistry.sol";
import "../src/TestToken.sol";

/**
 * @title BatchDEXTest
 * @notice Comprehensive tests for the BatchDEX contract.
 */
contract BatchDEXTest is Test {
    BatchDEX public dex;
    RevenueRouter public router;
    YieldRegistry public registry;
    TestToken public baseToken;  // "USDC"
    TestToken public quoteToken; // "SYLD"

    address public deployer = address(this);
    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);
    address public charlie = address(0xC4A1);
    address public treasury = address(0xDA0);
    address public devFund = address(0xDE7);

    uint256 constant BATCH_WINDOW = 10;

    function setUp() public {
        // Deploy tokens
        baseToken = new TestToken("Test USDC", "USDC");
        quoteToken = new TestToken("SocialYield Token", "SYLD");

        // Deploy YieldRegistry
        registry = new YieldRegistry(
            address(quoteToken),
            address(0),
            1000
        );

        // Deploy RevenueRouter
        router = new RevenueRouter(
            address(quoteToken),
            address(registry),
            treasury,
            devFund
        );

        // Wire registry
        registry.setRevenueRouter(address(router));

        // Deploy BatchDEX
        dex = new BatchDEX(
            address(baseToken),
            address(quoteToken),
            address(router),
            BATCH_WINDOW
        );

        // Fund test users with tokens
        baseToken.mint(alice, 1000 ether);
        baseToken.mint(bob, 1000 ether);
        baseToken.mint(charlie, 1000 ether);
        quoteToken.mint(alice, 10000 ether);
        quoteToken.mint(bob, 10000 ether);
        quoteToken.mint(charlie, 10000 ether);

        // Approve DEX for all users
        vm.prank(alice);
        baseToken.approve(address(dex), type(uint256).max);
        vm.prank(alice);
        quoteToken.approve(address(dex), type(uint256).max);

        vm.prank(bob);
        baseToken.approve(address(dex), type(uint256).max);
        vm.prank(bob);
        quoteToken.approve(address(dex), type(uint256).max);

        vm.prank(charlie);
        baseToken.approve(address(dex), type(uint256).max);
        vm.prank(charlie);
        quoteToken.approve(address(dex), type(uint256).max);
    }

    // ─── Test: placeBuyOrder ────────────────────────────────────────────

    function testPlaceBuyOrder() public {
        uint256 limitPrice = 2 ether; // 2 SYLD per USDC
        uint256 amount = 10 ether;    // 10 USDC
        uint256 quoteCost = (limitPrice * amount) / 1e18; // 20 SYLD

        uint256 balBefore = quoteToken.balanceOf(alice);

        vm.prank(alice);
        uint256 orderId = dex.placeBuyOrder(limitPrice, amount);

        assertEq(orderId, 0, "First order should have ID 0");
        assertEq(
            quoteToken.balanceOf(alice),
            balBefore - quoteCost,
            "Buyer should have quoteToken deducted"
        );
        assertEq(
            quoteToken.balanceOf(address(dex)),
            quoteCost,
            "DEX should hold locked quoteToken"
        );

        // Check order struct
        (
            address trader,
            bool isBuy,
            uint256 price,
            uint256 amt,
            uint256 batchId,
            bool filled,
            ,
        ) = dex.allOrders(orderId);
        assertEq(trader, alice);
        assertTrue(isBuy);
        assertEq(price, limitPrice);
        assertEq(amt, amount);
        assertEq(batchId, 1);
        assertFalse(filled);
    }

    // ─── Test: placeSellOrder ───────────────────────────────────────────

    function testPlaceSellOrder() public {
        uint256 limitPrice = 1.5 ether; // 1.5 SYLD per USDC
        uint256 amount = 15 ether;      // 15 USDC worth of baseToken

        uint256 balBefore = baseToken.balanceOf(bob);

        vm.prank(bob);
        uint256 orderId = dex.placeSellOrder(limitPrice, amount);

        assertEq(orderId, 0);
        assertEq(
            baseToken.balanceOf(bob),
            balBefore - amount,
            "Seller should have baseToken deducted"
        );
        assertEq(
            baseToken.balanceOf(address(dex)),
            amount,
            "DEX should hold locked baseToken"
        );
    }

    // ─── Test: batch not settleable before window ───────────────────────

    function testBatchNotSettleableBeforeWindow() public {
        // Place an order so batch is non-empty
        vm.prank(alice);
        dex.placeBuyOrder(2 ether, 10 ether);

        assertFalse(dex.isBatchSettleable(), "Should not be settleable yet");

        vm.expectRevert("BatchDEX: batch window not elapsed");
        dex.settleBatch();
    }

    // ─── Test: batch settles at correct clearing price ──────────────────

    function testBatchSettlesAtClearingPrice() public {
        // 3 buy orders (descending willingness to pay)
        vm.prank(alice);
        dex.placeBuyOrder(3 ether, 10 ether);   // buy 10 USDC at up to 3 SYLD each
        vm.prank(bob);
        dex.placeBuyOrder(2.5 ether, 10 ether);  // buy 10 USDC at up to 2.5 SYLD each
        vm.prank(charlie);
        dex.placeBuyOrder(2 ether, 10 ether);   // buy 10 USDC at up to 2 SYLD each

        // 3 sell orders (ascending asking price)
        vm.prank(alice);
        dex.placeSellOrder(1.5 ether, 10 ether); // sell 10 USDC at min 1.5 SYLD each
        vm.prank(bob);
        dex.placeSellOrder(2 ether, 10 ether);  // sell 10 USDC at min 2 SYLD each
        vm.prank(charlie);
        dex.placeSellOrder(2.5 ether, 10 ether); // sell 10 USDC at min 2.5 SYLD each

        // Advance past batch window
        vm.roll(block.number + BATCH_WINDOW + 1);

        assertTrue(dex.isBatchSettleable(), "Batch should be settleable");

        dex.settleBatch();

        // Verify batch was settled
        (
            ,
            ,
            ,
            uint256 clearingPrice,
            bool settled,
            ,
            ,
        ) = dex.batches(1);
        assertTrue(settled, "Batch should be settled");
        assertTrue(clearingPrice > 0, "Clearing price should be non-zero");

        // The clearing price should be at the intersection where supply meets demand
        // Demand: 10@3, 10@2.5, 10@2 → cumulative at 2 SYLD = 30 USDC demand
        // Supply: 10@1.5, 10@2, 10@2.5 → cumulative at 2 SYLD = 20 USDC supply
        // At price 2.0, demand(30) >= supply(20), so clearing = 2.0
        // At price 2.5, demand(20) >= supply(30)? No → demand < supply
        // So clearing price should be 2.0 SYLD
        assertEq(clearingPrice, 2 ether, "Clearing price should be 2 SYLD");
    }

    // ─── Test: MEV forwarded to router ──────────────────────────────────

    function testMEVForwardedToRouter() public {
        // Buy at 3 SYLD (high), sell at 1 SYLD (low)
        // Clearing at 1 SYLD → surplus from buyer = (3-1)*10 = 20 SYLD
        vm.prank(alice);
        dex.placeBuyOrder(3 ether, 10 ether);
        vm.prank(bob);
        dex.placeSellOrder(1 ether, 10 ether);

        vm.roll(block.number + BATCH_WINDOW + 1);

        uint256 registryBalBefore = quoteToken.balanceOf(address(registry));
        uint256 treasuryBalBefore = quoteToken.balanceOf(treasury);
        uint256 devBalBefore = quoteToken.balanceOf(devFund);

        dex.settleBatch();

        // 20 SYLD MEV surplus.
        // YieldRegistry: 60% = 12 SYLD
        // DAO: 30% = 6 SYLD
        // Dev: 10% = 2 SYLD
        uint256 registryBalAfter = quoteToken.balanceOf(address(registry));
        uint256 treasuryBalAfter = quoteToken.balanceOf(treasury);
        uint256 devBalAfter = quoteToken.balanceOf(devFund);

        assertEq(registryBalAfter - registryBalBefore, 12 ether, "Registry should receive 60%");
        assertEq(treasuryBalAfter - treasuryBalBefore, 6 ether, "DAO should receive 30%");
        assertEq(devBalAfter - devBalBefore, 2 ether, "Dev Fund should receive 10%");

        uint256 mev = dex.totalMEVCaptured();
        assertEq(mev, 20 ether, "Total MEV captured should be 20 SYLD");
    }

    // ─── Test: unfilled orders get refunds ──────────────────────────────

    function testUnfilledOrdersRefunded() public {
        // Buy order at very low price → won't be filled
        vm.prank(alice);
        dex.placeBuyOrder(0.5 ether, 10 ether); // too low

        // Sell order at reasonable price
        vm.prank(bob);
        dex.placeSellOrder(1 ether, 10 ether);

        // Another buy at higher price to create a valid market
        vm.prank(charlie);
        dex.placeBuyOrder(1.5 ether, 10 ether);

        uint256 aliceQuoteBefore = quoteToken.balanceOf(alice);

        vm.roll(block.number + BATCH_WINDOW + 1);
        dex.settleBatch();

        // Alice's buy at 0.5 should be unfilled since clearing > 0.5
        // She should get her locked quoteToken back
        uint256 aliceQuoteAfter = quoteToken.balanceOf(alice);
        // Alice initially paid 0.5 * 10 = 5 SYLD
        // If not filled, she should get 5 SYLD back
        assertEq(
            aliceQuoteAfter,
            aliceQuoteBefore + 5 ether,
            "Alice should be refunded for unfilled order"
        );
    }

    // ─── Test: front-run impossible ─────────────────────────────────────

    function testFrontRunImpossible() public {
        // Two identical buy orders in same batch get same clearing price
        vm.prank(alice);
        dex.placeBuyOrder(2 ether, 10 ether);
        vm.prank(bob);
        dex.placeBuyOrder(2 ether, 10 ether);

        // One sell order
        vm.prank(charlie);
        dex.placeSellOrder(1 ether, 20 ether);

        vm.roll(block.number + BATCH_WINDOW + 1);
        dex.settleBatch();

        // Both should be filled at the same clearing price
        (,,,, , bool aliceFilled, uint256 aliceFilledAmt,) = dex.allOrders(0);
        (,,,, , bool bobFilled, uint256 bobFilledAmt,) = dex.allOrders(1);

        assertTrue(aliceFilled, "Alice order should be filled");
        assertTrue(bobFilled, "Bob order should be filled");
        assertEq(
            aliceFilledAmt,
            bobFilledAmt,
            "Both identical orders should be filled for same amount"
        );
    }

    // ─── Test: batch window configurable ────────────────────────────────

    function testBatchWindowConfigurable() public {
        uint256 oldWindow = dex.batchWindow();
        uint256 newWindow = 20;

        dex.setBatchWindow(newWindow);
        assertEq(dex.batchWindow(), newWindow);

        // Non-owner cannot update
        vm.prank(alice);
        vm.expectRevert();
        dex.setBatchWindow(30);
    }

    // ─── Test: empty batch settles cleanly ──────────────────────────────

    function testEmptyBatchSettles() public {
        vm.roll(block.number + BATCH_WINDOW + 1);
        dex.settleBatch();

        assertEq(dex.currentBatchId(), 2, "Should advance to batch 2");
    }

    // ─── Test: new batch starts after settlement ────────────────────────

    function testNewBatchStartsAfterSettlement() public {
        vm.roll(block.number + BATCH_WINDOW + 1);
        dex.settleBatch();

        assertEq(dex.currentBatchId(), 2);

        // Can place orders in new batch
        vm.prank(alice);
        uint256 orderId = dex.placeBuyOrder(2 ether, 10 ether);
        (,,,, uint256 batchId,,,) = dex.allOrders(orderId);
        assertEq(batchId, 2, "Order should be in batch 2");
    }
}
