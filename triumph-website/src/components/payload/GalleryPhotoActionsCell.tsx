'use client'

import type { DefaultCellComponentProps } from 'payload'

import ReviewActionsCell from './ReviewActionsCell'

export default function GalleryPhotoActionsCell(props: DefaultCellComponentProps) {
  return (
    <ReviewActionsCell
      config={{
        allowRejectAfterAccepted: true,
        acceptedStatus: 'approved',
        endpoint: '/api/gallery-photos',
        labels: {
          acceptAction: 'Aprobă fotografia',
          acceptedStatus: 'Fotografie aprobată',
          errorMessage: 'Decizia nu a putut fi salvată.',
          messageDescription: 'Adaugă motivul respingerii pentru evidența internă.',
          messageLabel: 'Motiv respingere',
          rejectAction: 'Respinge fotografia',
          rejectedStatus: 'Fotografie respinsă',
          requiredMessage: 'Adaugă motivul respingerii.',
          successMessage: 'Decizia a fost salvată.',
        },
        messageFieldName: 'rejectionReason',
        pendingStatus: 'pending',
        rejectedStatus: 'rejected',
      }}
      {...props}
    />
  )
}
