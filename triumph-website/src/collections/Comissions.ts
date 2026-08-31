import type { Access, CollectionConfig } from 'payload'
import { hasBoardRole } from '@/utilities/membersAccess'
import LocationSelectorField from '@/fields/location-selector'
import { locationField } from '@/fields/location-selector/field'

const canReadCommission: Access = ({ req }) => {
  if (hasBoardRole({ req })) return true
  if (!req.user?.id) return false

  return {
    coordinators: {
      contains: req.user.id,
    },
  }
}

export const Comissions: CollectionConfig = {
  slug: 'comissions',
  access: {
    read: canReadCommission,
    update: hasBoardRole,
  },
  indexes: [{ unique: true, fields: ['commissionNumber', 'mandate'] }],
  admin: {
    useAsTitle: 'commissionNumber',
    group: 'Projects',
  },
  fields: [
    {
      name: 'commissionNumber',
      type: 'number',
      defaultValue: 1,
      min: 1,
      required: true,
    },
    {
      name: 'mandate',
      type: 'relationship',
      relationTo: 'mandates',
      required: true,
    },
    {
      name: 'coordinators',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hasMany: true,
    },
    {
      name: 'aspirers',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
    },
    {
      name: 'recruitmentReviews',
      type: 'array',
      admin: {
        description: 'Tracks when commission coordinators confirmed their known applicants review.',
      },
      fields: [
        {
          name: 'coordinator',
          type: 'relationship',
          relationTo: 'users',
          required: true,
        },
        {
          name: 'confirmedAt',
          type: 'date',
          required: true,
          defaultValue: new Date()
        },
      ],
    },
    {
      name: 'interviewIntervals',
      type: 'array',
      label: 'Intervalele pentru Interview',
      admin: {
        description: 'Adauga o zi pentru a programa interview-uri cu aspirantii.',
      },
      fields: [
        locationField({label: 'interviewLocation'}),
        {
          name: 'startDateTime',
          type: 'date',
          admin: {
            date: {
              pickerAppearance: 'dayAndTime'
            }
          }
        },
        {
          name: 'endDateTime',
          type: 'date',
          admin: {
            date: {
              pickerAppearance: 'dayAndTime'
            }
          }
        },
        {
          name: 'interviewDuration',
          type: 'number',
        },
        {
          name: 'pauseBetween',
          type: 'number',
        },
        {
          name: 'breaks',
          type: 'array',
          fields: [
            {
              name: 'startTime',
              type: 'date',
              admin: {
                date: {
                  pickerAppearance: 'timeOnly'
                }
              }
            },
            {
              name: 'endTime',
              type: 'date',
              admin: {
                date: {
                  pickerAppearance: 'timeOnly'
                }
              }
            },
          ],
        },
      ],
    },
  ],
}
