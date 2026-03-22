'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react'

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
    if (isSuccess) {
      const timer = setTimeout(() => setVisible(false), 8000)
      return () => clearTimeout(timer)
    }
  }, [isSuccess])

  if (!visible) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-slide-up">
      <div className="glass-card p-4 shadow-xl">
        {isPending && (
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-teal-400 animate-spin" />
            <div>
              <p className="text-sm font-medium text-dark-200">
                Confirm {label} in wallet...
              </p>
            </div>
          </div>
        )}

        {isConfirming && (
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-teal-400 animate-spin" />
            <div>
              <p className="text-sm font-medium text-dark-200">{label} confirming...</p>
              {hash && (
                <p className="text-xs text-dark-500 font-mono mt-1">
                  {hash.slice(0, 10)}...{hash.slice(-8)}
                </p>
              )}
            </div>
          </div>
        )}

        {isSuccess && (
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-sm font-medium text-green-400">{label} confirmed!</p>
              {hash && (
                <a
                  href={`https://scan.testnet.initia.xyz/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 mt-1"
                >
                  View on explorer
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <button
              onClick={() => setVisible(false)}
              className="ml-auto text-dark-500 hover:text-dark-300"
            >
              ✕
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-sm font-medium text-red-400">{label} failed</p>
              <p className="text-xs text-dark-500 mt-1">
                {error.message?.slice(0, 100)}
              </p>
            </div>
            <button
              onClick={() => setVisible(false)}
              className="ml-auto text-dark-500 hover:text-dark-300"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
