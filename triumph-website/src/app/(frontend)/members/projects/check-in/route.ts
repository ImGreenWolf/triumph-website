import payloadConfig from '@payload-config'
import { getPayload, type Payload } from 'payload'

import type { Event, EventRegistration, User } from '@/payload-types'
import { canCheckInEvent, canManageEvent, getRelationshipID } from '@/utilities/eventAccess'
import { findEventSlot } from '@/utilities/eventRegistration'
import { AGE_GROUP_ERROR, calculateEventPayment, isAgeGroup } from '@/utilities/eventPayment'

const allowedStatuses = new Set(['registered', 'present', 'absent'])

export async function POST(request: Request) {
  const payload = await getPayload({ config: payloadConfig })
  const authentication = await authenticateRequest(request, payload)
  if ('response' in authentication) return authentication.response

  let input: unknown

  try {
    input = await request.json()
  } catch {
    return Response.json({ message: 'Datele trimise nu sunt valide.' }, { status: 400 })
  }

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return Response.json({ message: 'Datele trimise nu sunt valide.' }, { status: 400 })
  }
  const body = input as Record<string, unknown>
  const eventID = normalizeText(body.eventId)
  const dayID = normalizeText(body.dayId)
  const slotID = normalizeText(body.slotId)
  const name = normalizeText(body.name)
  const email = normalizeText(body.email).toLocaleLowerCase('ro')
  const phone = normalizeText(body.phone)
  const ageGroup = body.ageGroup
  const guests = body.guests === undefined ? 0 : Number(body.guests)

  if (!eventID || !dayID || !slotID) {
    return Response.json({ message: 'Selectează ziua și tura participantului.' }, { status: 400 })
  }

  if (!name || name.length > 160) {
    return Response.json({ message: 'Completează numele participantului.' }, { status: 400 })
  }

  if (email && !isValidEmail(email)) {
    return Response.json({ message: 'Adresa de email nu este validă.' }, { status: 400 })
  }

  if (phone.length > 50) {
    return Response.json({ message: 'Numărul de telefon este prea lung.' }, { status: 400 })
  }

  if (!isAgeGroup(ageGroup)) {
    return Response.json({ message: AGE_GROUP_ERROR }, { status: 400 })
  }

  if (!Number.isInteger(guests) || guests < 0 || guests > 50) {
    return Response.json(
      { message: 'Numărul de însoțitori trebuie să fie între 0 și 50.' },
      { status: 400 },
    )
  }

  let event: Event

  try {
    event = (await payload.findByID({
      collection: 'events',
      depth: 0,
      id: eventID,
      overrideAccess: true,
    })) as Event
  } catch {
    return Response.json({ message: 'Evenimentul nu a fost găsit.' }, { status: 404 })
  }

  if (!canCheckInEvent(event, authentication.user)) {
    return Response.json(
      { message: 'Nu ai permisiunea de a gestiona acest eveniment.' },
      { status: 403 },
    )
  }

  const { day, slot } = findEventSlot(event, dayID, slotID)
  if (!day?.id || !slot?.id) {
    return Response.json({ message: 'Tura selectată nu mai există.' }, { status: 400 })
  }

  const payment = calculateEventPayment(event, guests, body.totalCollected)
  if (payment.error) return Response.json({ message: payment.error }, { status: 400 })

  try {
    const created = (await payload.create({
      collection: 'event-registrations',
      context: {
        eventRegistrationWalkIn: true,
      },
      data: {
        ageGroup,
        consumptionAmount: payment.consumptionAmount,
        day: day.id,
        donation: payment.donation!,
        email: email || undefined,
        event: event.id,
        guests,
        name,
        phone: phone || undefined,
        slot: slot.id,
        status: 'present',
        timeOfArrival: new Date().toISOString(),
      },
      overrideAccess: true,
      user: authentication.user,
    })) as EventRegistration

    return Response.json(
      {
        registration: serializeRegistration(created),
      },
      { status: 201 },
    )
  } catch (error) {
    return Response.json(
      {
        message: error instanceof Error ? error.message : 'Participantul nu a putut fi adăugat.',
      },
      { status: getErrorStatus(error) },
    )
  }
}

export async function PATCH(request: Request) {
  const payload = await getPayload({ config: payloadConfig })
  const authentication = await authenticateRequest(request, payload)
  if ('response' in authentication) return authentication.response

  let input: unknown

  try {
    input = await request.json()
  } catch {
    return Response.json({ message: 'Datele trimise nu sunt valide.' }, { status: 400 })
  }

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return Response.json({ message: 'Datele trimise nu sunt valide.' }, { status: 400 })
  }
  const body = input as Record<string, unknown>
  const registrationID = typeof body.registrationId === 'string' ? body.registrationId : ''
  const status = typeof body.status === 'string' ? body.status : ''

  if (!registrationID || !allowedStatuses.has(status)) {
    return Response.json({ message: 'Selectează o înscriere și un status valid.' }, { status: 400 })
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
  if (!canCheckInEvent(event, authentication.user)) {
    return Response.json(
      { message: 'Nu ai permisiunea de a gestiona acest eveniment.' },
      { status: 403 },
    )
  }

  let paymentData = {}
  if (status === 'present') {
    if (!isAgeGroup(body.ageGroup)) {
      return Response.json({ message: AGE_GROUP_ERROR }, { status: 400 })
    }
    const guests = body.guests === undefined ? (registration.guests ?? 0) : Number(body.guests)
    const payment = calculateEventPayment(event, guests, body.totalCollected)
    if (payment.error) return Response.json({ message: payment.error }, { status: 400 })
    paymentData = {
      ageGroup: body.ageGroup,
      consumptionAmount: payment.consumptionAmount,
      donation: payment.donation!,
      guests,
    }
  }

  const updated = (await payload.update({
    collection: 'event-registrations',
    data: {
      ...paymentData,
      name: registration.name?.trim() || registration.email || 'Participant fără nume',
      phone: registration.phone?.trim() || undefined,
      status: status as 'registered' | 'present' | 'absent',
      timeOfArrival:
        status === 'present' ? registration.timeOfArrival || new Date().toISOString() : null,
    },
    id: registrationID,
    overrideAccess: true,
  })) as EventRegistration

  return Response.json({
    registration: serializeRegistration(updated),
  })
}

export async function DELETE(request: Request) {
  const payload = await getPayload({ config: payloadConfig })
  const authentication = await authenticateRequest(request, payload)
  if ('response' in authentication) return authentication.response

  let input: unknown

  try {
    input = await request.json()
  } catch {
    return Response.json({ message: 'Datele trimise nu sunt valide.' }, { status: 400 })
  }

  const body = input as Record<string, unknown>
  const registrationID = typeof body.registrationId === 'string' ? body.registrationId : ''

  if (!registrationID) {
    return Response.json({ message: 'Selectează o înscriere validă.' }, { status: 400 })
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

  const eventID = getRelationshipID(registration.event)
  const event = (await payload.findByID({
    collection: 'events',
    depth: 0,
    id: eventID,
    overrideAccess: true,
  })) as Event

  if (!canManageEvent(event, authentication.user)) {
    return Response.json(
      { message: 'Nu ai permisiunea de a gestiona acest eveniment.' },
      { status: 403 },
    )
  }

  const updated = (await payload.update({
    collection: 'event-registrations',
    data: {
      status: 'cancelled',
      timeOfArrival: null,
    },
    id: registrationID,
    overrideAccess: true,
  })) as EventRegistration

  return Response.json({
    registration: {
      id: updated.id,
      status: updated.status ?? 'cancelled',
      timeOfArrival: updated.timeOfArrival ?? null,
    },
  })
}

async function authenticateRequest(
  request: Request,
  payload: Payload,
): Promise<{ response: Response } | { user: User }> {
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return { response: Response.json({ message: 'Cerere nepermisă.' }, { status: 403 }) }
  }

  const authHeaders = new Headers(request.headers)
  authHeaders.delete('origin')
  if (!authHeaders.has('sec-fetch-site')) {
    authHeaders.set('sec-fetch-site', 'same-origin')
  }
  const auth = await payload.auth({ headers: authHeaders })

  if (!auth.user) {
    return {
      response: Response.json(
        { message: 'Sesiunea a expirat. Autentifică-te din nou.' },
        { status: 401 },
      ),
    }
  }

  return { user: auth.user as User }
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function serializeRegistration(registration: EventRegistration) {
  return {
    ageGroup: registration.ageGroup ?? null,
    consumptionAmount: registration.consumptionAmount ?? null,
    createdAt: registration.createdAt,
    day: registration.day,
    donation: registration.donation ?? 0,
    email: registration.email ?? '',
    guests: registration.guests ?? 0,
    id: registration.id,
    name: registration.name,
    phone: registration.phone ?? '',
    questions: registration.questions ?? null,
    slot: registration.slot,
    status: registration.status,
    timeOfArrival: registration.timeOfArrival ?? null,
  }
}

function getErrorStatus(error: unknown) {
  if (!error || typeof error !== 'object' || !('status' in error)) return 400
  const status = Number(error.status)
  return Number.isInteger(status) && status >= 400 && status < 600 ? status : 400
}
