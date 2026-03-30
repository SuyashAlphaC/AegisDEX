'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { shortenAddress } from '@/hooks/useInitiaUsernames'
import logo from '../public/socialyield.png'
import { Menu, X, ArrowLeftRight } from 'lucide-react'

const NAV_LINKS = [
  { name: 'Trade', path: '/trade' },
  { name: 'Earn', path: '/earn' },
  { name: 'Dashboard', path: '/dashboard' },
]

export default function Navbar() {
  const pathname = usePathname()
  const { initiaAddress, username, openConnect, openWallet, openBridge } = useInterwovenKit()
  const [mobileOpen, setMobileOpen] = useState(false)

  const displayName = username || (initiaAddress ? shortenAddress(initiaAddress) : '')

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 w-full max-w-7xl px-4 z-50">
      <div className="flex items-center justify-between">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <Image 
            src={logo} 
            alt="SocialYield Logo" 
            width={28} 
            height={28} 
            className="rounded" 
            priority
          />
          <span className="font-heading italic text-white text-xl tracking-tight">SocialYield</span>
        </Link>

        {/* Center: Nav Links (desktop) */}
        <div className="hidden md:flex items-center justify-center liquid-glass rounded-full px-2 py-1.5">
          {NAV_LINKS.map((link) => {
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

        {/* Right: Actions (desktop) */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          {initiaAddress ? (
            <>
              <button 
                onClick={() => openBridge?.({ srcChainId: 'initiation-2', srcDenom: 'uinit' })}
                className="liquid-glass rounded-full px-4 py-2 text-sm font-body text-white hover:bg-white/5 transition-colors flex items-center gap-2"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-white/60" />
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

        {/* Mobile: Hamburger button */}
        <button 
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden liquid-glass rounded-full p-2 text-white transition-colors hover:bg-white/5"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div 
          className="md:hidden mt-3 liquid-glass-strong rounded-2xl p-4 space-y-2 animate-fade-in"
          style={{ animation: 'fadeSlideDown 0.2s ease-out forwards' }}
        >
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.path
            return (
              <Link 
                key={link.name} 
                href={link.path}
                onClick={() => setMobileOpen(false)}
                className={`block rounded-xl px-4 py-3 text-sm font-body transition-colors ${
                  isActive 
                    ? 'bg-white/10 text-white' 
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.name}
              </Link>
            )
          })}

          <div className="border-t border-white/10 pt-3 mt-3 space-y-2">
            {initiaAddress ? (
              <>
                <button 
                  onClick={() => {
                    openBridge?.({ srcChainId: 'initiation-2', srcDenom: 'uinit' })
                    setMobileOpen(false)
                  }}
                  className="w-full liquid-glass rounded-xl px-4 py-3 text-sm font-body text-white hover:bg-white/5 transition-colors flex items-center gap-2"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-white/60" />
                  Bridge Assets
                </button>
                <button 
                  onClick={() => {
                    openWallet?.()
                    setMobileOpen(false)
                  }}
                  className="w-full liquid-glass-teal rounded-xl px-4 py-3 text-sm font-body text-[#00ff87] transition-colors"
                >
                  {displayName}
                </button>
              </>
            ) : (
              <button 
                onClick={() => {
                  openConnect?.()
                  setMobileOpen(false)
                }}
                className="w-full bg-[#00ff87] text-black rounded-xl px-4 py-3 text-sm font-body font-medium"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </nav>
  )
}
