'use client'

import { MotionConfig } from 'motion/react'
import type { ReactNode } from 'react'
import { BlindsTransition } from './BlindsTransition'

export function SiteMotion({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
      {children}
      <BlindsTransition />
    </MotionConfig>
  )
}
