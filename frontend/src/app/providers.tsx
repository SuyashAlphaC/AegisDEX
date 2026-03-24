'use client'

import { PropsWithChildren, useEffect } from 'react'
import { createConfig, http, WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  initiaPrivyWalletConnector,
  injectStyles,
  InterwovenKitProvider,
  TESTNET,
} from '@initia/interwovenkit-react'
import interwovenKitStyles from '@initia/interwovenkit-react/styles.js'

const evmChainId = Number(process.env.NEXT_PUBLIC_EVM_CHAIN_ID!)

const socialyieldChain = {
  id: evmChainId,
  name: 'SocialYield Appchain',
  nativeCurrency: { name: 'GAS', symbol: 'GAS', decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_EVM_RPC_URL!],
    },
  },
} as const

const customChain = {
  chain_id: process.env.NEXT_PUBLIC_ROLLUP_CHAIN_ID!,
  chain_name: 'SocialYield',
  network_type: 'testnet' as const,
  bech32_prefix: 'init',
  apis: {
    rpc: [{ address: process.env.NEXT_PUBLIC_ROLLUP_RPC_URL || 'http://localhost:26657' }],
    rest: [{ address: process.env.NEXT_PUBLIC_ROLLUP_REST_URL || 'http://localhost:1317' }],
    indexer: [{ address: 'http://localhost:8080' }],
    'json-rpc': [{ address: process.env.NEXT_PUBLIC_EVM_RPC_URL || 'http://localhost:8545' }],
  },
  fees: {
    fee_tokens: [{
      denom: 'GAS',
      fixed_min_gas_price: 0,
      low_gas_price: 0,
      average_gas_price: 0,
      high_gas_price: 0,
    }],
  },
  staking: { staking_tokens: [{ denom: 'GAS' }] },
  native_assets: [{ denom: 'GAS', name: 'Gas', symbol: 'GAS', decimals: 18 }],
  metadata: { is_l1: false, minitia: { type: 'minievm' } },
}

const wagmiConfig = createConfig({
  connectors: [initiaPrivyWalletConnector],
  chains: [socialyieldChain],
  transports: { [socialyieldChain.id]: http() },
})

const queryClient = new QueryClient()

export default function Providers({ children }: PropsWithChildren) {
  useEffect(() => {
    injectStyles(interwovenKitStyles)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <InterwovenKitProvider
          {...TESTNET}
          customChain={customChain as any}
          defaultChainId={process.env.NEXT_PUBLIC_ROLLUP_CHAIN_ID!}
        >
          {children}
        </InterwovenKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  )
}
