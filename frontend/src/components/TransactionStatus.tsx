'use client'

import { useState, useEffect } from 'react'

interface TransactionStatusProps {
  hash?: string
  isPending: boolean
  isConfirming: boolean
  isSuccess: boolean
  error: Error | null
  label?: string
}

export default function TransactionStatus({
  hash,
  isPending,
  isConfirming,
  isSuccess,
  error,
  label = 'Transaction',
}: TransactionStatusProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isPending || isConfirming || isSuccess || error) {
      setVisible(true)
    }
  }, [isPending, isConfirming, isSuccess, error])

  useEffect(() => {
    if (isSuccess || error) {
      const timer = setTimeout(() => setVisible(false), 8000)
      return () => clearTimeout(timer)
    }
  }, [isSuccess, error])

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
      return (
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-body text-white">{label} failed</p>
            <p className="text-xs font-body text-white/50 truncate mt-0.5" title={error.message}>
              {error.message}
            </p>
          </div>
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
