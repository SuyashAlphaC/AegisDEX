# SocialYield — MEV Yield for .init Holders

> A batch-auction DEX appchain on Initia where 100% of captured MEV is redistributed to .init name holders every epoch.

**🏆 INITIATE: The Initia Hackathon (Season 1) — DeFi Track**

---

## Initia Hackathon Submission

- **Project Name**: SocialYield

### Project Overview

SocialYield is a batch-auction DEX appchain on Initia that eliminates front-running by clearing all orders at a uniform price every 10 blocks. 100% of the MEV surplus captured at settlement is redistributed to .init name holders every epoch — turning Initia's identity primitive into a yield-bearing asset.

### Implementation Detail

- **The Custom Implementation**: A uniform-price batch auction clearing engine (`BatchDEX.sol`) that aggregates orders over a configurable block window, computes the intersection of supply and demand curves, settles all trades at one price, and routes captured surplus through a `RevenueRouter` to a permissionless yield pool.

- **The Native Feature**: Initia Usernames (.init). Registration in the `YieldRegistry` requires owning a .init name. The frontend queries the Initia L1 username module to verify ownership before showing the registration button. All holder displays show .init names instead of hex addresses throughout the app.

### How to Run Locally

1. Clone repo:
   ```bash
   git clone https://github.com/<YOUR_USERNAME>/socialyield.git
   cd socialyield
   ```

2. Build and test contracts:
   ```bash
   cd contracts
   forge install OpenZeppelin/openzeppelin-contracts --no-git
   forge build
   forge test -vv
   ```

3. Deploy (local):
   ```bash
   chmod +x ../scripts/deploy.sh
   ../scripts/deploy.sh local
   ```

4. Copy deployed addresses to `frontend/.env.local`

5. Run frontend:
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

6. Open http://localhost:3000, connect wallet, place orders

---

## Architecture

```
┌─────────────────┐        ┌──────────────────┐        ┌──────────────────┐
│                 │ MEV    │                  │  60%   │                  │
│    BatchDEX     │───────▶│  RevenueRouter   │───────▶│  YieldRegistry   │
│  (Batch Auction │ Surplus│  (Split Engine)   │        │  (.init Holders) │
│   Clearing)     │        │                  │        │  Claim Yield     │
└─────────────────┘        │                  │        └──────────────────┘
                           │                  │  30%   ┌──────────────────┐
 Orders collected           │                  │───────▶│  DAO Treasury    │
 every 10 blocks            │                  │        └──────────────────┘
 Uniform price              │                  │  10%   ┌──────────────────┐
 No front-running           │                  │───────▶│  Dev Fund        │
                           └──────────────────┘        └──────────────────┘

                    ┌──────────────────┐
                    │ GovernanceTimelock│  48h delay on all
                    │   (Admin Guard)  │  parameter changes
                    └──────────────────┘
```

## Contracts

| Contract             | Purpose                                        |
|---------------------|-------------------------------------------------|
| `BatchDEX.sol`       | Batch-auction DEX with uniform clearing price   |
| `RevenueRouter.sol`  | MEV surplus splitter (60/30/10)                 |
| `YieldRegistry.sol`  | .init holder registry + epoch yield claims      |
| `GovernanceTimelock.sol` | 48h timelock for admin changes              |
| `TestToken.sol`      | Mintable ERC20 for testing                      |

## Contract Addresses (Testnet)

> Fill after deployment

| Contract             | Address |
|---------------------|---------|
| BatchDEX            | `0x7Be218B5D6D22B9DF8a20c009fbC7a621a6667d5`   |
| RevenueRouter       | `0x7fF2FCb057d4B6747D5d2d2BDF5249CF7241Af7A`   |
| YieldRegistry       | `0xc3b703885dE6F2fA25Fa315268F69A56f677FCA7`   |
| GovernanceTimelock   | `0xd059B82372B751D12f4641160a5d0b19B166ff63`   |
| USDC (Test)         | `0x66D61B6D6c7BCe320EADddd7b9364EF59d4FC923`   |
| SYLD (Test)         | `0x9f6292F57EDD679120f540638D7A9CAC2681573F`   |

## Tech Stack

- **Contracts**: Solidity 0.8.24 / Foundry / OpenZeppelin
- **Frontend**: Next.js 14 / TypeScript / Tailwind CSS
- **Web3**: wagmi / viem / InterwovenKit
- **Chain**: Initia EVM Appchain (minievm)

## Key Features

1. **Fair Batch Auctions** — All orders in a batch get the same clearing price. No MEV extraction by position.
2. **MEV → Yield** — 100% of surplus between limit prices and clearing price is captured and redistributed.
3. **Identity-Gated Yield** — Only .init name holders can register for yield, making Initia's identity layer economically meaningful.
4. **Permissionless Settlement** — Anyone can call `settleBatch()` after the window elapses.
5. **Governance Guarded** — A 48h timelock protects all admin parameter changes.

## Development

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- [Node.js 18+](https://nodejs.org/)
- [Initia CLI tools](https://docs.initia.xyz/hackathon/get-started) (for deployment)

### Quick Start

```bash
# Contracts
cd contracts
forge build          # Compile
forge test -vv       # Run tests

# Frontend
cd frontend
npm install
npm run dev          # Start dev server
```

### Deployment

```bash
# Set up env
cp contracts/.env.example contracts/.env
# Edit contracts/.env with your keys

# Deploy
./scripts/deploy.sh local    # Local
./scripts/deploy.sh testnet  # Testnet

# Smoke test
./scripts/smoke-test.sh
```

## License

MIT
