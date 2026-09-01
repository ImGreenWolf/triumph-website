import type { CollectionConfig } from 'payload'
import { hasBoardRole } from '@/utilities/membersAccess'
import { authenticated } from '@/access/authenticated'

export const Applications: CollectionConfig = {
  slug: 'applications',
  access: {
    read: () => true,
    update: authenticated,
  },
  admin: {
    useAsTitle: 'name',
    group: 'Recruitment',
  },
  fields: [
    {
      type: 'collapsible',
      label: 'Applicant Info',
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
        },
        {
          name: 'email',
          type: 'email',
          required: true,
        },
        {
          name: 'instagram',
          type: 'text',
        },
        {
          name: 'formSubmission',
          type: 'relationship',
          relationTo: 'form-submissions',
          required: true,
        },
      ],
    },
    {
      name: 'reviewProcess',
      type: 'group',
      fields: [
        {
          name: 'notes',
          type: 'textarea',
        },
        {
          name: 'comission',
          type: 'relationship',
          relationTo: 'comissions',
        },
        {
          name: 'interviewDate',
          type: 'date',
        },
        {
          name: 'interviewAttendance',
          type: 'select',
          options: [
            { label: 'Programat', value: 'scheduled' },
            { label: 'Intarziat', value: 'late' },
            { label: 'Absent', value: 'absent' },
            { label: 'Finalizat', value: 'completed' },
          ],
        },
        {
          name: 'interviewScheduleToken',
          type: 'text',
          admin: {
            readOnly: true,
          },
          index: true,
        },
        {
          name: 'interviewScheduleTokenCreatedAt',
          type: 'date',
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'interviewMailSentAt',
          type: 'date',
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'interviewMailSentBy',
          type: 'relationship',
          relationTo: 'users',
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'finalMailSentAt',
          type: 'date',
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'finalMailSentBy',
          type: 'relationship',
          relationTo: 'users',
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'interviewNotes',
          type: 'array',
          fields: [
            {
              name: 'author',
              type: 'relationship',
              relationTo: 'users',
              required: true,
            },
            {
              name: 'note',
              type: 'textarea',
              required: true,
            },
            {
              name: 'createdAt',
              type: 'date',
              required: true,
            },
          ],
        },
        {
          name: 'coordonatorIncompatability',
          type: 'relationship',
          relationTo: 'users',
          hasMany: true,
        },
        {
          name: 'coordonatorReviewChecks',
          type: 'relationship',
          relationTo: 'users',
          hasMany: true,
        },
        {
          name: 'aspirerUser',
          type: 'relationship',
          relationTo: 'users',
        },
        {
          name: 'status',
          type: 'select',
          defaultValue: 'submitted',
          options: [
            {
              value: 'submitted',
              label: 'Neverificat',
            },
            {
              value: 'coordonator-review',
              label: 'Se asteapta verificarea Coordonatorilor',
            },
            {
              value: 'submission-waitlisted',
              label: 'Lista de asteptare',
            },
            {
              value: 'submission-rejected',
              label: 'Formular Respins',
            },
            {
              value: 'interview',
              label: 'Acceptat pentru Interview',
            },
            {
              value: 'interview-withdrawn',
              label: 'Retras din proces',
            },
            {
              value: 'interviewed',
              label: 'Se asteapta decizia Coordonatorilor',
            },
            {
              value: 'absent',
              label: 'Absent la Interview',
            },
            {
              value: 'interview-passed',
              label: 'Acceptat ca aspirant',
            },
            {
              value: 'interview-rejected',
              label: 'Respins ca aspirant',
            },
          ],
        },
      ],
    },
  ],
}
