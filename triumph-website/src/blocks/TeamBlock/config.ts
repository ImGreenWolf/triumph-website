import type { Block } from 'payload'

export const TeamBlock: Block = {
    slug: 'teamBlock',
    interfaceName: 'TeamBlock',
    fields: [
        {
            name: 'mandates',
            type: 'array',
            fields: [
                {
                    name: 'year',
                    type: 'number',
                    defaultValue: () => new Date().getFullYear(),
                    unique: true,
                    admin: {
                        components: {
                            Description: '@/blocks/TeamBlock/YearDescription#YearDescription',
                        },
                    },
                },
                {
                    name: 'columns',
                    type: 'number',
                    required: true,
                    defaultValue: 4
                },
                {
                    name: 'members',
                    type: 'array',
                    fields: [
                        {
                            name: 'name',
                            type: 'text',
                        },
                        {
                            name: 'role',
                            type: 'text',
                        },
                        {
                            name: 'description',
                            type: 'textarea'
                        },
                        {
                            name: 'picture',
                            type: 'upload',
                            relationTo: 'media'
                        },
                        {
                            name: 'secondPicture',
                            type: 'upload',
                            relationTo: 'media',
                            admin: {description: 'The picture used for the back of the member card'}
                        }
                    ],
                     admin: {
                        components: {
                            RowLabel: '@/blocks/TeamBlock/TeamRowComponent'
                        },
                    }
                }
            ]
        }
    ],
    admin: {
        images: {
            thumbnail: '/block-previews/teamBlock.webp',
            icon: '/block-previews/icons/teamBlock.svg'
        }
    }
}
