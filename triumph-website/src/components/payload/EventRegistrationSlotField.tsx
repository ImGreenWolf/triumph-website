'use client'

import type { TextFieldClientComponent } from 'payload'
import { EventRegistrationSelectionField } from './EventRegistrationSelectionShared'

const EventRegistrationSlotField: TextFieldClientComponent = (props) => {
  return <EventRegistrationSelectionField {...props} variant="slot" />
}

export default EventRegistrationSlotField
