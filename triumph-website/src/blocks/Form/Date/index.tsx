import type { DateField } from '@payloadcms/plugin-form-builder/types'
import type { FieldErrorsImpl, FieldValues, UseFormRegister } from 'react-hook-form'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import React from 'react'

import { Error } from '../Error'
import { Width } from '../Width'
import { fieldLabelClass, inputClass, requiredClass } from '../styles'

export const Date: React.FC<
  DateField & {
    errors: Partial<FieldErrorsImpl>
    register: UseFormRegister<FieldValues>
  }
> = ({ name, defaultValue, errors, label, register, required, width }) => {
  return (
    <Width width={width}>
      <Label className={fieldLabelClass} htmlFor={name}>
        {label}

        {required && (
          <span className={requiredClass}>
            * <span className="sr-only">(required)</span>
          </span>
        )}
      </Label>
      <Input
        aria-invalid={Boolean(errors[name])}
        className={inputClass}
        defaultValue={formatDateDefaultValue(defaultValue)}
        id={name}
        type="date"
        {...register(name, { required })}
      />
      {errors[name] && <Error name={name} />}
    </Width>
  )
}

function formatDateDefaultValue(value?: string) {
  if (!value) return undefined

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10)
  }

  const date = new globalThis.Date(value)

  if (Number.isNaN(date.getTime())) {
    return undefined
  }

  return date.toISOString().slice(0, 10)
}
