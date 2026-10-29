import { afterEach, describe, expect, it, vi } from 'vitest'
import { getEventTheme } from '@/utilities/eventTheme'
import { createElement } from 'react'
import type { Event } from '@/payload-types'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import EventPhotoBoard from '@/app/(frontend)/events/[slug]/EventPhotoBoard.client'
import SignupForm from '@/app/(frontend)/events/[slug]/SignupForm'

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

vi.mock('@/blocks/Masonry/MasonyComponent', () => ({ default: () => createElement('div', null) }))
vi.mock('@/lib/ga4/appEvents', () => ({
  trackEventSignup: vi.fn(),
  trackSignupFormOpen: vi.fn(),
}))
afterEach(cleanup)
const photo = { height: 600, width: 800, id: 'photo', img: '/photo.jpg', url: '/photo.jpg' }
const completedEvent: Event & { participantsCount: number; totalDonation: number } = {
  id: 'event',
  name: 'Eveniment Triumph',
  slug: 'eveniment-triumph',
  createdAt: '2020-01-01T00:00:00Z',
  updatedAt: '2020-01-01T00:00:00Z',
  content: {
    root: { type: 'root', version: 1, children: [], direction: null, format: '', indent: 0 },
  },
  capacity: 100,
  days: [{ eventDate: '2020-01-01', slots: [] }],
  participantsCount: 42,
  totalDonation: 1200,
}
describe('event gallery photographer credits', () => {
  it('links each photographer by name and hides credits when switching to inspiration', () => {
    render(
      createElement(EventPhotoBoard, {
        defaultMode: 'gallery',
        galleryItems: [photo],
        inspoboardItems: [photo],
        eventRef: {
          ...completedEvent,
          photographers: [
            { name: 'Ana Popescu', instagram: '@ana.foto' },
            { name: 'Andrei Ionescu', instagram: 'https://www.instagram.com/andrei_foto/' },
          ],
        },
      }),
    )
    expect(screen.getByRole('link', { name: 'Ana Popescu' }).getAttribute('href')).toBe(
      'https://www.instagram.com/ana.foto/',
    )
    expect(screen.getByRole('link', { name: 'Andrei Ionescu' }).getAttribute('href')).toBe(
      'https://www.instagram.com/andrei_foto/',
    )
    expect(screen.getByRole('heading', { name: 'Fotografii din eveniment' })).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Inspo' }))
    expect(screen.queryByText('Fotografii de')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Ana Popescu' })).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'Galerie' }))
    expect(screen.getByRole('link', { name: 'Ana Popescu' })).toBeTruthy()
  })
  it('renders older events without a credit line and never links invalid Instagram values', () => {
    const props = { defaultMode: 'gallery' as const, galleryItems: [photo], inspoboardItems: [] }
    const { rerender } = render(
      createElement(EventPhotoBoard, { ...props, eventRef: completedEvent }),
    )
    expect(screen.queryByText('Fotografii de')).toBeNull()
    rerender(
      createElement(EventPhotoBoard, {
        ...props,
        eventRef: {
          ...completedEvent,
          photographers: [{ name: 'Ana', instagram: 'javascript:alert(1)' }],
        },
      }),
    )
    expect(screen.getByText('Ana')).toBeTruthy()
    expect(screen.queryByRole('link')).toBeNull()
  })
})
describe('event participant count visibility', () => {
  it.each(['card', 'inline'] as const)(
    'respects the checkbox in %s mode and keeps donations',
    (mode) => {
      const props = {
        accentColor: '#00a2e0',
        backgroundColor: '#ffffff',
        cardColor: '#141e34',
        mode,
        slotAvailability: [],
      }
      const { rerender } = render(createElement(SignupForm, { ...props, event: completedEvent }))
      expect(screen.getByText('Participanți')).toBeTruthy()
      expect(screen.getByText('42 / 100')).toBeTruthy()
      rerender(
        createElement(SignupForm, {
          ...props,
          event: { ...completedEvent, showParticipantsCount: false },
        }),
      )
      expect(screen.queryByText('Participanți')).toBeNull()
      expect(screen.queryByText('42 / 100')).toBeNull()
      expect(screen.getByText('1200 RON')).toBeTruthy()
      rerender(
        createElement(SignupForm, {
          ...props,
          event: { ...completedEvent, showParticipantsCount: true },
        }),
      )
      expect(screen.getByText('42 / 100')).toBeTruthy()
    },
  )
})
