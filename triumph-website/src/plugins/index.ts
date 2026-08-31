import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { nestedDocsPlugin } from '@payloadcms/plugin-nested-docs'
import { redirectsPlugin } from '@payloadcms/plugin-redirects'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { searchPlugin } from '@payloadcms/plugin-search'
import { APIError, Plugin, type PayloadRequest } from 'payload'
import { revalidateRedirects } from '@/hooks/revalidateRedirects'
import { GenerateTitle, GenerateURL } from '@payloadcms/plugin-seo/types'
import { FixedToolbarFeature, HeadingFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { searchFields } from '@/search/fieldOverrides'
import { beforeSyncWithSearch } from '@/search/beforeSync'

import { AspirementConfig, FormSubmission, Page, Post } from '@/payload-types'
import { getServerSideURL } from '@/utilities/getURL'
import { getEndOfBucharestDay, getStartOfBucharestDay } from '@/utilities/recruitmentWorkflow'

const searchableCollections = ['posts', 'events'] as const

const generateTitle: GenerateTitle<Post | Page> = ({ doc }) => {
  return doc?.title ? `${doc.title} | Interact Bucureşti Triumph` : 'Interact Bucureşti Triumph'
}

const generateURL: GenerateURL<Post | Page> = ({ doc }) => {
  const url = getServerSideURL()

  return doc?.slug ? `${url}/${doc.slug}` : url
}

export const plugins: Plugin[] = [
  redirectsPlugin({
    collections: ['pages', 'posts', 'events'],
    overrides: {
      // @ts-expect-error - This is a valid override, mapped fields don't resolve to the same type
      fields: ({ defaultFields }) => {
        return defaultFields.map((field) => {
          if ('name' in field && field.name === 'from') {
            return {
              ...field,
              admin: {
                description: 'You will need to rebuild the website when changing this field.',
              },
            }
          }
          return field
        })
      },
      hooks: {
        afterChange: [revalidateRedirects],
      },
      admin: {
        group: 'Content',
      },
    },
  }),
  nestedDocsPlugin({
    collections: ['categories'],
    generateURL: (docs) => docs.reduce((url, doc) => `${url}/${doc.slug}`, ''),
  }),
  seoPlugin({
    generateTitle,
    generateURL,
  }),
  formBuilderPlugin({
    uploadCollections: ['media', 'documents'],
    fields: {
      payment: false,
      upload: true,
      date: true,
    },
    formOverrides: {
      fields: ({ defaultFields }) => {
        return defaultFields.map((field) => {
          if ('name' in field && field.name === 'confirmationMessage') {
            return {
              ...field,
              editor: lexicalEditor({
                features: ({ rootFeatures }) => {
                  return [
                    ...rootFeatures,
                    FixedToolbarFeature(),
                    HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                  ]
                },
              }),
            }
          }
          return field
        })
      },

      admin: {
        group: 'Content',
      },
    },
    formSubmissionOverrides: {
      hooks: {
        beforeChange: [
          async ({ data, operation, req }) => {
            if (operation !== 'create') return data

            const config = (await req.payload.findGlobal({
              slug: 'aspirementConfig',
              depth: 0,
              overrideAccess: true,
            })) as AspirementConfig
            const recruitmentForm = getRelationshipID(config.recruitment?.['recruitment-form'])
            const submittedForm = getRelationshipID(data.form)
            if (!recruitmentForm || recruitmentForm !== submittedForm) return data

            const now = new Date()
            const start = getStartOfBucharestDay(config.recruitment?.recruitmentStartDate)
            const end = getEndOfBucharestDay(config.recruitment?.recruitmentEndDate)
            if ((start && now < start) || (end && now > end)) {
              throw new APIError('Perioada de inscrieri s-a incheiat.', 403)
            }

            return data
          },
        ],
        afterChange: [
          async ({ operation, doc, req }) => {
            if (operation === 'create') {
              await createApplication(doc as FormSubmission, req)
            }
          },
        ],
      },
      admin: {
        group: 'Content',
      },
    },
  }),
  searchPlugin({
    // Add more collection slugs here to include them in the generated search index.
    collections: [...searchableCollections],
    beforeSync: beforeSyncWithSearch,
    searchOverrides: {
      fields: ({ defaultFields }) => {
        return [...defaultFields, ...searchFields]
      },
      admin: {
        group: 'Content',
      },
    },
  }),
]

async function createApplication(formSubmission: FormSubmission, req: PayloadRequest) {
  const config = (await req.payload.findGlobal({
    slug: 'aspirementConfig',
    depth: 0,
    overrideAccess: true,
  })) as AspirementConfig
  const recruitmentForm = getRelationshipID(config.recruitment?.['recruitment-form'])
  const submittedForm = getRelationshipID(formSubmission.form)

  if (!recruitmentForm || recruitmentForm !== submittedForm) return

  const existing = await req.payload.find({
    collection: 'applications',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    req,
    where: {
      formSubmission: {
        equals: formSubmission.id,
      },
    },
  })
  if (existing.docs.length > 0) return

  const formData = formSubmission.submissionData ?? []
  const formMap = new Map(formData.map((entry) => [entry.field, entry.value]))
  const firstName = normalizeFormValue(formMap.get('firstName'))
  const lastName = normalizeFormValue(formMap.get('lastName'))
  const name = [firstName, lastName].filter(Boolean).join(' ') || 'Candidat fara nume'
  const email = normalizeFormValue(formMap.get('email'))

  await req.payload.create({
    collection: 'applications',
    data: {
      email,
      formSubmission: formSubmission.id,
      name,
    },
    overrideAccess: true,
    req,
  })
}

function normalizeFormValue(value: unknown) {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  return ''
}

function getRelationshipID(value: unknown) {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) {
    return typeof value.id === 'string' ? value.id : ''
  }

  return ''
}
