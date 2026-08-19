import { lexicalEditor, HeadingFeature, FixedToolbarFeature, InlineToolbarFeature } from '@payloadcms/richtext-lexical'
import type { Block } from 'payload'

const richTextEditor = () =>
  lexicalEditor({
    features: ({ rootFeatures }) => {
      return [
        ...rootFeatures,
        HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
        FixedToolbarFeature(),
        InlineToolbarFeature(),
      ]
    },
  })

const defaultRichText = (text: string) => ({
  root: {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text,
            type: 'text',
            version: 1,
          },
        ],
        direction: null,
        format: '',
        indent: 0,
        textFormat: 0,
        textStyle: '',
        version: 1,
      },
    ],
    direction: null,
    format: '',
    indent: 0,
    version: 1,
  },
})

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
      editor: richTextEditor(),
    },
    {
      name: 'rotaryContent',
      type: 'richText',
      label: 'What is Rotary?',
      required: true,
      editor: richTextEditor(),
    },
    {
      name: 'rotaractContent',
      type: 'richText',
      label: 'What is Rotaract?',
      required: true,
      defaultValue: defaultRichText(
        'Rotaract este puntea dintre Interact si Rotary: o comunitate pentru tineri adulti care continua spiritul voluntariatului prin leadership, proiecte de impact si conexiuni internationale in familia Rotary.',
      ),
      editor: richTextEditor(),
    },
    {
      name: 'relationshipContent',
      type: 'richText',
      label: 'The Relationship',
      required: true,
      editor: richTextEditor(),
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
        { label: 'Rotaract Cranberry', value: 'cranberry' },
        { label: 'Gold', value: 'gold' },
      ],
      defaultValue: 'blue',
    }
  ],
}
