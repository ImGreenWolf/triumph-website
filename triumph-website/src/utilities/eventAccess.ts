import type { User } from '@/payload-types'
import { isBoardMember } from '@/utilities/membersAccess'

type RelationshipValue = string | number | { id?: string | number | null } | null | undefined

export type EventAccessLevel = 'manager' | 'check-in' | 'none'

export type EventAccessSource = {
  checkInMembers?: RelationshipValue[] | null
  coordonators?: RelationshipValue[] | null
}

export type EventAccessUser = Pick<User, 'id' | 'role'>

export function getRelationshipID(value: RelationshipValue) {
  if (value && typeof value === 'object') return value.id == null ? '' : String(value.id)
  return value == null ? '' : String(value)
}

export function canManageEvent(event: EventAccessSource, user: EventAccessUser | null | undefined) {
  if (!user?.id) return false
  if (isBoardMember(user)) return true

  return relationshipListIncludes(event.coordonators, user.id)
}

export function canCheckInEvent(
  event: EventAccessSource,
  user: EventAccessUser | null | undefined,
) {
  if (!user?.id) return false
  if (canManageEvent(event, user)) return true

  return relationshipListIncludes(event.checkInMembers, user.id)
}

export function getEventAccessLevel(
  event: EventAccessSource,
  user: EventAccessUser | null | undefined,
): EventAccessLevel {
  if (canManageEvent(event, user)) return 'manager'
  if (canCheckInEvent(event, user)) return 'check-in'
  return 'none'
}

export function relationshipListIncludes(
  values: RelationshipValue[] | null | undefined,
  id: string | number,
) {
  const targetID = String(id)
  return (values ?? []).some((value) => getRelationshipID(value) === targetID)
}
