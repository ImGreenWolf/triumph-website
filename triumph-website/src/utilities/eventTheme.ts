import type { Event } from '@/payload-types'
import { getContrastTextColor } from '@/utilities/eventDisplay'

type EventColors = Pick<Event, 'cardColor' | 'primaryColor' | 'secondaryColor' | 'useColors'>

export type EventThemeDefaults = {
  accent: string
  background: string
  card: string
}

export function getEventTheme(event: EventColors, defaults: EventThemeDefaults) {
  const colorsEnabled = event.useColors === true
  const background = colorsEnabled
    ? normalizeThemeColor(event.primaryColor, defaults.background)
    : defaults.background
  const accent = colorsEnabled
    ? normalizeThemeColor(event.secondaryColor, defaults.accent)
    : defaults.accent
  const card = colorsEnabled ? normalizeThemeColor(event.cardColor, defaults.card) : defaults.card

  return {
    accent,
    accentForeground: getContrastTextColor(accent) ?? '#ffffff',
    background,
    backgroundForeground: getContrastTextColor(background) ?? '#152039',
    card,
    cardForeground: getContrastTextColor(card) ?? '#152039',
  }
}

function normalizeThemeColor(value: string | null | undefined, fallback: string) {
  return value && getContrastTextColor(value) ? value : fallback
}
