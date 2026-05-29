import type { GlobalConfig } from 'payload'







import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'


export const Partners: GlobalConfig = {
  slug: 'parteners',
  access: {
    read: anyone,
    update: authenticated,
  },
  admin: {
    
  },
  fields: [
    {
      name: 'causes',
      type: 'array',
      labels: {
        singular: 'cause',
        plural: 'causes'
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
    },
     {
      name: 'sponsors',
      type: 'array',
      fields: [
        {
            name: 'name',
            type: 'text',
            required: true
        },
        {
            name: 'logo',
            type: 'upload',
            relationTo: 'media'
        }
      ]
    }
  ],
}
