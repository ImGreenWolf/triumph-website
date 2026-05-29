import type { Block } from 'payload'

export const DownloadFilesBlock: Block = {
  slug: 'downloadFiles',
  interfaceName: 'DownloadFilesBlock',
  labels: {
    singular: 'Download Files',
    plural: 'Download Files',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: false,
    },
    {
      name: 'description',
      type: 'textarea',
      required: false,
    },
    {
      name: 'files',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        {
          name: 'file',
          type: 'upload',
          relationTo: 'media', // your media collection slug
          required: true,
        },
        {
          name: 'label',
          type: 'text',
          required: false,
        },
      ],
    },
  ],
}