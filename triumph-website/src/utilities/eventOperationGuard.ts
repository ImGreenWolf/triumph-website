import { randomUUID } from 'node:crypto'
import { APIError, type Payload, type PayloadRequest } from 'payload'
import { eventModel, eventSession, mongoID } from './eventMongo'

export type EventOperationState = {
  token: string
  event?: string
  locked?: boolean
  acquiring?: Promise<EventOperationState>
  revision?: number
  identityRevision?: number
  previousToken?: string
  expectedVersion?: number
  capacityOverrideReason?: string
  reason?: string
  undoOf?: string
  before?: Record<string, unknown>
  action?: string
  capacity?: { key: string; people: number }
  changes?: Map<
    string,
    {
      before?: Record<string, unknown>
      after: Record<string, unknown>
      action: string
      version: number
      actorName: string
    }
  >
}
const trusted = new WeakSet<object>()

export function createEventOperationState(): EventOperationState {
  const state = { token: randomUUID() }
  trusted.add(state)
  return state
}

export function operationState(context: Record<string, unknown>): EventOperationState {
  const state = context.eventOperationState
  if (state && typeof state === 'object' && trusted.has(state)) return state as EventOperationState
  const created = createEventOperationState()
  context.eventOperationState = created
  return created
}

/** Serialize event writes, using the request transaction or a short lease on standalone MongoDB. */
export async function lockEvent(req: PayloadRequest, event: string, identityChange = false) {
  const state = operationState(req.context)
  if (state.acquiring) await state.acquiring
  if (state.event === event && state.locked) return state
  if (state.event && state.event !== event)
    throw new APIError('Mutarea între evenimente necesită o înscriere separată.', 400)
  state.acquiring = acquireEvent(req, event, identityChange, state)
  try {
    return await state.acquiring
  } finally {
    state.acquiring = undefined
  }
}

async function acquireEvent(
  req: PayloadRequest,
  event: string,
  identityChange: boolean,
  state: EventOperationState,
) {
  try {
    const now = new Date()
    const doc = (await eventModel(req.payload, 'events').findOneAndUpdate(
      {
        _id: mongoID(req.payload, 'events', '_id', event),
        $or: [
          { registrationLockUntil: { $exists: false } },
          { registrationLockUntil: null },
          { registrationLockUntil: { $lt: now } },
        ],
      },
      {
        $set: {
          registrationLockToken: state.token,
          registrationLockUntil: new Date(now.getTime() + 30_000),
          registrationLastToken: state.token,
        },
        $inc: {
          registrationRevision: 1,
          ...(identityChange ? { registrationIdentityRevision: 1 } : {}),
        },
      },
      { session: await eventSession(req), new: false, lean: true },
    )) as Record<string, unknown> | null
    if (!doc)
      throw new APIError('Alt membru salvează o modificare. Reîncarcă și încearcă din nou.', 409)
    state.event = event
    state.locked = true
    state.revision = Number(doc.registrationRevision || 0) + 1
    state.identityRevision =
      Number(doc.registrationIdentityRevision || 0) + (identityChange ? 1 : 0)
    state.previousToken = doc.registrationLastToken as string | undefined
    return state
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      [112, 251].includes(Number(error.code))
    ) {
      throw new APIError(
        'Înscrierea a fost modificată simultan. Reîncarcă și încearcă din nou.',
        409,
      )
    }
    throw error
  }
}

export async function releaseEventOperation(
  payload: Payload,
  candidate?: unknown,
  req?: PayloadRequest,
) {
  if (!candidate || typeof candidate !== 'object' || !trusted.has(candidate)) return
  const state = candidate as EventOperationState
  if (!state.event) return
  await eventModel(payload, 'events').updateOne(
    {
      _id: mongoID(payload, 'events', '_id', state.event),
      registrationLockToken: state.token,
    },
    { $unset: { registrationLockToken: 1, registrationLockUntil: 1 } },
    { session: await eventSession(req) },
  )
  state.locked = false
}
