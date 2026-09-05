import { APIError } from 'payload'
import type { CollectionConfig } from 'payload'

import type { Attendance } from '@/payload-types'
import { authenticated } from '@/access/authenticated'
import { hasBoardRole, hasSecretaryRole, isBoardMember, isSecretary } from '@/utilities/membersAccess'

const getRelationshipID = (value: unknown) => {
  if (typeof value === 'string') return value

  if (value && typeof value === 'object' && 'id' in value && typeof value.id === 'string') {
    return value.id
  }

  return null
}
const allowManual = true

export const AbsenceMotivations: CollectionConfig = {
  slug: 'absence-motivations',

  access: {
    admin: hasBoardRole,
    create: hasBoardRole,
    delete: hasBoardRole,
    read: authenticated,
    // ({ req }) => {
    //   if (!req.user) return false
    //   if (isSecretary(req.user)) return true

    //   return false
    //   //  {
    //   //   member: {
    //   //     equals: req.user.id,
    //   //   },
    //   // }
    // },
    update: hasBoardRole,
  },

  indexes: [
    {
      fields: ['member', 'meeting'],
      unique: true,
    },
  ],
  disableBulkEdit: true,
  admin: {
    defaultColumns: ['member', 'meeting', 'status', 'memberMessage', 'reviewActions', 'reviewedAt'],
    group: 'Club Administration',
    useAsTitle: 'id',
    
  },

  hooks: {
    beforeValidate: [
      ({ data, operation, req }) => {
        // member dashboard motivation
        console.log(data)
        if (operation !== 'create') return data
        if (!req.user) throw new APIError('Trebuie să fii autentificat pentru a trimite o motivare.', 401)

        if(data && data.status == "accepted") return data;
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
        // prevent multiple motivations
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
              pagination: false
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
        // prevent motivating an already present member
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
              pagination: false
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
      // async ({ doc, operation, previousDoc, req }) => {
      //   if (operation !== 'update' || doc.status === previousDoc.status) return doc

      //   const member = getRelationshipID(doc.member)
      //   const meeting = getRelationshipID(doc.meeting)

      //   if (!member || !meeting) return doc

      //   // const attendance = await req.payload.find({
      //   //   collection: 'attendance',
      //   //   where: {
      //   //     and: [
      //   //       {
      //   //         member: {
      //   //           equals: member,
      //   //         },
      //   //       },
      //   //       {
      //   //         meeting: {
      //   //           equals: meeting,
      //   //         },
      //   //       },
      //   //     ],
      //   //   },
      //   //   limit: 1,
      //   //   req,
      //   // })
      //   // const existingAttendance = attendance.docs[0] as Attendance | undefined

      //   // if (doc.status === 'accepted') {
      //   //   const reviewer = getRelationshipID(req.user)
      //   //   const data = {
      //   //     member,
      //   //     meeting,
      //   //     issuedBy: reviewer,
      //   //     motivationReason: doc.memberMessage,
      //   //     status: 'motivated' as const,
      //   //   }

      //   //   if (existingAttendance) {
      //   //     await req.payload.update({
      //   //       collection: 'attendance',
      //   //       id: existingAttendance.id,
      //   //       data,
      //   //       req,
      //   //     })
      //   //   } else {
      //   //     await req.payload.create({
      //   //       collection: 'attendance',
      //   //       data,
      //   //       req,
      //   //     })
      //   //   }
      //   // } else if (previousDoc.status === 'accepted' && existingAttendance?.status === 'motivated') {
      //   //   await req.payload.update({
      //   //     collection: 'attendance',
      //   //     id: existingAttendance.id,
      //   //     data: {
      //   //       issuedBy: null,
      //   //       motivationReason: null,
      //   //       status: 'absent',
      //   //     },
      //   //     req,
      //   //   })
      //   // }

      //   return doc
      // },
    ],
  },

  fields: [
    {
      name: 'member',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      access: {
        create: ({ req }) => isSecretary(req.user) && allowManual,
        update: ({ req }) => isSecretary(req.user) && allowManual,
      },
    },
    {
      name: 'meeting',
      type: 'relationship',
      relationTo: 'meetings',
      required: true,
      access: {
        update: ({ req }) => isSecretary(req.user) && allowManual,
      },
      defaultValue: async ({req}) => (await req.payload.find({collection: 'meetings', sort: '-meetingDate', limit: 1, req})).docs[0]
    },
    {
      name: 'memberMessage',
      type: 'textarea',
      label: 'Motivul cererii de motivăre a absenței din partea membrului.',
      access: {
        update: ({ req }) => isSecretary(req.user) && allowManual,
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'accepted',
      options: [
        {
          label: 'Necesită Verificare',
          value: 'pending',
        },
        {
          label: 'Acceptată',
          value: 'accepted',
        },
        {
          label: 'Refuzată',
          value: 'rejected',
        },
      ],
      access: {
        create: ({ req }) => isSecretary(req.user) && allowManual,
        update: ({ req }) => isSecretary(req.user),
      },
    },
    {
      name: 'secretaryMessage',
      type: 'textarea',
      label: 'Message for member',
      admin: {
        condition: (_, siblingData) => siblingData.status === 'rejected',
        description: 'Necesar pentru a refuza cererea. Apare in contul membrului.',
      },
      access: {
        create: ({ req }) => isSecretary(req.user) && allowManual,
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
      defaultValue: (req) => req.user?.id
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
      defaultValue: new Date(),
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
