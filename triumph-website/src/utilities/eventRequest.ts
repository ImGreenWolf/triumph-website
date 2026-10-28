import type { Payload } from 'payload'
import type { Event, User } from '@/payload-types'
import { canCheckInEvent, canManageEvent } from './eventAccess'

export async function authenticateEventRequest(
  request: Request,
  payload: Payload,
  eventId: string,
  managerOnly = false,
): Promise<{ event: Event; user: User } | { response: Response }> {
  if (request.headers.get('sec-fetch-site') === 'cross-site')
    return { response: Response.json({ message: 'Cerere nepermisă.' }, { status: 403 }) }
  const headers = new Headers(request.headers)
  headers.delete('origin')
  if (!headers.has('sec-fetch-site')) headers.set('sec-fetch-site', 'same-origin')
  const auth = await payload.auth({ headers })
  if (!auth.user)
    return {
      response: Response.json(
        { message: 'Sesiunea a expirat. Autentifică-te din nou.' },
        { status: 401 },
      ),
    }
  if (!eventId)
    return { response: Response.json({ message: 'Selectează un eveniment.' }, { status: 400 }) }
  let event: Event
  try {
    event = (await payload.findByID({
      collection: 'events',
      id: eventId,
      depth: 1,
      overrideAccess: true,
      showHiddenFields: true,
      select: {
        name: true,
        slug: true,
        days: true,
        coordonators: true,
        checkInMembers: true,
        donation: true,
        minimumConsumation: true,
        private: true,
        primaryColor: true,
        secondaryColor: true,
        cardColor: true,
        useColors: true,
        meta: true,
        location: true,
        updatedAt: true,
        registrationRevision: true,
        registrationIdentityRevision: true,
        registrationLockUntil: true,
      },
      populate: { users: { name: true, email: true, role: true } },
    })) as Event
  } catch {
    return { response: Response.json({ message: 'Evenimentul nu a fost găsit.' }, { status: 404 }) }
  }
  const user = auth.user as User
  if (!(managerOnly ? canManageEvent(event, user) : canCheckInEvent(event, user)))
    return {
      response: Response.json(
        { message: 'Nu ai permisiunea de a gestiona acest eveniment.' },
        { status: 403 },
      ),
    }
  return { event, user }
}

export function eventErrorResponse(error: unknown) {
  const status =
    error && typeof error === 'object' && 'status' in error ? Number(error.status) : 500
  return Response.json(
    { message: error instanceof Error ? error.message : 'Operațiunea nu a putut fi finalizată.' },
    { status: status >= 400 && status < 600 ? status : 500 },
  )
}
