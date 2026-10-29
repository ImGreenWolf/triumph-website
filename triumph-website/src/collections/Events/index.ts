import type { CollectionConfig } from 'payload'
import type { Event } from '@/payload-types'

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
import { FormBlock } from '../../blocks/Form/config'
import { StatsBlock } from '../../blocks/HomepageBlocks/config'
import { generatePreviewPath } from '../../utilities/generatePreviewPath'
import { populateAuthors } from './hooks/populateAuthors'
import { revalidateDelete, revalidatePost } from './hooks/revalidatePost'
import {
  generateParticipationConfirmationEmailHTML,
  generateParticipationConfirmationEmailQRCodeAttachment,
  generateParticipationConfirmationEmailSubject,
  generateParticipationConfirmationEmailText,
} from './registrationEmails'
import { colorField } from '@/fields/color-picker/field'
import { AGE_GROUP_ERROR, isAgeGroup } from '@/utilities/eventPayment'
import { getRegistrationImportBatch } from '@/utilities/eventRegistrationImportContext'
import { guardRegistrationOperation, recordRegistrationOperation } from './operationHooks'
import { eventOperationAccess } from '../EventOperations'
import { operationState, releaseEventOperation } from '@/utilities/eventOperationGuard'
import { normalizeInstagramUsername } from '@/utilities/instagram'

import {
  MetaDescriptionField,
  MetaImageField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'
import { APIError, slugField } from 'payload'
import { locationField } from '@/fields/location-selector/field'
import {
  findEventSlot,
  formatEventDayLabel,
  formatEventSlotLabel,
  isEventSlotRegistrationOpen,
} from '@/utilities/eventRegistration'

export const Events: CollectionConfig<'events'> = {
  slug: 'events',
  labels: {
    plural: 'Evenimente',
    singular: 'Eveniment',
  },
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticatedOrPublished,
    update: authenticated,
  },
  // This config controls what's populated by default when a post is referenced
  // https://payloadcms.com/docs/queries/select#defaultpopulate-collection-config-property
  // Type safe if the collection slug generic is passed to `CollectionConfig` - `CollectionConfig<'events'>`
  defaultPopulate: {
    name: true,
    slug: true,
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
    group: 'Projects',
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
              name: 'content',
              type: 'richText',
              editor: lexicalEditor({
                features: ({ rootFeatures }) => {
                  return [
                    ...rootFeatures,
                    HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                    BlocksFeature({ blocks: [Banner, Code, MediaBlock, StatsBlock, FormBlock] }),
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
                locationField({ label: 'Location of Event' }),
                {
                  type: 'array',
                  name: 'documents',
                  fields: [
                    {
                      type: 'text',
                      name: 'label',
                      required: true,
                    },
                    {
                      type: 'upload',
                      relationTo: 'media',
                      name: 'document',
                      required: true,
                    },
                  ],
                },
              ],
            },

            {
              type: 'collapsible',
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
                  name: 'donation',
                  admin: { description: 'Donație minimă per persoană (RON).' },
                },
                {
                  type: 'number',
                  name: 'minimumConsumation',
                  label: 'Consumație minimă per persoană (RON)',
                  min: 0,
                },
                {
                  type: 'text',
                  name: 'signupMessage',
                  label: 'Mesaj deasupra butonului de înscriere',
                },
              ],
            },

            {
              name: 'days',
              type: 'array',
              required: true,
              admin: {},
              fields: [
                {
                  name: 'eventDate',
                  type: 'date',
                  required: true,
                  admin: {
                    date: {
                      displayFormat: 'dd MMMM yyyy',
                      pickerAppearance: 'dayOnly',
                    },
                  },
                },
                {
                  name: 'slots',
                  type: 'array',
                  required: true,
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
                            description:
                              'Opțională pentru ultimul sau singurul interval al zilei. Lasă gol dacă nu există o oră fixă de final.',
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
                            width: '50%',
                          },
                          fields: [
                            {
                              name: 'capacity',
                              type: 'number',
                              min: 0,
                              admin: {
                                width: '50%',
                                description: 'Număr de persoane, inclusiv însoțitorii.',
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
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          label: 'Content',
        },
        {
          label: 'Aspect',
          fields: [
            {
              name: 'heroImage',
              type: 'upload',
              relationTo: 'media',
            },
            {
              name: 'useColors',
              type: 'checkbox',
              label: 'Folosește culori personalizate',
            },
            {
              type: 'collapsible',
              label: 'Culori',
              admin: {
                condition: (data, siblingData) => siblingData.useColors,
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    colorField({ name: 'primaryColor', required: false }),
                    colorField({ name: 'secondaryColor', required: false }),
                    colorField({
                      name: 'cardColor',
                      defaultValue: '#141e34',
                      required: false,
                    }),
                  ],
                },
              ],
            },
            {
              name: 'showParticipantsCount',
              type: 'checkbox',
              label: 'Afișează numărul de participanți',
              defaultValue: true,
              admin: {
                description:
                  'Afișează numărul de participanți pe pagina publică după încheierea evenimentului.',
              },
            },
            {
              name: 'inspoboard',
              type: 'upload',
              relationTo: 'media',
              hasMany: true,
            },
            {
              name: 'photographers',
              type: 'array',
              label: 'Fotografi',
              labels: { singular: 'Fotograf', plural: 'Fotografi' },
              admin: {
                description: 'Creditele apar sub titlul galeriei de fotografii a evenimentului.',
              },
              fields: [
                { name: 'name', type: 'text', label: 'Nume', required: true },
                {
                  name: 'instagram',
                  type: 'text',
                  label: 'Instagram',
                  required: true,
                  admin: {
                    description:
                      'Numele de utilizator, @utilizator sau linkul profilului Instagram.',
                  },
                  validate: (value: unknown) =>
                    Boolean(normalizeInstagramUsername(value)) ||
                    'Introdu un profil Instagram valid.',
                },
              ],
            },
          ],
        },
        {
          name: 'meta',
          label: 'SEO',
          fields: [
            OverviewField({
              titlePath: 'name',
            }),
            MetaImageField({
              relationTo: 'media',
              overrides: {
                label: 'Event Image',
                admin: {
                  description: 'This image is displayed on event cards and on search results.',
                },
              },
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
      name: 'checkInMembers',
      type: 'relationship',
      label: 'Check-in team',
      admin: {
        description:
          'Members listed here can view this event in the members dashboard and process check-in without becoming project managers.',
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
          ({ siblingData }) => {
            if (!siblingData.days) return 0

            return (siblingData.days as Array<{ slots: { capacity: number }[] }>).reduce(
              (p, v) => (p += v.slots ? v.slots.reduce((p, v) => (p += v.capacity), 0) : 0),
              0,
            )
          },
        ],
      },
    },
    ...['registrationRevision', 'registrationIdentityRevision'].map((name) => ({
      name,
      type: 'number' as const,
      defaultValue: 0,
      hidden: true,
      admin: { hidden: true },
      access: { create: () => false, update: () => false },
    })),
    ...['registrationLockToken', 'registrationLastToken'].map((name) => ({
      name,
      type: 'text' as const,
      hidden: true,
      access: { create: () => false, update: () => false },
    })),
    {
      name: 'registrationLockUntil',
      type: 'date',
      hidden: true,
      access: { create: () => false, update: () => false },
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
      defaultLimit: 0,
      admin: {
        allowCreate: false,
        components: {
          Cell: {
            path: '@/components/payload/EventRegistrationsCell',
          },
          beforeInput: [
            {
              path: '@/components/payload/EventRegistrationsBeforeInput',
            },
          ],
        },
        position: 'sidebar',
        defaultColumns: ['email', 'day', 'slot'],
        disableListColumn: false,
        disableRowTypes: true,
      },
    },
    slugField({ useAsSlug: 'name' }),
    {
      type: 'ui',
      name: 'display',
      admin: {},
    },
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
  indexes: [
    { fields: ['event', 'email', 'status'] },
    { fields: ['event', 'day', 'slot', 'status'] },
    { fields: ['event', 'createdAt'] },
  ],
  labels: {
    plural: 'Înregistrări Evenimente',
    singular: 'Înregistrare Eveniment',
  },

  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'day', 'slot', 'status', 'updatedAt'],
    group: 'Projects',
  },

  access: {
    create: () => true, // allow public signup
    read: eventOperationAccess,
    delete: () => false, // Cancellation preserves payment and activity history.
    update: eventOperationAccess,
  },

  fields: [
    {
      name: 'operationVersion',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true, hidden: true },
    },
    { name: 'lastHandledBy', type: 'relationship', relationTo: 'users', admin: { readOnly: true } },
    { name: 'lastHandledName', type: 'text', admin: { readOnly: true } },
    { name: 'lastHandledAt', type: 'date', admin: { readOnly: true } },
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
    },
    {
      name: 'ageGroup',
      type: 'select',
      label: 'Categorie de vârstă',
      options: [
        { label: 'Minor — sub 18 ani', value: 'minor' },
        { label: 'Major — 18+', value: 'adult' },
      ],
    },

    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'phone',
      type: 'text',
    },
    {
      name: 'questions',
      type: 'textarea',
    },
    {
      name: 'emailConsent',
      type: 'checkbox',
    },
    {
      name: 'minimumsAcknowledged',
      type: 'checkbox',
      label: 'A confirmat minimele evenimentului',
    },
    {
      type: 'group',
      fields: [
        {
          name: 'donation',
          type: 'number',
          required: true,
          defaultValue: 0,
        },
        {
          name: 'consumptionAmount',
          type: 'number',
          label: 'Consumație inclusă în total (RON)',
          min: 0,
          admin: { description: 'Separată de donație la confirmarea participării.' },
        },
        {
          name: 'guests',
          type: 'number',
          defaultValue: 0,
          required: true,
        },
        {
          name: 'timeOfArrival',
          type: 'date',
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'registered',
      required: true,
      options: [
        {
          label: 'Registrat',
          value: 'registered',
        },
        {
          label: 'Present',
          value: 'present',
        },
        {
          label: 'Absent',
          value: 'absent',
        },
        {
          label: 'Anulat',
          value: 'cancelled',
        },
      ],
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data, originalDoc, operation, req }) => {
        const ageGroup = data?.ageGroup === undefined ? originalDoc?.ageGroup : data.ageGroup
        const requiresAge =
          !operationState(req.context).undoOf &&
          !req.context.eventRegistrationImport &&
          (operation === 'create' || data?.status === 'present')
        if ((requiresAge || ageGroup != null) && !isAgeGroup(ageGroup)) {
          throw new APIError(AGE_GROUP_ERROR, 400)
        }
        return data
      },
      async ({ data, req, operation }) => {
        if (operation !== 'create') return data

        if (!data?.event || !data?.day || !data?.slot) {
          throw new APIError('Selectează o zi și un interval.', 400)
        }

        // if (!req.context.eventRegistrationWalkIn && (!data.email || !data.phone)) {
        //   throw new APIError('Completează adresa de email și numărul de telefon.', 400)
        // }

        const eventId = typeof data.event === 'string' ? data.event : data.event.id

        const batch = getRegistrationImportBatch(req.context)
        const event =
          batch && batch.event.id === eventId
            ? batch.event
            : await req.payload.findByID({
                collection: 'events',
                id: eventId,
                depth: 0,
                req,
              })

        const bypassSignupRestrictions =
          req.context.eventRegistrationImport || req.context.eventRegistrationWalkIn

        if (event.private && !bypassSignupRestrictions) {
          throw new APIError('Înscrierile pentru acest eveniment sunt private.', 403)
        }

        if (
          !bypassSignupRestrictions &&
          !validateMinimumsAcknowledgement(event, data.minimumsAcknowledged)
        ) {
          throw new APIError(MINIMUMS_ACKNOWLEDGEMENT_ERROR, 400)
        }

        const { day, slot } = findEventSlot(event, data.day, data.slot)

        if (!day?.id || !day.eventDate || !slot?.id) {
          throw new APIError('Slotul selectat nu mai este disponibil.', 400)
        }

        if (
          !bypassSignupRestrictions &&
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

        return data
      },
    ],
    beforeChange: [guardRegistrationOperation],
    afterOperation: [
      async ({ result, req, operation }) => {
        if (['create', 'update', 'updateByID'].includes(operation))
          await releaseEventOperation(req.payload, req.context.eventOperationState, req)
        return result
      },
    ],
    afterError: [
      async ({ req }) => {
        await releaseEventOperation(req.payload, operationState(req.context))
      },
    ],
    afterChange: [
      recordRegistrationOperation,
      async ({ doc, operation, req }) => {
        if (!doc.email) return doc
        if (operation !== 'create' || doc.status !== 'registered') return doc
        if (req.context.eventRegistrationImport || req.context.eventRegistrationWalkIn) return doc

        const eventID = typeof doc.event === 'string' ? doc.event : doc.event.id
        const event = await req.payload.findByID({ collection: 'events', id: eventID })
        const { day, slot } = findEventSlot(event, doc.day, doc.slot)
        const dayLabel = day?.eventDate ? formatEventDayLabel(day.eventDate) : 'Zi nespecificată'
        const slotLabel = slot
          ? formatEventSlotLabel(slot.startTime, slot.endTime)
          : 'Interval nespecificat'
        const emailArgs = {
          dayLabel,
          event,
          registration: doc,
          req,
          slotLabel,
        }

        try {
          await req.payload.sendEmail({
            attachments: [await generateParticipationConfirmationEmailQRCodeAttachment(doc.id)],
            html: generateParticipationConfirmationEmailHTML(emailArgs),
            subject: generateParticipationConfirmationEmailSubject(event.name),
            text: generateParticipationConfirmationEmailText(emailArgs),
            to: doc.email,
          })
        } catch (error) {
          req.payload.logger.error(
            { err: error, registrationID: doc.id },
            'Emailul pentru participarea la eveniment nu a putut fi trimis.',
          )
        }

        return doc
      },
    ],
  },
}

export const MINIMUMS_ACKNOWLEDGEMENT_ERROR =
  'Confirmă că ai luat la cunoștință minimele pentru acest eveniment.'

export function validateMinimumsAcknowledgement(
  event: Pick<Event, 'donation' | 'minimumConsumation'>,
  minimumsAcknowledged: unknown,
) {
  return !eventRequiresMinimumsAcknowledgement(event) || minimumsAcknowledged === true
}

export function eventRequiresMinimumsAcknowledgement(
  event: Pick<Event, 'donation' | 'minimumConsumation'>,
) {
  return (
    normalizeMinimumDonation(event.donation) !== null ||
    normalizeMinimumNumber(event.minimumConsumation) !== null
  )
}

function normalizeMinimumDonation(value: Event['donation']) {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  if (!trimmed) return null

  const parsed = Number(trimmed)
  if (Number.isFinite(parsed)) return parsed > 0 ? parsed : null

  return trimmed
}

function normalizeMinimumNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}
