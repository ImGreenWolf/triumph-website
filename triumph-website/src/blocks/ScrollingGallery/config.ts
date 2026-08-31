import type { Block, Field } from 'payload'




export const ScrollingGalleryBlock: Block = {
    slug: 'scrollingGallery',
    interfaceName: 'ScrollingGalleryBlock',
    fields: [
        {
            name: "images",
            type: 'relationship',
            relationTo: 'media',
            hasMany: true
        }
    ],
    admin: {
        images: {
            thumbnail: '/block-previews/content.webp',
            icon: '/block-previews/icons/content.svg'
        }
    }
}
