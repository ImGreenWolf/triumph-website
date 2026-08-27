// triumph-website/src/utilities/membersAccess.ts
import { User } from '@/payload-types'
import type { Access, PayloadRequest } from 'payload'

export const boardRoles = [
  'president',
  'vice-president',
  'secretary',
  'treasurer',
  'pr-director',
  'hr-director',
  'past-president',
] as const

export const allRoles = ['aspirer', 'active', ...boardRoles] as const

export type BoardRole = (typeof boardRoles)[number]
export type AllRoles = (typeof allRoles)[number]

type AdminAccess = ({ req }: { req: PayloadRequest }) => boolean | Promise<boolean>

export const hasRole =
  (allowed: AllRoles[]): Access =>
  ({ req }) => {
    const user = req.user as { role?: AllRoles } | null
    return Boolean(user?.role && allowed.includes(user.role))
  }

export const isBoardMember = (user: { role?: string } | null | undefined) =>
  Boolean(user?.role && boardRoles.includes(user.role as BoardRole))

export const hasBoardRole: AdminAccess = ({ req }) => {
  return isBoardMember(req.user)
}

export const isSecretary = (user: Pick<User, 'role'> | null | undefined) => {
  return user?.role === 'secretary' || user?.role === 'president' || user?.role === 'vice-president'
}

export const hasSecretaryRole: AdminAccess = ({ req }) => {
  return isSecretary(req.user)
}


