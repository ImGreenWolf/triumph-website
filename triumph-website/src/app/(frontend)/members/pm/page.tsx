import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import payloadConfig from '@payload-config'
import { getPayload } from 'payload'

import type { Event, EventRegistration, User } from '@/payload-types'
import { formatEventDayLabel, formatEventSlotLabel } from '@/utilities/eventRegistration'
import { getPayloadAuthHeaders } from '@/utilities/payloadAuth'

import ProjectManagerDashboard, { type ManagedEvent } from './ProjectManagerDashboard'

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
    depth: 0,
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
    .sort((left, right) => left.startDate.localeCompare(right.startDate))

  return <ProjectManagerDashboard events={managedEvents} userName={user.name || user.email} />
}

function serializeEvent(event: Event, registrations: EventRegistration[]): ManagedEvent {
  const days = (event.days ?? [])
    .filter((day): day is NonNullable<Event['days']>[number] & { eventDate: string; id: string } =>
      Boolean(day?.eventDate && day.id),
    )
    .map((day) => ({
      date: day.eventDate,
      id: day.id,
      label: formatEventDayLabel(day.eventDate),
      slots: (day.slots ?? [])
        .filter(
          (slot): slot is NonNullable<NonNullable<typeof day.slots>[number]> & { id: string } =>
            Boolean(slot?.id),
        )
        .map((slot) => ({
          capacity: slot.capacity ?? 0,
          endTime: slot.endTime ?? null,
          id: slot.id,
          label: formatEventSlotLabel(slot.startTime, slot.endTime),
          startTime: slot.startTime ?? null,
        })),
    }))
    .sort((left, right) => left.date.localeCompare(right.date))
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
        timeOfArrival: registration.timeOfAriival ?? null,
      }
    })
  const dateValues = days.map((day) => day.date)

  return {
    days,
    endDate: dateValues.at(-1) ?? event.updatedAt,
    id: event.id,
    location: getLocationName(event.location),
    name: event.name,
    registrations: eventRegistrations,
    slug: event.slug,
    startDate: dateValues[0] ?? event.createdAt,
  }
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

function getLocationName(value: Event['location']) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const location = value as { formattedAddress?: unknown; name?: unknown }
  if (typeof location.name === 'string' && location.name.trim()) return location.name
  if (typeof location.formattedAddress === 'string' && location.formattedAddress.trim()) {
    return location.formattedAddress
  }

  return null
}
