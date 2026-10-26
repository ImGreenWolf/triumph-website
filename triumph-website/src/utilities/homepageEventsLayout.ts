import type { Event, HomepageEventsBlock, Page } from '@/payload-types'
import { getEventStartDate } from './eventDisplay'

type Block = Page['layout'][number]
export function isEventHighlightGallery(
  block: Block,
): block is Extract<Block, { blockType: 'accordionGallery' }> {
  return (
    block.blockType === 'accordionGallery' &&
    Boolean(block.items?.length) &&
    block.items!.every((item) => Boolean(item.link.url?.startsWith('/events/')))
  )
}

// Adapt only the homepage events surface; stored blocks and all other pages remain editable as authored.
export function consolidateHomepageEvents(
  layout: Page['layout'],
  events: Pick<Event, 'id' | 'slug'>[],
): Page['layout'] {
  const existing = layout.find((block) => block.blockType === 'homepageEvents')
  const gallery = layout.find(isEventHighlightGallery)
  if (!existing && !gallery) return layout
  const bySlug = new Map(events.map((event) => [event.slug, event.id]))
  const selected =
    gallery?.items?.map((item) =>
      bySlug.get(item.link.url!.split('/events/')[1].split(/[?#]/)[0]),
    ) ?? []
  if (!existing && selected.some((id) => !id)) return layout
  const section: HomepageEventsBlock = existing ?? {
    blockType: 'homepageEvents',
    title: 'Evenimentele noastre',
    highlightedEvents: [...new Set(selected.filter((id): id is string => Boolean(id)))],
    archiveLabel: 'Vezi toate evenimentele',
    highlightGallery: {
      items: gallery!.items,
      showLabels: gallery!.showLabels,
      expandRatio: gallery!.expandRatio,
    },
    introContent: gallery!.introContent,
  }
  return layout.flatMap((block): Block[] => {
    if (block === (existing ?? gallery)) return [section]
    if (isEventHighlightGallery(block)) return []
    return [block.blockType === 'statsBlock' ? { ...block, showEvents: false } : block]
  })
}

export function chooseUpcomingEvent<T extends Pick<Event, 'id' | 'days'>>(
  events: T[],
  preferredID: string | undefined,
  now: number,
): T | undefined {
  const upcoming = events.filter((event) => (getEventStartDate(event)?.getTime() ?? 0) > now)
  return (
    upcoming.find((event) => event.id === preferredID) ??
    upcoming.sort((a, b) => getEventStartDate(a)!.getTime() - getEventStartDate(b)!.getTime())[0]
  )
}
