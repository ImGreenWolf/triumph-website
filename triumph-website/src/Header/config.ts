import type { GlobalConfig } from 'payload'

import { link } from '@/fields/link'
import { revalidateHeader } from './hooks/revalidateHeader'
import { linkGroup } from '@/fields/linkGroup'

export const Header: GlobalConfig = {
  slug: 'header',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'navItems',
      type: 'array',
      fields: [
        link({
          appearances: false,
        }),
      ],
      maxRows: 6,
      admin: {
        initCollapsed: true,
        components: {
          RowLabel: '@/Header/RowLabel#RowLabel',
        },
      },
    },

    {
      name: 'navCategory',
      type: 'array',
      fields: [
        link({
          appearances: false,
          overrides: {required: false}
        }),
        {
          type: 'text',
          name: 'collectionSlug',
        },
         linkGroup({
          appearances: false,
          
          overrides: {required: false, name: 'reference'}, 
          field: [
            {
              name: 'sectionId',
              type: 'text'
            },
          ]
        }),
      ],
      maxRows: 6,
      admin: {
        initCollapsed: true,
        components: {
          RowLabel: '@/Header/RowLabel#RowLabel',
        },
      },
    },

  ],
  hooks: {
    afterChange: [revalidateHeader],
  },
}
