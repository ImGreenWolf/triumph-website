'use client'

import { useFormFields } from '@payloadcms/ui'

type JoinValue = {
  docs?: unknown[]
  totalDocs?: number
}

export default function EventRegistrationsBeforeInput() {
  const registrations = useFormFields(([fields]) => {
    return fields.registrations?.value as JoinValue | undefined
  })

  const total =
    registrations?.totalDocs ??
    registrations?.docs?.length ??
    0

  return (
    <div style={{ marginBottom: 10 }}>
      Total registrations: {total}
    </div>
  )
}