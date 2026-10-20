'use client'

import { gsap } from 'gsap'
import React, { useId, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { createHandwritingTimeline } from './animation'
import { observeHeroActivity } from './activity'
import { composeEntry, layoutEntries } from './geometry'
import { type HandwritingConfig, resolveHandwriting } from './settings'

type Props = {
  config: HandwritingConfig
  actions: React.ReactNode
  children?: React.ReactNode
  finalTitle?: React.ReactNode
}

export function HandwritingHeadline({ config, actions, children, finalTitle }: Props) {
  const maskPrefix = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const configKey = JSON.stringify(config)
  const settings = useMemo(
    () => resolveHandwriting(JSON.parse(configKey) as HandwritingConfig),
    [configKey],
  )
  const rootRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const actionsRef = useRef<HTMLDivElement>(null)
  const finalTitleRef = useRef<HTMLDivElement>(null)
  const hasFinalTitle = Boolean(finalTitle)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  const [availableWidth, setAvailableWidth] = useState((320 / settings.mobileTextSize) * 1000)
  const [completed, setCompleted] = useState(false)
  const layout = useMemo(
    () => layoutEntries(settings.entries, availableWidth, settings.strokeWidth),
    [settings, availableWidth],
  )
  const shapes = useMemo(() => layout.entries.map(composeEntry), [layout])

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const update = () => {
      const size = Number.parseFloat(getComputedStyle(stage).fontSize)
      const width = stage.getBoundingClientRect().width
      if (width > 0 && size > 0) setAvailableWidth((width / size) * 1000)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(stage)
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  // Layout changes update the same normalized phrase path without replaying the intro.
  useLayoutEffect(() => {
    const root = rootRef.current
    const actions = actionsRef.current
    if (!root || !actions) return
    const media = gsap.matchMedia()
    media.add(
      {
        animated: '(prefers-reduced-motion: no-preference)',
        reduced: '(prefers-reduced-motion: reduce)',
      },
      (context) => {
        const reduced = Boolean(context.conditions?.reduced)
        const entries = Array.from(root.querySelectorAll<SVGSVGElement>('[data-handwriting-entry]'))
        let stopObserving: (() => void) | undefined
        setCompleted(false)
        if (!reduced) {
          timelineRef.current = createHandwritingTimeline(entries, actions, settings, {
            title: finalTitleRef.current,
            onComplete: () => setCompleted(true),
          })
          const timeline = timelineRef.current
          stopObserving = observeHeroActivity(root, (active) => timeline.paused(!active))
        } else if (!settings.loop) {
          gsap.set(entries, { autoAlpha: 0 })
          if (finalTitleRef.current) gsap.set(finalTitleRef.current, { autoAlpha: 1 })
          else gsap.set(entries[entries.length - 1], { autoAlpha: 1 })
          setCompleted(true)
        }
        return () => {
          stopObserving?.()
          timelineRef.current?.kill()
          timelineRef.current = null
          actions.inert = false
          actions.removeAttribute('aria-hidden')
        }
      },
      root,
    )
    return () => media.revert()
  }, [settings, hasFinalTitle])

  const style = {
    '--hero-desktop-text-size': `${settings.desktopTextSize}px`,
    '--hero-mobile-text-size': `${settings.mobileTextSize}px`,
    color: settings.color,
  } as React.CSSProperties

  return (
    <div className="flex w-full flex-col items-center gap-6 sm:gap-8" ref={rootRef} style={style}>
      <h1 aria-hidden={completed && hasFinalTitle ? true : undefined} className="sr-only">
        {settings.entries.join(' · ')}
      </h1>
      <div className="grid w-full items-end justify-items-center">
        <div
          aria-hidden="true"
          className="relative col-start-1 row-start-1 w-full [contain:layout_paint] [font-size:var(--hero-mobile-text-size)] md:[font-size:clamp(var(--hero-mobile-text-size),12vw,var(--hero-desktop-text-size))] lg:[font-size:var(--hero-desktop-text-size)] [@media(max-height:500px)]:[font-size:var(--hero-mobile-text-size)]"
          data-hero-stage=""
          ref={stageRef}
          style={{ aspectRatio: `${layout.width} / ${layout.height}` }}
        >
          {shapes.map((shape, index) => (
            <svg
              className={`absolute inset-0 size-full ${index === 0 ? 'visible' : 'invisible'}`}
              data-handwriting-entry={index}
              focusable="false"
              key={index}
              viewBox={`0 0 ${layout.width} ${layout.height}`}
            >
              <defs>
                <mask
                  id={`${maskPrefix}-${index}`}
                  maskUnits="userSpaceOnUse"
                  x={0}
                  y={0}
                  width={layout.width}
                  height={layout.height}
                  className="[mask-type:luminance]"
                >
                  <path
                    d={shape.reveal}
                    data-reveal-path=""
                    fill="none"
                    pathLength={1}
                    stroke="white"
                    strokeDasharray={1}
                    strokeDashoffset={0}
                    strokeLinecap="butt"
                    strokeLinejoin="round"
                    strokeWidth={140 * shape.scale}
                  />
                </mask>
              </defs>
              <path
                d={shape.outline}
                data-ink=""
                fill="currentColor"
                mask={`url(#${maskPrefix}-${index})`}
                stroke="currentColor"
                strokeLinejoin="round"
                strokeWidth={(settings.strokeWidth / 8) * shape.scale}
              />
              {shape.fallbacks.map(({ glyph, x, y, scale }, fallbackIndex) => (
                <text
                  fill="currentColor"
                  fontFamily="system-ui, sans-serif"
                  fontSize={1000}
                  key={fallbackIndex}
                  lengthAdjust="spacingAndGlyphs"
                  textLength={glyph.advance}
                  transform={`translate(${x} ${y}) scale(${scale})`}
                >
                  {glyph.fallback}
                </text>
              ))}
            </svg>
          ))}
        </div>
        {hasFinalTitle && (
          <div
            aria-hidden={!completed}
            className="invisible col-start-1 row-start-1 flex w-full items-center justify-center"
            data-hero-final-title=""
            ref={finalTitleRef}
          >
            {finalTitle}
          </div>
        )}
      </div>
      <div
        className={children || actions ? 'flex w-full flex-col items-center gap-6' : 'hidden'}
        data-hero-support=""
      >
        {children}
        <div className={actions ? 'w-full' : 'hidden'} data-hero-actions="" ref={actionsRef}>
          {actions}
        </div>
      </div>
    </div>
  )
}
