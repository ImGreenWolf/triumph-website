import type { Access, CollectionBeforeChangeHook, CollectionConfig, Where } from 'payload'
import { APIError } from 'payload'

import { authenticated } from '@/access/authenticated'
import { hasBoardRole } from '@/utilities/membersAccess'

const approvedGalleryAccess: Access = ({ req }) => {
  if (hasBoardRole({ req })) return true

  if (req.user) {
    const memberGalleryAccess: Where = {
      status: {
        equals: 'approved',
      },
    }

    return memberGalleryAccess
  }

  const publicGalleryAccess: Where = {
    and: [
      {
        visibility: {
          equals: 'public',
        },
      },
      {
        status: {
          equals: 'approved',
        },
      },
    ],
  }

  return publicGalleryAccess
}

const setSubmissionMetadata: CollectionBeforeChangeHook = ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation === 'create') {
    if (!req.user) {
      throw new APIError('You must be logged in to submit gallery photos.', 401)
    }

    const visibility = data.visibility === 'private' ? 'private' : 'public'
    const submittedByBoardMember = hasBoardRole({ req })
    const submittedAt = new Date().toISOString()
    const status = visibility === 'private' || submittedByBoardMember ? 'approved' : 'pending'

    return {
      ...data,
      reviewedAt: submittedByBoardMember ? submittedAt : null,
      reviewedBy: submittedByBoardMember ? req.user.id : null,
      status,
      submittedAt,
      uploadedBy: req.user.id,
      visibility,
    }
  }

  const nextStatus = data.status || originalDoc?.status

  if (nextStatus !== originalDoc?.status) {
    return {
      ...data,
      reviewedAt: nextStatus === 'pending' ? null : new Date().toISOString(),
      reviewedBy: nextStatus === 'pending' ? null : req.user?.id,
    }
  }

  return data
}

export const GalleryPhotos: CollectionConfig = {
  slug: 'gallery-photos',
  access: {
    admin: hasBoardRole,
    create: authenticated,
    delete: hasBoardRole,
    read: approvedGalleryAccess,
    update: hasBoardRole,
  },
  admin: {
    defaultColumns: [
      'photo',
      'visibility',
      'status',
      'event',
      'uploadedBy',
      'submittedAt',
      'reviewActions',
      'reviewedAt',
    ],
    group: 'Club Administration',
    useAsTitle: 'id',
  },
  fields: [
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'caption',
      type: 'textarea',
    },
    {
      name: 'visibility',
      type: 'select',
      defaultValue: 'public',
      required: true,
      options: [
        {
          label: 'Public gallery',
          value: 'public',
        },
        {
          label: 'Members only',
          value: 'private',
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      required: true,
      options: [
        {
          label: 'Pending review',
          value: 'pending',
        },
        {
          label: 'Approved',
          value: 'approved',
        },
        {
          label: 'Rejected',
          value: 'rejected',
        },
      ],
      admin: {
        description:
          'Public submissions start pending. Private submissions are visible to members until rejected.',
      },
      access: {
        create: hasBoardRole,
      },
    },
    {
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
    },
    {
      name: 'uploadedBy',
      type: 'relationship',
      relationTo: 'users',
      access: {
        create: () => false,
        update: () => false,
      },
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'submittedAt',
      type: 'date',
      access: {
        create: () => false,
        update: () => false,
      },
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'reviewedBy',
      type: 'relationship',
      relationTo: 'users',
      access: {
        create: () => false,
        update: () => false,
      },
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'reviewedAt',
      type: 'date',
      access: {
        create: () => false,
        update: () => false,
      },
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'rejectionReason',
      type: 'textarea',
      admin: {
        condition: (_, siblingData) => siblingData.status === 'rejected',
      },
    },
    {
      name: 'reviewActions',
      type: 'ui',
      label: 'Actions',
      admin: {
        components: {
          Cell: {
            path: '@/components/payload/GalleryPhotoActionsCell',
          },
        },
      },
    },
  ],
  hooks: {
    beforeChange: [setSubmissionMetadata],
  },
  timestamps: true,
}
