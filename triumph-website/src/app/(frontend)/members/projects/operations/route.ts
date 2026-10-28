import { getPayload } from 'payload'
import payloadConfig from '@payload-config'
import { authenticateEventRequest, eventErrorResponse } from '@/utilities/eventRequest'
import { mutateProjectOperation, projectActivity } from '@/utilities/projectOperations'
import { csvCell } from '@/utilities/projectExport'

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const payload = await getPayload({ config: payloadConfig })
  const auth = await authenticateEventRequest(
    request,
    payload,
    params.get('eventId') || '',
    Boolean(params.get('closingId')),
  )
  if ('response' in auth) return auth.response
  try {
    const closingId = params.get('closingId')
    if (closingId) {
      const closing = await payload.findByID({
        collection: 'event-closings',
        id: closingId,
        depth: 0,
        overrideAccess: true,
      })
      const eventId = typeof closing.event === 'string' ? closing.event : closing.event.id
      if (eventId !== auth.event.id)
        return Response.json(
          { message: 'Închiderea nu aparține acestui eveniment.' },
          { status: 404 },
        )
      const rows = [
        [
          'Eveniment',
          'Zi',
          'Tură',
          'Verificat de',
          'Data',
          'Donații RON',
          'Consumație RON',
          'Total înregistrat RON',
          'Total verificat RON',
          'Diferență RON',
          'Persoane',
          'Încasări istorice fără consumație separată',
          'Notă',
        ],
        [
          auth.event.name,
          closing.day,
          closing.slot,
          closing.actorName,
          closing.createdAt,
          closing.donation.toFixed(2),
          closing.consumptionAmount.toFixed(2),
          closing.totalCollected.toFixed(2),
          closing.countedAmount.toFixed(2),
          closing.difference.toFixed(2),
          closing.people,
          closing.legacyConsumptionCount,
          closing.note || '',
        ],
      ]
      return new Response('\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n'), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="inchidere-tura.csv"',
          'Cache-Control': 'private, no-store',
        },
      })
    }
    return Response.json(await projectActivity(payload, auth.event, auth.user, params), {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error) {
    return eventErrorResponse(error)
  }
}
export async function POST(request: Request) {
  let input: unknown
  try {
    input = await request.json()
  } catch {
    return Response.json({ message: 'Date invalide.' }, { status: 400 })
  }
  if (!input || typeof input !== 'object' || Array.isArray(input))
    return Response.json({ message: 'Date invalide.' }, { status: 400 })
  const body = input as Record<string, unknown>
  const payload = await getPayload({ config: payloadConfig })
  const auth = await authenticateEventRequest(
    request,
    payload,
    typeof body.eventId === 'string' ? body.eventId : '',
  )
  if ('response' in auth) return auth.response
  try {
    return Response.json(await mutateProjectOperation(payload, auth.event, auth.user, body))
  } catch (error) {
    return eventErrorResponse(error)
  }
}
