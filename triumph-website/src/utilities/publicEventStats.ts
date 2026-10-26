import { cache } from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Event } from '@/payload-types'

// Only aggregates leave the server. Registration records retain their private read access.
const getCount = cache(async (eventID: string): Promise<number | undefined> => {
  const payload = await getPayload({ config })
  const published = await payload.find({
    collection: 'events',
    overrideAccess: false,
    draft: false,
    depth: 0,
    limit: 1,
    select: { slug: true },
    where: { and: [{ id: { equals: eventID } }, { _status: { equals: 'published' } }] },
  })
  if (!published.docs.length) return undefined
  try {
    const { totalDocs } = await payload.count({
      collection: 'event-registrations',
      overrideAccess: true,
      where: { and: [{ event: { equals: eventID } }, { status: { not_equals: 'cancelled' } }] },
    })
    return totalDocs
  } catch (error) {
    payload.logger.error({ err: error, msg: 'Could not load public event registration count' })
    return undefined
  }
})

export async function withPublicEventCounts(events: Event[]): Promise<Event[]> {
  return Promise.all(
    events.map(async (event) => {
      const count = await getCount(event.id)
      return { ...event, registrations: count === undefined ? undefined : { totalDocs: count } }
    }),
  )
}
