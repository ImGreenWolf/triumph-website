'use client'

import { ArrowUp } from 'lucide-react'
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'
import { usePathname } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'

export function FooterReveal({ children }: { children: React.ReactNode }) {
  const anchorRef = useRef<HTMLDivElement>(null)
  const blur = useMotionValue(0)
  const filter = useTransform(blur, (value) => `blur(${value}px)`)
  const footerRef = useRef<HTMLElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [focused, setFocused] = useState(false)
  const reducedMotion = useReducedMotion()
  const pathname = usePathname()
  const stretch = useSpring(0, { stiffness: 280, damping: 28, mass: 0.55 })
  const scaleY = useTransform(stretch, [0, 120], [1, 1.08])

  useEffect(() => {
    const footer = footerRef.current
    const panel = panelRef.current
    if (!footer || !panel) return

    let frame = 0
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateBlur = () => {
      frame = 0
      const anchor = anchorRef.current
      const atBottom =
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2
      if (!anchor || preference.matches || footer.dataset.sticky !== 'true' || atBottom) {
        blur.set(0)
        return
      }
      // The zero-height flow anchor stays still while the footer sticks behind
      // the page, so reveal progress does not depend on transformed geometry.
      const revealed = Math.max(
        0,
        Math.min(1, (window.innerHeight - anchor.getBoundingClientRect().top) / panel.offsetHeight),
      )
      blur.set(16 * (1 - revealed))
    }
    const onRevealScroll = () => {
      if (!frame) frame = requestAnimationFrame(updateBlur)
    }
    const updateSize = () => {
      // Read untransformed height so stretching cannot change sticky eligibility.
      const height = panel.offsetHeight
      footer.dataset.sticky = String(!preference.matches && height < window.innerHeight - 32)
      if (preference.matches) stretch.jump(0)
      updateBlur()
    }

    const resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(panel)
    window.addEventListener('resize', updateSize)
    window.addEventListener('scroll', onRevealScroll, { passive: true })
    preference.addEventListener('change', updateSize)
    updateSize()

    return () => {
      resizeObserver.disconnect()
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onRevealScroll)
      window.removeEventListener('resize', updateSize)
      preference.removeEventListener('change', updateSize)
      delete footer.dataset.sticky
    }
  }, [blur, pathname, stretch])

  useEffect(() => {
    const footer = footerRef.current
    if (!footer) return
    let pull = 0
    let releaseTimer = 0
    let lastTouchY: number | null = null
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const release = () => {
      window.clearTimeout(releaseTimer)
      pull = 0
      stretch.set(0)
    }
    const atBottom = () =>
      window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2
    const applyPull = (delta: number, target: EventTarget | null) => {
      if (preference.matches || footer.contains(document.activeElement)) return
      if (delta <= 0 || !atBottom()) {
        release()
        return
      }
      // Leave nested scrollable controls and portalled menus to native scrolling.
      if (!(target instanceof Element) || !footer.contains(target)) return
      for (
        let element: Element | null = target;
        element && element !== footer;
        element = element.parentElement
      ) {
        if (
          element.scrollHeight > element.clientHeight + 1 &&
          /auto|scroll/.test(getComputedStyle(element).overflowY)
        )
          return
      }
      window.clearTimeout(releaseTimer)
      // Increasing resistance caps the stretch at 8%, without extending the page.
      pull = Math.min(600, pull + delta)
      stretch.set(120 * (1 - Math.exp(-pull / 240)))
      releaseTimer = window.setTimeout(release, 140)
    }
    const onWheel = (event: WheelEvent) => {
      if (
        event.ctrlKey ||
        event.defaultPrevented ||
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
      )
        return
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1
      applyPull(event.deltaY * unit, event.target)
    }
    const onTouchStart = (event: TouchEvent) => {
      release()
      lastTouchY = event.touches.length === 1 ? event.touches[0].clientY : null
    }
    const onTouchMove = (event: TouchEvent) => {
      if (lastTouchY === null || event.touches.length !== 1) return
      const y = event.touches[0].clientY
      applyPull(lastTouchY - y, event.target)
      lastTouchY = y
    }
    const onTouchEnd = () => {
      lastTouchY = null
      release()
    }
    const onScroll = () => {
      if (pull > 0 && !atBottom()) release()
    }
    footer.addEventListener('wheel', onWheel, { passive: true })
    footer.addEventListener('touchstart', onTouchStart, { passive: true })
    footer.addEventListener('touchmove', onTouchMove, { passive: true })
    footer.addEventListener('touchend', onTouchEnd, { passive: true })
    footer.addEventListener('touchcancel', onTouchEnd, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('blur', release)
    return () => {
      window.clearTimeout(releaseTimer)
      stretch.jump(0)
      footer.removeEventListener('wheel', onWheel)
      footer.removeEventListener('touchstart', onTouchStart)
      footer.removeEventListener('touchmove', onTouchMove)
      footer.removeEventListener('touchend', onTouchEnd)
      footer.removeEventListener('touchcancel', onTouchEnd)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('blur', release)
    }
  }, [pathname, stretch])

  return (
    <>
      <div ref={anchorRef} aria-hidden="true" className="h-0 shrink-0" data-footer-anchor />
      <footer
        className="relative z-0 mt-auto shrink-0 bg-sidebar text-sidebar-foreground selection:bg-accent selection:text-sidebar data-[sticky=true]:sticky data-[sticky=true]:bottom-0 focus-within:static! motion-reduce:static! [&_:is(a,button):focus-visible]:outline-2 [&_:is(a,button):focus-visible]:outline-offset-4 [&_:is(a,button):focus-visible]:outline-accent"
        data-footer
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
        }}
        onFocusCapture={(event) => {
          setFocused(true)
          stretch.jump(0)
          event.target.scrollIntoView({ block: 'nearest', behavior: 'instant' })
        }}
        ref={footerRef}
      >
        <motion.div
          className="origin-bottom bg-sidebar motion-reduce:transform-none! motion-reduce:filter-none!"
          data-footer-panel
          ref={panelRef}
          style={{
            scaleY: reducedMotion || focused ? 1 : scaleY,
            filter: reducedMotion || focused ? 'none' : filter,
          }}
        >
          {children}
        </motion.div>
      </footer>
    </>
  )
}

export function BackToTop({ label }: { label: string }) {
  return (
    <button
      className="group inline-flex min-h-11 max-w-full cursor-pointer items-center justify-between gap-4 text-start text-[0.8125rem] text-sidebar-foreground/70 transition-colors duration-200 hover:text-accent motion-reduce:transition-none"
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'instant'
            : 'smooth',
        })
      }
      type="button"
    >
      <span>{label}</span>
      <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-sidebar-foreground/20 text-accent transition-colors duration-200 group-hover:bg-accent group-hover:text-sidebar motion-reduce:transition-none">
        <ArrowUp aria-hidden size={19} strokeWidth={1.5} />
      </span>
    </button>
  )
}
