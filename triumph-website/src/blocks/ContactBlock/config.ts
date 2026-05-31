import type { Block, Field } from 'payload'

import {
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

const contactIconOptions = [
  { label: 'Mail', value: 'mail' },
  { label: 'Phone', value: 'phone' },
  { label: 'Location', value: 'mapPin' },
  { label: 'Clock', value: 'clock' },
  { label: 'Message', value: 'messageCircle' },
  { label: 'Send', value: 'send' },
  { label: 'Website', value: 'globe' },
  { label: 'Calendar', value: 'calendar' },
  { label: 'People', value: 'users' },
  { label: 'Building', value: 'building' },
]

const richTextField = (name: string, label: string): Field => ({
  name,
  type: 'richText',
  editor: lexicalEditor({
    features: ({ rootFeatures }) => {
      return [
        ...rootFeatures,
        HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] }),
        FixedToolbarFeature(),
        InlineToolbarFeature(),
      ]
    },
  }),
  label,
})

export const ContactBlock: Block = {
  slug: 'contactBlock',
  interfaceName: 'ContactBlock',
  fields: [
    {
      name: 'eyebrow',
      type: 'text',
      defaultValue: 'Contact',
    },
    richTextField('introContent', 'Intro Content'),
    {
      name: 'contactDetails',
      type: 'array',
      labels: {
        plural: 'Contact Details',
        singular: 'Contact Detail',
      },
      minRows: 1,
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
        },
        {
          name: 'value',
          type: 'text',
          required: true,
        },
        {
          name: 'href',
          type: 'text',
          label: 'Link',
          admin: {
            description: 'Use tel:, mailto:, https://, or a relative URL.',
          },
        },
        {
          name: 'icon',
          type: 'select',
          defaultValue: 'mail',
          options: contactIconOptions,
          required: true,
        },
        {
          name: 'description',
          type: 'textarea',
        },
        {
          name: 'newTab',
          type: 'checkbox',
          label: 'Open in a new tab',
        },
      ],
    },
    {
      name: 'supportingLabel',
      type: 'text',
      defaultValue: 'We usually reply quickly',
    },
    {
      name: 'supportingTitle',
      type: 'text',
      defaultValue: 'Tell us what you need and we will point you in the right direction.',
    },
    {
      name: 'supportingText',
      type: 'textarea',
    },
  ],
  labels: {
    plural: 'Contact Blocks',
    singular: 'Contact Block',
  },
  admin: {
    images: {
      thumbnail: '/block-previews/content.webp',
      icon: '/block-previews/icons/content.svg',
    },
  },
}
