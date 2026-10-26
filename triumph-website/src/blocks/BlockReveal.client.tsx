'use client'

import { inView, motion, useAnimationControls } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, type ReactNode } from 'react'
import { useMotionPreference } from '@/components/SiteMotion/useMotionPreference'
import { cn } from '@/utilities/ui'

const fadeOnlyTypes = new Set([
  'teamBlock',
  'textLoop',
  'logoLoopBlock',
  'scrollingGallery',
  'statsBlock',
])
const mediaTypes = new Set(['mediaBlock', 'masonryBlock', 'accordionGallery', 'splitMediaBlock'])

/** A client boundary around server-rendered blocks; CMS rendering stays on the server. */
export function BlockReveal({
  children,
  className,
  blockType,
}: {
  children: ReactNode
  className?: string
  blockType: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const controls = useAnimationControls()
  const pathname = usePathname()
  const reducedMotion = useMotionPreference()

  useEffect(() => {
    const element = ref.current
    if (!element || reducedMotion || pathname.startsWith('/members')) return
    const belowFold = element.getBoundingClientRect().top >= innerHeight - 24
    const mask = mediaTypes.has(blockType) && element.offsetHeight < innerHeight
    let active = true
    const restore = () => {
      element.setAttribute('data-reveal', 'visible')
      element.style.removeProperty('opacity')
      element.style.removeProperty('transform')
      element.style.removeProperty('clip-path')
    }
    const stop = inView(
      element,
      () => {
        if (element.contains(document.activeElement)) {
          restore()
          return
        }
        element.setAttribute('data-reveal', 'entering')
        const opacity = [belowFold ? 0 : 0.65, 1]
        const animation = controls.start(
          mask
            ? { opacity, clipPath: ['inset(0 0 8% 0)', 'inset(0 0 0% 0)'] }
            : fadeOnlyTypes.has(blockType)
              ? { opacity }
              : { opacity, y: [24, 0] },
          { duration: mask ? 0.55 : 0.5, ease: [0.16, 1, 0.3, 1] },
        )
        void animation.then(() => {
          if (active) restore()
        })
      },
      { margin: '0px 0px -24px 0px' },
    )
    const onFocus = () => {
      stop()
      controls.stop()
      restore()
    }
    element.addEventListener('focusin', onFocus)
    // Progressive enhancement: SSR stays visible; only registered offscreen
    // blocks wait for their own viewport entry, with immediate focus recovery.
    if (belowFold && !element.contains(document.activeElement))
      element.setAttribute('data-reveal', 'waiting')
    return () => {
      active = false
      stop()
      controls.stop()
      element.removeEventListener('focusin', onFocus)
      restore()
    }
  }, [blockType, controls, pathname, reducedMotion])

  return (
    <motion.div
      ref={ref}
      initial={false}
      animate={controls}
      data-scroll-block
      data-reveal="visible"
      className={cn(
        className,
        'data-[reveal=waiting]:opacity-0 data-[reveal=entering]:will-change-[opacity,transform] motion-reduce:opacity-100! motion-reduce:transform-none! motion-reduce:[clip-path:none]!',
      )}
    >
      {children}
    </motion.div>
  )
}
