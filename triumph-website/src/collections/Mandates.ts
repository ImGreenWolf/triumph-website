import type { CollectionConfig, GlobalConfig } from 'payload'
import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'


export const Mandates: CollectionConfig = {
    slug: 'mandates',
      labels: {
    plural: "Mandate",
    singular: "Mandat",
  },
    access: {
    read: anyone,
    update: authenticated,
    },
    admin: {
        useAsTitle: 'year',
        group: "Club Administration",
    },
    fields: [
    {
        name: 'year',
        type: 'number',
        required: true
    },
    ]
}


