'use client'

import { useState, useEffect } from 'react'
import { formatEther } from 'viem'
import {
  useTotalVolume,
  useTotalMEVCaptured,
  useCurrentBatch,
  useBatchInfo,
} from '@/hooks/useBatchDEX'
import {
  useActiveHolderCount,
  useCurrentEpoch,
  useEpochDeposits,
} from '@/hooks/useYieldRegistry'
import { CONTRACTS, REVENUE_ROUTER_ABI } from '@/lib/contracts'
import { useReadContract } from 'wagmi'
import {
  TrendingUp,
  Shield,
  Users,
  Coins,
  Activity,
  ArrowRight,
} from 'lucide-react'

// ─── Activity Feed Item ─────────────────────────────────────────────────

interface FeedItem {
  id: string
  type: 'batch' | 'claim' | 'register'
  message: string
  timestamp: number
  value?: string
}

export default function DashboardPage() {
  // Live data
  const { data: totalVolume } = useTotalVolume()
  const { data: totalMEV } = useTotalMEVCaptured()
  const { data: holderCount } = useActiveHolderCount()
  const { data: currentEpoch } = useCurrentEpoch()
  const { data: epochDeposits } = useEpochDeposits()
  const { batchId } = useCurrentBatch()
  const { data: totalToHolders } = useReadContract({
    address: CONTRACTS.revenueRouter,
    abi: REVENUE_ROUTER_ABI,
    functionName: 'totalToHolders',
    query: { refetchInterval: 10000 },
  })

  // Mock activity feed (would use event logs in production)
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])

  useEffect(() => {
    // Simulate live feed updates
    const items: FeedItem[] = []
    if (batchId && batchId > 1n) {
      for (let i = Number(batchId) - 1; i >= Math.max(1, Number(batchId) - 5); i--) {
        items.push({
          id: `batch-${i}`,
          type: 'batch',
          message: `Batch #${i} settled`,
          timestamp: Date.now() - (Number(batchId) - i) * 60000,
        })
      }
    }
    setFeedItems(items)
  }, [batchId])

  const fmt = (v: bigint | undefined) => {
    if (!v) return '0.00'
    return parseFloat(formatEther(v)).toFixed(2)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 gradient-text">Dashboard</h1>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-teal-400" />
            </div>
            <span className="text-xs text-dark-500 uppercase tracking-wider">Total Volume</span>
          </div>
          <p className="text-2xl font-bold text-dark-100 font-mono">{fmt(totalVolume)}</p>
          <p className="text-xs text-dark-500 mt-1">USDC traded</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-yellow-400" />
            </div>
            <span className="text-xs text-dark-500 uppercase tracking-wider">MEV Captured</span>
          </div>
          <p className="text-2xl font-bold text-dark-100 font-mono">{fmt(totalMEV)}</p>
          <p className="text-xs text-dark-500 mt-1">SYLD from surplus</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Coins className="w-4 h-4 text-green-400" />
            </div>
            <span className="text-xs text-dark-500 uppercase tracking-wider">Distributed</span>
          </div>
          <p className="text-2xl font-bold text-dark-100 font-mono">{fmt(totalToHolders)}</p>
          <p className="text-xs text-dark-500 mt-1">SYLD to holders (60%)</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-purple-400" />
            </div>
            <span className="text-xs text-dark-500 uppercase tracking-wider">Epoch {currentEpoch?.toString()}</span>
          </div>
          <p className="text-2xl font-bold text-dark-100 font-mono">{fmt(epochDeposits)}</p>
          <p className="text-xs text-dark-500 mt-1">SYLD this epoch | {holderCount?.toString() || '0'} holders</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Revenue Flow Diagram */}
        <div className="lg:col-span-2 glass-card p-6">
          <h2 className="text-lg font-semibold mb-6 text-dark-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-400" />
            Revenue Flow
          </h2>

          <div className="relative">
            {/* SVG Flow Diagram */}
            <svg viewBox="0 0 800 240" className="w-full h-auto">
              {/* Background */}
              <defs>
                <linearGradient id="tealGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.05" />
                </linearGradient>
                <linearGradient id="arrowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#14b8a6" />
                  <stop offset="100%" stopColor="#2dd4bf" />
                </linearGradient>
              </defs>

              {/* BatchDEX Box */}
              <rect x="20" y="80" width="160" height="80" rx="12" fill="url(#tealGrad)" stroke="#14b8a6" strokeWidth="1.5" />
              <text x="100" y="112" textAnchor="middle" fill="#14b8a6" fontSize="14" fontWeight="bold">BatchDEX</text>
              <text x="100" y="132" textAnchor="middle" fill="#64748b" fontSize="11">Batch Auction</text>

              {/* Arrow 1 */}
              <line x1="180" y1="120" x2="270" y2="120" stroke="url(#arrowGrad)" strokeWidth="2" />
              <polygon points="270,115 280,120 270,125" fill="#14b8a6" />
              <text x="225" y="108" textAnchor="middle" fill="#94a3b8" fontSize="10">MEV Surplus</text>

              {/* RevenueRouter Box */}
              <rect x="280" y="80" width="160" height="80" rx="12" fill="url(#tealGrad)" stroke="#14b8a6" strokeWidth="1.5" />
              <text x="360" y="112" textAnchor="middle" fill="#14b8a6" fontSize="14" fontWeight="bold">Revenue</text>
              <text x="360" y="132" textAnchor="middle" fill="#64748b" fontSize="11">Router</text>

              {/* Arrow to YieldRegistry (60%) */}
              <line x1="440" y1="100" x2="540" y2="40" stroke="#22c55e" strokeWidth="2" />
              <polygon points="535,35 545,38 537,45" fill="#22c55e" />
              <text x="490" y="60" textAnchor="middle" fill="#22c55e" fontSize="11" fontWeight="bold">60%</text>

              {/* YieldRegistry Box */}
              <rect x="540" y="10" width="160" height="60" rx="12" fill="rgba(34,197,94,0.1)" stroke="#22c55e" strokeWidth="1.5" />
              <text x="620" y="35" textAnchor="middle" fill="#22c55e" fontSize="13" fontWeight="bold">.init Holders</text>
              <text x="620" y="52" textAnchor="middle" fill="#64748b" fontSize="10">YieldRegistry</text>

              {/* Arrow to DAO (30%) */}
              <line x1="440" y1="120" x2="540" y2="120" stroke="#eab308" strokeWidth="2" />
              <polygon points="540,115 550,120 540,125" fill="#eab308" />
              <text x="490" y="112" textAnchor="middle" fill="#eab308" fontSize="11" fontWeight="bold">30%</text>

              {/* DAO Box */}
              <rect x="550" y="90" width="140" height="60" rx="12" fill="rgba(234,179,8,0.1)" stroke="#eab308" strokeWidth="1.5" />
              <text x="620" y="118" textAnchor="middle" fill="#eab308" fontSize="13" fontWeight="bold">DAO Treasury</text>
              <text x="620" y="135" textAnchor="middle" fill="#64748b" fontSize="10">Governance</text>

              {/* Arrow to Dev (10%) */}
              <line x1="440" y1="140" x2="540" y2="200" stroke="#a855f7" strokeWidth="2" />
              <polygon points="535,195 545,198 537,205" fill="#a855f7" />
              <text x="490" y="180" textAnchor="middle" fill="#a855f7" fontSize="11" fontWeight="bold">10%</text>

              {/* Dev Box */}
              <rect x="540" y="170" width="140" height="60" rx="12" fill="rgba(168,85,247,0.1)" stroke="#a855f7" strokeWidth="1.5" />
              <text x="610" y="198" textAnchor="middle" fill="#a855f7" fontSize="13" fontWeight="bold">Dev Fund</text>
              <text x="610" y="215" textAnchor="middle" fill="#64748b" fontSize="10">Development</text>
            </svg>
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-4 text-dark-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-400" />
            Live Feed
          </h2>

          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {feedItems.length === 0 ? (
              <div className="text-center py-8 text-dark-500 text-sm">
                <Activity className="w-8 h-8 mx-auto mb-2 text-dark-600" />
                <p>No activity yet.</p>
                <p className="text-xs mt-1">Place orders and settle batches to see events here.</p>
              </div>
            ) : (
              feedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-dark-900/40 border border-dark-700/20 hover:border-teal-500/20 transition-all"
                >
                  <div
                    className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      item.type === 'batch'
                        ? 'bg-teal-400'
                        : item.type === 'claim'
                        ? 'bg-green-400'
                        : 'bg-purple-400'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-dark-200">{item.message}</p>
                    <p className="text-xs text-dark-600 mt-0.5">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Protocol Summary */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4 text-dark-100">Protocol Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Current Batch</p>
            <p className="text-lg font-bold font-mono text-dark-200">#{batchId?.toString() || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Current Epoch</p>
            <p className="text-lg font-bold font-mono text-dark-200">{currentEpoch?.toString() || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Holder Split</p>
            <p className="text-lg font-bold font-mono text-green-400">60%</p>
          </div>
          <div>
            <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Batch Window</p>
            <p className="text-lg font-bold font-mono text-dark-200">10 blocks</p>
          </div>
        </div>
      </div>
    </div>
  )
}
