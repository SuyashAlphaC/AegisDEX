'use client'

import Link from 'next/link'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { useTotalVolume, useTotalMEVCaptured } from '@/hooks/useBatchDEX'
import { useActiveHolderCount } from '@/hooks/useYieldRegistry'
import { formatEther } from 'viem'
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import BlurText from '@/components/BlurText'
import CountUp from '@/components/CountUp'
import { useEffect, useState } from 'react'

export default function HomePage() {
  const { openConnect, initiaAddress } = useInterwovenKit()
  const { data: totalVolume } = useTotalVolume()
  const { data: totalMEV } = useTotalMEVCaptured()
  const { data: holderCount } = useActiveHolderCount()

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const formatBigInt = (v: bigint | undefined) => {
    if (!v) return '0.00'
    const num = parseFloat(formatEther(v))
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`
    if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`
    return num.toFixed(2)
  }

  if (!mounted) return null

  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col justify-center items-center">
      {/* Main Content */}
      <div className="relative z-10 text-center px-4 flex flex-col items-center pt-20">
        {/* Badge */}
        <div 
          className="liquid-glass rounded-full px-4 py-1.5 flex items-center gap-2 mb-8 animate-fade-in"
          style={{ animationDelay: '0.2s', animationFillMode: 'both' }}
        >
          <div className="w-2 h-2 rounded-full bg-[#00ff87] animate-pulse" />
          <span className="text-white/80 font-body text-xs tracking-wider uppercase">Live on Initia Testnet</span>
        </div>

        {/* Heading */}
        <BlurText 
          text="Turn your .init name into yield." 
          className="text-6xl md:text-7xl lg:text-8xl font-heading italic text-white tracking-tight leading-[0.85] justify-center mb-6 max-w-4xl"
        />

        {/* Subtext */}
        <p 
          className="text-white/50 font-body font-light text-lg max-w-xl mx-auto mb-12 animate-fade-in"
          style={{ animationDelay: '0.8s', animationFillMode: 'both' }}
        >
          SocialYield is a batch-auction DEX on Initia where every trade captures MEV — and redistributes it to .init name holders every epoch.
        </p>

        {/* Live Stats Bar */}
        <div 
          className="liquid-glass rounded-2xl inline-flex flex-wrap justify-center gap-x-12 gap-y-6 px-8 py-4 mb-16 animate-fade-in"
          style={{ animationDelay: '1.1s', animationFillMode: 'both' }}
        >
          <div className="flex flex-col items-center">
            <span className="text-white/40 font-body text-xs uppercase tracking-widest mb-1">Total Volume</span>
            <CountUp value={parseFloat(formatBigInt(totalVolume))} decimals={2} className="font-heading italic text-[#00ff87] text-3xl" />
          </div>
          <div className="flex flex-col items-center">
            <span className="text-white/40 font-body text-xs uppercase tracking-widest mb-1">MEV Captured</span>
            <CountUp value={parseFloat(formatBigInt(totalMEV))} decimals={2} className="font-heading italic text-[#00ff87] text-3xl" />
          </div>
          <div className="flex flex-col items-center">
            <span className="text-white/40 font-body text-xs uppercase tracking-widest mb-1">Active Holders</span>
            <CountUp value={Number(holderCount || 0)} decimals={0} className="font-heading italic text-[#00ff87] text-3xl" />
          </div>
        </div>

        {/* CTA Buttons */}
        <div 
          className="flex flex-col sm:flex-row items-center gap-6 animate-fade-in"
          style={{ animationDelay: '1.3s', animationFillMode: 'both' }}
        >
          {initiaAddress ? (
            <Link 
              href="/trade" 
              className="liquid-glass-strong rounded-full px-8 py-4 border border-[#00ff87] flex items-center gap-2 text-white font-body font-medium transition-transform hover:scale-105"
            >
              Start Trading <ArrowUpRight className="w-5 h-5 text-[#00ff87]" />
            </Link>
          ) : (
            <button 
              onClick={() => openConnect?.()}
              className="liquid-glass-strong rounded-full px-8 py-4 border border-[#00ff87] flex items-center gap-2 text-white font-body font-medium transition-transform hover:scale-105"
            >
              Start Trading <ArrowUpRight className="w-5 h-5 text-[#00ff87]" />
            </button>
          )}

          <a href="#how-it-works" className="text-white/60 font-body text-sm hover:text-white transition-colors flex items-center gap-1 group">
            Learn How It Works <ChevronDown className="w-4 h-4 group-hover:translate-y-1 transition-transform" />
          </a>
        </div>
      </div>

      {/* How It Works Section (Below Fold) */}
      <section id="how-it-works" className="relative z-10 w-full max-w-7xl mx-auto px-4 py-32 mt-32 border-t border-white/5">
        <h2 className="font-heading italic text-5xl text-center text-white mb-16 tracking-tight">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: '01',
              title: 'Batch Orders',
              desc: 'All buy and sell orders are collected into a batch over a 10-block window. No order has positional advantage.',
            },
            {
              step: '02',
              title: 'Uniform Clearing',
              desc: 'A single clearing price is computed at the intersection of demand and supply curves. Everyone gets the same fair price.',
            },
            {
              step: '03',
              title: 'MEV → Yield',
              desc: 'The surplus between limit prices and clearing price is captured as MEV and redistributed to .init name holders every epoch.',
            },
          ].map(({ step, title, desc }) => (
            <div key={step} className="liquid-glass rounded-3xl p-8 transition-transform hover:scale-[1.02] duration-300">
              <span className="font-heading italic text-3xl text-[#00ff87] mb-4 block opacity-80">{step}</span>
              <h3 className="font-heading italic text-2xl text-white mb-3">{title}</h3>
              <p className="font-body text-white/50 leading-relaxed text-sm">
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}
