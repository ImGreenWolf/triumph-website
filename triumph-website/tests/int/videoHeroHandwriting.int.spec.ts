import { gsap } from 'gsap'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createHandwritingTimeline } from '@/heros/VideoHero/animation'
import { composeEntry, getGlyph, layoutEntries } from '@/heros/VideoHero/geometry'
import { handwritingDefaults, resolveHandwriting } from '@/heros/VideoHero/settings'
import { handwritingField } from '@/heros/VideoHero/fields'

afterEach(() => {
  gsap.globalTimeline.clear()
  document.body.replaceChildren()
})

describe('video hero handwriting content and layout', () => {
  it('keeps defaults for existing documents and normalizes live-preview entries', () => {
    expect(resolveHandwriting()).toEqual({ ...handwritingDefaults, entries: [] })
    expect(
      resolveHandwriting({ entries: [{ text: '  Împreună   reușim ' }, { text: '  ' }] }).entries,
    ).toEqual(['Împreună reușim'])
    const settings = resolveHandwriting({
      writingDuration: -1,
      initialDelay: NaN,
      mobileTextSize: 1000,
      color: 'broken',
    })
    expect(settings.writingDuration).toBe(0.1)
    expect(settings.initialDelay).toBe(0.3)
    expect(settings.mobileTextSize).toBe(160)
    expect(settings.color).toBe('#ffffff')
    expect(settings.loop).toBe(true)
    expect(resolveHandwriting({ loop: false }).loop).toBe(false)
    expect(settings.parallelReveal).toBe(false)
    expect(resolveHandwriting({ parallelReveal: true }).parallelReveal).toBe(true)
    expect(resolveHandwriting({ finalDelay: -2 }).finalDelay).toBe(0)
    expect(resolveHandwriting({ finalDelay: Infinity }).finalDelay).toBe(0)
  })

  it('rejects blank and excessive text in Payload', () => {
    const entries = handwritingField.fields.find(
      (field) => 'name' in field && field.name === 'entries',
    )
    if (!entries || entries.type !== 'array') throw new Error('Missing entries field')
    const text = entries.fields[0]
    if (text.type !== 'text' || !text.validate) throw new Error('Missing text validator')
    const validate = text.validate as (value: unknown) => true | string
    expect(validate('   ')).not.toBe(true)
    expect(validate('x'.repeat(121))).not.toBe(true)
    expect(validate('Împreună')).toBe(true)
  })

  it('draws Romanian letters and punctuation; preserves unsupported text', () => {
    for (const character of 'ăâîșțĂÂÎȘȚ!?') {
      const glyph = getGlyph(character)
      expect(glyph.fallback).toBeUndefined()
      expect(glyph.outline).toMatch(/[zZ]/)
    }
    expect(getGlyph('ă').bounds[3]).toBeGreaterThan(getGlyph('a').bounds[3])
    expect(getGlyph('ț').bounds[1]).toBeLessThanOrEqual(-180)
    expect(getGlyph('漢').fallback).toBe('漢')
  })

  it('composes a whole phrase and wrapped lines into one continuous reveal route', () => {
    for (const width of [2200, 8000]) {
      const layout = layoutEntries(['Împreună schimbăm lumea'], width, 16)
      const shape = composeEntry(layout.entries[0])
      expect((shape.outline.match(/M/g) || []).length).toBeGreaterThan(10)
      expect(shape.outline).toMatch(/Z/)
      expect((shape.reveal.match(/M/g) || []).length).toBe(1)
      expect(shape.reveal).not.toMatch(/Z|NaN|Infinity/)
      expect(shape.reveal).toMatch(/C/)
      expect(shape.fallbacks).toHaveLength(0)
    }
  })

  it('wraps phrases at words and fits long words into the shared frame', () => {
    const texts = ['Triumph', 'Împreună schimbăm lumea', 'Extraordinar'.repeat(5)]
    const layout = layoutEntries(texts, 2200, 12)
    expect(layout.lineCounts[1]).toBeGreaterThan(1)
    expect(layout.lineCounts[2]).toBe(1)
    expect(layout.width).toBe(2200)
    expect(layout.entries[2][0].scale).toBeLessThan(layout.entries[0][0].scale)
    for (const entry of layout.entries) {
      for (const { x, y, glyph, scale } of entry) {
        expect(x + glyph.bounds[0] * scale).toBeGreaterThanOrEqual(0)
        expect(x + glyph.bounds[2] * scale).toBeLessThanOrEqual(layout.width)
        expect(y - glyph.bounds[3] * scale).toBeGreaterThanOrEqual(0)
        expect(y - glyph.bounds[1] * scale).toBeLessThanOrEqual(layout.height)
      }
    }
  })

  it('keeps a constant visible gap below short words, wrapped phrases, and scaled entries', () => {
    for (const width of [2200, 8000]) {
      const layout = layoutEntries(
        ['Împreună', 'Schimbăm lumea', 'TRIUMPH', 'ășț', 'Extraordinar'.repeat(5)],
        width,
        16,
      )
      const bottoms = layout.entries.map((entry) =>
        Math.max(...entry.map(({ y, glyph, scale }) => y - glyph.bounds[1] * scale)),
      )
      for (const bottom of bottoms) {
        expect(bottom).toBeCloseTo(bottoms[0])
        expect(layout.height - bottom).toBeLessThanOrEqual(40.001)
      }
    }
  })
})

function animationFixture(
  count: number,
  config: Parameters<typeof resolveHandwriting>[0] = {},
  withTitle = false,
) {
  document.body.innerHTML = `${Array.from(
    { length: count },
    () => '<svg><path data-reveal-path pathLength="1"/></svg>',
  ).join(
    '',
  )}<div data-actions><a href="#join">Join</a></div>${withTitle ? '<div data-final-title>Closing title</div>' : ''}`
  const entries = Array.from(document.querySelectorAll('svg'))
  const actions = document.querySelector('div')!
  const settings = resolveHandwriting(config)
  const title = document.querySelector<HTMLDivElement>('[data-final-title]')
  const completed = vi.fn()
  const timeline = createHandwritingTimeline(entries, actions, settings, {
    title,
    onComplete: completed,
  })
  return { entries, actions, settings, timeline, title, completed }
}

describe('video hero handwriting timeline', () => {
  it.each([2, 3])(
    'overlaps all %i entries, including repeated last-to-first transitions',
    (count) => {
      const { entries, settings, timeline, actions } = animationFixture(count, {
        parallelReveal: true,
        writingDuration: 1,
        holdDuration: 0.2,
        fadeDuration: 0.4,
        finalDelay: 0.3,
        entryGap: 9,
      })
      let at = settings.initialDelay + settings.writingDuration + settings.holdDuration
      for (let transition = 0; transition < count * 4; transition++) {
        const outgoing = transition % count
        const incoming = (transition + 1) % count
        timeline.totalTime(at + 0.1, false)
        expect(Number(gsap.getProperty(entries[outgoing], 'opacity'))).toBeGreaterThan(0)
        expect(Number(gsap.getProperty(entries[outgoing], 'opacity'))).toBeLessThan(1)
        expect(Number(gsap.getProperty(entries[incoming], 'opacity'))).toBe(1)
        expect(
          Number(gsap.getProperty(entries[incoming].querySelector('path')!, 'strokeDashoffset')),
        ).toBeCloseTo(0.9)
        expect(actions.inert).toBe(false)
        for (let index = 0; index < count; index++) {
          if (index !== outgoing && index !== incoming)
            expect(entries[index].style.visibility).toBe('hidden')
        }
        timeline.totalTime(at + 0.5, false)
        expect(entries[outgoing].style.visibility).toBe('hidden')
        at +=
          settings.writingDuration +
          settings.holdDuration +
          (incoming === count - 1 ? settings.finalDelay : 0)
      }
      timeline.kill()
    },
  )

  it.each([true, false])('finishes overlapping playback with closing title: %s', (withTitle) => {
    const { entries, timeline, title, completed } = animationFixture(
      3,
      {
        loop: false,
        parallelReveal: true,
        initialDelay: 0,
        writingDuration: 0.1,
        holdDuration: 0,
        fadeDuration: 1,
        finalDelay: 2,
      },
      withTitle,
    )
    timeline.totalTime(2, false)
    expect(entries[0].style.visibility).toBe('hidden')
    expect(Number(gsap.getProperty(entries[2], 'opacity'))).toBe(1)
    expect(completed).not.toHaveBeenCalled()
    timeline.totalTime(3.7, false)
    if (withTitle) {
      expect(Number(gsap.getProperty(title!, 'opacity'))).toBeGreaterThan(0)
      expect(Number(gsap.getProperty(title!, 'opacity'))).toBeLessThan(1)
    }
    timeline.totalTime(10, false)
    expect(completed).toHaveBeenCalledTimes(1)
    expect(entries[2].style.visibility).toBe(withTitle ? 'hidden' : 'inherit')
    timeline.kill()
  })

  it('preserves single-entry looping when parallel reveal is enabled', () => {
    const { entries, settings, timeline } = animationFixture(1, { parallelReveal: true })
    const period =
      settings.writingDuration + settings.holdDuration + settings.fadeDuration + settings.entryGap
    timeline.totalTime(settings.initialDelay + period + 0.1, false)
    expect(
      Number(gsap.getProperty(entries[0].querySelector('path')!, 'strokeDashoffset')),
    ).toBeCloseTo(0.95)
    timeline.kill()
  })

  it('holds the last entry for the final delay before crossfading into the closing title', () => {
    const { entries, settings, timeline, title, completed } = animationFixture(
      2,
      { loop: false, finalDelay: 2 },
      true,
    )
    const period =
      settings.writingDuration + settings.holdDuration + settings.fadeDuration + settings.entryGap
    const normalEnd =
      settings.initialDelay + period + settings.writingDuration + settings.holdDuration
    timeline.totalTime(normalEnd + settings.finalDelay / 2, false)
    expect(Number(gsap.getProperty(entries[1], 'opacity'))).toBe(1)
    expect(Number(gsap.getProperty(title!, 'opacity'))).toBe(0)
    expect(completed).not.toHaveBeenCalled()
    timeline.totalTime(normalEnd + settings.finalDelay + settings.fadeDuration / 2, false)
    expect(Number(gsap.getProperty(title!, 'opacity'))).toBeGreaterThan(0)
    expect(Number(gsap.getProperty(title!, 'opacity'))).toBeLessThan(1)
    timeline.totalTime(normalEnd + settings.finalDelay + settings.fadeDuration, false)
    expect(completed).toHaveBeenCalledTimes(1)
    timeline.kill()
  })

  it('adds the final delay only after the last entry of each repeated sequence', () => {
    const { entries, settings, timeline } = animationFixture(2, { finalDelay: 2 })
    const period =
      settings.writingDuration + settings.holdDuration + settings.fadeDuration + settings.entryGap
    timeline.totalTime(settings.initialDelay + period + 0.1, false)
    expect(entries[1].style.visibility).toBe('inherit')
    timeline.totalTime(
      settings.initialDelay + period + settings.writingDuration + settings.holdDuration + 1,
      false,
    )
    expect(Number(gsap.getProperty(entries[1], 'opacity'))).toBe(1)
    timeline.totalTime(settings.initialDelay + period * 2 + settings.finalDelay + 0.1, false)
    expect(entries[0].style.visibility).toBe('inherit')
    expect(
      Number(gsap.getProperty(entries[0].querySelector('path')!, 'strokeDashoffset')),
    ).toBeCloseTo(0.95)
    timeline.kill()
  })
  it('plays once and crossfades the final entry into the closing title', () => {
    const { entries, actions, settings, timeline, title, completed } = animationFixture(
      2,
      { loop: false },
      true,
    )
    expect(title!.style.visibility).toBe('hidden')
    const period =
      settings.writingDuration + settings.holdDuration + settings.fadeDuration + settings.entryGap
    const fadeAt = settings.initialDelay + period + settings.writingDuration + settings.holdDuration
    timeline.totalTime(fadeAt + settings.fadeDuration / 2, false)
    expect(Number(gsap.getProperty(title!, 'opacity'))).toBeGreaterThan(0)
    expect(Number(gsap.getProperty(title!, 'opacity'))).toBeLessThan(1)
    expect(Number(gsap.getProperty(entries[1], 'opacity'))).toBeGreaterThan(0)
    expect(completed).not.toHaveBeenCalled()
    timeline.totalTime(fadeAt + settings.fadeDuration, false)
    expect(completed).toHaveBeenCalledTimes(1)
    expect(Number(gsap.getProperty(title!, 'opacity'))).toBe(1)
    expect(entries.every((entry) => entry.style.visibility === 'hidden')).toBe(true)
    timeline.totalTime(fadeAt + period * 3, false)
    expect(completed).toHaveBeenCalledTimes(1)
    expect(title!.style.visibility).toBe('inherit')
    expect(Number(gsap.getProperty(actions, 'opacity'))).toBe(1)
    timeline.kill()
  })

  it('keeps the completed last entry when looping is off and no closing title exists', () => {
    const { entries, settings, timeline, completed } = animationFixture(2, { loop: false })
    const period =
      settings.writingDuration + settings.holdDuration + settings.fadeDuration + settings.entryGap
    timeline.totalTime(settings.initialDelay + period * 5, false)
    expect(entries[0].style.visibility).toBe('hidden')
    expect(entries[1].style.visibility).toBe('inherit')
    expect(Number(gsap.getProperty(entries[1].querySelector('path')!, 'strokeDashoffset'))).toBe(0)
    expect(completed).toHaveBeenCalledTimes(1)
    timeline.kill()
  })
  it('reveals the entire phrase with one linear offset and then reveals the actions', () => {
    const { entries, actions, settings, timeline } = animationFixture(2)
    expect(actions.inert).toBe(true)
    timeline.totalTime(settings.initialDelay + 0.25, false)
    const paths = entries[0].querySelectorAll('path')
    expect(paths).toHaveLength(1)
    expect(Number(gsap.getProperty(paths[0], 'strokeDashoffset'))).toBeCloseTo(0.875)
    timeline.totalTime(settings.initialDelay + settings.writingDuration / 2, false)
    expect(Number(gsap.getProperty(paths[0], 'strokeDashoffset'))).toBeCloseTo(0.5)
    expect(actions.inert).toBe(true)
    timeline.totalTime(
      settings.initialDelay + settings.writingDuration + settings.buttonRevealDuration,
      false,
    )
    expect(actions.inert).toBe(false)
    expect(actions.hasAttribute('aria-hidden')).toBe(false)
    expect(Number(gsap.getProperty(actions, 'opacity'))).toBe(1)
    const period =
      settings.writingDuration + settings.holdDuration + settings.fadeDuration + settings.entryGap
    timeline.totalTime(settings.initialDelay + period + 0.1, false)
    expect(entries[0].style.visibility).toBe('hidden')
    expect(entries[1].style.visibility).toBe('inherit')
    timeline.totalTime(settings.initialDelay + period * 2 + 0.1, false)
    expect(entries[0].style.visibility).toBe('inherit')
    expect(entries[1].style.visibility).toBe('hidden')
    expect(actions.inert).toBe(false)
    expect(Number(gsap.getProperty(actions, 'opacity'))).toBe(1)
    timeline.kill()
  })

  it('loops a single entry with no second initial delay and supports pausing', () => {
    const { entries, settings, timeline } = animationFixture(1)
    const period =
      settings.writingDuration + settings.holdDuration + settings.fadeDuration + settings.entryGap
    timeline.totalTime(settings.initialDelay + period + 0.1, false)
    expect(entries[0].style.visibility).toBe('inherit')
    expect(
      Number(gsap.getProperty(entries[0].querySelector('path')!, 'strokeDashoffset')),
    ).toBeCloseTo(0.95)
    timeline.paused(true)
    expect(timeline.paused()).toBe(true)
    timeline.kill()
  })
})
