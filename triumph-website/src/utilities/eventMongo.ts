import type { Payload, PayloadRequest } from 'payload'
import { APIError } from 'payload'
import type { PipelineStage } from 'mongoose'
import { activePeople } from './eventPeople'

export function eventModel(payload: Payload, slug: string) {
  const model = payload.db.collections?.[slug]
  if (!model) throw new APIError('Baza de date a evenimentului nu este disponibilă.', 503)
  return model
}

export async function eventSession(req?: PayloadRequest) {
  const transaction = await req?.transactionID
  return transaction ? req?.payload.db.sessions?.[String(transaction)] : undefined
}

export function mongoID(payload: Payload, collection: string, path: string, id: string) {
  return eventModel(payload, collection).schema.path(path).cast(id)
}

export async function eventAggregate<T>(
  payload: Payload,
  pipeline: PipelineStage[],
  req?: PayloadRequest,
) {
  const query = eventModel(payload, 'event-registrations')
    .aggregate<T>(pipeline)
    .collation({ locale: 'ro', strength: 2 })
  const session = await eventSession(req)
  if (session) query.session(session)
  return query.exec()
}

export const peopleExpression = { $add: [1, { $max: [0, { $ifNull: ['$guests', 0] }] }] }
export const donationBaniExpression = {
  $round: [{ $multiply: [{ $ifNull: ['$donation', 0] }, 100] }, 0],
}
export const consumptionBaniExpression = {
  $round: [{ $multiply: [{ $ifNull: ['$consumptionAmount', 0] }, 100] }, 0],
}

export async function slotPeople(
  payload: Pick<Payload, 'find'> & Partial<Pick<Payload, 'db'>>,
  event: string,
  day: string,
  slot: string,
  req?: PayloadRequest,
) {
  if (!payload.db?.collections?.['event-registrations']) {
    const rows = await payload.find({
      collection: 'event-registrations',
      depth: 0,
      limit: 0,
      pagination: false,
      overrideAccess: true,
      req,
      select: { guests: true, status: true },
      where: {
        and: [
          { event: { equals: event } },
          { day: { equals: day } },
          { slot: { equals: slot } },
          { status: { not_equals: 'cancelled' } },
        ],
      },
    })
    return activePeople(rows.docs)
  }
  const mongoPayload = payload as Payload
  const result = await eventAggregate<{ people: number }>(
    mongoPayload,
    [
      {
        $match: {
          event: mongoID(mongoPayload, 'event-registrations', 'event', event),
          day,
          slot,
          status: { $ne: 'cancelled' },
        },
      },
      { $group: { _id: null, people: { $sum: peopleExpression } } },
    ],
    req,
  )
  return result[0]?.people ?? 0
}
