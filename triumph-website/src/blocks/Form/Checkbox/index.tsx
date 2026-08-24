import type { CheckboxField } from '@payloadcms/plugin-form-builder/types'
import type { FieldErrorsImpl, FieldValues, UseFormRegister } from 'react-hook-form'

import { useFormContext } from 'react-hook-form'

import { Checkbox as CheckboxUi } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import React from 'react'

import { Error } from '../Error'
import { Width } from '../Width'
import { checkboxClass, requiredClass } from '../styles'

export const Checkbox: React.FC<
  CheckboxField & {
    errors: Partial<FieldErrorsImpl>
    register: UseFormRegister<FieldValues>
  }
> = ({ name, defaultValue, errors, label, register, required, width }) => {
  const props = register(name, { required: required })
  const { setValue } = useFormContext()

  return (
    <Width width={width}>
      <div className="rounded-md border border-border bg-background p-4 shadow-sm">
        <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-3">
          <CheckboxUi
            aria-invalid={Boolean(errors[name])}
            className={checkboxClass}
            defaultChecked={defaultValue}
            id={name}
            {...props}
            onCheckedChange={(checked) => {
              setValue(props.name, checked)
            }}
          />
          <Label className="text-sm font-medium leading-5 text-foreground" htmlFor={name}>
            {required && (
              <span className={requiredClass}>
                * <span className="sr-only">(required)</span>
              </span>
            )}
            {label}
          </Label>
        </div>
      </div>
      {errors[name] && <Error name={name} />}
    </Width>
  )
}
