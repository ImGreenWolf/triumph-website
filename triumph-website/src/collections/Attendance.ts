import { authenticated } from '@/access/authenticated'
import type { CollectionConfig } from 'payload'


export const Attendance: CollectionConfig = {
  slug: 'attendance',
  labels: {
    plural: "Prezență",
    singular: "Prezență",
  },
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
      defaultValue: async ({req}) => (await req.payload.find({collection: 'meetings', sort: '-meetingDate', limit: 1, req})).docs[0]

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
      name: 'issuedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        readOnly: true,
        description: 'Pentru prezenta, este membrul care a scanat codul, iar pentru motivare, persoana care a motivat absenta'
      },
      defaultValue: (req) => req.user?.id
      // admin: {
      //   condition: (_, siblingData) =>
      //     siblingData.status === 'motivated',
      // },
    },

    {
      name: 'notes',
      type: 'textarea',
    },
  ],

  timestamps: true,
}
