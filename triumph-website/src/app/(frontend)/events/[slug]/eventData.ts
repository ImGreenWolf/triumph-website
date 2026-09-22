import configPromise from '@payload-config'
import { draftMode } from 'next/headers'
import { getPayload } from 'payload'
import { cache } from 'react'

import type { Event, EventRegistration } from '@/payload-types'
import { getEventSlotAvailability } from '@/utilities/eventRegistration'

export const queryEventBySlug = cache(async ({ slug }: { slug: string }) => {
  const { isEnabled: draft } = await draftMode()
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'events',
    draft,
    limit: 1,
    overrideAccess: draft,
    pagination: false,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return (result.docs?.[0] as Event | undefined) || null
})

export async function getEventSignupData(event: Event) {
  const payload = await getPayload({ config: configPromise })
  const registrations = await payload.find({
    collection: 'event-registrations',
    depth: 0,
    limit: 0,
    overrideAccess: true,
    pagination: false,
    select: {
      day: true,
      donation: true,
      slot: true,
      status: true,
    },
    where: {
      event: {
        equals: event.id,
      },
    },
  })
  const docs = registrations.docs as Pick<
    EventRegistration,
    'day' | 'donation' | 'slot' | 'status'
  >[]
  const participantsCount = docs.filter(
    (registration) => registration.status !== 'cancelled',
  ).length

  return {
    participantsCount,
    registrations: docs,
    signupEvent: {
      capacity: event.capacity,
      days: event.days,
      donation: event.donation,
      id: event.id,
      minimumConsumation: event.minimumConsumation,
      name: event.name,
      participantsCount,
      private: event.private,
      signupMessage: event.signupMessage,
      totalDonation: getTotalDonations(docs),
    },
    slotAvailability: getEventSlotAvailability({
      event,
      registrations: docs,
    }),
  }
}

function getTotalDonations(registrations: Pick<EventRegistration, 'donation' | 'status'>[]) {
  return registrations.reduce((sum, registration) => sum + (registration.donation ?? 0), 0)
}
