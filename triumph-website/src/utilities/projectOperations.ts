import {
  APIError,
  commitTransaction,
  createLocalReq,
  initTransaction,
  killTransaction,
  type Payload,
  type PayloadRequest,
} from 'payload'
import type { Event, EventActivity, EventShift, EventRegistration, User } from '@/payload-types'
import { canManageEvent, getRelationshipID } from './eventAccess'
import {
  createEventOperationState,
  operationState,
  lockEvent,
  releaseEventOperation,
} from './eventOperationGuard'
import { findEventSlot } from './eventRegistration'
import { projectSummary } from './projectQueries'
import type { EventActivityItem } from './eventOperationsTypes'
import { revalidateTag } from 'next/cache'
import { eventRegistrationsTag } from './memberCachePolicy'

export { parseCountedMoneyBani as parseClosingBani } from './eventPayment'
import { parseCountedMoneyBani as parseClosingBani } from './eventPayment'
import { shiftSnapshotKey } from './eventOperationsTypes'
const reasonText = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
function requiredReason(value: unknown) {
  const reason = reasonText(value)
  if (reason.length < 5 || reason.length > 2000)
    throw new APIError('Scrie un motiv de cel puțin 5 caractere (maximum 2.000).', 400)
  return reason
}

async function writeEvent<T>(
  payload: Payload,
  event: Event,
  user: User,
  operation: (req: PayloadRequest) => Promise<T>,
  identityChange = false,
) {
  const state = createEventOperationState()
  const req = await createLocalReq({ user, context: { eventOperationState: state } }, payload)
  const ownsTransaction = await initTransaction(req)
  try {
    await lockEvent(req, event.id, identityChange)
    const result = await operation(req)
    await releaseEventOperation(payload, state, req)
    if (ownsTransaction) await commitTransaction(req)
    revalidateTag(eventRegistrationsTag(event.id), { expire: 0 })
    return result
  } catch (error) {
    await killTransaction(req)
    await releaseEventOperation(payload, state)
    throw error
  }
}

async function currentShift(
  payload: Payload,
  event: Event,
  day: string,
  slot: string,
  req?: PayloadRequest,
) {
  const position = findEventSlot(event, day, slot)
  if (!position.day?.id || !position.slot?.id) throw new APIError('Selectează o tură validă.', 400)
  const rows = await payload.find({
    collection: 'event-shifts',
    depth: 0,
    limit: 1,
    pagination: false,
    overrideAccess: true,
    req,
    where: {
      and: [{ event: { equals: event.id } }, { day: { equals: day } }, { slot: { equals: slot } }],
    },
  })
  return rows.docs[0]
}
async function saveShift(
  payload: Payload,
  event: Event,
  day: string,
  slot: string,
  previous: EventShift | undefined,
  data: Partial<EventShift>,
  req: PayloadRequest,
) {
  return previous
    ? payload.update({
        collection: 'event-shifts',
        id: previous.id,
        data,
        depth: 0,
        overrideAccess: true,
        req,
      })
    : payload.create({
        collection: 'event-shifts',
        data: { ...data, event: event.id, day, slot },
        depth: 0,
        overrideAccess: true,
        req,
      })
}
async function logShift(
  payload: Payload,
  event: Event,
  user: User,
  day: string,
  slot: string,
  action: string,
  before: EventActivity['before'],
  after: EventActivity['after'],
  reason: string,
  req: PayloadRequest,
) {
  await payload.create({
    collection: 'event-activity',
    depth: 0,
    overrideAccess: true,
    req,
    data: {
      event: event.id,
      actor: user.id,
      actorName: user.name || user.email,
      day,
      slot,
      action,
      before,
      after,
      reason,
    },
  })
}

export async function mutateProjectOperation(
  payload: Payload,
  event: Event,
  user: User,
  body: Record<string, unknown>,
) {
  const action = body.action
  const day = reasonText(body.day),
    slot = reasonText(body.slot)
  const manager = canManageEvent(event, user)
  if (action === 'undo') {
    if (!manager) throw new APIError('Doar un manager poate anula o modificare.', 403)
    const reason = requiredReason(body.reason)
    const activityId = reasonText(body.activityId)
    if (!activityId) throw new APIError('Selectează o modificare.', 400)
    return writeEvent(
      payload,
      event,
      user,
      async (req) => {
        const activity = await payload.findByID({
          collection: 'event-activity',
          id: activityId,
          depth: 0,
          overrideAccess: true,
          req,
        })
        if (getRelationshipID(activity.event) !== event.id || !activity.registration)
          throw new APIError('Modificarea nu aparține acestui eveniment.', 404)
        const registration = await payload.findByID({
          collection: 'event-registrations',
          id: getRelationshipID(activity.registration),
          depth: 0,
          overrideAccess: true,
          req,
        })
        if (
          Number(registration.operationVersion || 0) !== activity.version ||
          getRelationshipID(registration.event) !== event.id
        )
          throw new APIError(
            'Înscrierea a fost modificată ulterior. Această acțiune nu mai poate fi anulată.',
            409,
          )
        const state = operationState(req.context)
        state.undoOf = activity.id
        state.reason = reason
        state.expectedVersion = activity.version
        state.capacityOverrideReason = reasonText(body.capacityOverrideReason)
        const before = activity.before as Record<string, unknown> | null
        const restored = before
          ? Object.fromEntries(
              Object.entries(before).filter(([key]) =>
                [
                  'ageGroup',
                  'consumptionAmount',
                  'day',
                  'donation',
                  'email',
                  'guests',
                  'name',
                  'phone',
                  'questions',
                  'slot',
                  'status',
                  'timeOfArrival',
                ].includes(key),
              ),
            )
          : { status: 'cancelled' }
        const updated = await payload.update({
          collection: 'event-registrations',
          id: registration.id,
          depth: 0,
          overrideAccess: true,
          user,
          req,
          data: {
            ...restored,
            name: restored.name || registration.name,
          } as Partial<EventRegistration>,
        })
        return {
          message: 'Modificarea a fost anulată și păstrată în istoric.',
          registration: updated,
        }
      },
      true,
    )
  }
  if (!['save-shift', 'close-shift', 'reopen-shift'].includes(String(action)))
    throw new APIError('Acțiune necunoscută.', 400)
  if (!day || !slot) throw new APIError('Selectează o tură.', 400)
  if (action !== 'save-shift' && !manager)
    throw new APIError('Doar un manager poate închide sau redeschide o tură.', 403)
  return writeEvent(payload, event, user, async (req) => {
    const previous = await currentShift(payload, event, day, slot, req)
    const actor = user.name || user.email
    if (action === 'save-shift') {
      if (
        typeof body.expectedUpdatedAt !== 'string' ||
        body.expectedUpdatedAt !== (previous?.updatedAt || '')
      )
        throw new APIError(
          'Nota sau echipa au fost actualizate de alt membru. Reîncarcă înainte de salvare.',
          409,
        )
      const assigned = (previous?.members ?? []).map(getRelationshipID)
      if (!manager && assigned.length && !assigned.includes(user.id))
        throw new APIError('Doar echipa acestei ture poate edita nota de predare.', 403)
      const note = reasonText(body.handoverNote)
      if (note.length > 5000) throw new APIError('Nota poate avea maximum 5.000 de caractere.', 400)
      let members = assigned
      if (body.memberIds !== undefined) {
        if (
          !manager ||
          !Array.isArray(body.memberIds) ||
          !body.memberIds.every((id) => typeof id === 'string')
        )
          throw new APIError('Doar un manager poate atribui echipa turei.', 403)
        const eligible = new Set((event.checkInMembers ?? []).map(getRelationshipID))
        if (body.memberIds.some((id) => !eligible.has(id)))
          throw new APIError('Selectează membri din echipa evenimentului.', 400)
        members = [...new Set(body.memberIds)]
      }
      const updated = await saveShift(
        payload,
        event,
        day,
        slot,
        previous,
        { members, handoverNote: note, updatedBy: actor },
        req,
      )
      await logShift(
        payload,
        event,
        user,
        day,
        slot,
        'shift-handover',
        { members: assigned, handoverNote: previous?.handoverNote || '' },
        { members, handoverNote: note },
        '',
        req,
      )
      return { message: 'Echipa și nota turei au fost salvate.', shift: updated }
    }
    if (action === 'reopen-shift') {
      if (!previous?.closing) throw new APIError('Tura este deja deschisă.', 409)
      if (body.closingId !== getRelationshipID(previous.closing))
        throw new APIError('Închiderea turei s-a schimbat. Reîncarcă înainte de redeschidere.', 409)
      const reason = requiredReason(body.reason)
      await saveShift(payload, event, day, slot, previous, { closing: null, updatedBy: actor }, req)
      await logShift(
        payload,
        event,
        user,
        day,
        slot,
        'shift-reopen',
        { closing: getRelationshipID(previous.closing) },
        { closing: null },
        reason,
        req,
      )
      return { message: 'Tura a fost redeschisă. Închiderea anterioară rămâne în istoric.' }
    }
    if (previous?.closing) throw new APIError('Tura este deja închisă.', 409)
    const summary = await projectSummary(payload, event, req)
    const totals = summary.slots.find((row) => row.day === day && row.slot === slot)!
    if (body.snapshot !== shiftSnapshotKey(totals))
      throw new APIError(
        'Totalurile turei s-au schimbat. Reîncarcă și verifică încasările înainte de confirmare.',
        409,
      )
    const counted = parseClosingBani(body.countedAmount)
    if (counted === null)
      throw new APIError('Introdu totalul numărat cu maximum două zecimale.', 400)
    const donation = Math.round(totals.donation * 100),
      consumption = Math.round(totals.consumptionAmount * 100)
    const difference = counted - donation - consumption
    if (totals.legacyConsumptionCount && body.legacyAcknowledged !== true)
      throw new APIError(
        'Confirmă verificarea încasărilor istorice fără consumație înregistrată separat.',
        400,
      )
    const note =
      difference || totals.legacyConsumptionCount
        ? requiredReason(body.note)
        : reasonText(body.note)
    if (note.length > 2000) throw new APIError('Nota poate avea maximum 2.000 de caractere.', 400)
    const closing = await payload.create({
      collection: 'event-closings',
      depth: 0,
      overrideAccess: true,
      req,
      data: {
        event: event.id,
        day,
        slot,
        actor: user.id,
        actorName: actor,
        donation: donation / 100,
        consumptionAmount: consumption / 100,
        totalCollected: (donation + consumption) / 100,
        countedAmount: counted / 100,
        difference: difference / 100,
        people: totals.presentPeople,
        legacyConsumptionCount: totals.legacyConsumptionCount,
        legacyAcknowledged: body.legacyAcknowledged === true,
        note,
        revision: (operationState(req.context).revision || 1) - 1,
      },
    })
    await saveShift(
      payload,
      event,
      day,
      slot,
      previous,
      { closing: closing.id, updatedBy: actor },
      req,
    )
    await logShift(
      payload,
      event,
      user,
      day,
      slot,
      'shift-close',
      null,
      {
        closing: closing.id,
        totalCollected: closing.totalCollected,
        countedAmount: closing.countedAmount,
        difference: closing.difference,
      },
      note,
      req,
    )
    return { message: 'Tura a fost închisă. Totalurile și diferența au fost păstrate.', closing }
  })
}

export async function projectActivity(
  payload: Payload,
  event: Event,
  user: User,
  params: URLSearchParams,
) {
  const page = Math.max(1, Math.floor(Number(params.get('page')) || 1))
  const registration = params.get('registrationId')
  const result = await payload.find({
    collection: 'event-activity',
    depth: 0,
    limit: 25,
    page,
    sort: '-createdAt',
    overrideAccess: true,
    where: {
      and: [
        { event: { equals: event.id } },
        ...(registration ? [{ registration: { equals: registration } }] : []),
      ],
    },
  })
  const ids = result.docs.flatMap((row) =>
    row.registration ? [getRelationshipID(row.registration)] : [],
  )
  const current = ids.length
    ? await payload.find({
        collection: 'event-registrations',
        depth: 0,
        limit: 0,
        pagination: false,
        overrideAccess: true,
        select: { operationVersion: true },
        where: { and: [{ event: { equals: event.id } }, { id: { in: ids } }] },
      })
    : { docs: [] }
  const versions = new Map(current.docs.map((row) => [row.id, row.operationVersion || 0]))
  const items: EventActivityItem[] = result.docs.map((row) => {
    const before = (row.before || {}) as Record<string, unknown>,
      after = (row.after || {}) as Record<string, unknown>
    const registrationId = getRelationshipID(row.registration)
    return {
      id: row.id,
      action: row.action,
      actorName: row.actorName,
      createdAt: row.createdAt,
      registrationId,
      participantName: String(after.name || before.name || ''),
      reason: row.reason || '',
      version: row.version || 0,
      canUndo:
        canManageEvent(event, user) &&
        Boolean(registrationId) &&
        versions.get(registrationId) === row.version,
      changes: [...new Set([...Object.keys(before), ...Object.keys(after)])]
        .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
        .map((field) => ({ field, before: before[field] ?? null, after: after[field] ?? null })),
    }
  })
  return {
    items,
    page: result.page || 1,
    totalPages: result.totalPages,
    totalDocs: result.totalDocs,
  }
}
