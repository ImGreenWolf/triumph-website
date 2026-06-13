import type { Event } from '@/payload-types'
import {
  getEventEndDate,
  getEventLocation,
  getEventStartDate,
  isEventCompleted,
} from '@/utilities/eventDisplay'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

export const EVENTS_PER_PAGE = 12

export async function queryEventsPage(page = 1) {
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'events',
    depth: 1,
    limit: 0,
    overrideAccess: false,
    pagination: false,
    select: {
      cause: true,
      days: true,
      heroImage: true,
      location: true,
      meta: true,
      name: true,
      registrations: true,
      slug: true,
    },
  })
  const allEvents = (result.docs as Event[]).map(toDisplayEvent)
  const upcomingEvents = allEvents.filter((event) => !isEventCompleted(event)).sort(sortUpcomingEvents)
  const completedEvents = allEvents.filter((event) => isEventCompleted(event)).sort(sortCompletedEvents)
  const totalPages = Math.ceil(upcomingEvents.length / EVENTS_PER_PAGE)
  const offset = (page - 1) * EVENTS_PER_PAGE

  return {
    completedEvents,
    events: upcomingEvents.slice(offset, offset + EVENTS_PER_PAGE),
    page,
    totalDocs: upcomingEvents.length,
    totalPages,
  }
}

function toDisplayEvent(event: Event) {
  const location = getEventLocation(event.location)

  return {
    ...event,
    location: location
      ? {
          formattedAddress: location.formattedAddress,
          name: location.name,
        }
      : null,
    registrations: event.registrations
      ? {
          totalDocs: event.registrations.totalDocs,
        }
      : undefined,
  }
}

function sortUpcomingEvents(firstEvent: Event, secondEvent: Event) {
  return getTimestamp(getEventStartDate(firstEvent), Number.POSITIVE_INFINITY) -
    getTimestamp(getEventStartDate(secondEvent), Number.POSITIVE_INFINITY)
}

function sortCompletedEvents(firstEvent: Event, secondEvent: Event) {
  return getTimestamp(getEventEndDate(secondEvent), 0) - getTimestamp(getEventEndDate(firstEvent), 0)
}

function getTimestamp(date: Date | null, fallback: number) {
  return date?.getTime() ?? fallback
}
