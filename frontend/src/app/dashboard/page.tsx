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
import { Activity } from 'lucide-react'

interface FeedItem {
  id: string
  type: 'batch' | 'claim' | 'register'
  message: string
  timestamp: number
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

  // Mock activity feed
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])

  useEffect(() => {
    const items: FeedItem[] = []
    if (batchId && batchId > BigInt(1)) {
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
    <div className="max-w-7xl mx-auto px-4 py-8 mt-12 animate-fade-in">
      <h1 className="font-heading italic text-5xl text-white mb-8 tracking-tight">Dashboard</h1>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="liquid-glass rounded-3xl p-6 transition-transform hover:scale-[1.02] duration-300">
          <span className="text-white/40 font-body text-xs uppercase tracking-widest block mb-4">Total Volume</span>
          <p className="font-heading italic text-4xl text-white mb-1">
            {fmt(totalVolume)} <span className="text-lg font-body text-white/50 not-italic">USDC</span>
          </p>
          <p className="text-white/30 font-body text-sm mt-2">Cumulative traded</p>
        </div>

        <div className="liquid-glass rounded-3xl p-6 transition-transform hover:scale-[1.02] duration-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#00ff87]/5 rounded-full blur-2xl -mr-10 -mt-10" />
          <span className="text-white/40 font-body text-xs uppercase tracking-widest block mb-4 relative z-10">MEV Captured</span>
          <p className="font-heading italic text-4xl text-[#00ff87] mb-1 relative z-10">
            {fmt(totalMEV)} <span className="text-lg font-body text-[#00ff87]/50 not-italic">SYLD</span>
          </p>
          <p className="text-[#00ff87]/30 font-body text-sm mt-2 relative z-10">Total protocol surplus</p>
        </div>

        <div className="liquid-glass rounded-3xl p-6 transition-transform hover:scale-[1.02] duration-300">
          <span className="text-white/40 font-body text-xs uppercase tracking-widest block mb-4">Distributed</span>
          <p className="font-heading italic text-4xl text-white mb-1">
            {fmt(totalToHolders as bigint | undefined)} <span className="text-lg font-body text-white/50 not-italic">SYLD</span>
          </p>
          <p className="text-white/30 font-body text-sm mt-2">Sent to holders (60%)</p>
        </div>

        <div className="liquid-glass rounded-3xl p-6 transition-transform hover:scale-[1.02] duration-300">
          <span className="text-white/40 font-body text-xs uppercase tracking-widest block mb-4">Current Epoch</span>
          <p className="font-heading italic text-4xl text-white mb-1">
            {fmt(epochDeposits)} <span className="text-lg font-body text-white/50 not-italic">SYLD</span>
          </p>
          <p className="text-white/30 font-body text-sm mt-2">{holderCount?.toString() || '0'} active holders</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: SVG Flow Diagram */}
        <div className="lg:col-span-2 liquid-glass rounded-3xl p-8 flex flex-col justify-center transition-transform hover:scale-[1.01] duration-300 min-h-[400px]">
          <h2 className="font-heading italic text-white text-3xl mb-8">Revenue Flow</h2>
          
          <div className="relative w-full overflow-x-auto">
            <svg viewBox="0 0 800 280" className="w-full h-auto min-w-[600px]">
              <defs>
                <linearGradient id="tealGradDark" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgba(0, 255, 135, 0.15)" />
                  <stop offset="100%" stopColor="rgba(0, 255, 135, 0.02)" />
                </linearGradient>
                <linearGradient id="arrowTeal" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(0, 255, 135, 0.5)" />
                  <stop offset="100%" stopColor="rgba(0, 255, 135, 1)" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* BatchDEX */}
              <rect x="20" y="100" width="160" height="80" rx="16" fill="url(#tealGradDark)" stroke="#00ff87" strokeWidth="1" strokeOpacity="0.5" />
              <text x="100" y="135" textAnchor="middle" fill="#fff" fontFamily="Instrument Serif" fontStyle="italic" fontSize="22">BatchDEX</text>
              <text x="100" y="155" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontFamily="Barlow" fontSize="12" letterSpacing="1">BATCH AUCTION</text>

              {/* Arrow to Router */}
              <line x1="180" y1="140" x2="280" y2="140" stroke="url(#arrowTeal)" strokeWidth="2" strokeDasharray="4 4" className="animate-[dash_20s_linear_infinite]" />
              <polygon points="280,135 290,140 280,145" fill="#00ff87" />
              <text x="235" y="125" textAnchor="middle" fill="#00ff87" fontFamily="Barlow" fontSize="11" letterSpacing="1" opacity="0.8">MEV SURPLUS</text>

              {/* Revenue Router */}
              <rect x="300" y="100" width="160" height="80" rx="16" fill="url(#tealGradDark)" stroke="#00ff87" strokeWidth="1" strokeOpacity="0.5" />
              <text x="380" y="135" textAnchor="middle" fill="#fff" fontFamily="Instrument Serif" fontStyle="italic" fontSize="22">Router</text>
              <text x="380" y="155" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontFamily="Barlow" fontSize="12" letterSpacing="1">DISTRIBUTION</text>

              {/* 60% Yield */}
              <path d="M 460 120 C 500 120, 520 60, 580 60" fill="none" stroke="#00ff87" strokeWidth="2" />
              <polygon points="575,55 585,60 575,65" fill="#00ff87" />
              <rect x="490" y="65" width="40" height="20" rx="4" fill="#00ff87" opacity="0.1" />
              <text x="510" y="79" textAnchor="middle" fill="#00ff87" fontFamily="Barlow" fontWeight="bold" fontSize="12">60%</text>

              <rect x="585" y="30" width="180" height="60" rx="12" fill="rgba(0,255,135,0.05)" stroke="#00ff87" strokeWidth="1" />
              <text x="675" y="55" textAnchor="middle" fill="#fff" fontFamily="Instrument Serif" fontStyle="italic" fontSize="20">.init Holders</text>
              <text x="675" y="70" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontFamily="Barlow" fontSize="10" letterSpacing="1">YIELD REGISTRY</text>

              {/* 30% DAO */}
              <path d="M 460 140 L 580 140" fill="none" stroke="#eab308" strokeWidth="2" />
              <polygon points="575,135 585,140 575,145" fill="#eab308" />
              <rect x="490" y="120" width="40" height="20" rx="4" fill="#eab308" opacity="0.1" />
              <text x="510" y="134" textAnchor="middle" fill="#eab308" fontFamily="Barlow" fontWeight="bold" fontSize="12">30%</text>

              <rect x="585" y="110" width="180" height="60" rx="12" fill="rgba(234,179,8,0.05)" stroke="#eab308" strokeWidth="1" />
              <text x="675" y="135" textAnchor="middle" fill="#fff" fontFamily="Instrument Serif" fontStyle="italic" fontSize="20">DAO Treasury</text>
              <text x="675" y="150" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontFamily="Barlow" fontSize="10" letterSpacing="1">GOVERNANCE</text>

              {/* 10% Dev */}
              <path d="M 460 160 C 500 160, 520 220, 580 220" fill="none" stroke="#a855f7" strokeWidth="2" />
              <polygon points="575,215 585,220 575,225" fill="#a855f7" />
              <rect x="490" y="195" width="40" height="20" rx="4" fill="#a855f7" opacity="0.1" />
              <text x="510" y="209" textAnchor="middle" fill="#a855f7" fontFamily="Barlow" fontWeight="bold" fontSize="12">10%</text>

              <rect x="585" y="190" width="180" height="60" rx="12" fill="rgba(168,85,247,0.05)" stroke="#a855f7" strokeWidth="1" />
              <text x="675" y="215" textAnchor="middle" fill="#fff" fontFamily="Instrument Serif" fontStyle="italic" fontSize="20">Dev Fund</text>
              <text x="675" y="230" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontFamily="Barlow" fontSize="10" letterSpacing="1">DEVELOPMENT</text>
            </svg>
          </div>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes dash {
              to { stroke-dashoffset: -200; }
            }
          `}} />
        </div>

        {/* Right: Live Feed */}
        <div className="liquid-glass rounded-3xl p-6 transition-transform hover:scale-[1.01] duration-300">
          <h2 className="font-heading italic text-white text-3xl mb-6">Live Feed</h2>
          <div className="space-y-3">
            {feedItems.length === 0 ? (
              <div className="text-center py-12 text-white/30 font-body">
                <Activity className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p>No activity yet.</p>
                <p className="text-sm mt-1">Place orders to see events here.</p>
              </div>
            ) : (
              feedItems.map((item) => (
                <div key={item.id} className="liquid-glass rounded-xl p-4 flex items-start gap-4 hover:bg-white/5 transition-colors">
                  <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 animate-pulse ${
                    item.type === 'batch' ? 'bg-[#00ff87] shadow-[0_0_8px_rgba(0,255,135,0.6)]' : 'bg-white'
                  }`} />
                  <div>
                    <p className="text-white font-body text-sm mb-1">{item.message}</p>
                    <p className="text-white/30 font-body text-xs">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
