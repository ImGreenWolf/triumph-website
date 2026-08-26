import type { Block } from 'payload'

import {
    FixedToolbarFeature,
    InlineToolbarFeature,
    lexicalEditor,
} from '@payloadcms/richtext-lexical'
import { colorField } from '@/fields/color-picker/field'

export const TextLoop: Block = {
    slug: 'textLoop',
    fields: [
        {
            name: 'text',
            type: 'text',
            required: true,
        },
        colorField({ required: true, defaultValue: '#d4b55d'}),
        colorField({ required: true, defaultValue: '#ffffff', name: 'textColor'}),
        {
            name: 'width',
            type: 'number',
            required: true,
            defaultValue: 50
        },
        {
            name: 'fontSize',
            type: 'number',
            required: true,
            defaultValue: 26
        },
        {
            name: 'curviness',
            type: 'number',
            required: true,
            defaultValue: 25
        },
        {
            name: 'separator',
            type: 'text',
            required: true,
            defaultValue: '✦'
        }
    ],
    interfaceName: 'TextLoopBlock',
    admin: {
        
    }
}
