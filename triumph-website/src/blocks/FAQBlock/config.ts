import type { Block, Field } from 'payload'

import {
  defaultEditorLexicalConfig,
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  lexicalEditor,
  LinkFeature,
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
      defaultValue: 'Întrebări și răspunsuri',
    },
    introContent,
    {
      name: 'supportingText',
      type: 'textarea',
      defaultValue: 'Mai ai întrebări? Scrie-ne și te ajutăm să găsești răspunsul.',
    },
    {
      name: 'supportingLinkLabel',
      type: 'text',
      defaultValue: 'Contactează-ne',
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
        {
          name: 'answerSource',
          type: 'select',
          defaultValue: 'manual',
          label: 'Sursa răspunsului',
          options: [
            { label: 'Text editabil', value: 'manual' },
            { label: 'Calendarul recrutării', value: 'recruitment' },
          ],
        },
        {
          name: 'answer',
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
          required: false,
          validate: (value, { siblingData }) =>
            (siblingData as { answerSource?: string })?.answerSource === 'recruitment' ||
            Boolean(value) ||
            'Completează răspunsul.',
          admin: { condition: (_, data) => data.answerSource !== 'recruitment' },
        },
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
