import type { Block, Field } from 'payload'

import {
    FixedToolbarFeature,
    HeadingFeature,
    InlineToolbarFeature,
    lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { link } from '@/fields/link'



export const HeroBlock: Block = {
    slug: 'heroblock',
    interfaceName: 'HeroBlock',

    fields: [],
    admin: {
        images: {
            thumbnail: '/block-previews/heroblock.webp',
            icon: '/block-previews/icons/heroblock.svg'
        }
    }
}
