# SocialYield: The Community-First MEV-Aware Appchain

**SocialYield** is a sovereign Initia Appchain featuring a specialized Batch-Auction DEX that productizes sequencer revenue. By structurally eliminating front-running and internalizing arbitrage value, SocialYield transforms the **.init name** from a simple identity primitive into a high-yield productive asset.

🚀 **Live on Initia Testnet** | 📊 [Metrics Dashboard](#testnet-deployment) | 📖 [Testing Guide](./DEMO_GUIDE.md) | 🔒 [Security Model](./SECURITY.md) | 📈 [GTM Strategy](./GTM_STRATEGY.md)

---

## 🌐 Testnet Deployment

**Network**: Initia Testnet (`minievm-2`)
**Status**: ✅ Fully Operational
**EVM Chain ID**: `2124225178762456`

### Deployed Contract Addresses

| Contract | Address | Explorer |
|----------|---------|----------|
| **BatchDEX** | `0xbbD6525b878deB33188077B35f29B708d28B0C88` | [View ↗](https://scan.testnet.initia.xyz/address/0xbbD6525b878deB33188077B35f29B708d28B0C88) |
| **YieldRegistry** | `0xc37F0d3f439FBA4E5b134271BA910ab544BE466f` | [View ↗](https://scan.testnet.initia.xyz/address/0xc37F0d3f439FBA4E5b134271BA910ab544BE466f) |
| **RevenueRouter** | `0xb252F649255E4259a4853E8B55e7ddEbCe2dcD83` | [View ↗](https://scan.testnet.initia.xyz/address/0xb252F649255E4259a4853E8B55e7ddEbCe2dcD83) |
| **GovernanceTimelock** | `0xC99eDAA459828ece11F72a3bD8F04bfc60fabC74` | [View ↗](https://scan.testnet.initia.xyz/address/0xC99eDAA459828ece11F72a3bD8F04bfc60fabC74) |
| **USDC (Test)** | `0xA34Fa50612d20bEc3220c984135F41a806655Abd` | [View ↗](https://scan.testnet.initia.xyz/address/0xA34Fa50612d20bEc3220c984135F41a806655Abd) |
| **SYLD (Test)** | `0xfDb0A9DFFDb93DA8329d5966324845213f31E328` | [View ↗](https://scan.testnet.initia.xyz/address/0xfDb0A9DFFDb93DA8329d5966324845213f31E328) |

### RPC Endpoints

```bash
# EVM JSON-RPC
https://jsonrpc-evm-1.anvil.asia-southeast.initia.xyz

# Cosmos RPC/REST
https://rpc.testnet.initia.xyz:443
https://rest.testnet.initia.xyz
```

### Try It Now

1. **Connect Wallet**: Keplr or Leap with Initia testnet support
2. **Get Testnet Tokens**: Use built-in faucet (100 USDC + 100 SYLD/day)
3. **Place Orders**: Trade with MEV protection via batch auctions
4. **Register .init Name**: Start earning passive yield from protocol MEV
5. **Claim Rewards**: Receive SYLD tokens every epoch (~8 minutes)

📖 **Full Testing Guide**: See [DEMO_GUIDE.md](./DEMO_GUIDE.md) for step-by-step instructions.

---

## 🚀 The Core Thesis

On legacy networks, MEV (Maximal Extractable Value) is a "tax" on retail users that flows to bots and validators. **SocialYield changes the equation.**

Built on the Initia Interwoven Stack, SocialYield captures order surplus (the difference between limit prices and uniform clearing prices) and "socializes" it. By structurally eliminating front-running through batch auctions, the value that would normally leak to MEV bots is instead captured at the protocol level and redistributed to the community.

### **The Economic Flywheel**
1. **Trading Volume** generates Sequencer Fees and Arbitrage Surplus.
2. **Batch Auctions** capture this surplus at the protocol level.
3. **Revenue Distribution** routes yield to verified **.init name holders**.
4. **Demand for .init names** increases, bringing more users into the Initia ecosystem.

---

## ✨ Unique & Competent Features

### 1. Frequent Batch Auctions (FBA) Logic
Unlike standard XYK AMMs (like Uniswap) that execute trades sequentially, SocialYield’s `BatchDEX.sol` uses a discrete-time execution model:
* **Anti-Sandwich:** All orders within a 10-block window (approx. 5 seconds) are collected and executed at a **Uniform Clearing Price**.
* **Coincidence of Wants (CoW):** Orders are matched internally first, reducing slippage and external price impact.
* **MEV Capture:** Any residual arbitrage value is captured by the sequencer, not external searchers.

### 2. .init Staking & Yield Registry
We have implemented a native **Yield Registry** that bridges Initia's identity layer with DeFi incentives:
* **Identity-Gated Rewards:** Only users with a registered `.init` username can claim their share of the protocol revenue.
* **Automated Revenue Split:** All sequencer earnings are routed through `RevenueRouter.sol` with a hardcoded split:
    * **60%** to .init name holders.
    * **30%** to the DAO Treasury for liquidity mining.
    * **10%** for protocol insurance/maintenance.

### 3. "Invisible Chain" UX
Leveraging Initia’s native UX primitives, SocialYield minimizes friction:
* **Smart Auto-Approval:** Token approvals are batched with order placement — users experience a single-click trade flow after initial setup.
* **InterwovenKit Integration:** Native `.init` name detection, wallet connection, and chain auto-configuration via `@initia/interwovenkit-react`.
* **Real-Time Batch Status:** Live block countdown, progress bars, and order book updates with automatic refetching.

---

## 🛠 Technical Implementation

### **Smart Contract Architecture**
* **`BatchDEX.sol`**: The core execution engine. Manages order state machines and uniform price clearing.
* **`YieldRegistry.sol`**: Manages the distribution logic and maps rewards to `.init` identities.
* **`RevenueRouter.sol`**: The protocol's "Lungs"—receives order surplus from batch settlements and pumps them into the distribution pools.
* **`GovernanceTimelock.sol`**: Ensures that the community has a 48-hour window to review any changes to the revenue split.

### **Frontend Stack**
* **Framework**: Next.js 14 + Tailwind CSS.
* **Identity**: `@initia/interwovenkit-react` for native `.init` username resolution via L1 REST API.
* **Contract Hooks**: Custom hooks (`useBatchDEX.ts`, `useYieldRegistry.ts`) for smart approval flows, real-time batch status, and epoch tracking.

---

## 🏗 Setup & Deployment

### **Prerequisites**
* [Initia Weave CLI](https://docs.initia.xyz)
* Foundry (for contract testing)
* Node.js (v20+)

### **Appchain Orchestration**
```bash
# Initialize the SocialYield Minitia rollup
weave init socialyield-chain

# Deploy core contracts to the local/testnet Minitia
sh scripts/deploy.sh
```

### **Frontend Setup**
```bash
cd frontend
npm install
npm run dev
```

---

## 🔒 Security Hardening

SocialYield implements multiple layers of protection against known DeFi attack vectors:

* **Gas Safety Caps**: `maxOrdersPerBatch` (default: 100, max: 500) prevents gas-bomb attacks on batch settlement. `MAX_CLAIM_EPOCHS` (200) caps reward iteration per claim to prevent DoS.
* **Reentrancy Protection**: All state-changing functions use OpenZeppelin `ReentrancyGuard`.
* **Access Control**: Owner-gated admin functions, router-gated deposits, multisig-gated governance.
* **Governance Timelock**: 48-hour delay on parameter changes with 14-day grace period.
* **Owner-Gated Minting**: TestToken minting restricted to deployer (prevents inflation attacks on testnet metrics).

See [SECURITY.md](./SECURITY.md) for the full threat model and design rationale.

---

## 🏆 Why SocialYield Wins
SocialYield is the **only** submission that treats the **Appchain as a Business**. While others build DApps on top of chains, we have built a sovereign economy that:
1.  **Directly utilizes the "Keep the Revenue" rule** of Initia.
2.  **Solves the MEV problem** at the infrastructure layer.
3.  **Aggressively promotes the .init identity**, driving ecosystem-wide growth.

---

**Build the app. Keep the revenue. Share it with the community.** *SocialYield — Powered by Initia.*