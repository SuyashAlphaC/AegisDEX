'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { shortenAddress } from '@/hooks/useInitiaUsernames'
import { Waves, ArrowLeftRight, Coins, LayoutDashboard, Wallet } from 'lucide-react'

const navLinks = [
  { href: '/trade', label: 'Trade', icon: ArrowLeftRight },
  { href: '/earn', label: 'Earn', icon: Coins },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
]

export default function Navbar() {
  const pathname = usePathname()
  const { initiaAddress, username, openConnect, openWallet, openBridge } = useInterwovenKit()

  const displayName = username || (initiaAddress ? shortenAddress(initiaAddress) : '')

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-dark-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-teal-500/20 transition-all">
              <Waves className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold gradient-text">SocialYield</span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                      : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              )
            })}
          </div>

          {/* Wallet Section */}
          <div className="flex items-center gap-2">
            {initiaAddress ? (
              <>
                <button
                  onClick={() => openBridge?.({ srcChainId: 'initiation-2', srcDenom: 'uinit' })}
                  className="btn-secondary text-xs px-3 py-2 hidden sm:block"
                >
                  Bridge
                </button>
                <button
                  onClick={() => openWallet?.()}
                  className="flex items-center gap-2 btn-secondary text-xs px-3 py-2"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span className="gradient-text font-semibold">{displayName}</span>
                </button>
              </>
            ) : (
              <button onClick={() => openConnect?.()} className="btn-primary text-sm px-4 py-2">
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <div className="md:hidden border-t border-dark-700/50 px-4 py-2 flex gap-1">
        {navLinks.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-teal-500/10 text-teal-400'
                  : 'text-dark-400 hover:text-dark-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
