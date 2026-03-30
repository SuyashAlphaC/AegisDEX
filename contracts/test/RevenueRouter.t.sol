// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/RevenueRouter.sol";
import "../src/YieldRegistry.sol";
import "../src/TestToken.sol";

/**
 * @title RevenueRouterTest
 * @notice Tests for the RevenueRouter contract.
 */
contract RevenueRouterTest is Test {
    RevenueRouter public router;
    YieldRegistry public registry;
    TestToken public rewardToken;

    address public deployer = address(this);
    address public treasury = address(0xDA0);
    address public devFund = address(0xDE7);
    address public alice = address(0xA11CE);

    function setUp() public {
        rewardToken = new TestToken("SocialYield Token", "SYLD");

        registry = new YieldRegistry(
            address(rewardToken),
            address(0),
            1000
        );

        router = new RevenueRouter(
            address(rewardToken),
            address(registry),
            treasury,
            devFund
        );

        registry.setRevenueRouter(address(router));

        // Fund deployer (simulates BatchDEX sending MEV)
        rewardToken.mint(deployer, 10000 ether);
        rewardToken.approve(address(router), type(uint256).max);

        // Fund alice
        rewardToken.mint(alice, 1000 ether);
    }

    // ─── Test: 60/30/10 split is exact ──────────────────────────────────

    function testRouteRevenue() public {
        uint256 amount = 1000 ether;

        uint256 registryBefore = rewardToken.balanceOf(address(registry));
        uint256 treasuryBefore = rewardToken.balanceOf(treasury);
        uint256 devBefore = rewardToken.balanceOf(devFund);

        router.routeRevenue(amount);

        uint256 toHolders = (amount * 6000) / 10000; // 600
        uint256 toDAO = (amount * 3000) / 10000;     // 300
        uint256 toDev = amount - toHolders - toDAO;   // 100

        assertEq(
            rewardToken.balanceOf(address(registry)),
            registryBefore + toHolders,
            "Registry should receive 60%"
        );
        assertEq(
            rewardToken.balanceOf(treasury),
            treasuryBefore + toDAO,
            "Treasury should receive 30%"
        );
        assertEq(
            rewardToken.balanceOf(devFund),
            devBefore + toDev,
            "DevFund should receive 10%"
        );

        // Verify accounting
        assertEq(router.totalRouted(), amount);
        assertEq(router.totalToHolders(), toHolders);
        assertEq(router.totalToDAO(), toDAO);
        assertEq(router.totalToDev(), toDev);
    }

    // ─── Test: update shares must sum to 10000 ──────────────────────────

    function testUpdateSharesMustSum10000() public {
        vm.expectRevert("RevenueRouter: shares must sum to 10000");
        router.updateShares(5000, 3000, 1000); // = 9000, not 10000

        // Valid update
        router.updateShares(5000, 3000, 2000);
        (uint256 h, uint256 d, uint256 dev) = router.getShares();
        assertEq(h, 5000);
        assertEq(d, 3000);
        assertEq(dev, 2000);
    }

    // ─── Test: route revenue emits event ────────────────────────────────

    function testRouteRevenueEmitsEvent() public {
        uint256 amount = 500 ether;
        uint256 toHolders = (amount * 6000) / 10000;
        uint256 toDAO = (amount * 3000) / 10000;
        uint256 toDev = amount - toHolders - toDAO;

        vm.expectEmit(true, false, false, true);
        emit RevenueRouter.RevenueReceived(
            deployer,
            amount,
            toHolders,
            toDAO,
            toDev
        );

        router.routeRevenue(amount);
    }

    // ─── Test: update addresses ─────────────────────────────────────────

    function testUpdateAddresses() public {
        address newRegistry = address(0x1234);
        address newTreasury = address(0x5678);
        address newDev = address(0x9ABC);

        router.updateAddresses(newRegistry, newTreasury, newDev);

        (address r, address t, address d) = router.getAddresses();
        assertEq(r, newRegistry);
        assertEq(t, newTreasury);
        assertEq(d, newDev);
    }

    // ─── Test: zero amount reverts ──────────────────────────────────────

    function testZeroAmountReverts() public {
        vm.expectRevert("RevenueRouter: zero amount");
        router.routeRevenue(0);
    }

    // ─── Test: only owner can update shares ─────────────────────────────

    function testOnlyOwnerCanUpdateShares() public {
        vm.prank(alice);
        vm.expectRevert();
        router.updateShares(5000, 3000, 2000);
    }

    // ─── Test: custom split ratios work correctly ──────────────────────

    function testCustomSplitRatios() public {
        // Change to 80/15/5
        router.updateShares(8000, 1500, 500);

        uint256 amount = 1000 ether;
        uint256 registryBefore = rewardToken.balanceOf(address(registry));
        uint256 treasuryBefore = rewardToken.balanceOf(treasury);
        uint256 devBefore = rewardToken.balanceOf(devFund);

        router.routeRevenue(amount);

        assertEq(rewardToken.balanceOf(address(registry)) - registryBefore, 800 ether);
        assertEq(rewardToken.balanceOf(treasury) - treasuryBefore, 150 ether);
        assertEq(rewardToken.balanceOf(devFund) - devBefore, 50 ether);
    }

    // ─── Test: multiple sequential distributions ───────────────────────

    function testMultipleDistributions() public {
        router.routeRevenue(100 ether);
        router.routeRevenue(200 ether);
        router.routeRevenue(300 ether);

        assertEq(router.totalRouted(), 600 ether);
        assertEq(router.totalToHolders(), 360 ether); // 60% of 600
        assertEq(router.totalToDAO(), 180 ether);     // 30% of 600
        assertEq(router.totalToDev(), 60 ether);      // 10% of 600
    }

    // ─── Test: update addresses with zero reverts ──────────────────────

    function testUpdateAddressesZeroReverts() public {
        vm.expectRevert("RevenueRouter: zero registry");
        router.updateAddresses(address(0), treasury, devFund);

        vm.expectRevert("RevenueRouter: zero treasury");
        router.updateAddresses(address(registry), address(0), devFund);

        vm.expectRevert("RevenueRouter: zero dev fund");
        router.updateAddresses(address(registry), treasury, address(0));
    }

    // ─── Fuzz: split always sums to input amount ───────────────────────

    function testFuzz_SplitSumsToInput(uint256 amount) public {
        amount = bound(amount, 1, 10000 ether);

        uint256 totalBefore = rewardToken.balanceOf(address(registry))
            + rewardToken.balanceOf(treasury)
            + rewardToken.balanceOf(devFund);

        router.routeRevenue(amount);

        uint256 totalAfter = rewardToken.balanceOf(address(registry))
            + rewardToken.balanceOf(treasury)
            + rewardToken.balanceOf(devFund);

        assertEq(totalAfter - totalBefore, amount, "Split must sum to input");
    }
}
