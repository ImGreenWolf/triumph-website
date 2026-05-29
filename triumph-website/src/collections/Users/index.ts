import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'
import { hasBoardRole } from '@/utilities/membersAccess'

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: hasBoardRole,
    create: authenticated,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['name', 'email', 'joinedAt'],
    useAsTitle: 'name',
    group: "Club Administration",
  },
  auth: true,
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'role',
      type: 'select',
      saveToJWT: true,
      required: true,
      defaultValue: 'active',
      options: [
        {
          label: 'Membru Aspirant',
          value: 'aspirer',
        },
        {
          label: 'Membru Activ',
          value: 'active',
        },
        {
          label: 'Presedinte',
          value: 'president',
        },
        {
          label: 'PR Director',
          value: 'pr-director',
        },
        {
          label: 'Secretar',
          value: 'secretary',
        },
      ]
    },
    {
      name: 'joinedAt',
      type: 'date',
      required: true,
      defaultValue: () => new Date(),
    },
    {
      type: 'group',
      admin: {
        position: 'sidebar',
      },
      fields: [
        {
          name: 'payments',
          type: 'join',
          collection: 'payments',
          on: 'member',
          virtual: true,
          admin: {
            defaultColumns: ['month', 'amount', 'type'],
          },
        },
        {
          name: 'attendance',
          type: 'join',
          collection: 'attendance',
          on: 'member',
          virtual: true,
          admin: {
            defaultColumns: ['meeting', 'status'],
          },
        },
      ],
    },
  ],
  timestamps: true,
}
