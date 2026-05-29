import type { GlobalConfig } from 'payload'

import { link } from '@/fields/link'
import { revalidateHeader } from './hooks/revalidateHeader'

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
        {
          type: 'array',
          name: 'subItems',
          fields: [
            {
              name: 'label',
              type: 'text'
            },
            {
              name: 'sectionId',
              type: 'text'
            },
            {
              type: 'relationship',
              name: 'reference',
              relationTo: ['pages', 'events', 'posts']
            }
          ]
        }
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
