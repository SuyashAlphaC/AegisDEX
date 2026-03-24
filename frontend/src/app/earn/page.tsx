'use client'

import { useState } from 'react'
import { formatEther } from 'viem'
import { useAccount } from 'wagmi'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import {
  useCurrentEpoch,
  useActiveHolderCount,
  useEpochDeposits,
  useBlocksUntilNextEpoch,
  usePendingClaim,
  useHolderInfo,
  useHolderList,
  useRegister,
  useDeregister,
  useClaim,
  useFinalizeEpoch,
} from '@/hooks/useYieldRegistry'
import { useUsername, shortenAddress } from '@/hooks/useInitiaUsernames'
import TransactionStatus from '@/components/TransactionStatus'
import { ArrowUpRight } from 'lucide-react'

function HolderRow({ address, displayIndex }: { address: string; displayIndex: number }) {
  const { username, isLoading } = useUsername(address)
  const { data: holderInfo } = useHolderInfo(address as `0x${string}`)

  // If the holder info has loaded and they are not active, hide the row.
  const isLoaded = !!holderInfo
  const isActive = isLoaded ? (holderInfo as any).active : true
  
  if (isLoaded && !isActive) return null

  return (
    <div className="liquid-glass rounded-xl px-5 py-3.5 flex items-center justify-between group hover:bg-white/5 transition-colors">
      <div className="flex items-center gap-6">
        <span className="text-white/20 font-body text-sm w-6">{displayIndex}</span>
        {isLoading ? (
          <div className="w-32 h-6 bg-[#00ff87]/10 rounded animate-pulse" />
        ) : (
          <span className="font-heading italic text-[#00ff87] text-xl">
            {username || shortenAddress(address)}
          </span>
        )}
        <span className="text-white/40 font-mono text-xs hidden sm:block">{shortenAddress(address)}</span>
      </div>
      <div className="liquid-glass rounded-full px-3 py-1 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-[#00ff87] shadow-[0_0_5px_rgba(0,255,135,0.5)]" />
        <span className="font-body text-[10px] text-[#00ff87] tracking-wider uppercase">Active</span>
      </div>
    </div>
  )
}

export default function EarnPage() {
  const { address } = useAccount()
  const { initiaAddress, username: interwovenUsername, openConnect } = useInterwovenKit()

  // Yield Registry state
  const { data: currentEpoch } = useCurrentEpoch()
  const { data: holderCount } = useActiveHolderCount()
  const { data: epochDeposits } = useEpochDeposits()
  const { data: blocksUntil } = useBlocksUntilNextEpoch()
  const { data: pendingAmount } = usePendingClaim(address)
  const { data: holderInfo } = useHolderInfo(address)
  const { data: holderList } = useHolderList()

  // Username check
  const { username: fetchedName, isLoading: usernameLoading } = useUsername(initiaAddress)
  const initName = interwovenUsername || fetchedName
  const hasUsername = !!initName

  console.log('initiaAddress:', initiaAddress)
  console.log('interwovenUsername:', interwovenUsername) 
  console.log('fetchedName:', fetchedName)
  console.log('hasUsername:', hasUsername)

  // Write hooks
  const registerHook = useRegister()
  const deregisterHook = useDeregister()
  const claimHook = useClaim()
  const finalizeHook = useFinalizeEpoch()

  const isRegistered = holderInfo && (holderInfo as any).active
  const rewardPerHolder =
    holderCount && holderCount > BigInt(0) && epochDeposits
      ? epochDeposits / holderCount
      : BigInt(0)

  if (!initiaAddress) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="font-heading italic text-6xl text-white mb-6 tracking-tight">Earn</h1>
        <p className="font-body text-white/50 text-lg mb-8 max-w-md text-center">
          Connect your wallet to register your .init name and start earning passive MEV yield.
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
    <div className="max-w-7xl mx-auto px-4 py-8 mt-12 space-y-8 animate-fade-in">
      <h1 className="font-heading italic text-5xl text-white mb-2 tracking-tight">Earn Yield</h1>
      
      {/* Hero Stat Bar */}
      <div className="liquid-glass rounded-3xl p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div>
          <span className="text-white/40 font-body text-xs uppercase tracking-widest block mb-2">Epoch Rewards</span>
          <span className="font-heading italic text-3xl text-white">
            {epochDeposits ? parseFloat(formatEther(epochDeposits)).toFixed(2) : '0.00'} <span className="text-[#00ff87]/50 text-lg not-italic font-body">SYLD</span>
          </span>
        </div>
        <div>
          <span className="text-white/40 font-body text-xs uppercase tracking-widest block mb-2">Your Pending</span>
          <span className="font-heading italic text-3xl text-[#00ff87]">
            {pendingAmount ? parseFloat(formatEther(pendingAmount)).toFixed(4) : '0.00'} <span className="text-[#00ff87]/50 text-lg not-italic font-body">SYLD</span>
          </span>
        </div>
        <div>
          <span className="text-white/40 font-body text-xs uppercase tracking-widest block mb-2">Active Holders</span>
          <span className="font-heading italic text-3xl text-white">
            {holderCount?.toString() || '0'}
          </span>
        </div>
        <div>
          <span className="text-white/40 font-body text-xs uppercase tracking-widest block mb-2">
            Epoch {currentEpoch?.toString()}
          </span>
          <div className="flex items-end gap-2">
            <span className="font-heading italic text-3xl text-white">
              {blocksUntil?.toString() || '—'}
            </span>
            <span className="font-body text-white/40 mb-1.5">blocks left</span>
          </div>
        </div>
      </div>

      {/* Registration & Claim Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 liquid-glass rounded-3xl p-8">
        
        {/* Left: Registration */}
        <div className="flex flex-col justify-center lg:pr-8 lg:border-r border-white/10">
          {usernameLoading ? (
            <div className="animate-pulse">
              <div className="h-6 w-32 bg-white/10 rounded mb-4" />
              <div className="h-4 w-48 bg-white/5 rounded" />
            </div>
          ) : isRegistered ? (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#00ff87] animate-pulse shadow-[0_0_8px_rgba(0,255,135,0.6)]" />
                <span className="font-body text-xs text-[#00ff87] tracking-wider uppercase">Registered</span>
              </div>
              <div>
                <span className="text-white/40 font-body text-sm block mb-1">.init name:</span>
                <span className="font-heading italic text-[#00ff87] text-4xl block mb-2">
                  {(holderInfo as any)?.initName}
                </span>
                <span className="text-white/40 font-body text-sm">
                  Since epoch {(holderInfo as any)?.registeredEpoch?.toString()}
                </span>
              </div>
              <button
                onClick={() => deregisterHook.deregister()}
                disabled={deregisterHook.isPending}
                className="text-white/40 hover:text-[#ff6b6b] font-body text-sm transition-colors mt-4 self-start"
              >
                {deregisterHook.isPending ? 'Deregistering...' : 'Deregister'}
              </button>
            </div>
          ) : hasUsername ? (
            <div className="space-y-6">
              <div>
                <h3 className="font-heading italic text-white text-3xl mb-3">You qualify for yield.</h3>
                <p className="font-body text-white/50 leading-relaxed">
                  Your .init name <span className="text-[#00ff87]">{initName}</span> makes you eligible to earn MEV yield every epoch.
                </p>
              </div>
              <button
                onClick={() => initName && registerHook.register(initName)}
                disabled={registerHook.isPending}
                className="w-full liquid-glass-teal rounded-2xl py-4 font-body font-medium text-white transition-transform hover:scale-[1.02]"
              >
                {registerHook.isPending ? 'Registering...' : 'Register for Yield'}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="font-heading italic text-white text-3xl mb-3">Get a .init name first.</h3>
                <p className="font-body text-white/50 leading-relaxed">
                  Register a .init name on Initia to participate in yield distribution.
                </p>
              </div>
              <a
                href="https://app.testnet.initia.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full liquid-glass rounded-2xl py-4 font-body font-medium text-white transition-colors hover:bg-white/5"
              >
                Get .init Name <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>

        {/* Right: Claim Rewards */}
        <div className="flex flex-col justify-center mt-8 lg:mt-0 lg:pl-4">
          {pendingAmount && pendingAmount > BigInt(0) ? (
            <div className="space-y-6 flex flex-col items-center lg:items-start text-center lg:text-left">
              <div>
                <span className="font-heading italic text-teal-400 text-6xl block mb-2 text-[#00ff87]">
                  {parseFloat(formatEther(pendingAmount)).toFixed(4)} <span className="text-2xl not-italic font-body text-[#00ff87]/50">SYLD</span>
                </span>
                <span className="text-white/40 font-body">Available to claim</span>
              </div>
              <button
                onClick={() => claimHook.claim()}
                disabled={claimHook.isPending}
                className="w-full liquid-glass-teal rounded-2xl py-4 font-body font-medium text-white transition-transform hover:scale-[1.02] relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                {claimHook.isPending ? 'Claiming...' : 'Claim Rewards'}
              </button>
              <div className="text-white/30 font-body text-xs w-full text-center">
                Per-holder reward: {rewardPerHolder ? parseFloat(formatEther(rewardPerHolder)).toFixed(4) : '0'} SYLD this epoch
              </div>
            </div>
          ) : (
            <div className="space-y-6 flex flex-col items-center justify-center text-center h-full">
              {isRegistered ? (
                <>
                  <div className="text-white/30 font-body leading-relaxed max-w-sm mb-4">
                    No pending rewards yet. Rewards accumulate each epoch.
                  </div>
                  <button
                    onClick={() => finalizeHook.finalize()}
                    disabled={finalizeHook.isPending || (blocksUntil !== undefined && blocksUntil > BigInt(0))}
                    className="liquid-glass rounded-xl px-6 py-3 font-body text-sm text-white/60 hover:text-white transition-colors disabled:opacity-50 disabled:hover:text-white/60"
                  >
                    {finalizeHook.isPending
                      ? 'Finalizing...'
                      : `Finalize Epoch ${currentEpoch?.toString() || ''}`}
                  </button>
                  <div className="text-white/30 font-body text-xs">
                    Per-holder reward: {rewardPerHolder ? parseFloat(formatEther(rewardPerHolder)).toFixed(4) : '0'} SYLD
                  </div>
                </>
              ) : (
                <div className="text-white/30 font-body leading-relaxed max-w-sm">
                  Register your .init name to start earning.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Registered Holders Table */}
      <div className="liquid-glass rounded-3xl p-6 transition-transform hover:scale-[1.005]">
        <h2 className="font-heading italic text-white text-2xl mb-6 pl-2">Registered Holders</h2>
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scroll">
          {!holderCount || holderCount === BigInt(0) ? (
            <div className="text-center text-white/30 font-body py-8">
              No holders currently registered. Be the first!
            </div>
          ) : (
            holderList?.slice(0, 50).map((addr: string, i: number) => (
              <HolderRow key={addr} address={addr} displayIndex={i + 1} />
            ))
          )}
        </div>
      </div>

      {/* CSS for custom scrollbar and shimmer */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        .custom-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 4px;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}} />

      {/* Transaction statuses */}
      {(registerHook.isPending || registerHook.isSuccess || registerHook.error) && (
        <TransactionStatus {...registerHook} label="Registration" />
      )}
      {(claimHook.isPending || claimHook.isSuccess || claimHook.error) && (
        <TransactionStatus {...claimHook} label="Claim" />
      )}
    </div>
  )
}
