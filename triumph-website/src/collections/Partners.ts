import type { CollectionConfig, GlobalConfig } from 'payload'







import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'


export const Causes: CollectionConfig = {
    slug: 'causes',
    access: {
    read: anyone,
    update: authenticated,
    },
    admin: {
        useAsTitle: 'name',
        group: "Projects",
    },
    fields: [
    {
        name: 'name',
        type: 'text',
        required: true
    },
    {
        name: 'description',
        type: 'textarea'
    },
    {
        name: 'logo',
        type: 'upload',
        relationTo: 'media'
    }
    ]
}


export const Sponsors: CollectionConfig = {
  slug: 'sponsors',
  access: {
    read: anyone,
    update: authenticated,
  },
  admin: {
     useAsTitle: 'name',
     group: "Projects",
  },
    fields: [
    {
        name: 'name',
        type: 'text',
        required: true,
    },
    {
        name: 'logo',
        type: 'upload',
        relationTo: 'media',
        
    }
    ]

}
