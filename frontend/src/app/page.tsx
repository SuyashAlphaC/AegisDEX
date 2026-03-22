'use client'

import Link from 'next/link'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { useTotalVolume, useTotalMEVCaptured } from '@/hooks/useBatchDEX'
import { useActiveHolderCount } from '@/hooks/useYieldRegistry'
import { formatEther } from 'viem'
import { ArrowRight, Shield, Zap, Users, TrendingUp } from 'lucide-react'

export default function HomePage() {
  const { openConnect, initiaAddress } = useInterwovenKit()
  const { data: totalVolume } = useTotalVolume()
  const { data: totalMEV } = useTotalMEVCaptured()
  const { data: holderCount } = useActiveHolderCount()

  const formatBigInt = (v: bigint | undefined) => {
    if (!v) return '0.00'
    const num = parseFloat(formatEther(v))
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`
    if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`
    return num.toFixed(2)
  }

  return (
    <div className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-teal-500/5 blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-teal-600/5 blur-[100px]" />
      </div>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 pt-20 pb-32 text-center">
        <div className="animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-teal-500/20 bg-teal-500/5 text-teal-400 text-xs font-medium mb-8">
            <Zap className="w-3.5 h-3.5" />
            Built on Initia — DeFi Track
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6">
            Turn your{' '}
            <span className="gradient-text">.init name</span>
            <br />
            into yield
          </h1>

          <p className="text-lg md:text-xl text-dark-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            SocialYield is a batch-auction DEX where{' '}
            <span className="text-teal-400 font-semibold">100% of MEV</span>{' '}
            goes to .init name holders. No front-running. No sandwich attacks.
            Just fair trades and passive income.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            {initiaAddress ? (
              <Link href="/trade" className="btn-primary text-base px-8 py-3 flex items-center gap-2">
                Go to App <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <button
                onClick={() => openConnect?.()}
                className="btn-primary text-base px-8 py-3 flex items-center gap-2"
              >
                Connect Wallet <ArrowRight className="w-4 h-4" />
              </button>
            )}
            <Link href="/dashboard" className="btn-secondary text-base px-8 py-3">
              View Dashboard
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="stat-card text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-teal-400" />
                <span className="text-xs text-dark-500 uppercase tracking-wider font-medium">
                  Total Volume
                </span>
              </div>
              <p className="text-3xl font-bold gradient-text">
                {formatBigInt(totalVolume)} USDC
              </p>
            </div>

            <div className="stat-card text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-teal-400" />
                <span className="text-xs text-dark-500 uppercase tracking-wider font-medium">
                  MEV Captured
                </span>
              </div>
              <p className="text-3xl font-bold gradient-text">
                {formatBigInt(totalMEV)} SYLD
              </p>
            </div>

            <div className="stat-card text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Users className="w-4 h-4 text-teal-400" />
                <span className="text-xs text-dark-500 uppercase tracking-wider font-medium">
                  Active Holders
                </span>
              </div>
              <p className="text-3xl font-bold gradient-text">
                {holderCount?.toString() || '0'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-6xl mx-auto px-4 pb-32">
        <h2 className="text-3xl font-bold text-center mb-16 gradient-text">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: '01',
              title: 'Batch Orders',
              desc: 'All buy and sell orders are collected into a batch over a 10-block window. No order has positional advantage.',
              icon: ArrowRight,
            },
            {
              step: '02',
              title: 'Uniform Clearing',
              desc: 'A single clearing price is computed at the intersection of demand and supply curves. Everyone gets the same fair price.',
              icon: Shield,
            },
            {
              step: '03',
              title: 'MEV → Yield',
              desc: 'The surplus between limit prices and clearing price is captured as MEV and redistributed to .init name holders every epoch.',
              icon: Zap,
            },
          ].map(({ step, title, desc, icon: Icon }) => (
            <div key={step} className="glass-card glass-card-hover p-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-teal-500 font-mono text-sm font-bold">{step}</span>
                <Icon className="w-5 h-5 text-teal-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-dark-100">{title}</h3>
              <p className="text-dark-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 pb-32 text-center">
        <div className="glass-card p-12">
          <h2 className="text-3xl font-bold mb-4 gradient-text">
            Own a .init name? Start earning now.
          </h2>
          <p className="text-dark-400 mb-8 max-w-lg mx-auto">
            Register your .init name on the Earn page and start receiving your share
            of MEV yield every epoch. No staking, no lockup, no minimum.
          </p>
          <Link href="/earn" className="btn-primary text-base px-8 py-3 inline-flex items-center gap-2">
            Start Earning <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
