'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface BlurTextProps {
  text: string
  className?: string
  delay?: number
}

export default function BlurText({ text, className = '', delay = 0 }: BlurTextProps) {
  const words = text.split(' ')

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: delay }
    }
  }

  const item = {
    hidden: { opacity: 0, filter: 'blur(12px)', y: 40 },
    show: {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      transition: { duration: 0.35, ease: 'easeOut' }
    }
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className={`flex flex-wrap ${className}`}
    >
      {words.map((word, i) => (
        <motion.span
          key={i}
          variants={item}
          className="mr-[0.25em]"
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  )
}
