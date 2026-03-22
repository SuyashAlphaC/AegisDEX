'use client'

import { useState } from 'react'
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
} from '@/hooks/useBatchDEX'
import TransactionStatus from '@/components/TransactionStatus'
import { shortenAddress } from '@/hooks/useInitiaUsernames'
import { ArrowDownUp, Clock, Zap, TrendingUp } from 'lucide-react'

export default function TradePage() {
  const { initiaAddress, openConnect } = useInterwovenKit()
  const [isBuyMode, setIsBuyMode] = useState(true)
  const [limitPrice, setLimitPrice] = useState('')
  const [amount, setAmount] = useState('')

  // Read state
  const { batchId } = useCurrentBatch()
  const { data: blocksLeft } = useBlocksUntilSettlement()
  const { data: isSettleable } = useIsBatchSettleable()
  const { data: batchOrders } = useBatchOrders(batchId)
  const { data: batchInfo } = useBatchInfo(batchId)
  const { data: totalVolume } = useTotalVolume()
  const { data: totalMEV } = useTotalMEVCaptured()

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!limitPrice || !amount) return

    if (isBuyMode) {
      buyOrder.placeBuyOrder(limitPrice, amount)
    } else {
      sellOrder.placeSellOrder(limitPrice, amount)
    }
  }

  if (!initiaAddress) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl font-bold mb-4 gradient-text">Trade</h1>
        <p className="text-dark-400 mb-8">Connect your wallet to start placing orders.</p>
        <button onClick={() => openConnect?.()} className="btn-primary px-8 py-3">
          Connect Wallet
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 gradient-text">Trade</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Order Form */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-4 text-dark-100 flex items-center gap-2">
            <ArrowDownUp className="w-5 h-5 text-teal-400" />
            Place Order
          </h2>

          {/* Buy/Sell Toggle */}
          <div className="flex mb-6 bg-dark-900/50 rounded-lg p-1">
            <button
              onClick={() => setIsBuyMode(true)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                isBuyMode
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'text-dark-400 hover:text-dark-200'
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => setIsBuyMode(false)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                !isBuyMode
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'text-dark-400 hover:text-dark-200'
              }`}
            >
              Sell
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-dark-500 uppercase tracking-wider mb-1.5 font-medium">
                Limit Price (SYLD per USDC)
              </label>
              <input
                type="number"
                step="0.001"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                placeholder="0.00"
                className="input-dark"
              />
            </div>

            <div>
              <label className="block text-xs text-dark-500 uppercase tracking-wider mb-1.5 font-medium">
                Amount (USDC)
              </label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="input-dark"
              />
            </div>

            <div className="p-3 rounded-lg bg-dark-950/50 border border-dark-700/30">
              <div className="flex justify-between text-sm">
                <span className="text-dark-500">
                  {isBuyMode ? 'You pay' : 'You receive'}
                </span>
                <span className="text-dark-200 font-mono font-medium">
                  {computedCost} SYLD
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={
                !limitPrice || !amount || buyOrder.isPending || sellOrder.isPending
              }
              className={`w-full py-3 rounded-lg font-semibold text-white transition-all ${
                isBuyMode
                  ? 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 disabled:from-green-800 disabled:to-green-700'
                  : 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 disabled:from-red-800 disabled:to-red-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {buyOrder.isPending || sellOrder.isPending
                ? 'Confirming...'
                : isBuyMode
                ? 'Place Buy Order'
                : 'Place Sell Order'}
            </button>
          </form>
        </div>

        {/* Right: Batch Status */}
        <div className="lg:col-span-2 space-y-6">
          {/* Batch Header */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-dark-100 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-teal-400" />
                  Batch #{batchId?.toString() || '—'}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    isSettleable
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                      : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                  }`}
                >
                  {isSettleable ? 'Ready to Settle' : 'Collecting Orders'}
                </span>
              </div>

              <button
                onClick={() => settleBatchHook.settle()}
                disabled={!isSettleable || settleBatchHook.isPending}
                className="btn-primary text-sm px-4 py-2 disabled:opacity-30"
              >
                {settleBatchHook.isPending ? 'Settling...' : 'Settle Batch'}
              </button>
            </div>

            {/* Progress bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-dark-500 mb-1">
                <span>{blocksElapsed}/{batchWindow} blocks</span>
                <span>
                  {Number(blocksLeft || 0) > 0
                    ? `${blocksLeft} blocks left`
                    : 'Ready!'}
                </span>
              </div>
              <div className="w-full bg-dark-800 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-teal-600 to-teal-400 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="text-center p-3 rounded-lg bg-dark-950/30">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
                  <span className="text-xs text-dark-500">Total Volume</span>
                </div>
                <p className="text-lg font-bold text-dark-100 font-mono">
                  {totalVolume ? parseFloat(formatEther(totalVolume)).toFixed(2) : '0.00'} USDC
                </p>
              </div>
              <div className="text-center p-3 rounded-lg bg-dark-950/30">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Zap className="w-3.5 h-3.5 text-teal-400" />
                  <span className="text-xs text-dark-500">MEV Captured</span>
                </div>
                <p className="text-lg font-bold text-dark-100 font-mono">
                  {totalMEV ? parseFloat(formatEther(totalMEV)).toFixed(2) : '0.00'} SYLD
                </p>
              </div>
            </div>
          </div>

          {/* Order Book */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4 text-dark-100">Order Book</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Buy Orders */}
              <div>
                <h4 className="text-xs font-medium text-green-400 uppercase tracking-wider mb-2">
                  Buy Orders ({buyOrders.length})
                </h4>
                <div className="overflow-hidden rounded-lg border border-dark-700/30">
                  <table className="table-dark">
                    <thead>
                      <tr>
                        <th>Price</th>
                        <th>Amount</th>
                        <th>Trader</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buyOrders.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="text-center text-dark-500 py-6">
                            No buy orders
                          </td>
                        </tr>
                      ) : (
                        buyOrders.map((o: any, i: number) => (
                          <tr key={i}>
                            <td className="text-green-400 font-mono text-sm">
                              {parseFloat(formatEther(o.limitPrice)).toFixed(4)}
                            </td>
                            <td className="font-mono text-sm">
                              {parseFloat(formatEther(o.amount)).toFixed(2)}
                            </td>
                            <td className="text-dark-500 text-xs">
                              {shortenAddress(o.trader)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sell Orders */}
              <div>
                <h4 className="text-xs font-medium text-red-400 uppercase tracking-wider mb-2">
                  Sell Orders ({sellOrders.length})
                </h4>
                <div className="overflow-hidden rounded-lg border border-dark-700/30">
                  <table className="table-dark">
                    <thead>
                      <tr>
                        <th>Price</th>
                        <th>Amount</th>
                        <th>Trader</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sellOrders.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="text-center text-dark-500 py-6">
                            No sell orders
                          </td>
                        </tr>
                      ) : (
                        sellOrders.map((o: any, i: number) => (
                          <tr key={i}>
                            <td className="text-red-400 font-mono text-sm">
                              {parseFloat(formatEther(o.limitPrice)).toFixed(4)}
                            </td>
                            <td className="font-mono text-sm">
                              {parseFloat(formatEther(o.amount)).toFixed(2)}
                            </td>
                            <td className="text-dark-500 text-xs">
                              {shortenAddress(o.trader)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
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
    </div>
  )
}
