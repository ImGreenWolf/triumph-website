import type { Block } from 'payload'

export const MediaBlock: Block = {
    slug: 'mediaBlock',
    interfaceName: 'MediaBlock',
    fields: [
        {
            name: 'media',
            type: 'upload',
            relationTo: 'media',
            required: true,

        },
    ],
    admin: {
        images: {
            thumbnail: '/block-previews/mediaBlock.webp',
            icon: '/block-previews/icons/mediaBlock.svg'
        }
    }
}
