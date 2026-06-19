import type {
  CollectionBeforeChangeHook,
  CollectionConfig,
  FieldAccess,
  PayloadRequest,
  Where,
} from 'payload'
import { APIError } from 'payload'

import { authenticated } from '../../access/authenticated'
import type { User } from '@/payload-types'
import { hasBoardRole, isBoardMember } from '@/utilities/membersAccess'
import { importMembersFromCSV } from './bulkUpload'
import {
  generateForgotPasswordEmailHTML,
  generateForgotPasswordEmailSubject,
} from './forgotPasswordEmail'
import { sendPasswordResetEmails } from './passwordReset'

const canManageUsers: FieldAccess = ({ req }) => hasBoardRole({ req })

const canUpdateOwnProfileField: FieldAccess = ({ id, req }) => {
  if (hasBoardRole({ req })) return true

  return Boolean(req.user?.id && id && String(req.user.id) === String(id))
}

const canSetOwnBirthday: FieldAccess = ({ doc, id, req }) => {
  if (hasBoardRole({ req })) return true

  return Boolean(req.user?.id && id && String(req.user.id) === String(id) && !doc?.birthday)
}

const preventMemberBirthdayChanges: CollectionBeforeChangeHook<User> = ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation !== 'update' || hasBoardRole({ req })) {
    return data
  }

  const isOwnProfile = Boolean(
    req.user?.id && originalDoc?.id && String(req.user.id) === String(originalDoc.id),
  )

  if (!isOwnProfile || data.birthday === undefined) {
    return data
  }

  if (originalDoc?.birthday) {
    const currentBirthday = toDateInputValue(originalDoc.birthday)
    const requestedBirthday = data.birthday ? toDateInputValue(data.birthday as string) : null

    if (requestedBirthday !== currentBirthday) {
      throw new APIError('Birthday can only be set once from the profile page.', 400)
    }

    return data
  }

  if (!data.birthdayConfirmed) {
    throw new APIError('Confirm your birthday before saving it.', 400)
  }

  return {
    ...data,
    birthdayConfirmed: true,
  }
}

function toDateInputValue(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    throw new APIError('Enter a valid birthday.', 400)
  }

  return date.toISOString().slice(0, 10)
}

async function getBoardAuthorizationError(req: PayloadRequest) {
  if (!req.user?.id) {
    return Response.json({ message: 'Your session has expired. Sign in again.' }, { status: 401 })
  }

  const authenticatedUser = await req.payload.findByID({
    collection: 'users',
    depth: 0,
    id: req.user.id,
    overrideAccess: true,
  })

  if (!isBoardMember(authenticatedUser)) {
    return Response.json({ message: 'Only board members can manage users.' }, { status: 403 })
  }

  return null
}

function getSelectedIDs(value: unknown) {
  if (!Array.isArray(value)) return []

  return [
    ...new Set(
      value.filter((id): id is number | string => typeof id === 'number' || typeof id === 'string'),
    ),
  ]
}

function isWhere(value: unknown): value is Where {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: hasBoardRole,
    create: authenticated,
    delete: authenticated,
    read: authenticated,
    update: ({ id, req }) => {
      if (hasBoardRole({ req })) return true

      return Boolean(req.user?.id && id && String(req.user.id) === String(id))
    },
  },
  admin: {
    defaultColumns: ['name', 'email', 'joinedAt','attendance', 'payments'],
    useAsTitle: 'name',
    group: 'Club Administration',
    components: {
      beforeList: [
        {
          path: '@/components/payload/MembersBeforeList',
        },
      ],
      listMenuItems: [
        {
          path: '@/components/payload/MembersPasswordResetAction',
        },
      ],
    },
  },
  auth: {
    forgotPassword: {
      generateEmailHTML: generateForgotPasswordEmailHTML,
      generateEmailSubject: generateForgotPasswordEmailSubject,
    },
  },
  endpoints: [
    {
      path: '/bulk-upload',
      method: 'post',
      handler: async (req) => {
        const authorizationError = await getBoardAuthorizationError(req)

        if (authorizationError) return authorizationError

        if (typeof req.formData !== 'function') {
          return Response.json(
            { message: 'CSV upload is not available for this request.' },
            { status: 400 },
          )
        }

        const formData = await req.formData()
        const file = formData.get('file')

        if (!isUploadedFile(file) || file.size === 0) {
          return Response.json({ message: 'Select a CSV file to upload.' }, { status: 400 })
        }

        if (!isCSVFile(file)) {
          return Response.json({ message: 'Upload a .csv file.' }, { status: 400 })
        }

        const result = await importMembersFromCSV({
          csv: await file.text(),
          payload: req.payload,
          user: req.user,
        })

        const totalIssues = result.errors.length + result.skipped.length
        const status = result.created.length === 0 && totalIssues > 0 ? 400 : 200
        const message =
          result.created.length > 0
            ? `Created ${result.created.length} user${result.created.length === 1 ? '' : 's'}.`
            : 'No users were created.'

        return Response.json({ message, ...result }, { status })
      },
    },
    {
      path: '/send-password-reset',
      method: 'post',
      handler: async (req) => {
        const authorizationError = await getBoardAuthorizationError(req)

        if (authorizationError) return authorizationError

        if (typeof req.json !== 'function') {
          return Response.json(
            { message: 'Password reset selection is unavailable.' },
            { status: 400 },
          )
        }

        let body: unknown

        try {
          body = await req.json()
        } catch {
          return Response.json({ message: 'Invalid password reset selection.' }, { status: 400 })
        }

        const selection = body as { all?: unknown; ids?: unknown }
        const selectAll = selection?.all === true
        const selectedIDs = getSelectedIDs(selection?.ids)

        if (!selectAll && selectedIDs.length === 0) {
          return Response.json({ message: 'Select at least one user.' }, { status: 400 })
        }

        const selectedWhere = isWhere(req.query?.where) ? req.query.where : undefined
        const where: Where = selectAll
          ? selectedWhere || { id: { not_equals: '' } }
          : { id: { in: selectedIDs } }
        const users = await req.payload.find({
          collection: 'users',
          depth: 0,
          limit: 0,
          overrideAccess: true,
          pagination: false,
          select: {
            email: true,
          },
          where,
        })

        if (users.docs.length === 0) {
          return Response.json({ message: 'No selected users were found.' }, { status: 400 })
        }

        const result = await sendPasswordResetEmails({
          payload: req.payload,
          req,
          users: users.docs,
        })
        const status = result.sent.length === 0 && result.errors.length > 0 ? 500 : 200
        const message =
          result.sent.length > 0
            ? `Sent ${result.sent.length} password reset email${result.sent.length === 1 ? '' : 's'}.`
            : 'No password reset emails were sent.'

        return Response.json({ message, ...result }, { status })
      },
    },
  ],
  hooks: {
    beforeChange: [preventMemberBirthdayChanges],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      access: {
        update: canManageUsers,
      },
    },
    {
      name: 'phone',
      type: 'text',
      access: {
        update: canManageUsers,
      },
    },
    {
      name: 'profilePicture',
      label: 'Profile Picture',
      type: 'upload',
      relationTo: 'media',
      access: {
        update: canUpdateOwnProfileField,
      },
      admin: {
        description: 'Photo shown on the member profile page.',
      },
    },
    {
      name: 'role',
      type: 'select',
      saveToJWT: true,
      required: true,
      defaultValue: 'active',
      options: [
        {
          label: 'Membru Aspirant',
          value: 'aspirer',
        },
        {
          label: 'Membru Activ',
          value: 'active',
        },
        {
          label: 'Membru Pasiv',
          value: 'passive',
        },
        {
          label: 'Presedinte',
          value: 'president',
        },
        {
          label: 'Past President',
          value: 'past-president',
        },
        {
          label: 'Vice Presedinte',
          value: 'president',
        },
        {
          label: 'PR Director',
          value: 'pr-director',
        },
        {
          label: 'HR Director',
          value: 'hr-director',
        },
        {
          label: 'Secretar',
          value: 'secretary',
        },
        {
          label: 'Trezorier',
          value: 'tresoursier',
        },
      ],
      access: {
        update: canManageUsers,
      },
    },
    {
      name: 'joinedAt',
      type: 'date',
      required: true,
      defaultValue: () => new Date(),
      access: {
        update: canManageUsers,
      },
    },
    {
      name: 'birthday',
      type: 'date',
      access: {
        update: canSetOwnBirthday,
      },
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
        },
        description: 'Members can set this once from their profile page.',
      },
    },
    {
      name: 'birthdayConfirmed',
      label: 'Birthday Confirmed',
      type: 'checkbox',
      defaultValue: false,
      access: {
        update: canSetOwnBirthday,
      },
      admin: {
        description: 'Records that the member confirmed their birthday is final.',
        readOnly: true,
      },
    },
    {
      name: 'birthdayStoryConsent',
      label: 'Birthday Story Consent',
      type: 'checkbox',
      defaultValue: false,
      access: {
        update: canUpdateOwnProfileField,
      },
    },
    {
      name: 'birthdayStoryImage',
      label: 'Birthday Story Image',
      type: 'upload',
      relationTo: 'media',
      access: {
        update: canUpdateOwnProfileField,
      },
      admin: {
        description: 'Image members provide for birthday social media stories.',
      },
    },
    {
      type: 'group',
      admin: {
        position: 'sidebar',
      },
      fields: [
        {
          name: 'payments',
          label: 'Member payments',
          type: 'join',
          collection: 'payments',
          on: 'member',
          virtual: true,
          admin: {
            defaultColumns: ['month', 'amount', 'type'],
            components: {
              Cell: {
                path: '@/components/MembersCell/MemberPaymentsCell.tsx'
              },
              Label: {
                path: '@/components/MembersCell/MemberPaymentsLabel.tsx'
              }
            }
          },
          
        },
        {
          name: 'attendance',
          label: 'Member attendance',
          type: 'join',
          collection: 'attendance',
          on: 'member',
          virtual: true,
          admin: {
            defaultColumns: ['meeting', 'status'],
            
            components: {
              Cell: {
                path: '@/components/MembersCell/MemberAttendenceCell.tsx'
              },
              Label: {
                path: '@/components/MembersCell/MemberAttendenceLabel.tsx'
              }
            }
          },
        },
        {
          name: 'absenceMotivations',
          type: 'join',
          collection: 'absence-motivations',
          on: 'member',
          virtual: true,
          admin: {
            defaultColumns: ['meeting', 'status', 'reviewedAt'],
          },
        },
      ],
    },
  ],
  timestamps: true,
}

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== 'undefined' && value instanceof File
}

function isCSVFile(file: File) {
  const fileName = file.name.toLowerCase()
  const mimeType = file.type.toLowerCase()

  return (
    fileName.endsWith('.csv') ||
    mimeType === 'text/csv' ||
    mimeType === 'text/plain' ||
    mimeType === 'application/vnd.ms-excel'
  )
}
