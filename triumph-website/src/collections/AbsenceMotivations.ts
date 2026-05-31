import { APIError } from 'payload'
import type { CollectionConfig } from 'payload'

import type { Attendance } from '@/payload-types'
import { authenticated } from '@/access/authenticated'
import { hasSecretaryRole, isSecretary } from '@/utilities/membersAccess'

const getRelationshipID = (value: unknown) => {
  if (typeof value === 'string') return value

  if (value && typeof value === 'object' && 'id' in value && typeof value.id === 'string') {
    return value.id
  }

  return null
}

export const AbsenceMotivations: CollectionConfig = {
  slug: 'absence-motivations',

  access: {
    admin: hasSecretaryRole,
    create: authenticated,
    delete: ({ req }) => isSecretary(req.user),
    read: ({ req }) => {
      if (!req.user) return false
      if (isSecretary(req.user)) return true

      return {
        member: {
          equals: req.user.id,
        },
      }
    },
    update: ({ req }) => isSecretary(req.user),
  },

  indexes: [
    {
      fields: ['member', 'meeting'],
      unique: true,
    },
  ],

  admin: {
    defaultColumns: ['member', 'meeting', 'status', 'memberMessage', 'reviewActions', 'reviewedAt'],
    group: 'Club Administration',
    useAsTitle: 'id',
  },

  hooks: {
    beforeValidate: [
      ({ data, operation, req }) => {
        if (operation !== 'create') return data
        if (!req.user) throw new APIError('Trebuie să fii autentificat pentru a trimite o motivare.', 401)

        return {
          ...data,
          member: req.user.id,
          reviewedAt: null,
          reviewedBy: null,
          secretaryMessage: null,
          status: 'pending',
        }
      },
    ],
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        if (operation === 'create') {
          const member = getRelationshipID(data.member)
          const meeting = getRelationshipID(data.meeting)

          if (member && meeting) {
            const attendance = await req.payload.find({
              collection: 'attendance',
              where: {
                and: [
                  {
                    member: {
                      equals: member,
                    },
                  },
                  {
                    meeting: {
                      equals: meeting,
                    },
                  },
                ],
              },
              limit: 1,
              req,
            })
            const existingAttendance = attendance.docs[0] as Attendance | undefined

            if (existingAttendance && existingAttendance.status !== 'absent') {
              throw new APIError('Prezența pentru această întâlnire este deja înregistrată.', 400)
            }
          }

          return data
        }

        const status = data.status || originalDoc.status
        const secretaryMessage = data.secretaryMessage ?? originalDoc.secretaryMessage

        if (status === 'rejected' && !secretaryMessage?.trim()) {
          throw new APIError('Adaugă un mesaj pentru membru înainte de a respinge motivarea.', 400)
        }

        if (status === 'accepted') {
          const member = getRelationshipID(originalDoc.member)
          const meeting = getRelationshipID(originalDoc.meeting)

          if (member && meeting) {
            const attendance = await req.payload.find({
              collection: 'attendance',
              where: {
                and: [
                  {
                    member: {
                      equals: member,
                    },
                  },
                  {
                    meeting: {
                      equals: meeting,
                    },
                  },
                ],
              },
              limit: 1,
              req,
            })
            const existingAttendance = attendance.docs[0] as Attendance | undefined

            if (
              existingAttendance?.status === 'present' ||
              existingAttendance?.status === 'late'
            ) {
              throw new APIError('Un membru deja prezent sau întârziat nu poate fi marcat absent motivat.', 400)
            }
          }
        }

        return {
          ...data,
          reviewedAt: status === 'pending' ? null : new Date().toISOString(),
          reviewedBy: status === 'pending' ? null : req.user?.id,
        }
      },
    ],
    afterChange: [
      async ({ doc, operation, previousDoc, req }) => {
        if (operation !== 'update' || doc.status === previousDoc.status) return doc

        const member = getRelationshipID(doc.member)
        const meeting = getRelationshipID(doc.meeting)

        if (!member || !meeting) return doc

        const attendance = await req.payload.find({
          collection: 'attendance',
          where: {
            and: [
              {
                member: {
                  equals: member,
                },
              },
              {
                meeting: {
                  equals: meeting,
                },
              },
            ],
          },
          limit: 1,
          req,
        })
        const existingAttendance = attendance.docs[0] as Attendance | undefined

        if (doc.status === 'accepted') {
          const reviewer = getRelationshipID(req.user)
          const data = {
            member,
            meeting,
            motivatedBy: reviewer,
            motivationReason: doc.memberMessage,
            status: 'motivated' as const,
          }

          if (existingAttendance) {
            await req.payload.update({
              collection: 'attendance',
              id: existingAttendance.id,
              data,
              req,
            })
          } else {
            await req.payload.create({
              collection: 'attendance',
              data,
              req,
            })
          }
        } else if (previousDoc.status === 'accepted' && existingAttendance?.status === 'motivated') {
          await req.payload.update({
            collection: 'attendance',
            id: existingAttendance.id,
            data: {
              motivatedBy: null,
              motivationReason: null,
              status: 'absent',
            },
            req,
          })
        }

        return doc
      },
    ],
  },

  fields: [
    {
      name: 'member',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      access: {
        create: () => false,
        update: () => false,
      },
    },
    {
      name: 'meeting',
      type: 'relationship',
      relationTo: 'meetings',
      required: true,
      access: {
        update: () => false,
      },
    },
    {
      name: 'memberMessage',
      type: 'textarea',
      label: 'Optional message from member',
      access: {
        update: () => false,
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        {
          label: 'Pending review',
          value: 'pending',
        },
        {
          label: 'Accepted',
          value: 'accepted',
        },
        {
          label: 'Rejected',
          value: 'rejected',
        },
      ],
      access: {
        create: () => false,
        update: ({ req }) => isSecretary(req.user),
      },
    },
    {
      name: 'secretaryMessage',
      type: 'textarea',
      label: 'Message for member',
      admin: {
        condition: (_, siblingData) => siblingData.status === 'rejected',
        description: 'Required when rejecting the request. It is shown on the member dashboard.',
      },
      access: {
        create: () => false,
        update: ({ req }) => isSecretary(req.user),
      },
    },
    {
      name: 'reviewedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        readOnly: true,
      },
      access: {
        create: () => false,
        update: () => false,
      },
    },
    {
      name: 'reviewedAt',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        readOnly: true,
      },
      access: {
        create: () => false,
        update: () => false,
      },
    },
    {
      name: 'reviewActions',
      type: 'ui',
      label: 'Actions',
      admin: {
        components: {
          Cell: {
            path: '@/components/payload/AbsenceMotivationActionsCell',
          },
        },
      },
    },
  ],

  timestamps: true,
}
