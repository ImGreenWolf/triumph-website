import type { GlobalConfig } from 'payload'

import { hasBoardRole, hasRole } from '@/utilities/membersAccess'
import { revalidateAspirementConfig } from './hooks/revalidateAspirementConfig'

export const AspirementConfig: GlobalConfig = {
  slug: 'aspirementConfig',
  admin: {
    group: 'Recruitment',
  },
  hooks: {
    afterChange: [revalidateAspirementConfig],
  },
  access: {
    read: () => true,
    update: hasBoardRole,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          name: 'recruitment',
          fields: [
            {
              name: 'recruitment-form',
              type: 'relationship',
              relationTo: 'forms',
            },
            {
              name: 'recruitmentStartDate',
              type: 'date',
              label: 'Inceput inscrieri',
              admin: {
                date: {
                  pickerAppearance: 'dayOnly',
                },
              },
            },
            {
              name: 'recruitmentEndDate',
              type: 'date',
              label: 'Final inscrieri',
              admin: {
                date: {
                  pickerAppearance: 'dayOnly',
                },
              },
            },
            {
              name: 'defaultInterviewDate',
              type: 'date',
              label: 'Data implicita pentru interview-uri',
              admin: {
                date: {
                  pickerAppearance: 'dayOnly',
                },
              },
            },
            {
              name: 'review-accepted-message',
              type: 'richText',
            },
            {
              name: 'review-rejected-message',
              type: 'richText',
            },
            {
              name: 'form-review-accepted-message',
              type: 'richText',
              admin: {
                description:
                  'Email trimis dupa review-ul formularelor catre candidatii acceptati mai departe.',
              },
            },
            {
              name: 'form-review-rejected-message',
              type: 'richText',
              admin: {
                description:
                  'Email trimis dupa review-ul formularelor catre candidatii respinsi la formular.',
              },
            },
            {
              name: 'interview-accepted-message',
              type: 'richText',
              admin: {
                description:
                  'foloseste placeholdere precum {{firstName}}, {{scheduleLink}} sau {{commission}}',
              },
            },
            {
              name: 'interview-rejected-message',
              type: 'richText',
            },
            {
              name: 'interviewSchedulingDeadline',
              type: 'date',
              label: 'Deadline programare interview',
            },
          ],
        },
      ],
    },
  ],
}
