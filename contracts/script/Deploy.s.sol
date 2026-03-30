// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/BatchDEX.sol";
import "../src/RevenueRouter.sol";
import "../src/YieldRegistry.sol";
import "../src/GovernanceTimelock.sol";
import "../src/TestToken.sol";

/**
 * @title Deploy
 * @notice Deployment script for the full SocialYield protocol.
 *         Order: TestTokens → YieldRegistry → RevenueRouter → BatchDEX → GovernanceTimelock
 */
contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        // Optional: use env vars for existing tokens, or deploy test tokens
        address baseTokenAddr = vm.envOr("BASE_TOKEN", address(0));
        address quoteTokenAddr = vm.envOr("QUOTE_TOKEN", address(0));
        address daoTreasury = vm.envOr("DAO_TREASURY", deployer);
        address devFund = vm.envOr("DEV_FUND", deployer);
        address multisig = vm.envOr("MULTISIG", deployer);

        vm.startBroadcast(deployerPrivateKey);

        // ── 0. Deploy test tokens if none provided ──────────────────────
        TestToken baseToken;
        TestToken quoteToken;

        if (baseTokenAddr == address(0)) {
            baseToken = new TestToken("Test USDC", "USDC");
            baseTokenAddr = address(baseToken);
            console.log("TestToken USDC:     ", baseTokenAddr);
        } else {
            console.log("Using existing base: ", baseTokenAddr);
        }

        if (quoteTokenAddr == address(0)) {
            quoteToken = new TestToken("SocialYield Token", "SYLD");
            quoteTokenAddr = address(quoteToken);
            console.log("TestToken SYLD:     ", quoteTokenAddr);
        } else {
            console.log("Using existing quote:", quoteTokenAddr);
        }

        // ── 1. Deploy YieldRegistry ─────────────────────────────────────
        YieldRegistry registry = new YieldRegistry(
            quoteTokenAddr,   // yieldToken = SYLD
            address(0),       // revenueRouter — set below
            1000              // epochLength: 1000 blocks
        );
        console.log("YieldRegistry:      ", address(registry));

        // ── 2. Deploy RevenueRouter ─────────────────────────────────────
        RevenueRouter router = new RevenueRouter(
            quoteTokenAddr,
            address(registry),
            daoTreasury,
            devFund
        );
        console.log("RevenueRouter:      ", address(router));

        // ── 3. Wire registry to router ──────────────────────────────────
        registry.setRevenueRouter(address(router));

        // ── 4. Deploy BatchDEX ──────────────────────────────────────────
        BatchDEX dex = new BatchDEX(
            baseTokenAddr,
            quoteTokenAddr,
            address(router),
            10                // batchWindow: 10 blocks
        );
        console.log("BatchDEX:           ", address(dex));

        // ── 5. Transfer BatchDEX ownership to timelock after mainnet ────
        //    (For testnet, deployer retains ownership for flexibility)

        // ── 6. Deploy GovernanceTimelock ─────────────────────────────────
        GovernanceTimelock timelock = new GovernanceTimelock(
            multisig,
            48 hours
        );
        console.log("GovernanceTimelock: ", address(timelock));

        vm.stopBroadcast();

        // ── Summary ─────────────────────────────────────────────────────
        console.log("");
        console.log("========================================");
        console.log("   SocialYield Deployment Complete");
        console.log("========================================");
        console.log("Base Token (USDC):  ", baseTokenAddr);
        console.log("Quote Token (SYLD): ", quoteTokenAddr);
        console.log("YieldRegistry:      ", address(registry));
        console.log("RevenueRouter:      ", address(router));
        console.log("BatchDEX:           ", address(dex));
        console.log("GovernanceTimelock: ", address(timelock));
        console.log("DAO Treasury:       ", daoTreasury);
        console.log("Dev Fund:           ", devFund);
        console.log("Multisig:           ", multisig);
        console.log("Deployer:           ", deployer);
        console.log("========================================");
    }
}
