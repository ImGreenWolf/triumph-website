import type { GlobalConfig } from 'payload'

import { link } from '@/fields/link'

import { hasRole } from '@/utilities/membersAccess'
import { revalidateAspirementConfig } from './hooks/revalidateAspirementConfig'


export const AspirementConfig: GlobalConfig = {
  slug: 'aspirementConfig',
  hooks: {
    afterChange: [revalidateAspirementConfig],
  },
  access: {
    read: () => true,
    update: hasRole(['pr-director', 'president', 'vice-president'])
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
            relationTo: 'forms'
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
          },
          {
            name: 'interview-rejected-message',
            type: 'richText',
          },
        ]
      }
    ]
   }
  ]
}
