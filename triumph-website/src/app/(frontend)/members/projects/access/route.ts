import payloadConfig from '@payload-config'
import { getPayload, type Payload } from 'payload'

import type { Event, User } from '@/payload-types'
import { canManageEvent, getRelationshipID } from '@/utilities/eventAccess'
import { boardRoles } from '@/utilities/membersAccess'

type CheckInMember = {
  email: string
  id: string
  name: string
  role: User['role']
}

export async function GET(request: Request) {
  const payload = await getPayload({ config: payloadConfig })
  const authentication = await authenticateRequest(request, payload)
  if ('response' in authentication) return authentication.response

  const eventID = new URL(request.url).searchParams.get('eventId')?.trim()
  if (!eventID) {
    return Response.json({ message: 'Selectează un eveniment.' }, { status: 400 })
  }

  const event = await findEvent(payload, eventID)
  if (!event) {
    return Response.json({ message: 'Evenimentul nu a fost găsit.' }, { status: 404 })
  }

  if (!canManageEvent(event, authentication.user)) {
    return Response.json(
      { message: 'Nu ai permisiunea de a gestiona accesul pentru acest eveniment.' },
      { status: 403 },
    )
  }

  const users = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 0,
    overrideAccess: true,
    pagination: false,
    sort: 'name',
    where: {
      role: {
        not_in: [...boardRoles],
      },
    },
  })
  const candidates = (users.docs as User[]).map(serializeUser)
  const selectedIDs = getCheckInMemberIDs(event)

  return Response.json({
    candidates,
    members: candidates.filter((candidate) => selectedIDs.includes(candidate.id)),
  })
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

  const body = input as Record<string, unknown>
  const eventID = typeof body.eventId === 'string' ? body.eventId.trim() : ''
  const memberIDs = Array.isArray(body.memberIds)
    ? [
        ...new Set(
          body.memberIds
            .filter((id): id is string => typeof id === 'string')
            .map((id) => id.trim())
            .filter(Boolean),
        ),
      ]
    : []

  if (!eventID) {
    return Response.json({ message: 'Selectează un eveniment.' }, { status: 400 })
  }

  const event = await findEvent(payload, eventID)
  if (!event) {
    return Response.json({ message: 'Evenimentul nu a fost găsit.' }, { status: 404 })
  }

  if (!canManageEvent(event, authentication.user)) {
    return Response.json(
      { message: 'Nu ai permisiunea de a gestiona accesul pentru acest eveniment.' },
      { status: 403 },
    )
  }

  const validUsers = memberIDs.length
    ? await payload.find({
        collection: 'users',
        depth: 0,
        limit: 0,
        overrideAccess: true,
        pagination: false,
        where: {
          and: [
            {
              id: {
                in: memberIDs,
              },
            },
            {
              role: {
                not_in: [...boardRoles],
              },
            },
          ],
        },
      })
    : { docs: [] }
  const validMemberIDs = (validUsers.docs as User[]).map((user) => String(user.id))

  if (validMemberIDs.length !== memberIDs.length) {
    return Response.json(
      { message: 'Lista conține membri care nu pot primi acces la check-in.' },
      { status: 400 },
    )
  }

  const updated = (await payload.update({
    collection: 'events',
    data: {
      checkInMembers: validMemberIDs,
    },
    depth: 1,
    id: eventID,
    overrideAccess: true,
    user: authentication.user,
  })) as Event

  const selectedIDs = getCheckInMemberIDs(updated)
  const candidates = (validUsers.docs as User[]).map(serializeUser)

  return Response.json({
    members: candidates.filter((candidate) => selectedIDs.includes(candidate.id)),
  })
}

async function authenticateRequest(request: Request, payload: Payload) {
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

async function findEvent(payload: Payload, eventID: string) {
  try {
    return (await payload.findByID({
      collection: 'events',
      depth: 1,
      id: eventID,
      overrideAccess: true,
    })) as Event
  } catch {
    return null
  }
}

function getCheckInMemberIDs(event: Event) {
  return ((event as Event & { checkInMembers?: unknown[] }).checkInMembers ?? [])
    .map(getRelationshipID)
    .filter(Boolean)
}

function serializeUser(user: User): CheckInMember {
  return {
    email: user.email,
    id: String(user.id),
    name: user.name || user.email,
    role: user.role,
  }
}
