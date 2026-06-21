import { describe, expect, it } from 'vitest'

import { getEventTheme } from '@/utilities/eventTheme'

const defaults = {
  accent: '#00a2e0',
  background: '#f4f6f8',
  card: '#ffffff',
}

describe('event theme', () => {
  it('maps enabled Payload event colors to background, accent, and card', () => {
    const theme = getEventTheme(
      {
        cardColor: '#141e34',
        primaryColor: '#102040',
        secondaryColor: '#f4b400',
        useColors: true,
      },
      defaults,
    )

    expect(theme.background).toBe('#102040')
    expect(theme.accent).toBe('#f4b400')
    expect(theme.card).toBe('#141e34')
  })

  it('uses PM defaults when event colors are disabled', () => {
    const theme = getEventTheme(
      {
        cardColor: '#111111',
        primaryColor: '#222222',
        secondaryColor: '#333333',
        useColors: false,
      },
      defaults,
    )

    expect(theme).toMatchObject(defaults)
  })

  it('falls back per color when an enabled event color is missing or invalid', () => {
    const theme = getEventTheme(
      {
        cardColor: null,
        primaryColor: 'not-a-color',
        secondaryColor: '#f4b400',
        useColors: true,
      },
      defaults,
    )

    expect(theme.background).toBe(defaults.background)
    expect(theme.accent).toBe('#f4b400')
    expect(theme.card).toBe(defaults.card)
  })
})
