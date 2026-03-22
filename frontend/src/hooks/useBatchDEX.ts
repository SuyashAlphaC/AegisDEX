'use client'

import { useState, useEffect, useCallback } from 'react'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { parseEther } from 'viem'
import { CONTRACTS, BATCH_DEX_ABI, ERC20_ABI } from '@/lib/contracts'

// ─── Read Hooks ─────────────────────────────────────────────────────────

export function useCurrentBatch() {
  const { data: batchId, ...rest } = useReadContract({
    address: CONTRACTS.batchDEX,
    abi: BATCH_DEX_ABI,
    functionName: 'getCurrentBatchId',
    query: { refetchInterval: 5000 },
  })
  return { batchId, ...rest }
}

export function useBatchWindow() {
  return useReadContract({
    address: CONTRACTS.batchDEX,
    abi: BATCH_DEX_ABI,
    functionName: 'batchWindow',
  })
}

export function useBlocksUntilSettlement() {
  return useReadContract({
    address: CONTRACTS.batchDEX,
    abi: BATCH_DEX_ABI,
    functionName: 'blocksUntilSettlement',
    query: { refetchInterval: 3000 },
  })
}

export function useIsBatchSettleable() {
  return useReadContract({
    address: CONTRACTS.batchDEX,
    abi: BATCH_DEX_ABI,
    functionName: 'isBatchSettleable',
    query: { refetchInterval: 3000 },
  })
}

export function useTotalVolume() {
  return useReadContract({
    address: CONTRACTS.batchDEX,
    abi: BATCH_DEX_ABI,
    functionName: 'totalVolume',
    query: { refetchInterval: 10000 },
  })
}

export function useTotalMEVCaptured() {
  return useReadContract({
    address: CONTRACTS.batchDEX,
    abi: BATCH_DEX_ABI,
    functionName: 'totalMEVCaptured',
    query: { refetchInterval: 10000 },
  })
}

export function useBatchOrders(batchId: bigint | undefined) {
  return useReadContract({
    address: CONTRACTS.batchDEX,
    abi: BATCH_DEX_ABI,
    functionName: 'getBatchOrders',
    args: batchId !== undefined ? [batchId] : undefined,
    query: {
      enabled: batchId !== undefined,
      refetchInterval: 5000,
    },
  })
}

export function useBatchInfo(batchId: bigint | undefined) {
  return useReadContract({
    address: CONTRACTS.batchDEX,
    abi: BATCH_DEX_ABI,
    functionName: 'batches',
    args: batchId !== undefined ? [batchId] : undefined,
    query: {
      enabled: batchId !== undefined,
      refetchInterval: 5000,
    },
  })
}

// ─── Write Hooks ────────────────────────────────────────────────────────

export function usePlaceBuyOrder() {
  const { address } = useAccount()

  // Read current allowance for quoteToken → BatchDEX
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.quoteToken,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.batchDEX] : undefined,
    query: { enabled: !!address },
  })

  // Separate write contracts for approve and order
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: isApproving,
    error: approveError,
  } = useWriteContract()

  const {
    writeContract: writeOrder,
    data: orderHash,
    isPending: isOrdering,
    error: orderError,
  } = useWriteContract()

  const { isLoading: isApproveConfirming, isSuccess: isApproveConfirmed } =
    useWaitForTransactionReceipt({ hash: approveHash })

  const { isLoading: isOrderConfirming, isSuccess: isOrderSuccess } =
    useWaitForTransactionReceipt({ hash: orderHash })

  // Track pending order params to submit after approval confirms
  const [pendingOrder, setPendingOrder] = useState<{
    limitPrice: string
    amount: string
  } | null>(null)

  // When approval confirms, submit the order
  useEffect(() => {
    if (isApproveConfirmed && pendingOrder) {
      writeOrder({
        address: CONTRACTS.batchDEX,
        abi: BATCH_DEX_ABI,
        functionName: 'placeBuyOrder',
        args: [parseEther(pendingOrder.limitPrice), parseEther(pendingOrder.amount)],
      })
      setPendingOrder(null)
      refetchAllowance()
    }
  }, [isApproveConfirmed, pendingOrder, writeOrder, refetchAllowance])

  const placeBuyOrder = useCallback(
    (limitPrice: string, amount: string) => {
      const quoteCost = (parseEther(limitPrice) * parseEther(amount)) / BigInt(1e18)

      // Check if existing allowance is sufficient
      if (allowance !== undefined && allowance >= quoteCost) {
        // Allowance sufficient — submit order directly
        writeOrder({
          address: CONTRACTS.batchDEX,
          abi: BATCH_DEX_ABI,
          functionName: 'placeBuyOrder',
          args: [parseEther(limitPrice), parseEther(amount)],
        })
      } else {
        // Allowance insufficient — approve first, then auto-submit on confirmation
        setPendingOrder({ limitPrice, amount })
        writeApprove({
          address: CONTRACTS.quoteToken,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [CONTRACTS.batchDEX, quoteCost],
        })
      }
    },
    [allowance, writeOrder, writeApprove]
  )

  return {
    placeBuyOrder,
    hash: orderHash || approveHash,
    isPending: isApproving || isOrdering || isApproveConfirming,
    isConfirming: isOrderConfirming,
    isSuccess: isOrderSuccess,
    error: approveError || orderError,
  }
}

export function usePlaceSellOrder() {
  const { address } = useAccount()

  // Read current allowance for baseToken → BatchDEX
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.baseToken,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.batchDEX] : undefined,
    query: { enabled: !!address },
  })

  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: isApproving,
    error: approveError,
  } = useWriteContract()

  const {
    writeContract: writeOrder,
    data: orderHash,
    isPending: isOrdering,
    error: orderError,
  } = useWriteContract()

  const { isLoading: isApproveConfirming, isSuccess: isApproveConfirmed } =
    useWaitForTransactionReceipt({ hash: approveHash })

  const { isLoading: isOrderConfirming, isSuccess: isOrderSuccess } =
    useWaitForTransactionReceipt({ hash: orderHash })

  const [pendingOrder, setPendingOrder] = useState<{
    limitPrice: string
    amount: string
  } | null>(null)

  useEffect(() => {
    if (isApproveConfirmed && pendingOrder) {
      writeOrder({
        address: CONTRACTS.batchDEX,
        abi: BATCH_DEX_ABI,
        functionName: 'placeSellOrder',
        args: [parseEther(pendingOrder.limitPrice), parseEther(pendingOrder.amount)],
      })
      setPendingOrder(null)
      refetchAllowance()
    }
  }, [isApproveConfirmed, pendingOrder, writeOrder, refetchAllowance])

  const placeSellOrder = useCallback(
    (limitPrice: string, amount: string) => {
      const sellAmount = parseEther(amount)

      if (allowance !== undefined && allowance >= sellAmount) {
        writeOrder({
          address: CONTRACTS.batchDEX,
          abi: BATCH_DEX_ABI,
          functionName: 'placeSellOrder',
          args: [parseEther(limitPrice), sellAmount],
        })
      } else {
        setPendingOrder({ limitPrice, amount })
        writeApprove({
          address: CONTRACTS.baseToken,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [CONTRACTS.batchDEX, sellAmount],
        })
      }
    },
    [allowance, writeOrder, writeApprove]
  )

  return {
    placeSellOrder,
    hash: orderHash || approveHash,
    isPending: isApproving || isOrdering || isApproveConfirming,
    isConfirming: isOrderConfirming,
    isSuccess: isOrderSuccess,
    error: approveError || orderError,
  }
}

export function useSettleBatch() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const settle = () => {
    writeContract({
      address: CONTRACTS.batchDEX,
      abi: BATCH_DEX_ABI,
      functionName: 'settleBatch',
    })
  }

  return { settle, hash, isPending, isConfirming, isSuccess, error }
}
