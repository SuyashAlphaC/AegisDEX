'use client'

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
import { Coins, Users, Clock, Gift, UserPlus, UserMinus, ExternalLink } from 'lucide-react'

export default function EarnPage() {
  const { address } = useAccount()
  const { initiaAddress, openConnect } = useInterwovenKit()

  // Yield Registry state
  const { data: currentEpoch } = useCurrentEpoch()
  const { data: holderCount } = useActiveHolderCount()
  const { data: epochDeposits } = useEpochDeposits()
  const { data: blocksUntil } = useBlocksUntilNextEpoch()
  const { data: pendingAmount } = usePendingClaim(address)
  const { data: holderInfo } = useHolderInfo(address)
  const { data: holderList } = useHolderList()

  // Username check
  const { username: initName, hasUsername, isLoading: usernameLoading } = useUsername(initiaAddress)

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
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl font-bold mb-4 gradient-text">Earn Yield</h1>
        <p className="text-dark-400 mb-8">
          Connect your wallet to register your .init name and start earning MEV yield.
        </p>
        <button onClick={() => openConnect?.()} className="btn-primary px-8 py-3">
          Connect Wallet
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 gradient-text">Earn Yield</h1>

      {/* Yield Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-4 h-4 text-teal-400" />
            <span className="text-xs text-dark-500 uppercase tracking-wider">Epoch Rewards</span>
          </div>
          <p className="text-2xl font-bold text-dark-100 font-mono">
            {epochDeposits ? parseFloat(formatEther(epochDeposits)).toFixed(2) : '0.00'} SYLD
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="w-4 h-4 text-teal-400" />
            <span className="text-xs text-dark-500 uppercase tracking-wider">Your Pending</span>
          </div>
          <p className="text-2xl font-bold text-green-400 font-mono">
            {pendingAmount ? parseFloat(formatEther(pendingAmount)).toFixed(4) : '0.00'} SYLD
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-teal-400" />
            <span className="text-xs text-dark-500 uppercase tracking-wider">Active Holders</span>
          </div>
          <p className="text-2xl font-bold text-dark-100">{holderCount?.toString() || '0'}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-teal-400" />
            <span className="text-xs text-dark-500 uppercase tracking-wider">Epoch {currentEpoch?.toString()}</span>
          </div>
          <p className="text-2xl font-bold text-dark-100">
            {blocksUntil?.toString() || '—'} <span className="text-sm text-dark-500">blocks left</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Registration Card */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-4 text-dark-100 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-teal-400" />
            Registration
          </h2>

          {usernameLoading ? (
            <div className="text-dark-500 text-sm">Checking .init name ownership...</div>
          ) : isRegistered ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-green-400 font-medium text-sm">Registered</span>
                </div>
                <p className="text-dark-200">
                  .init name: <span className="font-mono text-teal-400">{(holderInfo as any)?.initName}</span>
                </p>
                <p className="text-dark-500 text-sm mt-1">
                  Since epoch {(holderInfo as any)?.registeredEpoch?.toString()}
                </p>
              </div>
              <button
                onClick={() => deregisterHook.deregister()}
                disabled={deregisterHook.isPending}
                className="flex items-center gap-2 btn-secondary text-sm w-full justify-center"
              >
                <UserMinus className="w-4 h-4" />
                {deregisterHook.isPending ? 'Deregistering...' : 'Deregister'}
              </button>
            </div>
          ) : hasUsername ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-teal-500/5 border border-teal-500/20">
                <p className="text-dark-200 text-sm mb-1">Your .init name:</p>
                <p className="text-xl font-bold gradient-text">{initName}</p>
              </div>
              <button
                onClick={() => initName && registerHook.register(initName)}
                disabled={registerHook.isPending}
                className="btn-primary w-full text-sm py-3"
              >
                {registerHook.isPending ? 'Registering...' : `Register ${initName} for Yield`}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                <p className="text-yellow-400 font-medium text-sm mb-2">
                  .init name required
                </p>
                <p className="text-dark-400 text-sm">
                  You need a .init name to earn MEV yield. Get one on the Initia app.
                </p>
              </div>
              <a
                href="https://app.testnet.initia.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary w-full text-sm py-3 flex items-center justify-center gap-2"
              >
                Get a .init name <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

        {/* Claim Card */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-4 text-dark-100 flex items-center gap-2">
            <Gift className="w-5 h-5 text-teal-400" />
            Claim Rewards
          </h2>

          {isRegistered && pendingAmount && pendingAmount > BigInt(0) ? (
            <div className="space-y-4">
              <div className="text-center py-8">
                <p className="text-dark-500 text-sm mb-2">Available to claim</p>
                <p className="text-4xl font-bold gradient-text mb-1">
                  {parseFloat(formatEther(pendingAmount)).toFixed(4)}
                </p>
                <p className="text-dark-500 text-sm">SYLD</p>
              </div>
              <button
                onClick={() => claimHook.claim()}
                disabled={claimHook.isPending}
                className="btn-primary w-full py-3"
              >
                {claimHook.isPending ? 'Claiming...' : `Claim ${parseFloat(formatEther(pendingAmount)).toFixed(4)} SYLD`}
              </button>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-dark-500 text-sm">
                {isRegistered
                  ? 'No pending rewards yet. Rewards accumulate each epoch.'
                  : 'Register your .init name to start earning.'}
              </p>
            </div>
          )}

          {/* Finalize epoch button */}
          <div className="mt-4 pt-4 border-t border-dark-700/30">
            <button
              onClick={() => finalizeHook.finalize()}
              disabled={finalizeHook.isPending || (blocksUntil !== undefined && blocksUntil > BigInt(0))}
              className="btn-secondary w-full text-xs py-2"
            >
              {finalizeHook.isPending
                ? 'Finalizing...'
                : `Finalize Epoch ${currentEpoch?.toString() || ''}`}
            </button>
            <p className="text-dark-600 text-xs mt-1 text-center">
              Per-holder reward: {rewardPerHolder ? parseFloat(formatEther(rewardPerHolder)).toFixed(4) : '0'} SYLD
            </p>
          </div>
        </div>
      </div>

      {/* Holders Leaderboard */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4 text-dark-100 flex items-center gap-2">
          <Users className="w-5 h-5 text-teal-400" />
          Registered Holders
        </h2>
        <div className="overflow-x-auto rounded-lg border border-dark-700/30">
          <table className="table-dark">
            <thead>
              <tr>
                <th>#</th>
                <th>Address</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {!holderList || holderList.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center text-dark-500 py-8">
                    No holders registered yet. Be the first!
                  </td>
                </tr>
              ) : (
                holderList.slice(0, 20).map((addr: string, i: number) => (
                  <tr key={addr}>
                    <td className="text-dark-500 font-mono">{i + 1}</td>
                    <td className="font-mono text-sm">{shortenAddress(addr)}</td>
                    <td>
                      <span className="px-2 py-0.5 rounded text-xs bg-green-500/10 text-green-400">
                        Active
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
