import type { Block, Field } from 'payload'

import {
    BlocksFeature,
    createServerFeature,
    FixedToolbarFeature,
    HeadingFeature,
    InlineToolbarFeature,
    lexicalEditor,
    RelationshipFeature,
    TextStateFeature,
    UploadFeature,
} from '@payloadcms/richtext-lexical'

import { link } from '@/fields/link'
import { MediaBlock } from '../MediaBlock/config'
import { CallToAction } from '../CallToAction/config'
import { EventsBlock } from '../EventsBlock/config'
import { FormBlock } from '../Form/config'
import { LogoLoopBlock } from '../LogoLoop/config'
import { MasonryBlock } from '../Masonry/config'
import { Content } from '../Content/config'
import { Archive } from '../ArchiveBlock/config'
import { Banner } from '../Banner/config'
import textStateConfig from './textStateConfig'

export const OutlineFeature = TextStateFeature(textStateConfig)

export const FullWidthBlock: Block = {
    slug: 'fullWidthBlock',
    interfaceName: 'FullWidthBlock',
    fields: [
        {
        name: 'content',
        type: 'richText',
        editor: lexicalEditor({
            features: ({ rootFeatures }) => {
                return [
                    ...rootFeatures,
                    HeadingFeature({ enabledHeadingSizes: ['h1','h2', 'h3', 'h4'] }),
                    FixedToolbarFeature(),
                    InlineToolbarFeature(),
                    OutlineFeature,
                    BlocksFeature({blocks: [
                        CallToAction,
                        Content,
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
        required: true
    },
        {
            name: 'media',
            type: 'upload',
            relationTo: 'media'
        }
    ],
    admin: {
        images: {
            thumbnail: '/block-previews/content.webp',
            icon: '/block-previews/icons/content.svg'
        }
    }
}
