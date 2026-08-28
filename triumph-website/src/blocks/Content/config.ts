import type { Block, Field } from 'payload'

import {
    BlocksFeature,
    FixedToolbarFeature,
    HeadingFeature,
    InlineToolbarFeature,
    lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { link } from '@/fields/link'
import { Banner } from '../Banner/config'
import { Archive } from '../ArchiveBlock/config'
import { CallToAction } from '../CallToAction/config'
import { EventsBlock } from '../EventsBlock/config'
import { FormBlock } from '../Form/config'
import { LogoLoopBlock } from '../LogoLoop/config'
import { MasonryBlock } from '../Masonry/config'
import { MediaBlock } from '../MediaBlock/config'

const columnFields: Field[] = [
    {
        name: 'size',
        type: 'select',
        defaultValue: 'oneThird',
        options: [
            {
                label: 'One Third',
                value: 'oneThird',
            },
            {
                label: 'Half',
                value: 'half',
            },
            {
                label: 'Two Thirds',
                value: 'twoThirds',
            },
            {
                label: 'Two Thirds Centered',
                value: 'twoThirdsCentered',
            },
            {
                label: 'Full',
                value: 'full',
            },
        ],
    },
    {
        name: 'justifyText',
        type: 'checkbox'
    },
    {
        name: 'richText',
        type: 'richText',
        editor: lexicalEditor({
            features: ({ rootFeatures }) => {
                return [
                    ...rootFeatures,
                    HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] }),
                    FixedToolbarFeature(),
                    InlineToolbarFeature(),
                     BlocksFeature({blocks: [
                            CallToAction,
                            MediaBlock,
                            Archive,
                            FormBlock,
                            MasonryBlock,
                            EventsBlock,
                            LogoLoopBlock,
                            Banner
                        ]})
                ]
            },
        }),
        label: false,
    },
    {
        name: 'enableLink',
        type: 'checkbox',
    },
    link({
        overrides: {
            admin: {
                condition: (_data, siblingData) => {
                    return Boolean(siblingData?.enableLink)
                },
            },
        },
    }),
]

export const Content: Block = {
    slug: 'content',
    interfaceName: 'ContentBlock',
    fields: [
        {
            name: 'columns',
            type: 'array',
            admin: {
                initCollapsed: true,
            },
            fields: columnFields,
        },
    ],
    admin: {
        images: {
            thumbnail: '/block-previews/content.webp',
            icon: '/block-previews/icons/content.svg'
        }
    }
}
