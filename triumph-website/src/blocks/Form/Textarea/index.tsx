import type { TextAreaField } from '@payloadcms/plugin-form-builder/types'
import {
  useFormContext,
  useWatch,
  type FieldErrorsImpl,
  type FieldValues,
  type UseFormRegister,
} from 'react-hook-form'

import { Label } from '@/components/ui/label'
import { Textarea as TextAreaComponent } from '@/components/ui/textarea'
import React from 'react'

import { Error } from '../Error'
import { Width } from '../Width'
import { fieldLabelClass, requiredClass, textareaClass } from '../styles'

export const Textarea: React.FC<
  TextAreaField & {
    errors: Partial<FieldErrorsImpl>
    maxWords?: number | null
    register: UseFormRegister<FieldValues>
    rows?: number
  }
> = ({ name, defaultValue, errors, label, maxWords, register, required, rows = 3, width }) => {
  const { control } = useFormContext<FieldValues>()
  const value = useWatch({ control, defaultValue, name })
  const wordLimit = normalizeWordLimit(maxWords)
  const wordCount = countWords(value)
  const registration = register(name, {
    required,
    validate: (input) =>
      !wordLimit || countWords(input) <= wordLimit || `Foloseste cel mult ${wordLimit} cuvinte.`,
  })

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

      <TextAreaComponent
        aria-invalid={Boolean(errors[name])}
        className={textareaClass}
        defaultValue={defaultValue}
        id={name}
        rows={rows}
        {...registration}
        onChange={(event) => {
          if (wordLimit) {
            event.target.value = limitWords(event.target.value, wordLimit)
          }
          registration.onChange(event)
        }}
      />

      {wordLimit && (
        <p className="mt-1.5 text-right text-xs font-medium text-muted-foreground">
          {wordCount}/{wordLimit} cuvinte
        </p>
      )}

      {errors[name] && <Error name={name} />}
    </Width>
  )
}

function countWords(value: unknown) {
  return typeof value === 'string' ? value.trim().split(/\s+/).filter(Boolean).length : 0
}

function limitWords(value: string, limit: number) {
  const words = value.match(/\S+/g) ?? []
  if (words.length <= limit) return value
  return words.slice(0, limit).join(' ')
}

function normalizeWordLimit(value: number | null | undefined) {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null
}
