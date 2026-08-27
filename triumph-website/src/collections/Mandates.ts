import type { CollectionConfig, GlobalConfig } from 'payload'
import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'


export const Mandates: CollectionConfig = {
    slug: 'mandates',
    access: {
    read: anyone,
    update: authenticated,
    },
    admin: {
        useAsTitle: 'year',
        group: "Projects",
    },
    fields: [
    {
        name: 'year',
        type: 'number',
        required: true
    },
    ]
}


