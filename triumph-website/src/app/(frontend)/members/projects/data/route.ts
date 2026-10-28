import { createHash } from 'node:crypto'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'
import { authenticateEventRequest, eventErrorResponse } from '@/utilities/eventRequest'
import { queryProjectPage, serializeProjectRegistration } from '@/utilities/projectQueries'
import { exportProjectCSV } from '@/utilities/projectExport'
import { slotPeople } from '@/utilities/eventMongo'
import { findEventSlot } from '@/utilities/eventRegistration'

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const payload = await getPayload({ config: payloadConfig })
  const authentication = await authenticateEventRequest(
    request,
    payload,
    params.get('eventId') || '',
    params.get('export') === '1',
  )
  if ('response' in authentication) return authentication.response
  const { event, user } = authentication
  if (event.registrationLockUntil && Date.parse(event.registrationLockUntil) > Date.now())
    return Response.json(
      { message: 'Se salvează o modificare. Lista se va actualiza automat.' },
      { status: 503, headers: { 'Retry-After': '1', 'Cache-Control': 'private, no-store' } },
    )
  try {
    if (params.get('capacity') === '1') {
      const day = params.get('day') || '',
        slot = params.get('slot') || ''
      if (!findEventSlot(event, day, slot).slot)
        return Response.json({ message: 'Selectează o tură validă.' }, { status: 400 })
      return Response.json(
        { people: await slotPeople(payload, event.id, day, slot) },
        { headers: { 'Cache-Control': 'private, no-store' } },
      )
    }
    if (params.get('registrationId')) {
      const result = await payload.find({
        collection: 'event-registrations',
        depth: 0,
        limit: 1,
        pagination: false,
        overrideAccess: true,
        where: {
          and: [{ event: { equals: event.id } }, { id: { equals: params.get('registrationId') } }],
        },
      })
      if (!result.docs[0])
        return Response.json(
          { message: 'Înscrierea scanată nu aparține acestui eveniment.' },
          { status: 404 },
        )
      return Response.json(
        {
          registration: serializeProjectRegistration(
            result.docs[0] as unknown as Record<string, unknown>,
          ),
        },
        { headers: { 'Cache-Control': 'private, no-store' } },
      )
    }
    if (params.get('export') === '1') return exportProjectCSV(payload, event)
    const etag = `"${createHash('sha256')
      .update(
        `${user.id}:${event.id}:${event.updatedAt}:${event.registrationRevision || 0}:${params.toString()}`,
      )
      .digest('hex')}"`
    const headers = { ETag: etag, 'Cache-Control': 'private, no-store' }
    if (request.headers.get('if-none-match') === etag)
      return new Response(null, { status: 304, headers })
    return Response.json(await queryProjectPage(payload, event, user, params), { headers })
  } catch (error) {
    return eventErrorResponse(error)
  }
}
