'use client'

import type { NumberFieldDescriptionClientComponent } from 'payload'

import { useField } from '@payloadcms/ui'

export const YearDescription: NumberFieldDescriptionClientComponent = ({ path }) => {
  const { value } = useField<number>({ path })
  const year = typeof value === 'number' ? value : new Date().getFullYear()

  return <p className="field-description">Mandatul anului {year} - {year + 1}</p>
}
