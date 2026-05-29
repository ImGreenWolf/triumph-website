import { lexicalEditor, HeadingFeature, FixedToolbarFeature, InlineToolbarFeature } from '@payloadcms/richtext-lexical'
import type { Block } from 'payload'

export const AboutUs: Block = {
  slug: 'aboutUs',
  interfaceName: 'AboutUsBlock',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      defaultValue: 'About Interact & Rotary',
    },
    {
      name: 'interactContent',
      type: 'richText',
      label: 'What is Interact?',
      required: true,
       editor: lexicalEditor({
                      features: ({ rootFeatures }) => {
                          return [
                              ...rootFeatures,
                              HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                              FixedToolbarFeature(),
                              InlineToolbarFeature(),
                          ]
                      },
                  }),
    },
    {
      name: 'rotaryContent',
      type: 'richText',
      label: 'What is Rotary?',
      required: true,
       editor: lexicalEditor({
                      features: ({ rootFeatures }) => {
                          return [
                              ...rootFeatures,
                              HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                              FixedToolbarFeature(),
                              InlineToolbarFeature(),
                          ]
                      },
                  }),
    },
    {
      name: 'relationshipContent',
      type: 'richText',
      label: 'The Relationship',
      required: true,
       editor: lexicalEditor({
                      features: ({ rootFeatures }) => {
                          return [
                              ...rootFeatures,
                              HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                              FixedToolbarFeature(),
                              InlineToolbarFeature(),
                          ]
                      },
                  }),
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'accentColor',
      type: 'select',
      options: [
        { label: 'Rotary Blue', value: 'blue' },
        { label: 'Interact Royal Blue', value: 'royal' },
        { label: 'Gold', value: 'gold' },
      ],
      defaultValue: 'blue',
    }
  ],
}