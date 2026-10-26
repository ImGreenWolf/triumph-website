'use client'

import { useAnimate, stagger } from 'motion/react'
import { useMotionPreference } from './useMotionPreference'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { transitionDestination } from './navigation'

export function BlindsTransition() {
  const [scope, animate] = useAnimate<HTMLDivElement>()
  const reducedMotion = useMotionPreference()
  const router = useRouter()
  const pathname = usePathname()
  const previousPath = useRef(pathname)
  const run = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const playback = useRef<{ stop: () => void } | null>(null)
  const covering = useRef<Promise<void> | null>(null)
  const destinationBeforePush = useRef<string | null>(null)

  const phase = useCallback(
    (value: string) => {
      scope.current?.setAttribute('data-phase', value)
      const page = document.querySelector('[data-site-page]')
      if (value === 'idle') page?.removeAttribute('aria-busy')
      else page?.setAttribute('aria-busy', 'true')
    },
    [scope],
  )

  const reset = useCallback(() => {
    run.current += 1
    clearTimeout(timer.current)
    playback.current?.stop()
    scope.current?.querySelectorAll<HTMLElement>('[data-blind]').forEach((slat) => {
      slat.style.transform = 'scaleY(0)'
    })
    covering.current = null
    destinationBeforePush.current = null
    phase('idle')
  }, [phase, scope])

  const uncover = useCallback(
    async (token: number) => {
      if (run.current !== token || !scope.current) return
      phase('revealing')
      const slats = scope.current.querySelectorAll<HTMLElement>('[data-blind]')
      slats.forEach((slat) => {
        slat.style.transformOrigin = 'bottom'
      })
      const animation = animate(
        slats,
        { scaleY: [1, 0] },
        {
          duration: 0.36,
          delay: stagger(0.024),
          ease: [0.16, 1, 0.3, 1],
        },
      )
      playback.current = animation
      await animation
      if (run.current === token) {
        clearTimeout(timer.current)
        covering.current = null
        phase('idle')
      }
    },
    [animate, phase, scope],
  )

  useLayoutEffect(() => {
    const changedPage = previousPath.current !== pathname
    if (changedPage && !window.location.hash) {
      // Reset before the blinds reopen, even when Next keeps a visible layout
      // segment in place. Explicit section links keep their anchor destination.
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      previousPath.current = pathname
      const destination = destinationBeforePush.current
      reset()
      if (destination) router.push(destination, { scroll: destination.includes('#') })
      return
    }
    if (previousPath.current === pathname) return
    previousPath.current = pathname
    // Link clicks already closed the blinds. Back/forward and programmatic
    // navigation receive an arrival reveal, without changing browser history.
    if (!covering.current) {
      const token = ++run.current
      scope.current?.querySelectorAll<HTMLElement>('[data-blind]').forEach((slat) => {
        slat.style.transform = 'scaleY(1)'
      })
      void uncover(token)
    } else {
      const token = run.current
      void Promise.resolve(covering.current).then(() => uncover(token))
    }
  }, [pathname, reducedMotion, reset, router, scope, uncover])

  useEffect(() => {
    const previousRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    return () => {
      window.history.scrollRestoration = previousRestoration
    }
  }, [])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      )
        return
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null
      if (!(anchor instanceof HTMLAnchorElement)) return
      const destination = transitionDestination(anchor, new URL(location.href))
      if (!destination || !scope.current) return
      event.preventDefault()
      if (scope.current.dataset.phase !== 'idle') return
      const token = ++run.current
      destinationBeforePush.current = destination
      phase('covering')
      // Route errors, cancelled navigation, and stalled requests must never
      // leave a decorative layer blocking the site.
      timer.current = setTimeout(reset, 4500)
      const slats = scope.current.querySelectorAll<HTMLElement>('[data-blind]')
      slats.forEach((slat) => {
        slat.style.transformOrigin = 'top'
      })
      const animation = animate(
        slats,
        { scaleY: [0, 1] },
        {
          duration: 0.22,
          delay: stagger(0.018),
          ease: [0.65, 0, 0.35, 1],
        },
      )
      playback.current = animation
      const complete = animation.then(() => {})
      covering.current = complete
      void complete.then(() => {
        if (run.current !== token) return
        phase('covered')
        try {
          destinationBeforePush.current = null
          router.push(destination, { scroll: destination.includes('#') })
        } catch {
          reset()
        }
      })
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && scope.current?.dataset.phase !== 'idle') reset()
    }
    document.addEventListener('click', onClick, true)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('keydown', onKeyDown)
      reset()
    }
  }, [animate, phase, reset, router, scope])

  return (
    <div
      ref={scope}
      className="group/blinds pointer-events-auto fixed inset-0 z-[200] grid grid-rows-8 [contain:strict] data-[phase=idle]:invisible data-[phase=idle]:pointer-events-none motion-reduce:hidden"
      data-page-transition
      data-phase="idle"
      aria-hidden="true"
    >
      {Array.from({ length: 8 }, (_, index) => (
        <div
          key={index}
          data-blind
          className="origin-top border-b border-accent/24 bg-background [transform:scaleY(0)] group-data-[phase=covering]/blinds:will-change-transform group-data-[phase=covered]/blinds:will-change-transform group-data-[phase=revealing]/blinds:will-change-transform"
        />
      ))}
    </div>
  )
}
