'use client'

import { useState, useEffect } from 'react'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { CONTRACTS, YIELD_REGISTRY_ABI, ERC20_ABI } from '@/lib/contracts'

// ─── Read Hooks ─────────────────────────────────────────────────────────

export function useCurrentEpoch() {
  return useReadContract({
    address: CONTRACTS.yieldRegistry,
    abi: YIELD_REGISTRY_ABI,
    functionName: 'currentEpoch',
    query: { refetchInterval: 10000 },
  })
}

export function useActiveHolderCount() {
  return useReadContract({
    address: CONTRACTS.yieldRegistry,
    abi: YIELD_REGISTRY_ABI,
    functionName: 'activeHolderCount',
    query: { refetchInterval: 10000 },
  })
}

export function useEpochDeposits() {
  return useReadContract({
    address: CONTRACTS.yieldRegistry,
    abi: YIELD_REGISTRY_ABI,
    functionName: 'currentEpochDeposits',
    query: { refetchInterval: 10000 },
  })
}

export function useBlocksUntilNextEpoch() {
  return useReadContract({
    address: CONTRACTS.yieldRegistry,
    abi: YIELD_REGISTRY_ABI,
    functionName: 'blocksUntilNextEpoch',
    query: { refetchInterval: 5000 },
  })
}

export function usePendingClaim(address: `0x${string}` | undefined) {
  return useReadContract({
    address: CONTRACTS.yieldRegistry,
    abi: YIELD_REGISTRY_ABI,
    functionName: 'pendingClaim',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 10000,
    },
  })
}

export function useHolderInfo(address: `0x${string}` | undefined) {
  return useReadContract({
    address: CONTRACTS.yieldRegistry,
    abi: YIELD_REGISTRY_ABI,
    functionName: 'getHolder',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })
}

export function useHolderList() {
  return useReadContract({
    address: CONTRACTS.yieldRegistry,
    abi: YIELD_REGISTRY_ABI,
    functionName: 'getHolderList',
    query: { refetchInterval: 15000 },
  })
}

export function useEpochReward(epoch: bigint | undefined) {
  return useReadContract({
    address: CONTRACTS.yieldRegistry,
    abi: YIELD_REGISTRY_ABI,
    functionName: 'getEpochReward',
    args: epoch !== undefined ? [epoch] : undefined,
    query: { enabled: epoch !== undefined },
  })
}

// ─── Write Hooks ────────────────────────────────────────────────────────

/**
 * useRegister — auto-approves quoteToken for BatchDEX (so user is
 * immediately ready to trade), then registers the .init name.
 */
export function useRegister() {
  const { address } = useAccount()
  const MaxUint256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')

  // Check current quoteToken allowance for BatchDEX
  const { data: allowance } = useReadContract({
    address: CONTRACTS.quoteToken,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.batchDEX] : undefined,
    query: { enabled: !!address },
  })

  // Approve writer
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: isApproving,
    error: approveError,
  } = useWriteContract()

  const { isLoading: isApproveConfirming, isSuccess: isApproveConfirmed } =
    useWaitForTransactionReceipt({ hash: approveHash })

  // Register writer
  const {
    writeContract: writeRegister,
    data: registerHash,
    isPending: isRegistering,
    error: registerError,
  } = useWriteContract()

  const { isLoading: isRegisterConfirming, isSuccess: isRegisterSuccess } =
    useWaitForTransactionReceipt({ hash: registerHash })

  // Track pending initName for auto-submit after approval
  const [pendingName, setPendingName] = useState<string | null>(null)

  useEffect(() => {
    if (isApproveConfirmed && pendingName) {
      writeRegister({
        address: CONTRACTS.yieldRegistry,
        abi: YIELD_REGISTRY_ABI,
        functionName: 'register',
        args: [pendingName],
      })
      setPendingName(null)
    }
  }, [isApproveConfirmed, pendingName, writeRegister])

  const register = (initName: string) => {
    // If quoteToken already approved for BatchDEX, skip approval
    if (allowance !== undefined && allowance > BigInt(0)) {
      writeRegister({
        address: CONTRACTS.yieldRegistry,
        abi: YIELD_REGISTRY_ABI,
        functionName: 'register',
        args: [initName],
      })
    } else {
      // Approve quoteToken for BatchDEX with max allowance, then auto-register
      setPendingName(initName)
      writeApprove({
        address: CONTRACTS.quoteToken,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACTS.batchDEX, MaxUint256],
      })
    }
  }

  return {
    register,
    hash: registerHash || approveHash,
    isPending: isApproving || isRegistering || isApproveConfirming,
    isConfirming: isRegisterConfirming,
    isSuccess: isRegisterSuccess,
    error: approveError || registerError,
  }
}

export function useDeregister() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const deregister = () => {
    writeContract({
      address: CONTRACTS.yieldRegistry,
      abi: YIELD_REGISTRY_ABI,
      functionName: 'deregister',
    })
  }

  return { deregister, hash, isPending, isConfirming, isSuccess, error }
}

export function useClaim() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const claim = () => {
    writeContract({
      address: CONTRACTS.yieldRegistry,
      abi: YIELD_REGISTRY_ABI,
      functionName: 'claim',
    })
  }

  return { claim, hash, isPending, isConfirming, isSuccess, error }
}

export function useFinalizeEpoch() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const finalize = () => {
    writeContract({
      address: CONTRACTS.yieldRegistry,
      abi: YIELD_REGISTRY_ABI,
      functionName: 'finalizeEpoch',
    })
  }

  return { finalize, hash, isPending, isConfirming, isSuccess, error }
}
