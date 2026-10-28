import { APIError, type CollectionBeforeChangeHook, type CollectionAfterChangeHook } from 'payload'
import type { EventRegistration } from '@/payload-types'
import { canManageEvent, getRelationshipID } from '@/utilities/eventAccess'
import { findEventSlot } from '@/utilities/eventRegistration'
import { registrationPeople } from '@/utilities/eventPeople'
import { slotPeople } from '@/utilities/eventMongo'
import { lockEvent, operationState } from '@/utilities/eventOperationGuard'
import { getRegistrationImportBatch } from '@/utilities/eventRegistrationImportContext'

const snapshotFields = [
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
] as const
export function registrationSnapshot(record: Partial<EventRegistration>) {
  return Object.fromEntries(snapshotFields.map((field) => [field, record[field] ?? null]))
}

export const guardRegistrationOperation: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  // Payload passes {} for ordinary creates and the source document for duplicates.
  // Neither is a persisted previous version of the registration being created.
  const previous = operation === 'update' ? (originalDoc as EventRegistration) : undefined
  const eventId = getRelationshipID(data.event ?? previous?.event)
  if (previous && getRelationshipID(previous.event) !== eventId)
    throw new APIError('Mutarea între evenimente necesită o înscriere separată.', 400)
  const next = { ...previous, ...data } as EventRegistration
  if (
    !Number.isInteger(next.guests ?? 0) ||
    Number(next.guests ?? 0) < 0 ||
    Number(next.guests ?? 0) > 50
  )
    throw new APIError('Numărul de însoțitori trebuie să fie între 0 și 50.', 400)
  if (!req.user && operation === 'create' && !getRegistrationImportBatch(req.context)) {
    Object.assign(data, {
      status: 'registered',
      donation: 0,
      consumptionAmount: null,
      timeOfArrival: null,
    })
    Object.assign(next, data)
  }
  const state = operationState(req.context)
  const version = Number(previous?.operationVersion || 0)
  if (state.expectedVersion !== undefined && state.expectedVersion !== version)
    throw new APIError(
      'Alt membru a modificat această înscriere. Reîncarcă înainte de a salva.',
      409,
    )
  const identityChange =
    operation === 'create' ||
    (['name', 'email', 'phone'] as const).some(
      (field) => data[field] !== undefined && data[field] !== previous?.[field],
    ) ||
    (next.status === 'cancelled') !== (previous?.status === 'cancelled')
  await lockEvent(req, eventId, identityChange)
  if (previous) {
    // originalDoc may have been read before another request committed on standalone MongoDB.
    const current = await req.payload.findByID({
      collection: 'event-registrations',
      id: previous.id,
      depth: 0,
      overrideAccess: true,
      req,
      select: { operationVersion: true },
    })
    if (Number(current.operationVersion || 0) !== version)
      throw new APIError(
        'Alt membru a modificat această înscriere. Reîncarcă înainte de a salva.',
        409,
      )
  }
  const batch = getRegistrationImportBatch(req.context)
  const event =
    batch && batch.event.id === eventId
      ? batch.event
      : await req.payload.findByID({ collection: 'events', id: eventId, depth: 0, req })
  if (batch && batch.capacityState.token !== state.previousToken) {
    batch.capacityState.counts.clear()
    batch.capacityState.closed.clear()
  }
  const positions = new Map(
    [previous, next]
      .filter(Boolean)
      .map((position) => [JSON.stringify([position!.day, position!.slot]), position!]),
  )
  for (const position of positions.values()) {
    if (!position.day || !position.slot) continue
    const positionKey = JSON.stringify([position.day, position.slot])
    if (batch?.capacityState.closed.get(positionKey) === false) continue
    const closed = await req.payload.find({
      collection: 'event-shifts',
      depth: 0,
      limit: 1,
      pagination: false,
      req,
      where: {
        and: [
          { event: { equals: eventId } },
          { day: { equals: position.day } },
          { slot: { equals: position.slot } },
          { closing: { exists: true } },
        ],
      },
    })
    if (closed.docs.some((shift) => shift.closing))
      throw new APIError(
        'Tura este închisă. Un manager trebuie să o redeschidă înainte de modificări.',
        409,
      )
    batch?.capacityState.closed.set(positionKey, false)
  }
  if (next.status !== 'cancelled') {
    const { slot } = findEventSlot(event, next.day, next.slot)
    if (!slot?.id) throw new APIError('Tura selectată nu mai există.', 400)
    const previousPeople =
      previous &&
      previous.status !== 'cancelled' &&
      previous.day === next.day &&
      previous.slot === next.slot
        ? registrationPeople(previous)
        : 0
    const increase = registrationPeople(next) - previousPeople
    if (increase > 0) {
      const key = JSON.stringify([next.day, next.slot])
      const cache = batch?.capacityState
      const cached = cache?.token === state.previousToken ? cache?.counts.get(key) : undefined
      const occupied = cached ?? (await slotPeople(req.payload, eventId, next.day, next.slot, req))
      if (occupied + increase > (slot.capacity ?? 0)) {
        const reason = state.capacityOverrideReason?.trim()
        if (!reason || reason.length < 5 || reason.length > 500 || !canManageEvent(event, req.user))
          throw new APIError(
            `Capacitatea turei este de ${slot.capacity ?? 0} persoane; sunt deja ${occupied} locuri rezervate. Doar un manager poate aproba depășirea, cu motiv.`,
            409,
          )
        state.reason = [state.reason, `Depășire capacitate: ${reason}`].filter(Boolean).join('\n')
      }
      state.capacity = { key, people: occupied + increase }
    }
    if (
      next.email &&
      (operation === 'create' || next.email !== previous?.email || previous?.status === 'cancelled')
    ) {
      const duplicate = await req.payload.find({
        collection: 'event-registrations',
        depth: 0,
        limit: 1,
        pagination: false,
        select: { email: true },
        req,
        where: {
          and: [
            { event: { equals: eventId } },
            { email: { equals: next.email } },
            { status: { not_equals: 'cancelled' } },
            ...(previous?.id ? [{ id: { not_equals: previous.id } }] : []),
          ],
        },
      })
      if (duplicate.docs.length)
        throw new APIError('Te-ai înscris deja la acest eveniment cu această adresă de email.', 409)
    }
  }
  state.before = previous ? registrationSnapshot(previous) : undefined
  state.action = state.undoOf
    ? 'undo'
    : operation === 'create'
      ? req.context.eventRegistrationImport
        ? 'import'
        : req.context.eventRegistrationWalkIn
          ? 'walk-in'
          : 'signup'
      : next.status === 'cancelled'
        ? 'cancel'
        : next.status === 'present' && previous?.status !== 'present'
          ? 'check-in'
          : next.donation !== previous?.donation ||
              next.consumptionAmount !== previous?.consumptionAmount
            ? 'payment'
            : 'update'
  state.changes ??= new Map()
  state.changes.set(previous?.id ?? 'create', {
    before: state.before,
    after: registrationSnapshot(next),
    action: state.action,
    version: version + 1,
    actorName: req.user?.name || req.user?.email || 'Înscriere publică',
  })
  return {
    ...data,
    operationVersion: version + 1,
    lastHandledBy: req.user?.id ?? null,
    lastHandledName: req.user?.name || req.user?.email || 'Înscriere publică',
    lastHandledAt: new Date().toISOString(),
  }
}

export const recordRegistrationOperation: CollectionAfterChangeHook = async ({ doc, req }) => {
  const state = operationState(req.context)
  const change = state.changes?.get(doc.id) ?? state.changes?.get('create')
  await req.payload.create({
    collection: 'event-activity',
    depth: 0,
    overrideAccess: true,
    req,
    data: {
      event: getRelationshipID(doc.event) || state.event!,
      registration: doc.id,
      day: doc.day || String(change?.after.day || ''),
      slot: doc.slot || String(change?.after.slot || ''),
      action: change?.action || 'update',
      actor: req.user?.id,
      actorName: doc.lastHandledName || change?.actorName || 'Înscriere publică',
      before: change?.before,
      after: registrationSnapshot({ ...change?.after, ...doc }),
      reason: state.reason,
      undoOf: state.undoOf,
      version: doc.operationVersion || change?.version,
    },
  })
  return doc
}
