import { getPayload } from 'payload'
import config from '@payload-config'
import type { Event, HomepageEventsBlock } from '@/payload-types'
import ServerRichText from '@/components/RichText/server'
import { chooseUpcomingEvent } from '@/utilities/homepageEventsLayout'
import { HomepageEventsView, type HighlightArtwork } from './View'

const eventSelect = {
  name: true,
  slug: true,
  days: true,
  location: true,
  meta: true,
  heroImage: true,
} as const
export async function HomepageEventsBlockComponent(props: HomepageEventsBlock) {
  const id = (value: string | Event) => (typeof value === 'string' ? value : value.id)
  const featuredID = props.featuredEvent ? id(props.featuredEvent) : undefined
  const highlightedIDs = [...new Set((props.highlightedEvents ?? []).map(id))]
  const ids = [
    ...new Set([featuredID, ...highlightedIDs].filter((value): value is string => Boolean(value))),
  ]
  const payload = await getPayload({ config })
  // Capture request time once, so the first client render matches the server.
  // eslint-disable-next-line react-hooks/purity
  const renderedAt = Date.now()
  const events = ids.length
    ? (
        await payload.find({
          collection: 'events',
          overrideAccess: false,
          draft: false,
          depth: 1,
          limit: ids.length,
          where: { and: [{ id: { in: ids } }, { _status: { equals: 'published' } }] },
          select: eventSelect,
        })
      ).docs
    : []
  const byID = new Map(events.map((event) => [event.id, event]))
  let featured = chooseUpcomingEvent(
    events.filter((event) => event.id === featuredID),
    featuredID,
    renderedAt,
  )
  if (!featured) {
    const candidates = (
      await payload.find({
        collection: 'events',
        overrideAccess: false,
        draft: false,
        depth: 1,
        limit: 100,
        where: {
          and: [
            { _status: { equals: 'published' } },
            {
              'days.eventDate': {
                greater_than_equal: new Date(renderedAt - 2 * 86_400_000).toISOString(),
              },
            },
          ],
        },
        sort: 'days.eventDate',
        select: eventSelect,
      })
    ).docs
    featured = chooseUpcomingEvent(candidates, undefined, renderedAt)
  }
  const galleryItems = props.highlightGallery?.items ?? []
  const mediaIDs = galleryItems.flatMap((item) =>
    typeof item.image === 'string' ? [item.image] : [],
  )
  const media = mediaIDs.length
    ? (
        await payload.find({
          collection: 'media',
          overrideAccess: false,
          depth: 0,
          limit: mediaIDs.length,
          where: { id: { in: mediaIDs } },
        })
      ).docs
    : []
  const artworks: HighlightArtwork[] = galleryItems.flatMap((item) => {
    const slug = item.link.url?.startsWith('/events/')
      ? item.link.url.split('/events/')[1].split(/[?#]/)[0]
      : undefined
    const event = events.find((candidate) => candidate.slug === slug)
    const image =
      typeof item.image === 'string' ? media.find((entry) => entry.id === item.image) : item.image
    return event && image?.url
      ? [
          {
            eventID: event.id,
            image: image.url,
            alt: image.alt || item.label || event.name,
            label: item.label || event.name,
          },
        ]
      : []
  })
  return (
    <HomepageEventsView
      title={props.title}
      description={props.description}
      archiveLabel={props.archiveLabel}
      intro={
        props.introContent ? (
          <ServerRichText
            enableGutter={false}
            className="block-intro max-w-4xl"
            data={props.introContent}
          />
        ) : undefined
      }
      featured={featured}
      highlights={highlightedIDs.flatMap((eventID) =>
        byID.has(eventID) ? [byID.get(eventID)!] : [],
      )}
      presentation={props.presentation ?? 'gallery'}
      artworks={artworks}
      expandRatio={props.highlightGallery?.expandRatio ?? 0.5}
      showLabels={props.highlightGallery?.showLabels !== false}
      renderedAt={renderedAt}
    />
  )
}
