import type { Access, CollectionConfig, Where } from 'payload'
import { isBoardMember } from '@/utilities/membersAccess'

export const eventOperationAccess: Access = ({ req }) => {
  if (!req.user) return false
  if (isBoardMember(req.user)) return true
  return {
    or: [
      { 'event.coordonators': { contains: req.user.id } },
      { 'event.checkInMembers': { contains: req.user.id } },
    ],
  } as Where
}
const managerAccess: Access = ({ req }) => {
  if (!req.user) return false
  return isBoardMember(req.user) || { 'event.coordonators': { contains: req.user.id } }
}
const internalWrites = { create: () => false, update: () => false, delete: () => false }
const shiftFields = [
  { name: 'event', type: 'relationship', relationTo: 'events', required: true, index: true },
  { name: 'day', type: 'text', required: true },
  { name: 'slot', type: 'text', required: true },
] as const

export const EventActivity: CollectionConfig = {
  slug: 'event-activity',
  admin: { group: 'Projects', defaultColumns: ['action', 'actorName', 'createdAt'] },
  access: { ...internalWrites, read: eventOperationAccess },
  indexes: [{ fields: ['event', 'createdAt'] }, { fields: ['registration', 'createdAt'] }],
  fields: [
    { name: 'event', type: 'relationship', relationTo: 'events', required: true, index: true },
    { name: 'registration', type: 'relationship', relationTo: 'event-registrations', index: true },
    { name: 'day', type: 'text' },
    { name: 'slot', type: 'text' },
    { name: 'action', type: 'text', required: true },
    { name: 'actor', type: 'relationship', relationTo: 'users' },
    { name: 'actorName', type: 'text', required: true },
    { name: 'reason', type: 'textarea' },
    { name: 'before', type: 'json', admin: { readOnly: true } },
    { name: 'after', type: 'json', admin: { readOnly: true } },
    { name: 'undoOf', type: 'relationship', relationTo: 'event-activity' },
    { name: 'version', type: 'number' },
  ],
}

export const EventShifts: CollectionConfig = {
  slug: 'event-shifts',
  admin: { group: 'Projects', defaultColumns: ['event', 'day', 'slot', 'updatedAt'] },
  access: { ...internalWrites, read: eventOperationAccess },
  indexes: [{ fields: ['event', 'day', 'slot'], unique: true }],
  fields: [
    ...shiftFields,
    { name: 'members', type: 'relationship', relationTo: 'users', hasMany: true },
    { name: 'handoverNote', type: 'textarea' },
    { name: 'updatedBy', type: 'text' },
    { name: 'closing', type: 'relationship', relationTo: 'event-closings' },
  ],
}

export const EventClosings: CollectionConfig = {
  slug: 'event-closings',
  admin: {
    group: 'Projects',
    defaultColumns: ['event', 'actorName', 'totalCollected', 'difference', 'createdAt'],
  },
  access: { ...internalWrites, read: managerAccess },
  indexes: [{ fields: ['event', 'day', 'slot', 'createdAt'] }],
  fields: [
    ...shiftFields,
    { name: 'actor', type: 'relationship', relationTo: 'users', required: true },
    { name: 'actorName', type: 'text', required: true },
    { name: 'donation', type: 'number', required: true },
    { name: 'consumptionAmount', type: 'number', required: true },
    { name: 'totalCollected', type: 'number', required: true },
    { name: 'countedAmount', type: 'number', required: true },
    { name: 'difference', type: 'number', required: true },
    { name: 'people', type: 'number', required: true },
    { name: 'legacyConsumptionCount', type: 'number', required: true },
    { name: 'legacyAcknowledged', type: 'checkbox' },
    { name: 'note', type: 'textarea' },
    { name: 'revision', type: 'number', required: true },
  ],
}
