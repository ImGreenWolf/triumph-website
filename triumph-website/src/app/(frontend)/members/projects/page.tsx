import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import payloadConfig from '@payload-config'
import { getPayload } from 'payload'

import type { Event, EventRegistration, User } from '@/payload-types'
import { getEventSlotDateRange } from '@/utilities/eventDisplay'
import { formatEventDayLabel, formatEventSlotLabel } from '@/utilities/eventRegistration'
import { getPayloadAuthHeaders } from '@/utilities/payloadAuth'

import ProjectManagerDashboard, {
  type ManagedEvent,
  type ManagedEventDay,
  type ManagedEventSlot,
} from './ProjectManagerDashboard'

export const metadata: Metadata = {
  description: 'Înscrieri, check-in și rapoarte pentru evenimentele coordonate.',
  title: 'Panou Project Manager | Interact București Triumph',
}

export default async function ProjectManagerPage() {
  const payload = await getPayload({ config: payloadConfig })
  const auth = await payload.auth({ headers: await getPayloadAuthHeaders() })

  if (!auth.user) redirect('/members/login')

  const user = auth.user as User
  const eventResult = await payload.find({
    collection: 'events',
    depth: 1,
    limit: 0,
    overrideAccess: true,
    pagination: false,
    sort: '-updatedAt',

    where: {
      coordonators: {
        contains: user.id,
      },
    },
  })
  const events = eventResult.docs as Event[]
  const eventIDs = events.map((event) => event.id)
  const registrationResult = eventIDs.length
    ? await payload.find({
        collection: 'event-registrations',
        depth: 0,
        limit: 0,
        overrideAccess: true,
        pagination: false,
        sort: 'createdAt',
        where: {
          event: {
            in: eventIDs,
          },
        },
      })
    : { docs: [] }
  const registrations = registrationResult.docs as EventRegistration[]

  const managedEvents: ManagedEvent[] = events
    .map((event) => serializeEvent(event, registrations))
    .sort((left, right) => compareNullableDates(left.startTime, right.startTime))

  return <ProjectManagerDashboard events={managedEvents} userName={user.name || user.email} />
}

function serializeEvent(event: Event, registrations: EventRegistration[]): ManagedEvent {
  const days: ManagedEventDay[] = (event.days ?? [])
    .filter((day): day is NonNullable<Event['days']>[number] & { eventDate: string; id: string } =>
      Boolean(day?.eventDate && day.id),
    )
    .map((day) => {
      const slots: ManagedEventSlot[] = (day.slots ?? [])
        .filter(
          (slot): slot is NonNullable<NonNullable<typeof day.slots>[number]> & { id: string } =>
            Boolean(slot?.id),
        )
        .map((slot) => serializeSlot(day.eventDate, slot))
        .sort((left, right) => compareNullableDates(left.startTime, right.startTime))

      return {
        eventDate: day.eventDate,
        id: day.id,
        label: formatEventDayLabel(day.eventDate),
        slots,
      }
    })
    .sort((left, right) => left.eventDate.localeCompare(right.eventDate))
  const eventRegistrations = registrations
    .filter((registration) => getRelationshipID(registration.event) === event.id)
    .map((registration) => {
      const email = normalizeText(registration.email)
      const name = normalizeText(registration.name) || email || 'Participant fără nume'

      return {
        createdAt: normalizeText(registration.createdAt),
        day: normalizeText(registration.day),
        donation: normalizeNonNegativeNumber(registration.donation),
        email,
        guests: Math.floor(normalizeNonNegativeNumber(registration.guests)),
        id: registration.id,
        name,
        phone: normalizeText(registration.phone),
        questions: normalizeText(registration.questions) || null,
        slot: normalizeText(registration.slot),
        status: registration.status ?? 'registered',
        timeOfArrival: registration.timeOfArrival ?? null,
      }
    })
  const slotStartTimes = days.flatMap((day) =>
    day.slots.flatMap((slot) => (slot.startTime ? [slot.startTime] : [])),
  )
  const slotEndTimes = days.flatMap((day) =>
    day.slots.flatMap((slot) => {
      const endTime = slot.endTime ?? slot.startTime
      return endTime ? [endTime] : []
    }),
  )
  const firstEventDay = days[0]?.eventDate ?? null
  const lastEventDay = days.at(-1)?.eventDate ?? null

  return {
    days,
    cardColor: event.cardColor,
    endTime: getBoundaryTime(slotEndTimes, 'latest') ?? getDayBoundary(lastEventDay, true),
    id: event.id,
    location: getLocationName(event.location),
    name: event.name,
    primaryColor: event.primaryColor,
    registrations: eventRegistrations,
    secondaryColor: event.secondaryColor,
    slug: event.slug,
    startTime: getBoundaryTime(slotStartTimes, 'earliest') ?? getDayBoundary(firstEventDay, false),
    donation: normalizeDonation(event.donation),
    heroImage: event.meta?.image,
    useColors: event.useColors,
  }
}

type PayloadEventDay = NonNullable<Event['days']>[number]
type PayloadEventSlot = NonNullable<NonNullable<PayloadEventDay['slots']>>[number]

function serializeSlot(
  eventDate: string,
  slot: PayloadEventSlot & { id: string },
): ManagedEventSlot {
  const { end, start } = getEventSlotDateRange(eventDate, slot)

  return {
    capacity: slot.capacity ?? 0,
    endTime: end?.toISOString() ?? null,
    id: slot.id,
    label: formatEventSlotLabel(slot.startTime, slot.endTime),
    startTime: start?.toISOString() ?? null,
  }
}

function compareNullableDates(left: string | null, right: string | null) {
  if (!left && !right) return 0
  if (!left) return 1
  if (!right) return -1
  return new Date(left).getTime() - new Date(right).getTime()
}

function getBoundaryTime(values: string[], boundary: 'earliest' | 'latest') {
  const timestamps = values
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value))

  if (timestamps.length === 0) return null

  const timestamp = boundary === 'earliest' ? Math.min(...timestamps) : Math.max(...timestamps)
  return new Date(timestamp).toISOString()
}

function getDayBoundary(value: string | null, endOfDay: boolean) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  if (endOfDay) date.setHours(23, 59, 59, 999)
  else date.setHours(0, 0, 0, 0)

  return date.toISOString()
}

function getRelationshipID(value: string | { id: string }) {
  return typeof value === 'string' ? value : value.id
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeNonNegativeNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(value, 0) : 0
}

function normalizeDonation(value: Event['donation']) {
  const donation = Number(value)
  return Number.isFinite(donation) ? Math.max(donation, 0) : 0
}

function getLocationName(value: Event['location']) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const location = value as { formattedAddress?: unknown; name?: unknown }
  if (typeof location.name === 'string' && location.name.trim()) return location.name
  if (typeof location.formattedAddress === 'string' && location.formattedAddress.trim()) {
    return location.formattedAddress
  }

  return null
}
