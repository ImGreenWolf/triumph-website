import type { Block, Field } from 'payload'

import {
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

const introContent: Field = {
  name: 'introContent',
  type: 'richText',
  label: 'Intro Content',
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
}

export const FAQBlock: Block = {
  slug: 'faqBlock',
  interfaceName: 'FAQBlock',
  fields: [
    {
      name: 'eyebrow',
      type: 'text',
      defaultValue: 'Questions, answered',
    },
    introContent,
    {
      name: 'supportingText',
      type: 'textarea',
      defaultValue: 'Still curious? Send us a message and we will help you find the right answer.',
    },
    {
      name: 'supportingLinkLabel',
      type: 'text',
      defaultValue: 'Get in touch',
    },
    {
      name: 'supportingLinkHref',
      type: 'text',
      defaultValue: '/contact',
      label: 'Supporting Link',
      admin: {
        description: 'Use a relative URL, https:// URL, mailto:, or tel: link.',
      },
    },
    {
      name: 'openFirstItem',
      type: 'checkbox',
      defaultValue: true,
      label: 'Open the first question initially',
    },
    {
      name: 'faqs',
      type: 'array',
      labels: {
        plural: 'Questions',
        singular: 'Question',
      },
      minRows: 1,
      fields: [
        { name: 'question', type: 'text', required: true },
        { name: 'answer', type: 'textarea', required: true },
      ],
    },
  ],
  labels: {
    plural: 'FAQ Blocks',
    singular: 'FAQ Block',
  },
  admin: {
    images: {
      thumbnail: '/block-previews/faqBlock.webp',
      icon: '/block-previews/icons/faqBlock.svg',
    },
  },
}
