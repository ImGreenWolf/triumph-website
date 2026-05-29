'use client'

import type { DefaultCellComponentProps } from 'payload'
import { EventRegistrationSelectionCell } from './EventRegistrationSelectionShared'

export default function EventRegistrationSlotCell(props: DefaultCellComponentProps) {
  return <EventRegistrationSelectionCell {...props} variant="slot" />
}
