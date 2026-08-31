import type { GlobalConfig } from 'payload'

import { hasBoardRole, hasRole } from '@/utilities/membersAccess'
import { revalidateAspirementConfig } from './hooks/revalidateAspirementConfig'

export const AspirementConfig: GlobalConfig = {
  slug: 'aspirementConfig',
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
              name: 'review-accepted-message',
              type: 'richText',
            },
            {
              name: 'review-rejected-message',
              type: 'richText',
            },
            {
              name: 'interview-accepted-message',
              type: 'richText',
              admin: {
                description: 'foloseste placeholdere precum {{firstName}}, {{scheduleLink}} sau {{commission}}'
              }
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
