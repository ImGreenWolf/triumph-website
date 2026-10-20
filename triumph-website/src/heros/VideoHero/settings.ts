import type { Page } from '@/payload-types'

export type HandwritingConfig = NonNullable<Page['hero']['handwriting']>

export const handwritingDefaults = {
  loop: true,
  parallelReveal: false,
  initialDelay: 0.3,
  finalDelay: 0,
  writingDuration: 2,
  holdDuration: 1.5,
  fadeDuration: 0.5,
  entryGap: 0.15,
  buttonRevealDuration: 0.4,
  desktopTextSize: 160,
  mobileTextSize: 72,
  strokeWidth: 16,
  color: '#ffffff',
  backgroundDarkening: 30,
}

// Also used at runtime for older documents and partially completed live previews.
export const handwritingRanges = {
  initialDelay: [0, 10],
  finalDelay: [0, 30],
  writingDuration: [0.1, 30],
  holdDuration: [0, 30],
  fadeDuration: [0.1, 10],
  entryGap: [0, 10],
  buttonRevealDuration: [0.1, 5],
  desktopTextSize: [24, 320],
  mobileTextSize: [24, 160],
  strokeWidth: [2, 40],
  backgroundDarkening: [0, 100],
} as const

export function resolveHandwriting(config?: HandwritingConfig | null) {
  const settings = { ...handwritingDefaults }
  if (typeof config?.loop === 'boolean') settings.loop = config.loop
  if (typeof config?.parallelReveal === 'boolean') settings.parallelReveal = config.parallelReveal
  for (const key of Object.keys(handwritingRanges) as (keyof typeof handwritingRanges)[]) {
    const value = config?.[key]
    const [min, max] = handwritingRanges[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      settings[key] = Math.min(max, Math.max(min, value))
    }
  }
  if (config?.color && /^#([0-9a-f]{3}){1,2}$/i.test(config.color)) {
    settings.color = config.color
  }
  return {
    ...settings,
    entries: (config?.entries ?? [])
      .map(({ text }) => text?.normalize('NFC').trim().replace(/\s+/gu, ' ') ?? '')
      .filter(Boolean),
  }
}
