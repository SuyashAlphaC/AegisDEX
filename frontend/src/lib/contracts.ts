/**
 * SocialYield Contract ABIs and Configuration
 *
 * ABIs are derived from the Solidity contracts. Addresses come from env vars
 * which are populated after deployment.
 */

// ─── Addresses ──────────────────────────────────────────────────────────

export const CONTRACTS = {
  batchDEX: process.env.NEXT_PUBLIC_BATCH_DEX_ADDRESS as `0x${string}`,
  revenueRouter: process.env.NEXT_PUBLIC_REVENUE_ROUTER_ADDRESS as `0x${string}`,
  yieldRegistry: process.env.NEXT_PUBLIC_YIELD_REGISTRY_ADDRESS as `0x${string}`,
  baseToken: process.env.NEXT_PUBLIC_BASE_TOKEN_ADDRESS as `0x${string}`,
  quoteToken: process.env.NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS as `0x${string}`,
} as const

// ─── ERC20 ABI (minimal) ────────────────────────────────────────────────

export const ERC20_ABI = [
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'symbol',
    inputs: [],
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ type: 'uint8' }],
    stateMutability: 'view',
  },
] as const

// ─── BatchDEX ABI ───────────────────────────────────────────────────────

export const BATCH_DEX_ABI = [
  // Read functions
  {
    type: 'function',
    name: 'currentBatchId',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getCurrentBatchId',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'batchWindow',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'batchStartBlock',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'totalVolume',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'totalMEVCaptured',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'blocksUntilSettlement',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isBatchSettleable',
    inputs: [],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'totalOrders',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'maxOrdersPerBatch',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'batches',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'id', type: 'uint256' },
      { name: 'startBlock', type: 'uint256' },
      { name: 'endBlock', type: 'uint256' },
      { name: 'clearingPrice', type: 'uint256' },
      { name: 'settled', type: 'bool' },
      { name: 'buyOrderCount', type: 'uint256' },
      { name: 'sellOrderCount', type: 'uint256' },
      { name: 'mevCaptured', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getBatchOrders',
    inputs: [{ name: 'batchId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple[]',
        components: [
          { name: 'trader', type: 'address' },
          { name: 'isBuy', type: 'bool' },
          { name: 'limitPrice', type: 'uint256' },
          { name: 'amount', type: 'uint256' },
          { name: 'batchId', type: 'uint256' },
          { name: 'filled', type: 'bool' },
          { name: 'filledAmount', type: 'uint256' },
          { name: 'refundAmount', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getTraderOrders',
    inputs: [{ name: 'trader', type: 'address' }],
    outputs: [{ type: 'uint256[]' }],
    stateMutability: 'view',
  },
  // Write functions
  {
    type: 'function',
    name: 'placeBuyOrder',
    inputs: [
      { name: 'limitPrice', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: 'orderId', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'placeSellOrder',
    inputs: [
      { name: 'limitPrice', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: 'orderId', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'settleBatch',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  // Events
  {
    type: 'event',
    name: 'OrderPlaced',
    inputs: [
      { name: 'batchId', type: 'uint256', indexed: true },
      { name: 'orderId', type: 'uint256', indexed: true },
      { name: 'trader', type: 'address', indexed: true },
      { name: 'isBuy', type: 'bool', indexed: false },
      { name: 'limitPrice', type: 'uint256', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'BatchSettled',
    inputs: [
      { name: 'batchId', type: 'uint256', indexed: true },
      { name: 'clearingPrice', type: 'uint256', indexed: false },
      { name: 'buysFilled', type: 'uint256', indexed: false },
      { name: 'sellsFilled', type: 'uint256', indexed: false },
      { name: 'mevCaptured', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'OrderFilled',
    inputs: [
      { name: 'batchId', type: 'uint256', indexed: true },
      { name: 'orderId', type: 'uint256', indexed: true },
      { name: 'trader', type: 'address', indexed: true },
      { name: 'filledAmount', type: 'uint256', indexed: false },
      { name: 'clearingPrice', type: 'uint256', indexed: false },
    ],
  },
] as const

// ─── RevenueRouter ABI ──────────────────────────────────────────────────

export const REVENUE_ROUTER_ABI = [
  {
    type: 'function',
    name: 'totalRouted',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'totalToHolders',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'totalToDAO',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'totalToDev',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getShares',
    inputs: [],
    outputs: [
      { type: 'uint256' },
      { type: 'uint256' },
      { type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'RevenueReceived',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'toHolders', type: 'uint256', indexed: false },
      { name: 'toDAO', type: 'uint256', indexed: false },
      { name: 'toDev', type: 'uint256', indexed: false },
    ],
  },
] as const

// ─── YieldRegistry ABI ──────────────────────────────────────────────────

export const YIELD_REGISTRY_ABI = [
  {
    type: 'function',
    name: 'currentEpoch',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'activeHolderCount',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'epochLength',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'currentEpochDeposits',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'blocksUntilNextEpoch',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'pendingClaim',
    inputs: [{ name: 'holder', type: 'address' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getHolder',
    inputs: [{ name: 'addr', type: 'address' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'initName', type: 'string' },
          { name: 'registeredEpoch', type: 'uint256' },
          { name: 'lastClaimEpoch', type: 'uint256' },
          { name: 'pendingRewards', type: 'uint256' },
          { name: 'active', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getHolderList',
    inputs: [],
    outputs: [{ type: 'address[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getEpochReward',
    inputs: [{ name: 'epoch', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'totalReward', type: 'uint256' },
          { name: 'holderCount', type: 'uint256' },
          { name: 'rewardPerHolder', type: 'uint256' },
          { name: 'finalized', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  // Write
  {
    type: 'function',
    name: 'register',
    inputs: [{ name: '_initName', type: 'string' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'deregister',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'claim',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'finalizeEpoch',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  // Events
  {
    type: 'event',
    name: 'HolderRegistered',
    inputs: [
      { name: 'holder', type: 'address', indexed: true },
      { name: 'initName', type: 'string', indexed: false },
      { name: 'epoch', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'RewardClaimed',
    inputs: [
      { name: 'holder', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'fromEpoch', type: 'uint256', indexed: false },
      { name: 'toEpoch', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'EpochFinalized',
    inputs: [
      { name: 'epoch', type: 'uint256', indexed: true },
      { name: 'totalReward', type: 'uint256', indexed: false },
      { name: 'holderCount', type: 'uint256', indexed: false },
      { name: 'rewardPerHolder', type: 'uint256', indexed: false },
    ],
  },
] as const
