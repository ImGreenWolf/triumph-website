import { link } from '@/fields/link'
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

export const AccordionGalleryBlock: Block = {
  slug: 'accordionGallery',
  interfaceName: 'AccordionGallery',
  fields: [
    introContent,
    {
      name: 'showLabels',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'oreintation',
      type: 'select',
      defaultValue: 'horizontal',
      options: [
        {
          label: 'Vertical',
          value: 'vertical',
        },
        {
          label: 'Orizontal',
          value: 'horizontal',
        },
      ],
    },
    {
      name: 'expandRatio',
      type: 'number',
      defaultValue: 0.5,
    },
    {
      name: 'items',
      type: 'array',
      fields: [
        {
          name: 'label',
          type: 'text',
        },
        link(),
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
        },
      ],
    },
  ],
  admin: {
    images: {
      thumbnail: '/block-previews/content.webp',
      icon: '/block-previews/icons/content.svg',
    },
  },
}
