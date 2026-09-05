import type { CollectionConfig, GlobalConfig } from 'payload'







import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'


export const Causes: CollectionConfig = {
    slug: 'causes',
      labels: {
    plural: "Cauze",
    singular: "Cauză",
  },
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
        name: 'link',
        type: 'text'
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
    labels: {
    plural: "Sponsori",
    singular: "Sponsor",
  },
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
