'use client'

import { useEffect, useRef } from 'react'
import { observeMotionActivity } from '@/utilities/observeMotionActivity'

export function ActionRules() {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = root.current
    if (!element || !element.animate || document.querySelector('[data-action-rules]') !== element)
      return
    let played = false
    let animations: Animation[] = []
    const stop = observeMotionActivity(element, (active) => {
      if (!active) {
        animations.forEach((animation) => animation.cancel())
        return
      }
      if (played) return
      played = true
      animations = Array.from(element.children, (rule, index) =>
        rule.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)' }], {
          duration: 600,
          delay: index * 100,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          fill: 'backwards',
        }),
      )
    })
    return () => {
      stop()
      animations.forEach((animation) => animation.cancel())
    }
  }, [])

  return (
    <div aria-hidden data-action-rules ref={root} className="mb-6 flex items-center gap-3">
      <span className="h-px w-16 bg-background" />
      <span className="h-px w-24 bg-background/30" />
    </div>
  )
}
