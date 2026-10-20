import { gsap } from 'gsap'

import type { resolveHandwriting } from './settings'

type Settings = ReturnType<typeof resolveHandwriting>

function createParallelSequence(
  entries: SVGSVGElement[],
  settings: Settings,
  completion: { title?: HTMLDivElement | null; onComplete?: () => void },
) {
  const sequence = gsap.timeline({
    onComplete: settings.loop ? undefined : completion.onComplete,
  })
  const reveal = (timeline: gsap.core.Timeline, entry: SVGSVGElement, at: number) => {
    timeline.set(entry, { autoAlpha: 1 }, at)
    const path = entry.querySelector('[data-reveal-path]')
    if (path) {
      timeline.fromTo(
        path,
        { strokeDashoffset: 1 },
        {
          strokeDashoffset: 0,
          autoRound: false,
          immediateRender: false,
          duration: settings.writingDuration,
          ease: 'none',
        },
        at,
      )
    } else timeline.to(entry, { duration: settings.writingDuration }, at)
  }
  const fade = (timeline: gsap.core.Timeline, entry: SVGSVGElement, at: number) =>
    timeline.fromTo(
      entry,
      { autoAlpha: 1 },
      {
        autoAlpha: 0,
        immediateRender: false,
        duration: settings.fadeDuration,
        ease: 'power1.inOut',
      },
      at,
    )
  const visibleDuration = (index: number) =>
    settings.writingDuration +
    settings.holdDuration +
    (index === entries.length - 1 ? settings.finalDelay : 0)

  reveal(sequence, entries[0], 0)
  let transitionAt = visibleDuration(0)
  if (settings.loop) {
    // Begin the repeating section with the first entry already written. Each cycle
    // ends in the same state, so the last-to-first transition also overlaps.
    const cycle = gsap.timeline({ repeat: -1 })
    let at = 0
    entries.forEach((entry, index) => {
      const next = (index + 1) % entries.length
      fade(cycle, entry, at)
      reveal(cycle, entries[next], at)
      // Finish the outgoing fade before another transition, even with a long fade.
      const duration = Math.max(settings.fadeDuration, visibleDuration(next))
      cycle.to({}, { duration }, at)
      at += duration
    })
    sequence.add(cycle, transitionAt)
  } else {
    entries.forEach((entry, index) => {
      const last = index === entries.length - 1
      if (last) {
        if (completion.title) {
          fade(sequence, entry, transitionAt)
          sequence.to(
            completion.title,
            { autoAlpha: 1, duration: settings.fadeDuration, ease: 'power1.inOut' },
            transitionAt,
          )
        } else sequence.to({}, { duration: transitionAt }, 0)
        return
      }
      fade(sequence, entry, transitionAt)
      reveal(sequence, entries[index + 1], transitionAt)
      transitionAt += Math.max(settings.fadeDuration, visibleDuration(index + 1))
    })
  }
  return sequence
}

export function createHandwritingTimeline(
  entries: SVGSVGElement[],
  actions: HTMLDivElement,
  settings: Settings,
  completion: { title?: HTMLDivElement | null; onComplete?: () => void } = {},
) {
  const paths = entries.flatMap((entry) => Array.from(entry.querySelectorAll('[data-reveal-path]')))
  gsap.set(entries, { autoAlpha: 0 })
  if (completion.title) gsap.set(completion.title, { autoAlpha: 0 })
  if (paths.length) gsap.set(paths, { strokeDasharray: 1, strokeDashoffset: 1 })
  gsap.set(actions, { autoAlpha: 0 })
  actions.inert = true
  actions.setAttribute('aria-hidden', 'true')

  const parallel = settings.parallelReveal && entries.length > 1
  const loop = parallel
    ? createParallelSequence(entries, settings, completion)
    : gsap.timeline({
        repeat: settings.loop ? -1 : 0,
        onComplete: settings.loop ? undefined : completion.onComplete,
      })
  if (!parallel)
    entries.forEach((entry, index) => {
      const start = loop.duration()
      const path = entry.querySelector('[data-reveal-path]')
      loop.set(entry, { autoAlpha: 1 }, start)
      // One linear offset tween reveals the entire word or phrase at constant speed.
      if (path)
        loop.to(
          path,
          // Computed SVG dash offsets use px; rounding a normalized 0–1 offset makes it jump.
          {
            strokeDashoffset: 0,
            autoRound: false,
            duration: settings.writingDuration,
            ease: 'none',
          },
          start,
        )
      else loop.to(entry, { duration: settings.writingDuration }, start)
      const last = index === entries.length - 1
      const holdDuration = settings.holdDuration + (last ? settings.finalDelay : 0)
      const fadeAt = start + settings.writingDuration + holdDuration
      if (last && !settings.loop && !completion.title) {
        // A finite sequence without a closing title rests on its final completed entry.
        loop.to(entry, { duration: holdDuration }, start + settings.writingDuration)
        return
      }
      loop.to(
        entry,
        { autoAlpha: 0, duration: settings.fadeDuration, ease: 'power1.inOut' },
        fadeAt,
      )
      if (last && !settings.loop && completion.title) {
        loop.to(
          completion.title,
          { autoAlpha: 1, duration: settings.fadeDuration, ease: 'power1.inOut' },
          fadeAt,
        )
      }
      if (path) loop.set(path, { strokeDashoffset: 1 }, fadeAt + settings.fadeDuration)
      if (settings.entryGap > 0 && (!last || settings.loop))
        loop.to({}, { duration: settings.entryGap })
    })

  const timeline = gsap.timeline({ paused: true })
  timeline.add(loop, settings.initialDelay)
  const revealAt = settings.initialDelay + settings.writingDuration
  timeline.call(
    () => {
      actions.inert = false
      actions.removeAttribute('aria-hidden')
    },
    [],
    revealAt,
  )
  timeline.to(
    actions,
    {
      autoAlpha: 1,
      duration: settings.buttonRevealDuration,
      ease: 'power2.out',
    },
    revealAt,
  )
  return timeline
}
