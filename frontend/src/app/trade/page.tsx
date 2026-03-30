'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { formatEther } from 'viem'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import {
  useCurrentBatch,
  useBlocksUntilSettlement,
  useIsBatchSettleable,
  useBatchOrders,
  useBatchInfo,
  usePlaceBuyOrder,
  usePlaceSellOrder,
  useSettleBatch,
  useTotalVolume,
  useTotalMEVCaptured,
  useQuoteBalance,
  useBaseBalance,
} from '@/hooks/useBatchDEX'
import TransactionStatus from '@/components/TransactionStatus'
import { shortenAddress } from '@/hooks/useInitiaUsernames'

export default function TradePage() {
  const { initiaAddress, openConnect, openBridge, autoSign } = useInterwovenKit()
  const chainId = process.env.NEXT_PUBLIC_ROLLUP_CHAIN_ID!
  const [isBuyMode, setIsBuyMode] = useState(true)
  const [limitPrice, setLimitPrice] = useState('')
  const [amount, setAmount] = useState('')
  const [autoSignEnabled, setAutoSignEnabled] = useState(false)
  const [autoSignLoading, setAutoSignLoading] = useState(false)

  // Sync auto-sign state from kit
  useEffect(() => {
    if (autoSign?.isEnabledByChain?.[chainId]) {
      setAutoSignEnabled(true)
    } else {
      setAutoSignEnabled(false)
    }
  }, [autoSign?.isEnabledByChain, chainId])

  const toggleAutoSign = useCallback(async () => {
    if (!autoSign) return
    setAutoSignLoading(true)
    try {
      if (autoSignEnabled) {
        await (autoSign as any).disable(chainId)
        setAutoSignEnabled(false)
      } else {
        await (autoSign as any).enable(chainId, { permissions: ["/minievm.evm.v1.MsgCall"] })
        setAutoSignEnabled(true)
      }
    } catch (err) {
      console.error('Auto-sign toggle failed', err)
      // Check if it's an authorization error while disabling, in which case we consider it disabled
      if (err instanceof Error && err.message?.includes('authorization not found')) {
        setAutoSignEnabled(false)
      }
    } finally {
      setAutoSignLoading(false)
    }
  }, [autoSign, autoSignEnabled, chainId])

  // Read state
  const { batchId } = useCurrentBatch()
  const { data: blocksLeft } = useBlocksUntilSettlement()
  const { data: isSettleable } = useIsBatchSettleable()
  const { data: batchOrders } = useBatchOrders(batchId)
  const { data: batchInfo } = useBatchInfo(batchId)
  const { data: totalVolume } = useTotalVolume()
  const { data: totalMEV } = useTotalMEVCaptured()
  const { data: quoteBalance } = useQuoteBalance()
  const { data: baseBalance } = useBaseBalance()

  // Write hooks
  const buyOrder = usePlaceBuyOrder()
  const sellOrder = usePlaceSellOrder()
  const settleBatchHook = useSettleBatch()

  const batchWindow = batchInfo ? Number(batchInfo[2]) - Number(batchInfo[1]) : 10
  const blocksElapsed = batchWindow - Number(blocksLeft || 0)
  const progressPct = batchWindow > 0 ? Math.min((blocksElapsed / batchWindow) * 100, 100) : 0

  // Separate buy and sell orders
  const buyOrders = batchOrders?.filter((o: any) => o.isBuy).sort((a: any, b: any) =>
    Number(b.limitPrice - a.limitPrice)
  ) || []
  const sellOrders = batchOrders?.filter((o: any) => !o.isBuy).sort((a: any, b: any) =>
    Number(a.limitPrice - b.limitPrice)
  ) || []

  const computedCost = limitPrice && amount
    ? (parseFloat(limitPrice) * parseFloat(amount)).toFixed(4)
    : '0.00'

  // Input validation
  const priceNum = parseFloat(limitPrice)
  const amountNum = parseFloat(amount)
  const quoteBalNum = quoteBalance ? parseFloat(formatEther(quoteBalance)) : 0
  const baseBalNum = baseBalance ? parseFloat(formatEther(baseBalance)) : 0

  const getValidationError = (): string | null => {
    if (!limitPrice || !amount) return null // not an error, just empty
    if (isNaN(priceNum) || priceNum <= 0) return 'Price must be greater than 0'
    if (isNaN(amountNum) || amountNum <= 0) return 'Amount must be greater than 0'
    if (isBuyMode && quoteBalance !== undefined) {
      const cost = priceNum * amountNum
      if (cost > quoteBalNum) return `Insufficient SYLD balance (need ${cost.toFixed(2)}, have ${quoteBalNum.toFixed(2)})`
    }
    if (!isBuyMode && baseBalance !== undefined) {
      if (amountNum > baseBalNum) return `Insufficient USDC balance (need ${amountNum.toFixed(2)}, have ${baseBalNum.toFixed(2)})`
    }
    return null
  }

  const validationError = getValidationError()
  const canSubmit = !!limitPrice && !!amount && !validationError && !buyOrder.isPending && !sellOrder.isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    if (isBuyMode) {
      buyOrder.placeBuyOrder(limitPrice, amount)
    } else {
      sellOrder.placeSellOrder(limitPrice, amount)
    }
  }

  // Reset form upon successful order confirmation
  useEffect(() => {
    if (buyOrder.isSuccess || sellOrder.isSuccess) {
      setLimitPrice('')
      setAmount('')
    }
  }, [buyOrder.isSuccess, sellOrder.isSuccess])

  if (!initiaAddress) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="font-heading italic text-6xl text-white mb-6 tracking-tight">Trade</h1>
        <p className="font-body text-white/50 text-lg mb-8 max-w-md text-center">
          Connect your wallet to participate in the SocialYield batch auctions.
        </p>
        <button
          onClick={() => openConnect?.()}
          className="liquid-glass-teal rounded-full px-8 py-4 font-body font-medium text-[#00ff87] hover:scale-105 transition-transform"
        >
          Connect Wallet
        </button>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ filter: 'blur(10px)', opacity: 0 }}
      animate={{ filter: 'blur(0px)', opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="max-w-7xl mx-auto px-4 py-8 mt-12"
    >
      <h1 className="font-heading italic text-5xl text-white mb-8 tracking-tight">Trade</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Order Form */}
        <div className="liquid-glass rounded-3xl p-6 h-fit transition-transform hover:scale-[1.01] duration-300">
          {/* Auto-Sign Status */}
          {initiaAddress && (
            <div className="flex items-center justify-between mb-4">
              <span className="text-white/40 font-body text-xs uppercase tracking-widest">Session Key</span>
              <button
                onClick={toggleAutoSign}
                disabled={autoSignLoading}
                className={`liquid-glass rounded-full px-3 py-1.5 flex items-center gap-2 text-xs font-body transition-all hover:scale-105 disabled:opacity-50 ${
                  autoSignEnabled ? 'text-[#00ff87]' : 'text-white/50'
                }`}
                title={autoSignEnabled ? 'Session key active — trades sign automatically' : 'Enable session key for one-click trading'}
              >
                <div className={`w-2 h-2 rounded-full transition-colors ${
                  autoSignEnabled
                    ? 'bg-[#00ff87] shadow-[0_0_6px_rgba(0,255,135,0.6)] animate-pulse'
                    : 'bg-white/30'
                }`} />
                <span>{autoSignLoading ? 'Loading...' : autoSignEnabled ? 'Auto-Sign Active' : 'Auto-Sign Off'}</span>
              </button>
            </div>
          )}
          <div className="flex mb-8 liquid-glass-strong rounded-full p-1 relative">
            <div
              className="absolute inset-y-1 w-[calc(50%-4px)] bg-[#00ff87] rounded-full transition-transform duration-300 ease-out"
              style={{ transform: isBuyMode ? 'translateX(4px)' : 'translateX(calc(100% + 4px))' }}
            />
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={(e: React.MouseEvent) => {
                e.preventDefault()
                setIsBuyMode(true)
              }}
              className={`relative z-10 flex-1 py-2.5 rounded-full text-sm font-body font-medium transition-colors ${isBuyMode ? 'text-black' : 'text-white/60 hover:text-white'
                }`}
            >
              Buy
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={(e: React.MouseEvent) => {
                e.preventDefault()
                setIsBuyMode(false)
              }}
              className={`relative z-10 flex-1 py-2.5 rounded-full text-sm font-body font-medium transition-colors ${!isBuyMode ? 'text-black' : 'text-white/60 hover:text-white'
                }`}
            >
              Sell
            </motion.button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="liquid-glass rounded-2xl p-4 transition-colors focus-within:bg-white/5">
              <label className="block text-white/40 font-body text-xs uppercase tracking-widest mb-2">
                Limit Price (SYLD per USDC)
              </label>
              <input
                type="number"
                step="0.001"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent outline-none font-heading italic text-white text-3xl placeholder-white/20"
              />
            </div>

            <div className="liquid-glass rounded-2xl p-4 transition-colors focus-within:bg-white/5">
              <label className="block text-white/40 font-body text-xs uppercase tracking-widest mb-2">
                Amount (USDC)
              </label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent outline-none font-heading italic text-white text-3xl placeholder-white/20"
              />
              <div className="mt-2 flex justify-between text-white/40 text-sm">
                <span>SYLD: {quoteBalance ? parseFloat(formatEther(quoteBalance)).toFixed(2) : '0.00'}</span>
                <span>USDC: {baseBalance ? parseFloat(formatEther(baseBalance)).toFixed(2) : '0.00'}</span>
              </div>
            </div>

            <div className="liquid-glass rounded-xl px-4 py-3 flex justify-between items-center">
              <span className="text-white/40 font-body text-sm">
                {isBuyMode ? 'You pay' : 'You receive'}
              </span>
              <span className="font-heading italic text-[#00ff87] text-xl">
                {computedCost} SYLD
              </span>
            </div>

            {validationError && (
              <div className="liquid-glass rounded-xl px-4 py-2.5 border border-red-500/20">
                <p className="text-red-400 font-body text-xs">{validationError}</p>
              </div>
            )}

            <motion.button
              type="submit"
              whileTap={{ scale: 0.98 }}
              disabled={!canSubmit}
              className="w-full liquid-glass-teal rounded-2xl py-4 font-body font-medium text-white text-base transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              {buyOrder.isPending || sellOrder.isPending
                ? 'Confirming...'
                : isBuyMode
                  ? 'Place Buy Order'
                  : 'Place Sell Order'}
            </motion.button>
          </form>
        </div>

        {/* Right: Batch Status & Orderbook */}
        <div className="lg:col-span-2 space-y-6 flex flex-col">
          {/* Batch Status */}
          <div className="liquid-glass rounded-3xl p-6 transition-transform hover:scale-[1.01] duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading italic text-white text-2xl flex items-center gap-3">
                Batch #{batchId?.toString() || '—'}
                <div className={`liquid-glass rounded-full px-3 py-1 flex items-center gap-2 ${isSettleable ? '' : 'opacity-80'}`}>
                  <div className={`w-2 h-2 rounded-full animate-pulse ${isSettleable ? 'bg-[#00ff87]' : 'bg-amber-500'}`} />
                  <span className="font-body text-xs text-white/80 tracking-wide">
                    {isSettleable ? 'Ready to Settle' : 'Collecting Orders'}
                  </span>
                </div>
              </h2>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => settleBatchHook.settle()}
                disabled={!isSettleable || settleBatchHook.isPending}
                className="liquid-glass-teal rounded-2xl px-6 py-2.5 font-body text-sm font-medium text-white transition-all hover:scale-105 disabled:opacity-30 disabled:hover:scale-100"
              >
                {settleBatchHook.isPending ? 'Settling...' : 'Settle Batch'}
              </motion.button>
            </div>

            {/* Progress */}
            <div className="mb-6">
              <div className="flex justify-between text-white/40 font-body text-xs uppercase tracking-widest mb-2">
                <span>{blocksElapsed}/{batchWindow} blocks</span>
                <span>{Number(blocksLeft || 0) > 0 ? `${blocksLeft} blocks left` : 'Ready!'}</span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#00ff87]/40 to-[#00ff87] h-1.5 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-white/40 font-body text-xs uppercase tracking-widest block mb-1">Total Volume</span>
                <span className="font-heading italic text-2xl text-white">
                  {totalVolume ? parseFloat(formatEther(totalVolume)).toFixed(2) : '0.00'} <span className="text-sm font-body text-white/30 not-italic">USDC</span>
                </span>
              </div>
              <div>
                <span className="text-white/40 font-body text-xs uppercase tracking-widest block mb-1">Surplus Captured</span>
                <span className="font-heading italic text-2xl text-[#00ff87]">
                  {totalMEV ? parseFloat(formatEther(totalMEV)).toFixed(2) : '0.00'} <span className="text-sm font-body text-[#00ff87]/50 not-italic">SYLD</span>
                </span>
              </div>
            </div>
          </div>

          {/* Order Book */}
          <div className="liquid-glass rounded-3xl p-6 flex-1 transition-transform hover:scale-[1.01] duration-300">
            <h3 className="font-heading italic text-white text-2xl mb-6">Order Book</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Buy Orders */}
              <div>
                <h4 className="font-body text-[#00ff87] text-xs uppercase tracking-widest mb-4">Buy Orders ({buyOrders.length})</h4>
                <div className="space-y-1">
                  {buyOrders.length === 0 ? (
                    <div className="text-white/30 font-body text-sm py-4 text-center">No buy orders</div>
                  ) : (
                    buyOrders.map((o: any, i: number) => (
                      <div key={i} className="liquid-glass rounded-xl px-4 py-2.5 flex justify-between items-center group hover:bg-white/5 transition-colors">
                        <span className="font-heading italic text-[#00ff87] text-lg">
                          {parseFloat(formatEther(o.limitPrice)).toFixed(4)}
                        </span>
                        <div className="text-right">
                          <span className="font-body text-white/80 text-sm block">
                            {parseFloat(formatEther(o.amount)).toFixed(2)} Vol
                          </span>
                          <span className="font-body text-white/30 text-xs">
                            {shortenAddress(o.trader)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Sell Orders */}
              <div>
                <h4 className="font-body text-coral-400 text-[#ff6b6b] text-xs uppercase tracking-widest mb-4">Sell Orders ({sellOrders.length})</h4>
                <div className="space-y-1">
                  {sellOrders.length === 0 ? (
                    <div className="text-white/30 font-body text-sm py-4 text-center">No sell orders</div>
                  ) : (
                    sellOrders.map((o: any, i: number) => (
                      <div key={i} className="liquid-glass rounded-xl px-4 py-2.5 flex justify-between items-center group hover:bg-white/5 transition-colors">
                        <span className="font-heading italic text-[#ff6b6b] text-lg">
                          {parseFloat(formatEther(o.limitPrice)).toFixed(4)}
                        </span>
                        <div className="text-right">
                          <span className="font-body text-white/80 text-sm block">
                            {parseFloat(formatEther(o.amount)).toFixed(2)} Vol
                          </span>
                          <span className="font-body text-white/30 text-xs">
                            {shortenAddress(o.trader)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bridge CTA — Interwoven Bridge integration */}
      <div className="mt-6 liquid-glass rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 transition-transform hover:scale-[1.01] duration-300">
        <div className="flex-1">
          <h3 className="font-heading italic text-white text-xl mb-1">Need tokens from another chain?</h3>
          <p className="font-body text-white/40 text-sm">
            Bridge assets from Initia L1 or other rollups directly via the Interwoven Bridge — no external tools needed.
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={() => openBridge?.({ srcChainId: 'initiation-2', srcDenom: 'uinit' })}
            className="liquid-glass-teal rounded-2xl px-6 py-3 font-body text-sm font-medium text-white hover:scale-105 transition-transform flex items-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17L17 7" /><path d="M7 7h10v10" />
            </svg>
            Bridge to SocialYield
          </button>
          <button
            onClick={() => openBridge?.({ dstChainId: 'initiation-2', dstDenom: 'uinit' })}
            className="liquid-glass rounded-2xl px-6 py-3 font-body text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 7L7 17" /><path d="M17 17H7V7" />
            </svg>
            Bridge Out
          </button>
        </div>
      </div>

      {/* Transaction Status Toasts */}
      {(buyOrder.isPending || buyOrder.isConfirming || buyOrder.isSuccess || buyOrder.error) && (
        <TransactionStatus
          hash={buyOrder.hash}
          isPending={buyOrder.isPending}
          isConfirming={buyOrder.isConfirming}
          isSuccess={buyOrder.isSuccess}
          error={buyOrder.error}
          label="Buy Order"
        />
      )}
      {(sellOrder.isPending || sellOrder.isConfirming || sellOrder.isSuccess || sellOrder.error) && (
        <TransactionStatus
          hash={sellOrder.hash}
          isPending={sellOrder.isPending}
          isConfirming={sellOrder.isConfirming}
          isSuccess={sellOrder.isSuccess}
          error={sellOrder.error}
          label="Sell Order"
        />
      )}
      {(settleBatchHook.isPending || settleBatchHook.isConfirming || settleBatchHook.isSuccess || settleBatchHook.error) && (
        <TransactionStatus
          hash={settleBatchHook.hash}
          isPending={settleBatchHook.isPending}
          isConfirming={settleBatchHook.isConfirming}
          isSuccess={settleBatchHook.isSuccess}
          error={settleBatchHook.error}
          label="Batch Settlement"
        />
      )}
    </motion.div>
  )
}
