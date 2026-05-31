import type { GlobalConfig } from 'payload'

import { link } from '@/fields/link'
import { revalidateFooter } from './hooks/revalidateFooter'

const socialIconOptions = [
  { label: 'Instagram', value: 'instagram' },
  { label: 'Facebook', value: 'facebook' },
  { label: 'LinkedIn', value: 'linkedin' },
  { label: 'YouTube', value: 'youtube' },
  { label: 'X / Twitter', value: 'twitter' },
  { label: 'TikTok', value: 'music' },
  { label: 'Email', value: 'mail' },
  { label: 'Website', value: 'globe' },
  { label: 'Message', value: 'messageCircle' },
  { label: 'Send', value: 'send' },
]

export const Footer: GlobalConfig = {
  slug: 'footer',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'description',
      type: 'textarea',
      defaultValue:
        'Interact Bucuresti Triumph brings students together for service, leadership, and community projects across Bucharest.',
      label: 'Footer Description',
    },
    {
      name: 'wordmarkText',
      type: 'text',
      defaultValue: 'Triumph',
      label: 'Large Wordmark Text',
    },
    {
      name: 'copyrightText',
      type: 'text',
      defaultValue: 'Interact Bucuresti Triumph',
      label: 'Copyright Text',
      admin: {
        description: 'Displayed after the current year.',
      },
    },
    {
      name: 'backToTopLabel',
      type: 'text',
      defaultValue: 'Back to top',
      label: 'Back to Top Label',
    },
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
          RowLabel: '@/Footer/RowLabel#RowLabel',
        },
      },
    },
    {
      name: 'socialLinks',
      type: 'array',
      labels: {
        plural: 'Social Links',
        singular: 'Social Link',
      },
      maxRows: 10,
      admin: {
        initCollapsed: true,
        description: 'Add footer social links and choose the icon shown on the frontend.',
      },
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
        },
        {
          name: 'url',
          type: 'text',
          required: true,
          admin: {
            description: 'Use https://, mailto:, tel:, or a relative URL.',
          },
        },
        {
          name: 'icon',
          type: 'select',
          defaultValue: 'instagram',
          options: socialIconOptions,
          required: true,
        },
        {
          name: 'newTab',
          type: 'checkbox',
          defaultValue: true,
          label: 'Open in a new tab',
        },
      ],
    },
    {
      name: 'legalLinks',
      type: 'array',
      labels: {
        plural: 'Legal Links',
        singular: 'Legal Link',
      },
      defaultValue: [
        {
          label: 'Cookie Policy',
          url: '/cookie-policy',
        },
        {
          label: 'Privacy Policy',
          url: '/privacy-policy',
        },
      ],
      maxRows: 6,
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
        },
        {
          name: 'url',
          type: 'text',
          required: true,
          admin: {
            description: 'Use https://, mailto:, tel:, or a relative URL.',
          },
        },
        {
          name: 'newTab',
          type: 'checkbox',
          label: 'Open in a new tab',
        },
      ],
    },
  ],
  hooks: {
    afterChange: [revalidateFooter],
  },
}
