'use client'

import { animate, inView, stagger } from 'motion/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { useMotionPreference } from '@/components/SiteMotion/useMotionPreference'

export function StaggeredStats({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const reducedMotion = useMotionPreference()

  useEffect(() => {
    const row = ref.current
    if (!row || reducedMotion) return
    const items = row.querySelectorAll<HTMLElement>(':scope > [data-stat]')
    if (!items.length) return
    let animation: { stop: () => void } | undefined
    const restore = () => {
      row.setAttribute('data-reveal', 'visible')
      items.forEach((item) => {
        item.style.removeProperty('opacity')
        item.style.removeProperty('transform')
      })
    }
    const stop = inView(
      row,
      () => {
        if (row.contains(document.activeElement)) {
          restore()
          return
        }
        row.setAttribute('data-reveal', 'entering')
        const controls = animate(
          items,
          { opacity: [0, 1], y: [16, 0] },
          {
            duration: 0.45,
            delay: stagger(Math.min(0.08, 0.24 / Math.max(items.length - 1, 1))),
            ease: [0.16, 1, 0.3, 1],
          },
        )
        animation = controls
        void controls.then(restore)
      },
      { margin: '0px 0px -24px 0px' },
    )
    const onFocus = () => {
      stop()
      animation?.stop()
      restore()
    }
    row.addEventListener('focusin', onFocus)
    if (
      row.getBoundingClientRect().top >= innerHeight - 24 &&
      !row.contains(document.activeElement)
    ) {
      row.setAttribute('data-reveal', 'waiting')
    }
    return () => {
      stop()
      animation?.stop()
      row.removeEventListener('focusin', onFocus)
      restore()
    }
  }, [reducedMotion])

  return (
    <div
      ref={ref}
      data-stats-reveal
      data-reveal="visible"
      className="group/stats mb-0 flex flex-wrap justify-between gap-4 sm:gap-5 [&>[data-stat]]:max-w-full [&>[data-stat]]:flex-[1_1_12rem] data-[reveal=waiting]:[&>[data-stat]]:opacity-0 data-[reveal=entering]:[&>[data-stat]]:will-change-[opacity,transform] motion-reduce:[&>[data-stat]]:opacity-100! motion-reduce:[&>[data-stat]]:transform-none!"
    >
      {children}
    </div>
  )
}
