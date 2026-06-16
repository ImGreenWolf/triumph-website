'use client'

import type { DefaultCellComponentProps } from 'payload'

import ReviewActionsCell from './ReviewActionsCell'

export default function AbsenceMotivationActionsCell(props: DefaultCellComponentProps) {
  return (
    <ReviewActionsCell
      config={{
        acceptedStatus: 'accepted',
        endpoint: '/api/absence-motivations',
        labels: {
          acceptAction: 'Acceptă motivarea',
          acceptedStatus: 'Motivare acceptată',
          errorMessage: 'Decizia nu a putut fi salvată.',
          messageDescription: 'Adaugă mesajul care va fi afișat membrului în dashboard.',
          messageLabel: 'Mesaj pentru membru',
          rejectAction: 'Respinge motivarea',
          rejectedStatus: 'Motivare respinsă',
          requiredMessage: 'Adaugă un mesaj pentru membru.',
          successMessage: 'Decizia a fost salvată.',
        },
        messageFieldName: 'secretaryMessage',
        pendingStatus: 'pending',
        rejectedStatus: 'rejected',
      }}
      {...props}
    />
  )
}
