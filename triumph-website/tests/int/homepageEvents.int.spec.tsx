import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { EventCardData } from '@/components/EventCard'
import { HomepageEventsView } from '@/blocks/HomepageEvents/View'
import { consolidateHomepageEvents, chooseUpcomingEvent } from '@/utilities/homepageEventsLayout'
import { prepareHomepageLayout } from '@/utilities/homepageDraft'
import type { Page } from '@/payload-types'
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }) }))
vi.mock('@/components/AccordionGallery', () => ({
  default: ({ items }: { items: { label: string; image: string; link: string }[] }) => (
    <div>
      {items.map((item) => (
        <a key={item.link} href={item.link}>
          <img src={item.image} alt={item.label} />
          {item.label}
        </a>
      ))}
    </div>
  ),
}))
vi.mock('@/components/Media', () => ({ Media: () => null }))
const event = (id: string, year: number): EventCardData => ({
  id,
  name: id,
  slug: id,
  days: [{ eventDate: `${year}-10-25T00:00:00Z`, slots: [] }],
})
afterEach(cleanup)
describe('homepage event selection', () => {
  it('keeps the upcoming event separate, preserves highlight order, and offers the full archive', () => {
    render(
      <HomepageEventsView
        title="Evenimentele noastre"
        featured={event('viitor', 2099)}
        highlights={[
          event('viitor', 2099),
          event('al-doilea', 2000),
          event('primul', 2000),
          event('al-doilea', 2000),
        ]}
        renderedAt={Date.now()}
      />,
    )
    expect(
      screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent),
    ).toEqual(['al-doilea', 'primul', 'viitor'])
    expect(screen.getByRole('link', { name: 'Înscrie-te la eveniment' }).getAttribute('href')).toBe(
      '/events/viitor/signup',
    )
    expect(screen.getByRole('link', { name: 'Vezi toate evenimentele' }).getAttribute('href')).toBe(
      '/events',
    )
  })
  it('hides a past feature while retaining highlighted events', () => {
    render(
      <HomepageEventsView
        title="Evenimente"
        featured={event('trecut', 2000)}
        highlights={[event('trecut', 2000)]}
        renderedAt={Date.now()}
      />,
    )
    expect(screen.queryByRole('link', { name: 'Înscrie-te la eveniment' })).toBeNull()
    expect(screen.getByRole('heading', { level: 3 }).textContent).toBe('trecut')
  })
  it('keeps a useful archive action when the selection is empty', () => {
    render(<HomepageEventsView title="Evenimente" highlights={[]} renderedAt={Date.now()} />)
    expect(screen.getByRole('link', { name: 'Vezi toate evenimentele' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'ne poți contacta' })).toBeTruthy()
  })
  it('converts the legacy selection without losing its event order or changing the source data', () => {
    const source = {
      layout: [
        { blockType: 'statsBlock', showEvents: true },
        {
          blockType: 'accordionGallery',
          items: [{ link: { url: '/events/b' } }, { link: { url: '/events/a' } }],
        },
        {
          blockType: 'faqBlock',
          faqs: [{ question: 'Cum mă pot înscrie?', answer: { root: {} } }],
        },
      ],
    } as unknown as Page
    const before = JSON.stringify(source)
    const result = prepareHomepageLayout(source, [
      { id: '1', slug: 'a' },
      { id: '2', slug: 'b' },
    ])
    expect(result.layout[1]).toMatchObject({
      blockType: 'homepageEvents',
      highlightedEvents: ['2', '1'],
    })
    expect(result.layout[0]).toMatchObject({ showEvents: false })
    expect(result.layout[2]).toMatchObject({ faqs: [{ answerSource: 'recruitment' }] })
    expect(JSON.stringify(source)).toBe(before)
    expect(prepareHomepageLayout({ layout: result.layout }, []).layout).toEqual(result.layout)
  })
})

describe('homepage integration', () => {
  it('changes only events rendering and keeps gallery artwork, labels, and other content', () => {
    const layout = [
      { blockType: 'statsBlock', showEvents: true },
      {
        blockType: 'accordionGallery',
        introContent: { root: {} },
        items: [{ label: 'Titlu original', image: 'custom-photo', link: { url: '/events/past' } }],
      },
      { blockType: 'aboutUs', title: 'Existing content' },
    ] as unknown as Page['layout']
    const before = JSON.stringify(layout)
    const result = consolidateHomepageEvents(layout, [{ id: 'event', slug: 'past' }])
    expect(result[0]).toMatchObject({ showEvents: false })
    expect(result[1]).toMatchObject({
      blockType: 'homepageEvents',
      highlightedEvents: ['event'],
      highlightGallery: { items: [{ label: 'Titlu original', image: 'custom-photo' }] },
    })
    expect(result[2]).toBe(layout[2])
    expect(JSON.stringify(layout)).toBe(before)
    expect(consolidateHomepageEvents(result, [])).toEqual(result)
  })
  it('does not remove a gallery whose links cannot all be resolved', () => {
    const layout = [
      { blockType: 'accordionGallery', items: [{ link: { url: '/events/missing' } }] },
    ] as unknown as Page['layout']
    expect(consolidateHomepageEvents(layout, [])).toBe(layout)
  })
  it('chooses the selected future event or the nearest valid future event', () => {
    const now = new Date('2026-10-22').getTime()
    const events = [
      event('late', 2099),
      event('past', 2000),
      { ...event('near', 2098), days: [{ eventDate: '2098-10-25', slots: [] }] },
    ]
    expect(chooseUpcomingEvent(events, undefined, now)?.id).toBe('near')
    expect(chooseUpcomingEvent(events, 'late', now)?.id).toBe('late')
    expect(chooseUpcomingEvent(events, 'past', now)?.id).toBe('near')
    expect(chooseUpcomingEvent([event('past', 2000)], undefined, now)).toBeUndefined()
  })
  it('preserves custom highlight images and places highlights before the upcoming event and archive', () => {
    render(
      <HomepageEventsView
        title="Evenimente"
        presentation="gallery"
        highlights={[event('past', 2000)]}
        artworks={[
          {
            eventID: 'past',
            image: '/original-image.jpg',
            alt: 'Original',
            label: 'Titlu original',
          },
        ]}
        featured={event('future', 2099)}
        renderedAt={Date.now()}
      />,
    )
    expect(screen.getByRole('img', { name: 'Titlu original' }).getAttribute('src')).toBe(
      '/original-image.jpg',
    )
    const links = screen.getAllByRole('link').map((link) => link.getAttribute('href'))
    expect(links).toEqual(['/events/past', '/events/future/signup', '/events'])
  })
})
