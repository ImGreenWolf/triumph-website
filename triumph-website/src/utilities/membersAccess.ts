// triumph-website/src/utilities/membersAccess.ts
import type { Access, PayloadRequest } from 'payload'

export const boardRoles = [
  'president',
  'vice-president',
  'secretary',
  'treasurer',
  'pr-director',
  'hr-director',
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

export const hasBoardRole: AdminAccess = ({ req }) => {
  const user = req.user as { role?: AllRoles } | null
  return Boolean(user?.role && boardRoles.includes(user.role as BoardRole))
}