import type { Block } from 'payload'

import {
    FixedToolbarFeature,
    HeadingFeature,
    InlineToolbarFeature,
    lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { linkGroup } from '../../fields/linkGroup'

export const CaseStudyBlock: Block = {
    slug: 'caseStudyBlock',
    interfaceName: 'CaseStudyBlock',
    fields: [
        {
            name: 'richText',
            type: 'richText',
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
            label: false,
        },
        {
            name: 'details',
            type: 'array',
            fields: [
                {
                    name: 'title',
                    type: 'text'
                },
                {
                    name: 'desc',
                    type: 'text'
                }
            ]
        }
    ],
    labels: {
        plural: 'Calls to Action',
        singular: 'Call to Action',
    },
    admin: {
        images: {
            thumbnail: '/block-previews/caseStudyBlock.webp',
            icon: '/block-previews/icons/caseStudyBlock.svg'
        }
    }
}
