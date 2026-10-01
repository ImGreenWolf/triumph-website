import type { CollectionConfig } from 'payload'

import { hasBoardRole } from '@/utilities/membersAccess'

export const Logs: CollectionConfig = {
  slug: 'logs',
  labels: {
    plural: 'Logs',
    singular: 'Log',
  },
  admin: {
    defaultColumns: ['title', 'type', 'createdAt'],
    group: 'System',
    useAsTitle: 'title',
  },
  access: {
    create: hasBoardRole,
    delete: hasBoardRole,
    read: hasBoardRole,
    update: hasBoardRole,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'type',
      type: 'select',
      defaultValue: 'info',
      required: true,
      options: [
        { label: 'Email', value: 'email' },
        { label: 'Info', value: 'info' },
        { label: 'Warning', value: 'warning' },
        { label: 'Error', value: 'error' },
        { label: 'Debug', value: 'debug' },
      ],
    },
    {
      name: 'text',
      type: 'textarea',
      required: true,
    },
  ],
}
