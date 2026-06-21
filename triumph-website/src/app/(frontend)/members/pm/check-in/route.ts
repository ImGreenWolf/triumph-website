import payloadConfig from '@payload-config'
import { getPayload } from 'payload'

import type { Event, EventRegistration, User } from '@/payload-types'

const allowedStatuses = new Set(['registered', 'present', 'absent'])

export async function PATCH(request: Request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return Response.json({ message: 'Cerere nepermisă.' }, { status: 403 })
  }

  const payload = await getPayload({ config: payloadConfig })
  const authHeaders = new Headers(request.headers)
  // The browser Origin can differ from Payload's configured public serverURL in local
  // development or behind a proxy. Cross-site requests were rejected above, so let
  // Payload validate the cookie using the browser-controlled Sec-Fetch-Site header.
  authHeaders.delete('origin')
  if (!authHeaders.has('sec-fetch-site')) {
    authHeaders.set('sec-fetch-site', 'same-origin')
  }
  const auth = await payload.auth({ headers: authHeaders })

  if (!auth.user) {
    return Response.json(
      { message: 'Sesiunea a expirat. Autentifică-te din nou.' },
      { status: 401 },
    )
  }

  let input: unknown

  try {
    input = await request.json()
  } catch {
    return Response.json({ message: 'Datele trimise nu sunt valide.' }, { status: 400 })
  }

  const body = input as Record<string, unknown>
  const registrationID = typeof body.registrationId === 'string' ? body.registrationId : ''
  const status = typeof body.status === 'string' ? body.status : ''
  const donation = typeof body.donation === 'number' ? body.donation : Number(body.donation)
  const guests = typeof body.guests === 'number' ? body.guests : Number(body.guests)

  if (!registrationID || !allowedStatuses.has(status)) {
    return Response.json({ message: 'Selectează o înscriere și un status valid.' }, { status: 400 })
  }

  if (!Number.isFinite(donation) || donation < 0 || donation > 1_000_000) {
    return Response.json(
      { message: 'Suma donată trebuie să fie un număr pozitiv.' },
      { status: 400 },
    )
  }

  if (!Number.isInteger(guests) || guests < 0 || guests > 50) {
    return Response.json(
      { message: 'Numărul de însoțitori trebuie să fie între 0 și 50.' },
      { status: 400 },
    )
  }

  let registration: EventRegistration

  try {
    registration = (await payload.findByID({
      collection: 'event-registrations',
      depth: 0,
      id: registrationID,
      overrideAccess: true,
    })) as EventRegistration
  } catch {
    return Response.json({ message: 'Înscrierea nu a fost găsită.' }, { status: 404 })
  }

  if (registration.status === 'cancelled') {
    return Response.json(
      { message: 'O înscriere anulată nu poate fi procesată la check-in.' },
      { status: 409 },
    )
  }

  const eventID = getRelationshipID(registration.event)
  const event = (await payload.findByID({
    collection: 'events',
    depth: 0,
    id: eventID,
    overrideAccess: true,
  })) as Event
  const user = auth.user as User
  const canManage = (event.coordonators ?? []).some(
    (coordinator) => getRelationshipID(coordinator) === user.id,
  )

  if (!canManage) {
    return Response.json(
      { message: 'Nu ai permisiunea de a gestiona acest eveniment.' },
      { status: 403 },
    )
  }

  const minimumDonation = normalizeDonation(event.donation)
  if (status === 'present' && donation < minimumDonation) {
    return Response.json(
      { message: `Donația minimă pentru acest eveniment este de ${minimumDonation} RON.` },
      { status: 400 },
    )
  }

  const updated = (await payload.update({
    collection: 'event-registrations',
    data: {
      donation,
      guests,
      name: registration.name?.trim() || registration.email || 'Participant fără nume',
      phone: registration.phone?.trim() || 'Nespecificat',
      status: status as 'registered' | 'present' | 'absent',
      timeOfArrival:
        status === 'present' ? registration.timeOfArrival || new Date().toISOString() : null,
    },
    id: registrationID,
    overrideAccess: true,
  })) as EventRegistration

  return Response.json({
    registration: {
      donation: updated.donation ?? 0,
      guests: updated.guests ?? 0,
      id: updated.id,
      status: updated.status ?? 'registered',
      timeOfArrival: updated.timeOfArrival ?? null,
    },
  })
}

function getRelationshipID(value: string | { id: string }) {
  return typeof value === 'string' ? value : value.id
}

function normalizeDonation(value: Event['donation']) {
  const donation = Number(value)
  return Number.isFinite(donation) ? Math.max(donation, 0) : 0
}
