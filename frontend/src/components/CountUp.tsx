'use client'

import { useEffect, useRef, useState } from 'react'

interface CountUpProps {
  value: number
  decimals?: number
  duration?: number
  className?: string
  suffix?: string
}

export default function CountUp({ value, decimals = 2, duration = 1200, className, suffix }: CountUpProps) {
  const [display, setDisplay] = useState('0')
  const prevValue = useRef(0)
  const rafRef = useRef<number>()

  useEffect(() => {
    const start = prevValue.current
    const end = value
    const startTime = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = start + (end - start) * eased
      setDisplay(current.toFixed(decimals))

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        prevValue.current = end
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [value, decimals, duration])

  return <span className={className}>{display}{suffix}</span>
}
