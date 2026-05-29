import type { Block } from 'payload'

export const MasonryBlock: Block = {
    slug: 'masonryBlock',
    interfaceName: 'MasonryBlock',
    fields: [
        {
            name: 'media',
            type: 'upload',
            relationTo: 'media',
            required: true,
            hasMany: true
        },
    ],
    admin: {
        images: {
            thumbnail: '/block-previews/masonryBlock.webp',
            icon: '/block-previews/icons/masonryBlock.svg'
        }
    }
}
