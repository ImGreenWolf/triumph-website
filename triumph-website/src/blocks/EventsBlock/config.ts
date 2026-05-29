import type { Block } from 'payload'

import {
    FixedToolbarFeature,
    HeadingFeature,
    InlineToolbarFeature,
    lexicalEditor,
} from '@payloadcms/richtext-lexical'

export const EventsBlock: Block = {
    slug: 'eventsBlock',
    interfaceName: 'EventsBlock',
    fields: [
        {
            name: 'introContent',
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
            label: 'Intro Content',
        },
        {
            name: 'populateBy',
            type: 'select',
            defaultValue: 'collection',
            options: [
                {
                    label: 'All Events',
                    value: 'collection',
                },
                {
                    label: 'Individual Selection',
                    value: 'selection',
                },
            ],
        },
        {
            name: 'limit',
            type: 'number',
            admin: {
                condition: (_, siblingData) => siblingData.populateBy === 'collection',
                step: 1,
            },
            defaultValue: 10,
            label: 'Limit',
        },
        {
            name: 'selectedDocs',
            type: 'relationship',
            admin: {
                condition: (_, siblingData) => siblingData.populateBy === 'selection',
            },
            hasMany: true,
            label: 'Selection',
            relationTo: ['posts', 'events'],
        },
        {
            name: 'showDescription',
            type: 'checkbox',
            defaultValue: true
        }
    ],
    labels: {
        plural: 'EventsBlocks',
        singular: 'EventsBlock',
    },
    admin: {
        images: {
            thumbnail: '/block-previews/eventsBlock.webp',
            icon: '/block-previews/icons/eventsBlock.svg'
        }
    }
}
