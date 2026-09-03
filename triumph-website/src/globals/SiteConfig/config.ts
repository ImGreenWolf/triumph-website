import type { GlobalConfig } from 'payload'

import { link } from '@/fields/link'

import { hasBoardRole, hasRole } from '@/utilities/membersAccess'
import { revalidateSiteConfig } from './hooks/revalidateSiteConfig'


export const SiteConfig: GlobalConfig = {
  slug: 'siteConfig',
  hooks: {
    afterChange: [revalidateSiteConfig],
  },
  access: {
    read: () => true,
    update: hasBoardRole
  },
  fields: [
    {
      type: 'group',
      fields: [
        {
          type: 'upload',
          name: 'lightModeLogo',
          relationTo: 'media'
        },
        {
          type: 'upload',
          name: 'lightModeIcon',
          relationTo: 'media'
        },{
          type: 'upload',
          name: 'darkModeLogo',
          relationTo: 'media'
        },{
          type: 'upload',
          name: 'darkModeIcon',
          relationTo: 'media'
        },
        {
          type: 'group',
          fields: [
            {
              type: 'upload',
              name: 'faviconIco',
              relationTo: 'media'
            },
            {
              type: 'upload',
              name: 'faviconSvg',
              relationTo: 'media'
            },
          ]
        }
      ]
    }
  ]
}
