import { authenticated } from '@/access/authenticated'
import { locationField } from '@/fields/location-selector/field'
import { getMeetingWindow } from '@/utilities/meetingTime'
import type { CollectionConfig } from 'payload'

export const Meetings: CollectionConfig = {
  slug: 'meetings',
  labels: {
    plural: 'Întâlniri',
    singular: 'Întâlnire',
  },
  access: {
    admin: authenticated,

    create: authenticated,
    read: authenticated,
    update: authenticated,
    delete: authenticated,
  },

  admin: {
    useAsTitle: 'meetingDate',
    defaultColumns: ['meetingDate', 'durationMinutes', 'status', 'attendance'],
    group: 'Club Administration',
  },

  fields: [
    {
      name: 'meetingDate',
      type: 'date',
      required: true,
      defaultValue: new Date(
        (7 - new Date().getDay()) * 24 * 60 * 60 * 1000 + new Date().getTime(),
      ).setHours(18, 0, 0, 0),
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'durationMinutes',
      type: 'number',
      label: 'Meeting duration (minutes)',
      required: true,
      defaultValue: 60,
      min: 1,
      admin: {
        description: 'How long the meeting remains ongoing after the start time.',
        step: 5,
      },
    },
    {
      name: 'endedBufferMinutes',
      type: 'number',
      label: 'Ended status buffer (minutes)',
      required: true,
      defaultValue: 60,
      min: 0,
      admin: {
        description:
          'How long the meeting remains visible with ended status after the duration expires.',
        step: 5,
      },
    },
    {
      name: 'status',
      type: 'select',
      virtual: true,
      label: 'Status',
      options: [
        {
          label: 'Upcoming',
          value: 'upcoming',
        },
        {
          label: 'Ongoing',
          value: 'ongoing',
        },
        {
          label: 'Ended',
          value: 'ended',
        },
        {
          label: 'Expired',
          value: 'expired',
        },
      ],
      admin: {
        description: 'Calculated from the start time, duration, and ended buffer.',
        position: 'sidebar',
        readOnly: true,
      },
      hooks: {
        afterRead: [
          ({ siblingData }) =>
            getMeetingWindow({
              durationMinutes: siblingData.durationMinutes,
              endedBufferMinutes: siblingData.endedBufferMinutes,
              meetingDate: siblingData.meetingDate,
            }).status,
        ],
      },
    },
    locationField({ label: 'Location of Meeting' }),
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'attendance',
      label: 'Meeting attendance',
      type: 'join',
      virtual: true,
      collection: 'attendance',
      on: 'meeting',
      admin: {
        defaultColumns: ['member', 'status'],
        position: 'sidebar',
        components: {
          Cell: {
            path: '@/components/MembersCell/MeetingAttendenceCell.tsx',
          },
          Label: {
            path: '@/components/MembersCell/MeetingAttendenceLabel.tsx',
          },
        },
      },
    },
    {
      name: 'absenceMotivations',
      type: 'join',
      virtual: true,
      collection: 'absence-motivations',
      on: 'meeting',
      admin: {
        defaultColumns: ['member', 'status', 'reviewedAt'],
        position: 'sidebar',
      },
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
          Field: '@/components/payload/MeetingCheckInField',
        },
      },
    },
  ],

  timestamps: true,
}
