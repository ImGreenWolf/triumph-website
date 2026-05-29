import type { Block } from 'payload'

export const LogoLoopBlock: Block = {
    slug: 'logoLoopBlock',
    interfaceName: 'LogoLoopBlock',
    fields: [
        {
            name: 'type',
            type: 'select',
            options: [
                {
                    label: 'Sponsors',
                    value: 'sponsors'
                },
                {
                    label: 'Causes',
                    value: 'causes'
                },
                {
                    label: 'Manual Selection',
                    value: 'manual'
                }
            ]
        },
        {
            name: 'media',
            type: 'upload',
            relationTo: 'media',
            required: true,
            hasMany: true,
            admin: {
                condition: (data, siblingData) => siblingData!.type == 'manual'
            }
           
            
        },
    ],
    admin: {
        images: {
            thumbnail: '/block-previews/mediaBlock.webp',
            icon: '/block-previews/icons/mediaBlock.svg'
        }
    }
}
