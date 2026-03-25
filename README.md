# SocialYield: The Community-First MEV-Aware Appchain

**SocialYield** is a sovereign Initia Appchain featuring a specialized Batch-Auction DEX that productizes sequencer revenue. By structurally eliminating front-running and internalizing arbitrage value, SocialYield transforms the **.init name** from a simple identity primitive into a high-yield productive asset.

---

## 🚀 The Core Thesis

On legacy networks, MEV (Maximal Extractable Value) is a "tax" on retail users that flows to bots and validators. **SocialYield changes the equation.**

Built on the Initia Interwoven Stack, SocialYield captures 100% of sequencer revenue and "socializes" it. Instead of leaking value, we route it back to the community via a transparent, automated protocol.

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
Leveraging Initia’s native UX primitives, SocialYield feels like a Centralized Exchange:
* **Session Keys:** Using `InterwovenKit`'s `enableAutoSign`, users approve a single session and trade instantly without wallet popups.
* **Interwoven Bridge:** Users can deposit assets from any Minitia rollup into the SocialYield Batch window with a single click.

---

## 🛠 Technical Implementation

### **Smart Contract Architecture**
* **`BatchDEX.sol`**: The core execution engine. Manages order state machines and uniform price clearing.
* **`YieldRegistry.sol`**: Manages the distribution logic and maps rewards to `.init` identities.
* **`RevenueRouter.sol`**: The protocol's "Lungs"—receives sequencer fees and pumps them into the distribution pools.
* **`GovernanceTimelock.sol`**: Ensures that the community has a 48-hour window to review any changes to the revenue split.

### **Frontend Stack**
* **Framework**: Next.js 14 + Tailwind CSS.
* **Identity**: `@initia/interwovenkit-react` for native `.init` username resolution.
* **Interoperability**: Custom hooks (`useBatchDEX.ts`) for managing cross-chain asset movements via the Interwoven Bridge.

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

## 🏆 Why SocialYield Wins
SocialYield is the **only** submission that treats the **Appchain as a Business**. While others build DApps on top of chains, we have built a sovereign economy that:
1.  **Directly utilizes the "Keep the Revenue" rule** of Initia.
2.  **Solves the MEV problem** at the infrastructure layer.
3.  **Aggressively promotes the .init identity**, driving ecosystem-wide growth.

---

**Build the app. Keep the revenue. Share it with the community.** *SocialYield — Powered by Initia.*