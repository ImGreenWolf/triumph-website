import { link } from '@/fields/link'
import { linkGroup } from '@/fields/linkGroup'
import type { Block, Field } from 'payload'




export const AccordionGalleryBlock: Block = {
    slug: 'accordionGallery',
    interfaceName: 'AccordionGallery',
    fields: [
        {
            name: 'showLabels',
            type: 'checkbox',
            defaultValue: true,
        },
        {
            name: 'oreintation',
            type: 'select',
            defaultValue: 'horizontal',
            options: [
                {
                    label: 'Vertical',
                    value: 'vertical'
                },
                {
                    label: 'Orizontal',
                    value: 'horizontal'
                }
            ]
        },
        {
            name: 'expandRatio',
            type: 'number',
            defaultValue: 0.5
        },
        {
            name: 'items',
            type: 'array',
            fields: [
                {
                    name: 'label',
                    type: 'text'
                },
                link(),
                {
                    name: "image",
                    type: 'upload',
                    relationTo: 'media',
                }
            ]
        }
        
    ],
    admin: {
        images: {
            thumbnail: '/block-previews/content.webp',
            icon: '/block-previews/icons/content.svg'
        }
    }
}
