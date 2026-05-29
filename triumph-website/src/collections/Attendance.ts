import { authenticated } from '@/access/authenticated'
import type { CollectionConfig } from 'payload'


export const Attendance: CollectionConfig = {
  slug: 'attendance',

  access: {
    admin: authenticated,

    create: authenticated,
    read: authenticated,
    update: authenticated,
    delete: authenticated,
  },
    indexes: [
    {
        fields: ['member', 'meeting'],
        unique: true,
    },
    ],
  admin: {
    useAsTitle: 'id',
    defaultColumns: [
      'member',
      'meeting',
      'status',
    ],
    components: {
      beforeList: [{
        path: '@/components/payload/AttendanceBeforeList',
      }]
    },
    group: 'Club Administration',
  },

  fields: [
    {
      name: 'member',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },

    {
      name: 'meeting',
      type: 'relationship',
      relationTo: 'meetings',
      required: true,
    },

    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'present',

      options: [
        {
          label: 'Present',
          value: 'present',
        },
        {
          label: 'Absent',
          value: 'absent',
        },
        {
          label: 'Motivated Absence',
          value: 'motivated',
        },
        {
          label: 'Late',
          value: 'late',
        },
      ],
    },

    {
      name: 'motivationReason',
      type: 'textarea',
      admin: {
        condition: (_, siblingData) =>
          siblingData.status === 'motivated',
      },
    },

    {
      name: 'motivatedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        condition: (_, siblingData) =>
          siblingData.status === 'motivated',
      },
    },

    {
      name: 'notes',
      type: 'textarea',
    },
  ],

  timestamps: true,
}
