import type { CollectionSlug, GroupField } from 'payload'

import deepMerge from '@/utilities/deepMerge'

type TextOrMediaValue = {
  inputType?: 'text' | 'media' | null
  media?: unknown
  text?: string | null
}

type TextOrMediaFieldOptions = {
  label?: string
  mediaLabel?: string
  name?: string
  overrides?: Partial<GroupField>
  relationTo?: CollectionSlug
  required?: boolean
  textLabel?: string
}

const normalizeLegacyTextValue = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return {
      inputType: 'text',
      text: value,
    }
  }

  return value
}

export const textOrMediaField = ({
  label = 'Title',
  mediaLabel = 'Media',
  name = 'title',
  overrides = {},
  relationTo = 'media',
  required = false,
  textLabel = 'Text',
}: TextOrMediaFieldOptions = {}): GroupField => {
  const field: GroupField = {
    name,
    type: 'group',
    label,
    required,
    admin: {
      hideGutter: true,
    },
    hooks: {
      afterRead: [({ value }) => normalizeLegacyTextValue(value)],
      beforeValidate: [({ value }) => normalizeLegacyTextValue(value)],
    },
    fields: [
      {
        name: 'inputType',
        type: 'radio',
        label: 'Input method',
        defaultValue: 'text',
        options: [
          {
            label: 'Text',
            value: 'text',
          },
          {
            label: 'Media upload',
            value: 'media',
          },
        ],
        required: true,
        admin: {
          components: {
            Field: {
              path: '@/fields/text-or-media-input-switch',
            },
          },
        },
      },
      {
        name: 'text',
        type: 'text',
        label: textLabel,
        required,
        admin: {
          condition: (_, siblingData: TextOrMediaValue = {}) =>
            !siblingData.inputType || siblingData.inputType === 'text',
        },
      },
      {
        name: 'media',
        type: 'upload',
        label: mediaLabel,
        relationTo,
        required,
        admin: {
          condition: (_, siblingData: TextOrMediaValue = {}) => siblingData.inputType === 'media',
        },
      },
    ],
  }

  return deepMerge(field, overrides)
}
