'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { shortenAddress } from '@/hooks/useInitiaUsernames'

export default function Navbar() {
  const pathname = usePathname()
  const { initiaAddress, username, openConnect, openWallet, openBridge } = useInterwovenKit()

  const displayName = username || (initiaAddress ? shortenAddress(initiaAddress) : '')

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 w-full max-w-7xl px-4 z-50">
      <div className="flex items-center justify-between">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#00ff87]">
            <path d="M2 12C2 12 5 4 12 4C19 4 22 12 22 12C22 12 19 20 12 20C5 20 2 12 2 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <span className="font-heading italic text-white text-xl tracking-tight">SocialYield</span>
        </Link>

        {/* Center: Nav Links */}
        <div className="hidden md:flex items-center justify-center liquid-glass rounded-full px-2 py-1.5">
          {[
            { name: 'Trade', path: '/trade' },
            { name: 'Earn', path: '/earn' },
            { name: 'Dashboard', path: '/dashboard' }
          ].map((link) => {
            const isActive = pathname === link.path
            return (
              <Link 
                key={link.name} 
                href={link.path}
                className={`rounded-full px-5 py-2 text-sm font-body transition-colors ${
                  isActive 
                    ? 'bg-white/10 text-white' 
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.name}
              </Link>
            )
          })}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {initiaAddress ? (
            <>
              <button 
                onClick={() => openBridge?.({ srcChainId: 'initiation-2', srcDenom: 'uinit' })}
                className="liquid-glass rounded-full px-4 py-2 text-sm font-body text-white hover:bg-white/5 transition-colors hidden sm:block"
              >
                Bridge
              </button>
              <button 
                onClick={() => openWallet?.()}
                className="liquid-glass-teal rounded-full px-4 py-2 text-sm font-body text-[#00ff87] hover:scale-105 transition-transform"
              >
                {displayName}
              </button>
            </>
          ) : (
            <button 
              onClick={() => openConnect?.()} 
              className="bg-[#00ff87] text-black rounded-full px-5 py-2 text-sm font-body font-medium hover:scale-105 transition-transform"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
