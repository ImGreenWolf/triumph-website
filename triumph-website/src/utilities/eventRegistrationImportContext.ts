import type { Event } from '@/payload-types'

export type ImportEvent = Pick<Event, 'days' | 'id'> &
  Partial<Pick<Event, 'private' | 'donation' | 'minimumConsumation'>>

const trustedBatches = new WeakSet<object>()

/** Only server-created batches can reuse event data or defer cache invalidation. */
export function createRegistrationImportBatch(event: ImportEvent, deferInvalidation: boolean) {
  const batch = { event, invalidationTags: deferInvalidation ? new Set<string>() : undefined }
  trustedBatches.add(batch)
  return batch
}

export function getRegistrationImportBatch(context: Record<string, unknown> | undefined) {
  const batch = context?.eventRegistrationImportBatch
  if (!context?.eventRegistrationImport || !batch || typeof batch !== 'object') return undefined
  return trustedBatches.has(batch)
    ? (batch as ReturnType<typeof createRegistrationImportBatch>)
    : undefined
}
