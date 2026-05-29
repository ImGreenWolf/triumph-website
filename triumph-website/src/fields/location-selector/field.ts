import { CollapsibleField, Field } from 'payload'

export const locationField = (props: {label: string}): CollapsibleField => {
  const {label} = props
  const baseField: Field = {
    name: 'location',
    type: 'json',
    required: false,
    admin: {
      description: '',
      components: {
        Field: {
          path: '@/fields/location-selector',
        },
      },
    },
  }

  return {
    type: 'collapsible',
    label: label || 'Manage Location of Event',
    fields: [baseField],
    admin: {
      initCollapsed: true
    }
  }
}
