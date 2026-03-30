'use client'

import { useState, useEffect } from 'react'
import { RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'

interface TransactionStatusProps {
  hash?: string
  isPending: boolean
  isConfirming: boolean
  isSuccess: boolean
  error: Error | null
  label?: string
  onRetry?: () => void
}

/** Categorize error for human-friendly display */
function categorizeError(error: Error): { title: string; detail: string; isRetryable: boolean } {
  const msg = error.message?.toLowerCase() || ''

  // User rejected in wallet
  if (msg.includes('user rejected') || msg.includes('user denied') || msg.includes('rejected by user') || msg.includes('cancelled')) {
    return { title: 'Transaction rejected', detail: 'You declined the transaction in your wallet.', isRetryable: true }
  }

  // On-chain revert
  if (msg.includes('reverted') || msg.includes('execution reverted') || msg.includes('revert')) {
    return { title: 'Transaction reverted', detail: 'The transaction was reverted by the smart contract.', isRetryable: true }
  }

  // Insufficient funds
  if (msg.includes('insufficient') || msg.includes('not enough') || msg.includes('exceeds balance')) {
    return { title: 'Insufficient balance', detail: 'You don\'t have enough tokens for this transaction.', isRetryable: false }
  }

  // Network errors
  if (msg.includes('network') || msg.includes('timeout') || msg.includes('fetch') || msg.includes('failed to fetch') || msg.includes('disconnected')) {
    return { title: 'Network error', detail: 'Check your connection and try again.', isRetryable: true }
  }

  // Nonce issues
  if (msg.includes('nonce')) {
    return { title: 'Nonce mismatch', detail: 'Please reset your wallet or wait and retry.', isRetryable: true }
  }

  // Generic fallback
  return { title: 'Transaction failed', detail: error.message.slice(0, 120), isRetryable: true }
}

export default function TransactionStatus({
  hash,
  isPending,
  isConfirming,
  isSuccess,
  error,
  label = 'Transaction',
  onRetry,
}: TransactionStatusProps) {
  const [visible, setVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    if (isPending || isConfirming || isSuccess || error) {
      setVisible(true)
      setShowDetails(false)
    }
  }, [isPending, isConfirming, isSuccess, error])

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => setVisible(false), 8000)
      return () => clearTimeout(timer)
    }
  }, [isSuccess])

  if (!visible) return null

  const renderContent = () => {
    if (isPending || isConfirming) {
      return (
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
          <div className="flex-1">
            <p className="text-sm font-body text-white">
              {isPending ? 'Approve transaction...' : 'Transaction pending...'}
            </p>
          </div>
        </div>
      )
    }

    if (isSuccess) {
      return (
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#00ff87] shadow-[0_0_8px_rgba(0,255,135,0.6)]" />
          <div className="flex-1">
            <p className="text-sm font-body text-white">Transaction confirmed</p>
            {hash && (
              <a
                href={`https://scan.testnet.initia.xyz/tx/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-[#00ff87] hover:underline block mt-0.5"
              >
                {hash.slice(0, 8)}...{hash.slice(-6)}
              </a>
            )}
          </div>
        </div>
      )
    }

    if (error) {
      const { title, detail, isRetryable } = categorizeError(error)
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-body text-white">{label}: {title}</p>
              <p className="text-xs font-body text-white/50 mt-0.5">{detail}</p>
            </div>
          </div>

          {/* Expandable raw error details */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-white/30 text-xs font-body hover:text-white/50 transition-colors ml-5"
          >
            {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showDetails ? 'Hide' : 'Show'} details
          </button>
          {showDetails && (
            <p className="text-[10px] font-mono text-white/30 ml-5 break-all max-h-20 overflow-y-auto">
              {error.message}
            </p>
          )}

          {/* Retry button */}
          {isRetryable && onRetry && (
            <button
              onClick={onRetry}
              className="ml-5 flex items-center gap-1.5 liquid-glass rounded-lg px-3 py-1.5 text-xs font-body text-white/70 hover:text-white hover:bg-white/5 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Retry
            </button>
          )}
        </div>
      )
    }

    return null
  }

  return (
    <div className="fixed bottom-6 right-6 z-[100] w-80">
      <div 
        className="liquid-glass-strong rounded-2xl p-4 shadow-2xl"
        style={{
          animation: 'slideInLeft 0.3s ease-out forwards'
        }}
      >
        {renderContent()}
        <button
          onClick={() => setVisible(false)}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideInLeft {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}} />
    </div>
  )
}
