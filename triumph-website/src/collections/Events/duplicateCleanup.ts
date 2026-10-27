import type { Payload } from 'payload'
import { revalidateTag } from 'next/cache'

import type { User } from '@/payload-types'
import { canManageEvent } from '@/utilities/eventAccess'
import { getDuplicateCleanupPlan } from '@/utilities/eventCheckInWarnings'
import { createRegistrationImportBatch } from '@/utilities/eventRegistrationImportContext'

export async function handleDuplicateCleanup(
  payload: Payload,
  user: User,
  body: Record<string, unknown>,
) {
  const eventId = typeof body.eventId === 'string' ? body.eventId.trim() : ''
  if (!eventId) return Response.json({ message: 'Selectează un eveniment.' }, { status: 400 })
  let event
  try {
    event = await payload.findByID({
      collection: 'events',
      id: eventId,
      depth: 0,
      overrideAccess: true,
    })
  } catch {
    return Response.json({ message: 'Evenimentul nu a fost găsit.' }, { status: 404 })
  }
  if (!canManageEvent(event, user)) {
    return Response.json(
      { message: 'Nu ai permisiunea de a elimina duplicatele.' },
      { status: 403 },
    )
  }

  const registrations = await payload.find({
    collection: 'event-registrations',
    depth: 0,
    limit: 0,
    pagination: false,
    overrideAccess: true,
    select: {
      name: true,
      email: true,
      phone: true,
      status: true,
      createdAt: true,
      donation: true,
      consumptionAmount: true,
      timeOfArrival: true,
    },
    where: { and: [{ event: { equals: eventId } }, { status: { not_equals: 'cancelled' } }] },
  })
  const plan = getDuplicateCleanupPlan(registrations.docs)
  if (body.action === 'preview-duplicates') return Response.json({ plan })

  if (
    !Array.isArray(body.removals) ||
    body.removals.some(
      (row) =>
        !row ||
        typeof row !== 'object' ||
        typeof row.id !== 'string' ||
        typeof row.keepId !== 'string',
    )
  )
    return Response.json(
      { message: 'Reîncarcă lista de duplicate înainte de confirmare.' },
      { status: 400 },
    )
  const signature = (rows: { id: string; keepId: string }[]) =>
    JSON.stringify(
      rows.map((row) => [row.id, row.keepId]).sort((a, b) => a[0].localeCompare(b[0], 'en')),
    )
  if (signature(body.removals) !== signature(plan.removals)) {
    return Response.json(
      {
        message: 'Înscrierile s-au schimbat. Verifică lista actualizată și confirmă din nou.',
        plan,
      },
      { status: 409 },
    )
  }
  if (!plan.removals.length)
    return Response.json({
      registrations: [],
      message: 'Nu există duplicate care pot fi eliminate automat.',
    })

  const batch = createRegistrationImportBatch(event, true)
  const changed: { id: string; status: string | null | undefined; timeOfArrival: string | null }[] =
    []
  try {
    // Conditional updates protect attendance/payment changes made after the preview.
    // Soft cancellation preserves the original contact, group and payment data.
    // Bound each transaction and Payload's internal parallel document updates.
    for (let offset = 0; offset < plan.removals.length; offset += 50) {
      try {
        const updated = await payload.update({
          collection: 'event-registrations',
          context: { eventRegistrationImport: true, eventRegistrationImportBatch: batch },
          data: { status: 'cancelled' },
          depth: 0,
          select: { status: true, timeOfArrival: true },
          overrideAccess: true,
          user,
          where: {
            and: [
              { id: { in: plan.removals.slice(offset, offset + 50).map((row) => row.id) } },
              { event: { equals: eventId } },
              { status: { in: ['registered', 'absent'] } },
              ...['donation', 'consumptionAmount', 'timeOfArrival'].map((field) => ({
                or: [
                  { [field]: { exists: false } },
                  { [field]: { equals: null } },
                  ...(field === 'timeOfArrival' ? [] : [{ [field]: { equals: 0 } }]),
                ],
              })),
            ],
          },
        })
        changed.push(
          ...updated.docs.map((row) => ({
            id: row.id,
            status: row.status,
            timeOfArrival: row.timeOfArrival ?? null,
          })),
        )
      } catch {
        // Earlier chunks may have committed; report them and leave the rest for review.
        break
      }
    }
    const remaining = plan.removals.length - changed.length
    const message = `${changed.length} ${changed.length === 1 ? 'duplicat eliminat' : 'duplicate eliminate'} din lista activă.${remaining ? ` ${remaining} înscrieri nu au putut fi eliminate; verifică din nou lista.` : ''}`
    return Response.json({ message, incomplete: remaining > 0, registrations: changed })
  } finally {
    for (const tag of batch.invalidationTags ?? []) revalidateTag(tag, { expire: 0 })
  }
}
