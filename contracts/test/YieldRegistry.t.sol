// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/YieldRegistry.sol";
import "../src/TestToken.sol";

/**
 * @title YieldRegistryTest
 * @notice Tests for the YieldRegistry contract.
 */
contract YieldRegistryTest is Test {
    YieldRegistry public registry;
    TestToken public yieldToken;

    address public deployer = address(this);
    address public routerAddr = address(0x8017);
    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);
    address public charlie = address(0xC4A1);

    uint256 constant EPOCH_LENGTH = 100; // shorter for tests

    function setUp() public {
        yieldToken = new TestToken("SocialYield Token", "SYLD");

        registry = new YieldRegistry(
            address(yieldToken),
            routerAddr,
            EPOCH_LENGTH
        );

        // Fund the registry directly (simulating what RevenueRouter does: transfer then depositReward)
        // Also fund routerAddr for tests that need it
        yieldToken.mint(address(registry), 100000 ether);
        yieldToken.mint(routerAddr, 100000 ether);
        vm.prank(routerAddr);
        yieldToken.approve(address(registry), type(uint256).max);
    }

    // ─── Test: register ─────────────────────────────────────────────────

    function testRegister() public {
        vm.prank(alice);
        registry.register("alice.init");

        YieldRegistry.Holder memory h = registry.getHolder(alice);
        assertEq(h.initName, "alice.init");
        assertTrue(h.active);
        assertEq(h.registeredEpoch, 1);
        assertEq(registry.activeHolderCount(), 1);

        address[] memory list = registry.getHolderList();
        assertEq(list.length, 1);
        assertEq(list[0], alice);
    }

    // ─── Test: deregister ───────────────────────────────────────────────

    function testDeregister() public {
        vm.prank(alice);
        registry.register("alice.init");
        assertEq(registry.activeHolderCount(), 1);

        vm.prank(alice);
        registry.deregister();

        YieldRegistry.Holder memory h = registry.getHolder(alice);
        assertFalse(h.active);
        assertEq(registry.activeHolderCount(), 0);
    }

    // ─── Test: deposit reward ───────────────────────────────────────────

    function testDepositReward() public {
        uint256 amount = 500 ether;

        vm.prank(routerAddr);
        registry.depositReward(amount);

        assertEq(
            registry.currentEpochDeposits(),
            amount,
            "Epoch deposits should reflect deposited amount"
        );
    }

    // ─── Test: finalize epoch ───────────────────────────────────────────

    function testFinalizeEpoch() public {
        // Register 2 holders
        vm.prank(alice);
        registry.register("alice.init");
        vm.prank(bob);
        registry.register("bob.init");

        // Deposit rewards
        vm.prank(routerAddr);
        registry.depositReward(1000 ether);

        // Advance past epoch
        vm.roll(block.number + EPOCH_LENGTH + 1);

        registry.finalizeEpoch();

        YieldRegistry.EpochReward memory er = registry.getEpochReward(1);
        assertTrue(er.finalized);
        assertEq(er.totalReward, 1000 ether);
        assertEq(er.holderCount, 2);
        assertEq(er.rewardPerHolder, 500 ether); // 1000 / 2
    }

    // ─── Test: claim ────────────────────────────────────────────────────

    function testClaim() public {
        // Register holders
        vm.prank(alice);
        registry.register("alice.init");
        vm.prank(bob);
        registry.register("bob.init");

        // Epoch 1: deposit 1000
        vm.prank(routerAddr);
        registry.depositReward(1000 ether);
        vm.roll(200); // well past epoch 1 boundary
        registry.finalizeEpoch();

        // Epoch 2: deposit 600
        vm.prank(routerAddr);
        registry.depositReward(600 ether);
        vm.roll(400); // well past epoch 2 boundary
        registry.finalizeEpoch();

        // Epoch 3: deposit 300
        vm.prank(routerAddr);
        registry.depositReward(300 ether);
        vm.roll(600); // well past epoch 3 boundary
        registry.finalizeEpoch();

        // Alice claims: should get 500 + 300 + 150 = 950 across 3 epochs
        uint256 pending = registry.pendingClaim(alice);
        assertEq(pending, 950 ether, "Pending should be 950 SYLD");

        uint256 balBefore = yieldToken.balanceOf(alice);
        vm.prank(alice);
        registry.claim();
        uint256 balAfter = yieldToken.balanceOf(alice);

        assertEq(balAfter - balBefore, 950 ether, "Should receive 950 SYLD");
    }

    // ─── Test: pending claim view matches actual ────────────────────────

    function testPendingClaimView() public {
        vm.prank(alice);
        registry.register("alice.init");

        vm.prank(routerAddr);
        registry.depositReward(100 ether);
        vm.roll(block.number + EPOCH_LENGTH + 1);
        registry.finalizeEpoch();

        uint256 pending = registry.pendingClaim(alice);

        uint256 balBefore = yieldToken.balanceOf(alice);
        vm.prank(alice);
        registry.claim();
        uint256 actualClaimed = yieldToken.balanceOf(alice) - balBefore;

        assertEq(pending, actualClaimed, "Pending view should match claim");
    }

    // ─── Test: double register reverts ──────────────────────────────────

    function testDoubleRegisterReverts() public {
        vm.prank(alice);
        registry.register("alice.init");

        vm.prank(alice);
        vm.expectRevert("YieldRegistry: already registered");
        registry.register("alice.init");
    }

    // ─── Test: deregister when not registered reverts ────────────────────

    function testDeregisterNotRegisteredReverts() public {
        vm.prank(alice);
        vm.expectRevert("YieldRegistry: not registered");
        registry.deregister();
    }

    // ─── Test: epoch not elapsed reverts ────────────────────────────────

    function testEpochNotElapsedReverts() public {
        vm.expectRevert("YieldRegistry: epoch not elapsed");
        registry.finalizeEpoch();
    }

    // ─── Test: set epoch length ─────────────────────────────────────────

    function testSetEpochLength() public {
        registry.setEpochLength(500);
        assertEq(registry.epochLength(), 500);
    }

    // ─���─ Test: blocks until next epoch ──────────────────────────────────

    function testBlocksUntilNextEpoch() public {
        uint256 remaining = registry.blocksUntilNextEpoch();
        assertEq(remaining, EPOCH_LENGTH);

        vm.roll(block.number + 50);
        remaining = registry.blocksUntilNextEpoch();
        assertEq(remaining, EPOCH_LENGTH - 50);

        vm.roll(block.number + EPOCH_LENGTH);
        remaining = registry.blocksUntilNextEpoch();
        assertEq(remaining, 0);
    }

    // ─── Test: MAX_CLAIM_EPOCHS caps iteration ─────────────────────────

    function testMaxClaimEpochsCap() public {
        // Use a very short epoch for speed
        registry.setEpochLength(10);

        vm.prank(alice);
        registry.register("alice.init");

        // Create 250 epochs with rewards (exceeds 200 cap)
        for (uint256 i = 0; i < 250; i++) {
            vm.prank(routerAddr);
            registry.depositReward(1 ether);
            vm.roll(block.number + 11);
            registry.finalizeEpoch();
        }

        // pendingClaim should only cover 200 epochs (the cap)
        uint256 pending = registry.pendingClaim(alice);
        assertEq(pending, 200 ether, "Should be capped at 200 epochs");

        // First claim gets 200 epochs
        vm.prank(alice);
        registry.claim();
        assertEq(yieldToken.balanceOf(alice), 200 ether);

        // Second claim gets remaining 50
        uint256 pending2 = registry.pendingClaim(alice);
        assertEq(pending2, 50 ether, "Remaining 50 epochs");

        vm.prank(alice);
        registry.claim();
        assertEq(yieldToken.balanceOf(alice), 250 ether);
    }

    // ─── Test: re-registration after deregister ────────────────────────

    function testReRegistration() public {
        vm.prank(alice);
        registry.register("alice.init");
        assertEq(registry.activeHolderCount(), 1);

        vm.prank(alice);
        registry.deregister();
        assertEq(registry.activeHolderCount(), 0);

        // Re-register
        vm.prank(alice);
        registry.register("alice2.init");
        assertEq(registry.activeHolderCount(), 1);

        // holderList should not have duplicates (same address re-used)
        address[] memory list = registry.getHolderList();
        assertEq(list.length, 1, "Should not duplicate in holderList");
    }

    // ─── Test: deregistered holder can still claim pending ─────────────

    function testDeregisteredCanClaimPending() public {
        vm.prank(alice);
        registry.register("alice.init");

        vm.prank(routerAddr);
        registry.depositReward(100 ether);
        vm.roll(block.number + EPOCH_LENGTH + 1);
        registry.finalizeEpoch();

        // Deregister AFTER epoch finalized
        vm.prank(alice);
        registry.deregister();

        // Should still be able to claim
        uint256 pending = registry.pendingClaim(alice);
        assertEq(pending, 100 ether);

        vm.prank(alice);
        registry.claim();
        assertEq(yieldToken.balanceOf(alice), 100 ether);
    }

    // ─── Test: zero holders epoch finalization ─────────────────────────

    function testZeroHoldersEpochFinalization() public {
        vm.prank(routerAddr);
        registry.depositReward(100 ether);

        vm.roll(block.number + EPOCH_LENGTH + 1);
        registry.finalizeEpoch();

        YieldRegistry.EpochReward memory er = registry.getEpochReward(1);
        assertTrue(er.finalized);
        assertEq(er.holderCount, 0);
        assertEq(er.rewardPerHolder, 0);
    }

    // ─── Fuzz: pro-rata distribution is fair ───────────────────────────

    function testFuzz_ProRataFairness(uint256 reward, uint8 numHolders) public {
        reward = bound(reward, 1 ether, 10000 ether);
        numHolders = uint8(bound(numHolders, 1, 10));

        address[] memory holders = new address[](numHolders);
        for (uint256 i = 0; i < numHolders; i++) {
            holders[i] = address(uint160(0x1000 + i));
            vm.prank(holders[i]);
            registry.register(string(abi.encodePacked("holder", i)));
        }

        vm.prank(routerAddr);
        registry.depositReward(reward);
        vm.roll(block.number + EPOCH_LENGTH + 1);
        registry.finalizeEpoch();

        uint256 expectedPerHolder = reward / numHolders;
        for (uint256 i = 0; i < numHolders; i++) {
            uint256 pending = registry.pendingClaim(holders[i]);
            assertEq(pending, expectedPerHolder, "Each holder gets equal share");
        }
    }

    // ─── Test: only router can deposit ─────────────────────────────────

    function testOnlyRouterCanDeposit() public {
        vm.prank(alice);
        vm.expectRevert("YieldRegistry: not router");
        registry.depositReward(100 ether);
    }
}
