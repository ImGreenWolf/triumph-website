'use client'

import type { TextFieldClientComponent } from 'payload'
import { EventRegistrationSelectionField } from './EventRegistrationSelectionShared'

const EventRegistrationDayField: TextFieldClientComponent = (props) => {
  return <EventRegistrationSelectionField {...props} variant="day" />
}

export default EventRegistrationDayField
