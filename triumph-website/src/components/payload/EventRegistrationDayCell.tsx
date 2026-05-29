'use client'

import type { DefaultCellComponentProps } from 'payload'
import { EventRegistrationSelectionCell } from './EventRegistrationSelectionShared'

export default function EventRegistrationDayCell(props: DefaultCellComponentProps) {
  return <EventRegistrationSelectionCell {...props} variant="day" />
}
