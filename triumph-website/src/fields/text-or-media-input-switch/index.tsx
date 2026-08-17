'use client'

import { FieldDescription, FieldError, FieldLabel, useField } from '@payloadcms/ui'
import type { Option, RadioFieldClientProps } from 'payload'
import React from 'react'

import './style.scss'

const fieldBaseClass = 'text-or-media-input-switch'

const getOptionLabel = (option: Option) => {
  if (typeof option === 'string') {
    return option
  }

  return typeof option.label === 'string' ? option.label : option.value
}

const getOptionValue = (option: Option) => (typeof option === 'string' ? option : option.value)

const TextOrMediaInputSwitch: React.FC<RadioFieldClientProps> = ({ field, path, readOnly }) => {
  const fieldPath = path || field.name
  const { disabled, setValue, showError, value } = useField<string>({ path: fieldPath })
  const selectedValue = value || 'text'
  const actualReadOnly = readOnly || field.admin?.readOnly || false
  const isDisabled = actualReadOnly || disabled

  return (
    <div className={fieldBaseClass}>
      <FieldLabel
        label={field.label}
        localized={field.localized}
        path={fieldPath}
        required={field.required}
      />
      <div
        aria-label={typeof field.label === 'string' ? field.label : field.name}
        className={`${fieldBaseClass}__control`}
        role="radiogroup"
      >
        {field.options.map((option) => {
          const optionValue = getOptionValue(option)
          const selected = selectedValue === optionValue

          return (
            <button
              aria-checked={selected}
              className={`${fieldBaseClass}__button ${
                selected ? `${fieldBaseClass}__button--selected` : ''
              }`}
              disabled={isDisabled}
              key={optionValue}
              onClick={() => {
                if (!isDisabled) {
                  setValue(optionValue)
                }
              }}
              role="radio"
              type="button"
            >
              {getOptionLabel(option)}
            </button>
          )
        })}
      </div>
      <FieldError showError={showError} path={fieldPath} />
      <FieldDescription description={field.admin?.description} path={fieldPath} />
    </div>
  )
}

export default TextOrMediaInputSwitch
