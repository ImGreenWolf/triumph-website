import { authenticated } from '@/access/authenticated'
import { locationField } from '@/fields/location-selector/field'
import type { Meeting, User } from '@/payload-types'
import { getMeetingAbsenteeIds } from '@/utilities/meetingAttendance'
import { canCalculateMeetingAbsences, getMeetingWindow } from '@/utilities/meetingTime'
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

  endpoints: [
    {
      path: '/:id/absentees',
      method: 'get',
      handler: async (req) => {
        if (!req.user) {
          return Response.json({ message: 'Authentication required.' }, { status: 401 })
        }

        const id = req.routeParams?.id

        if (typeof id !== 'string') {
          return Response.json({ message: 'Meeting not found.' }, { status: 404 })
        }

        let meeting: Meeting

        try {
          meeting = (await req.payload.findByID({
            collection: 'meetings',
            id,
            depth: 0,
            select: {
              durationMinutes: true,
              endedBufferMinutes: true,
              meetingDate: true,
            },
          })) as Meeting
        } catch {
          return Response.json({ message: 'Meeting not found.' }, { status: 404 })
        }

        const calculationOpen = canCalculateMeetingAbsences(meeting)
        const absenteeIds = await getMeetingAbsenteeIds(req.payload, meeting)
        const usersDocs = absenteeIds.length
          ? await req.payload.find({
              collection: 'users',
              depth: 0,
              limit: absenteeIds.length,
              pagination: false,
              sort: 'name',
              where: {
                id: {
                  in: absenteeIds,
                },
              },
            })
          : null

        return Response.json({
          calculationOpen,
          docs: ((usersDocs?.docs ?? []) as User[]).map((user) => ({
            email: user.email,
            id: user.id,
            name: user.name,
          })),
          totalDocs: absenteeIds.length,
        })
      },
    },
  ],

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
      label: 'Durata Întâlnirii (minutes)',
      required: true,
      defaultValue: 60,
      min: 1,
      admin: {
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
        description: 'Cat mai este vizibilă ședința după ce s-a terminat.',
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
        description: 'Statusul întâlnirii.',
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
      name: 'notes',
      type: 'richText',
    },
    {
      type: 'tabs',
      tabs: [
        {
          name: 'Prezenți',
          fields: [
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
          ],
        },
        {
          name: 'Motivați',
          fields: [
            {
              name: 'absenceMotivations',
              type: 'join',
              virtual: true,
              collection: 'absence-motivations',
              on: 'meeting',
              admin: {
                defaultColumns: ['member', 'status', 'reviewedAt'],
              },
            },
          ],
        },
      ],
    },
    {
      name: 'absentees',
      label: 'Absenți',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      virtual: true,
      admin: {
        components: {
          Field: '@/components/payload/MeetingAbsenteesField',
        },
        description:
          'Calculat după încheierea întâlnirii. Exclude prezenții, întârziații și absențele motivate acceptate.',
        position: 'sidebar',
        readOnly: true,
      },
      hooks: {
        afterRead: [
          async ({ data, req, siblingData }) => {
            const id = siblingData.id ?? data?.id

            if (!id || !siblingData.meetingDate) return []

            return getMeetingAbsenteeIds(req.payload, {
              durationMinutes: siblingData.durationMinutes,
              endedBufferMinutes: siblingData.endedBufferMinutes,
              id: String(id),
              meetingDate: siblingData.meetingDate,
            })
          },
        ],
      },
    },
  ],

  timestamps: true,
}
