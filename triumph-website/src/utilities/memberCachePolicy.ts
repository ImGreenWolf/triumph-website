import type { CollectionSlug } from 'payload'

export const memberTag = (id: string) => `members:user:${id}`
export const collectionTag = (slug: string) => `members:collection:${slug}`
export const meetingAttendanceTag = (id: string) => `members:meeting-attendance:${id}`
export const eventRegistrationsTag = (id: string) => `members:event-registrations:${id}`
export const USER_DISPLAY_TAG = 'members:user-display'

export function relationID(value: unknown): string | undefined {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (value && typeof value === 'object' && 'id' in value) return relationID(value.id)
}

// Only use exact relationship constraints to narrow invalidation. OR/range queries
// retain the collection tag so inserts cannot leave a cached list incomplete.
export function exactConstraint(where: unknown, field: string): string | undefined {
  if (!where || typeof where !== 'object') return
  const query = where as Record<string, unknown>
  if (query.or) return
  const constraint = query[field] as { equals?: unknown } | undefined
  if (constraint?.equals !== undefined) return relationID(constraint.equals)
  if (Array.isArray(query.and)) {
    for (const clause of query.and) {
      const id = exactConstraint(clause, field)
      if (id) return id
    }
  }
}

export function readTags(slug: string, options: Record<string, unknown>, userID: string) {
  const tags = [memberTag(userID)]
  const owner = exactConstraint(options.where, 'member')
  const meeting = exactConstraint(options.where, 'meeting')
  const event = exactConstraint(options.where, 'event')
  if (['attendance', 'absence-motivations', 'payments'].includes(slug) && owner) {
    tags.push(memberTag(owner))
  } else if (['attendance', 'absence-motivations'].includes(slug) && meeting) {
    tags.push(meetingAttendanceTag(meeting))
  } else if (slug === 'event-registrations' && event) {
    tags.push(eventRegistrationsTag(event))
  } else if (slug === 'users' && options.id) {
    tags.push(memberTag(String(options.id)))
  } else {
    tags.push(collectionTag(slug))
  }
  if (Number(options.depth ?? 2) > 0) {
    tags.push(USER_DISPLAY_TAG, collectionTag('media'), collectionTag('documents'))
    if (['applications', 'comissions', 'aspirementConfig'].includes(slug)) {
      tags.push(...['forms', 'form-submissions', 'mandates', 'comissions'].map(collectionTag))
    }
    if (['attendance', 'absence-motivations'].includes(slug)) tags.push(collectionTag('meetings'))
  }
  return [...new Set(tags)]
}

const displayFields = ['name', 'email', 'role', 'joinedAt', 'profilePicture']

export function mutationTags(
  slug: CollectionSlug | string,
  doc: Record<string, unknown>,
  previous?: Record<string, unknown>,
) {
  const tags = [collectionTag(slug)]
  for (const record of [doc, previous]) {
    if (!record) continue
    if (slug === 'users') {
      const id = relationID(record.id)
      if (id) tags.push(memberTag(id))
    }
    if (['attendance', 'absence-motivations', 'payments'].includes(slug)) {
      const owner = relationID(record.member)
      const meeting = relationID(record.meeting)
      if (owner) tags.push(memberTag(owner))
      if (meeting) tags.push(meetingAttendanceTag(meeting))
    }
    if (slug === 'event-registrations') {
      const event = relationID(record.event)
      if (event) tags.push(eventRegistrationsTag(event))
    }
  }
  if (
    slug === 'users' &&
    (!previous ||
      displayFields.some((key) => JSON.stringify(doc[key]) !== JSON.stringify(previous[key])))
  ) {
    tags.push(USER_DISPLAY_TAG)
  }
  return [...new Set(tags)]
}
