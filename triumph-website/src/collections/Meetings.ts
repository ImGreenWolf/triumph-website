import { authenticated } from '@/access/authenticated'
import { locationField } from '@/fields/location-selector/field'
import type { CollectionConfig } from 'payload'


export const Meetings: CollectionConfig = {
  slug: 'meetings',

  access: {
    admin: authenticated,

    create: authenticated,
    read: authenticated,
    update: authenticated,
    delete: authenticated,
  },

  admin: {
    useAsTitle: 'meetingDate',
    defaultColumns: ['meetingDate'],
    group: 'Club Administration',
  },

  fields: [
    {
      name: 'meetingDate',
      type: 'date',
      required: true,
      defaultValue: new Date((7 - new Date().getDay()) * 24 * 60 * 60 * 1000 + new Date().getTime()).setHours(18, 0, 0, 0),
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    locationField({label: 'Location of Meeting'}),
    {
      name: 'description',
      type: 'textarea',
    },
    {
        name: 'attendance',
        type: 'join',
        virtual: true,
        collection: 'attendance',
        on: 'meeting',
        admin: {
            defaultColumns: ['member', 'status'],
            position: 'sidebar'
        }
    },


    {
      name: 'notes',
      type: 'richText',
    },
    {
    name: 'checkInLink',
    type: 'ui',
    admin: {
        components: {
        Field:
            '@/components/payload/MeetingCheckInField',
        },
    },
    }
  ],

  timestamps: true,
}