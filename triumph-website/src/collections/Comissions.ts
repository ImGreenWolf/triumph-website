import type { CollectionConfig, GlobalConfig } from 'payload'
import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'


export const Comissions: CollectionConfig = {
    slug: 'comissions',
    access: {
    read: anyone,
    update: authenticated,
    },
    indexes: [{unique: true, fields: ['commissionNumber', 'mandate']}],
    admin: {
        useAsTitle: 'commissionNumber',
        group: "Projects",
    },
    fields: [
    {
        name: 'commissionNumber',
        type: 'number',
        defaultValue: 1,
        min: 1,
        required: true
    },
    {
        name: 'mandate',
        type: 'relationship',
        relationTo: 'mandates',
        required: true
    },
    {
        name: 'coordinators',
        type: 'relationship',
        relationTo: 'users',
        required: true,
        hasMany: true,
    },
    {
        name: "aspirers",
        type: 'relationship',
        relationTo: 'users',
        hasMany: true
    }
    
    ]
}



