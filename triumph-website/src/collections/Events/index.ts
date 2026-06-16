import type { CollectionConfig, DateField } from 'payload'

import {
  BlocksFeature,
  FixedToolbarFeature,
  HeadingFeature,
  HorizontalRuleFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { authenticated } from '../../access/authenticated'
import { authenticatedOrPublished } from '../../access/authenticatedOrPublished'
import { Banner } from '../../blocks/Banner/config'
import { Code } from '../../blocks/Code/config'
import { MediaBlock } from '../../blocks/MediaBlock/config'
import { generatePreviewPath } from '../../utilities/generatePreviewPath'
import { populateAuthors } from './hooks/populateAuthors'
import { revalidateDelete, revalidatePost } from './hooks/revalidatePost'
import { colorField } from '@/fields/color-picker/field'

import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'
import { APIError, getPayload, slugField } from 'payload'
import { locationField } from '@/fields/location-selector/field'
import { findEventSlot, formatEventDayLabel, formatEventSlotLabel, isEventSlotRegistrationOpen } from '@/utilities/eventRegistration'
import payloadConfig from '@payload-config'

class MySpecialError extends APIError {
  constructor(message: string) {
    super(message, 201, undefined, true)
  }
}


export const Events: CollectionConfig<'posts'> = {
  slug: 'events',
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticatedOrPublished,
    update: authenticated,
  },
  // This config controls what's populated by default when a post is referenced
  // https://payloadcms.com/docs/queries/select#defaultpopulate-collection-config-property
  // Type safe if the collection slug generic is passed to `CollectionConfig` - `CollectionConfig<'posts'>
  defaultPopulate: {
    title: true,
    slug: true,
    categories: true,
    meta: {
      image: true,
      description: true,
    },
  },
  custom: {
    // links: [{value: '/picatsso', label: 'Picatsso'}]
     
  },
  admin: {
    defaultColumns: ['name', 'registrations', 'updatedAt'],
    group: "Projects",
    livePreview: {
      url: ({ data, req }) =>
        generatePreviewPath({
          slug: data?.slug,
          collection: 'events',
          req,
        }),
    },
    preview: (data, { req }) =>
      generatePreviewPath({
        slug: data?.slug as string,
        collection: 'events',
        req,
      }),
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      type: 'tabs',
      tabs: [
        {
          fields: [
            {
              name: 'heroImage',
              type: 'upload',
              relationTo: 'media',
              
            },
            {
              name: 'content',
              type: 'richText',
              editor: lexicalEditor({
                features: ({ rootFeatures }) => {
                  return [
                    ...rootFeatures,
                    HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                    BlocksFeature({ blocks: [Banner, Code, MediaBlock] }),
                    FixedToolbarFeature(),
                    InlineToolbarFeature(),
                    HorizontalRuleFeature(),
                  ]
                },
              }),
              label: false,
              required: true,
            },
            {
              type: 'group',
              fields: [
                {
                  name: 'useColors',
                  type: 'checkbox',
                  admin: {
                    position: 'sidebar',
                  }
                },
                {
                  type: 'collapsible',
                  label: 'Colors',
                  admin: {
                    condition: (data, siblingData) => siblingData.useColors
                  },
                  fields: [
                    {
                      type: 'row',
                      fields: [
                        colorField({
                          name: 'primaryColor',
                        
                          required: false
                        }),
                        colorField({
                          name: 'secondaryColor',
                        
                          required: false
                        }),
                      ]
                    }
                    
                  ]
                },
                {
                  name: 'inspoboard',
                  type: 'upload',
                  relationTo: 'media',
                  hasMany: true, 
                  
                },
                
                locationField({label: 'Location of Event'}),
                
              ]
            },
            
            {
      type:'collapsible',
      label: 'Cause Details',
      fields: [
        {
          type: 'relationship',
          name: 'cause',
          relationTo: 'causes',
          admin: {
            appearance: 'drawer',
          },
        },
        {
          type: 'text',
          name: 'donation'
        }
      ]
    },
    
    {
      name: 'days',
      type: 'array',
      admin: {

      },
      fields: [
        {
          name: 'eventDate',
          type: 'date',
          admin: {
            date: {
              pickerAppearance: 'dayOnly',
            },
            
          },
        },
        {
          name: 'slots',
          type: 'array',
          fields: [
            {
              type: 'row',
              fields: [
                
                    {
                      name: 'startTime',
                      type: 'date',
                      admin: {
                        date: {
                          pickerAppearance: 'timeOnly',
                          overrides: {
                            timeIntervals: 15,
                          },
                        },
                        components: {
                          Field: '@/fields/StartTimeField',
                        },
                      },
                    },
                    {
                      name: 'endTime',
                      type: 'date',
                      admin: {
                        date: {
                          pickerAppearance: 'timeOnly',
                          overrides: {
                            timeIntervals: 15,
                          },
                        },
                        components: {
                          Field: '@/fields/EndTimeField',
                        },
                      },
                    },
                    {
                      type: 'row',
                      admin: {
                        width: '50%'
                      },
                      fields: [
                        {
                          name: 'capacity',
                          type: 'number',
                          admin: {
                            width: '50%'
                          },
                          
                        },
                        {
                          type: 'ui',
                          name: 'slotRegistrations',
                          admin: {
                            components: {
                              Field: {
                                path: '@/components/payload/EventSlotRegistrationsField',
                              },
                            },
                          },
                        }
                      ]
                    }
                    
                
              ],
            },
             
          ]
        },
       
      ]
    },
          ],
          label: 'Content',
        },
        {
          name: 'meta',
          label: 'SEO',
          fields: [
            OverviewField({
              titlePath: 'name',
              descriptionPath: 'name.description',
              imagePath: 'meta.image',
            }),
            MetaImageField({
              relationTo: 'media',
              overrides: {label: 'Event Image', admin: {description: 'This image is displayed on event cards and on search results.'}}
            }),
            

            MetaDescriptionField({}),
            PreviewField({
              // if the `generateUrl` function is configured
              hasGenerateFn: true,

              // field paths to match the target field for data
              titlePath: 'name',
              descriptionPath: 'meta.description',
            }),
          ],
        },
      ],
    },
    
    {
      name: 'coordonators',
      type: 'relationship',
      admin: {
        position: 'sidebar',
      },
      hasMany: true,
      relationTo: 'users',
    },
    {
      name: 'private',
      type: 'checkbox',
      defaultValue: false,
      label: 'Private event',
      admin: {
        description: 'Disable public signups for this event.',
        position: 'sidebar',
      },
    },
    {
      name: 'capacity',
      type: 'number',
      virtual: true,
      admin: {
        position: 'sidebar',
      },
      
      hooks: {
        afterRead: [
          
            ({siblingData,}) => {
              if(!siblingData.days )
                return 0;
              
              return (siblingData.days as Array<{slots: {capacity: number}[]}>).reduce((p, v) => p+=v.slots ? v.slots.reduce((p, v) => p+=v.capacity, 0): 0, 0)
            }
          
        ]
      }
    },
    // This field is only used to populate the user data via the `populateAuthors` hook
    // This is because the `user` collection has access control locked to protect user privacy
    // GraphQL will also not return mutated user data that differs from the underlying schema
    {
      name: 'populatedCoordonators',
      type: 'array',
      access: {
        update: () => false,
      },
      admin: {
        disabled: true,
        readOnly: true,
      },
      fields: [
        {
          name: 'id',
          type: 'text',
        },
        {
          name: 'name',
          type: 'text',
        },
      ],
    },
    
    {
      name: 'registrations',
      type: 'join',
       collection: 'event-registrations',
       on: 'event',
       defaultLimit: 5,
       admin: {
        allowCreate: false,
       components: {
          Cell: {
            path: '@/components/payload/EventRegistrationsCell',
          },
          beforeInput: [{
             path: '@/components/payload/EventRegistrationsBeforeInput',
          }]
        },
        position: 'sidebar',
        defaultColumns: ['email', 'day', 'slot'],
        disableListColumn: false,
        disableRowTypes: true,
        
       }
    },
    slugField({useAsSlug: 'name'}),
    {
      type: 'ui',
      name: 'display',
      admin: {
        
      }
    }
  ],
  hooks: {
    afterChange: [revalidatePost],
    afterRead: [populateAuthors],
    afterDelete: [revalidateDelete],
  },
  versions: {
    drafts: {
      autosave: {
        interval: 100, // We set this interval for optimal live preview
      },
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
}




export const EventRegistrations: CollectionConfig = {
  slug: 'event-registrations',

  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'day', 'slot', 'status', 'updatedAt'],
    group: "Projects"
  },

  access: {
    create: () => true, // allow public signup
    read: authenticated,
    delete: authenticated,
    update: () => false
  },

  fields: [
    {
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
      required: true,
    },
    {
      name: 'day',
      type: 'text',
      required: true,
      admin: {
        components: {
          Cell: {
            path: '@/components/payload/EventRegistrationDayCell',
          },
          Field: {
            path: '@/components/payload/EventRegistrationDayField',
          },
        },
      },
    },
    {
      name: 'slot',
      type: 'text',
      required: true,
      admin: {
        components: {
          Cell: {
            path: '@/components/payload/EventRegistrationSlotCell',
          },
          Field: {
            path: '@/components/payload/EventRegistrationSlotField',
          },
        },
      },
    },
    {
      name: 'email',
      type: 'email',
      required: true,
    },
    
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'phone',
      type: 'text',
      required: true,
    },
    {
      name: 'questions',
      type: 'textarea',
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'registered',
      options: [
        {
          label: 'Registered',
          value: 'registered',
        },
        {
          label: 'Cancelled',
          value: 'cancelled',
        },
      ],
    },
    
  ],
  hooks: {
  beforeValidate: [
    async ({ data, req, operation }) => {
      if (operation !== 'create') return data

      if (!data?.event || !data?.day || !data?.slot) {
        throw new APIError('Selectează o zi și un interval.', 400)
      }

      const eventId = typeof data.event === 'string' ? data.event : data.event.id

      const event = await req.payload.findByID({
        collection: 'events',
        id: eventId,
        depth: 0,
      })

      if (event.private) {
        throw new APIError('Înscrierile pentru acest eveniment sunt private.', 403)
      }

      const { day, slot } = findEventSlot(event, data.day, data.slot)

      if (!day?.id || !day.eventDate || !slot?.id) {
        throw new APIError('Slotul selectat nu mai este disponibil.', 400)
      }

      if (
        !isEventSlotRegistrationOpen({
          endTime: slot.endTime,
          eventDate: day.eventDate,
          startTime: slot.startTime,
        })
      ) {
        throw new APIError(
          `Înscrierile pentru ${formatEventDayLabel(day.eventDate)}, ${formatEventSlotLabel(slot.startTime, slot.endTime)} s-au închis.`,
          409,
        )
      }

      const existing = await req.payload.find({
        collection: 'event-registrations',
        limit: 1,
        where: {
          and: [
            {
              email: {
                equals: data.email,
              },
            },
            {
              event: {
                equals: eventId,
              },
            },
            {
              status: {
                not_equals: 'cancelled',
              },
            },
          ],
        },
      })

      if (existing.docs.length > 0) {
        throw new APIError('Te-ai înscris deja la acest eveniment cu această adresă de email.', 409)
      }

      const existingForSlot = await req.payload.find({
        collection: 'event-registrations',
        limit: 0,
        pagination: false,
        where: {
          and: [
            {
              event: {
                equals: eventId,
              },
            },
            {
              day: {
                equals: day.id,
              },
            },
            {
              slot: {
                equals: slot.id,
              },
            },
            {
              status: {
                not_equals: 'cancelled',
              },
            },
          ],
        },
      })

      if (existingForSlot.docs.length >= (slot.capacity ?? 0)) {
        throw new APIError(
          `${formatEventDayLabel(day.eventDate)}, ${formatEventSlotLabel(slot.startTime, slot.endTime)} este complet.`,
          409,
        )
      }

      return data
    },
  ],
},
}
