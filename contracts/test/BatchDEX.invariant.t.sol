// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "forge-std/StdInvariant.sol";
import "../src/BatchDEX.sol";
import "../src/RevenueRouter.sol";
import "../src/YieldRegistry.sol";
import "../src/TestToken.sol";

contract BatchDEXInvariantHandler is Test {
    uint256 internal constant MIN_PRICE = 0.5 ether;
    uint256 internal constant MAX_PRICE = 5 ether;
    uint256 internal constant MIN_AMOUNT = 1 ether;
    uint256 internal constant MAX_AMOUNT = 50 ether;

    BatchDEX public immutable dex;
    TestToken public immutable baseToken;
    TestToken public immutable quoteToken;

    address[] internal actors;

    constructor(
        BatchDEX _dex,
        TestToken _baseToken,
        TestToken _quoteToken,
        address[] memory _actors
    ) {
        dex = _dex;
        baseToken = _baseToken;
        quoteToken = _quoteToken;
        actors = _actors;
    }

    function placeBuyOrder(
        uint256 actorSeed,
        uint256 priceSeed,
        uint256 amountSeed
    ) external {
        if (_currentBatchOrderCount() >= dex.maxOrdersPerBatch()) {
            return;
        }

        address trader = _actor(actorSeed);
        uint256 limitPrice = bound(priceSeed, MIN_PRICE, MAX_PRICE);
        uint256 quoteBalance = quoteToken.balanceOf(trader);
        uint256 maxAffordableAmount = (quoteBalance * 1e18) / limitPrice;
        uint256 maxAmount = maxAffordableAmount < MAX_AMOUNT
            ? maxAffordableAmount
            : MAX_AMOUNT;

        if (maxAmount < MIN_AMOUNT) {
            return;
        }

        uint256 amount = bound(amountSeed, MIN_AMOUNT, maxAmount);

        vm.prank(trader);
        dex.placeBuyOrder(limitPrice, amount);
    }

    function placeSellOrder(
        uint256 actorSeed,
        uint256 priceSeed,
        uint256 amountSeed
    ) external {
        if (_currentBatchOrderCount() >= dex.maxOrdersPerBatch()) {
            return;
        }

        address trader = _actor(actorSeed);
        uint256 limitPrice = bound(priceSeed, MIN_PRICE, MAX_PRICE);
        uint256 maxAmount = baseToken.balanceOf(trader);

        if (maxAmount > MAX_AMOUNT) {
            maxAmount = MAX_AMOUNT;
        }

        if (maxAmount < MIN_AMOUNT) {
            return;
        }

        uint256 amount = bound(amountSeed, MIN_AMOUNT, maxAmount);

        vm.prank(trader);
        dex.placeSellOrder(limitPrice, amount);
    }

    function advanceBlocks(uint256 blockSeed) external {
        uint256 blocksToAdvance = bound(blockSeed, 1, dex.batchWindow() + 1);
        vm.roll(block.number + blocksToAdvance);
    }

    function settleBatch(uint256 extraBlocksSeed) external {
        uint256 blocksUntil = dex.blocksUntilSettlement();
        uint256 extraBlocks = bound(extraBlocksSeed, 0, 2);

        if (blocksUntil > 0) {
            vm.roll(block.number + blocksUntil + extraBlocks);
        }

        dex.settleBatch();
    }

    function actorsLength() external view returns (uint256) {
        return actors.length;
    }

    function actorAt(uint256 index) external view returns (address) {
        return actors[index];
    }

    function _actor(uint256 seed) internal view returns (address) {
        return actors[seed % actors.length];
    }

    function _currentBatchOrderCount() internal view returns (uint256) {
        uint256 batchId = dex.currentBatchId();
        (, , , , , uint256 buyOrderCount, uint256 sellOrderCount, ) = dex
            .batches(batchId);
        return buyOrderCount + sellOrderCount;
    }
}

contract BatchDEXInvariantTest is StdInvariant, Test {
    uint256 internal constant INITIAL_ACTOR_BASE = 2_000 ether;
    uint256 internal constant INITIAL_ACTOR_QUOTE = 20_000 ether;
    uint256 internal constant BATCH_WINDOW = 5;
    uint256 internal constant EPOCH_LENGTH = 50;

    BatchDEX public dex;
    RevenueRouter public router;
    YieldRegistry public registry;
    TestToken public baseToken;
    TestToken public quoteToken;
    BatchDEXInvariantHandler public handler;

    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);
    address public charlie = address(0xC4A1);
    address public treasury = address(0xDA0);
    address public devFund = address(0xDE7);

    address[] internal trackedAddresses;

    function setUp() public {
        baseToken = new TestToken("Test USDC", "USDC");
        quoteToken = new TestToken("SocialYield Token", "SYLD");

        registry = new YieldRegistry(address(quoteToken), address(0), EPOCH_LENGTH);
        router = new RevenueRouter(
            address(quoteToken),
            address(registry),
            treasury,
            devFund
        );
        registry.setRevenueRouter(address(router));

        dex = new BatchDEX(
            address(baseToken),
            address(quoteToken),
            address(router),
            BATCH_WINDOW
        );
        dex.setMaxOrdersPerBatch(20);

        _fundAndApprove(alice);
        _fundAndApprove(bob);
        _fundAndApprove(charlie);

        vm.prank(alice);
        registry.register("alice.init");
        vm.prank(bob);
        registry.register("bob.init");
        vm.prank(charlie);
        registry.register("charlie.init");

        address[] memory actors = new address[](3);
        actors[0] = alice;
        actors[1] = bob;
        actors[2] = charlie;

        handler = new BatchDEXInvariantHandler(dex, baseToken, quoteToken, actors);

        trackedAddresses.push(address(this));
        trackedAddresses.push(address(handler));
        trackedAddresses.push(address(dex));
        trackedAddresses.push(address(router));
        trackedAddresses.push(address(registry));
        trackedAddresses.push(alice);
        trackedAddresses.push(bob);
        trackedAddresses.push(charlie);
        trackedAddresses.push(treasury);
        trackedAddresses.push(devFund);

        targetContract(address(handler));
    }

    function invariant_noTokensLostInDEX() public view {
        assertEq(
            _sumTrackedBalances(baseToken),
            baseToken.totalSupply(),
            "base token supply mismatch"
        );
        assertEq(
            _sumTrackedBalances(quoteToken),
            quoteToken.totalSupply(),
            "quote token supply mismatch"
        );
    }

    function invariant_totalMEV_equals_routerReceived() public view {
        uint256 routed = router.totalRouted();

        assertEq(
            dex.totalMEVCaptured(),
            routed,
            "DEX MEV and router receipts diverged"
        );
        assertEq(
            router.totalToHolders() + router.totalToDAO() + router.totalToDev(),
            routed,
            "router split accounting mismatch"
        );
    }

    function _fundAndApprove(address trader) internal {
        baseToken.mint(trader, INITIAL_ACTOR_BASE);
        quoteToken.mint(trader, INITIAL_ACTOR_QUOTE);

        vm.prank(trader);
        baseToken.approve(address(dex), type(uint256).max);
        vm.prank(trader);
        quoteToken.approve(address(dex), type(uint256).max);
    }

    function _sumTrackedBalances(
        IERC20 token
    ) internal view returns (uint256 total) {
        for (uint256 i = 0; i < trackedAddresses.length; i++) {
            total += token.balanceOf(trackedAddresses[i]);
        }
    }
}
