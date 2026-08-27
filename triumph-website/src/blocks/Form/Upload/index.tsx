import type { UploadField } from '@payloadcms/plugin-form-builder/types'
import type { FieldErrorsImpl, FieldValues, UseFormRegister } from 'react-hook-form'

import { UploadCloud } from 'lucide-react'
import React from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { Error } from '../Error'
import { Width } from '../Width'
import { fieldLabelClass, inputClass, requiredClass } from '../styles'

export const Upload: React.FC<
  UploadField & {
    errors: Partial<FieldErrorsImpl>
    register: UseFormRegister<FieldValues>
  }
> = ({ name, errors, label, maxFileSize, mimeTypes, multiple, register, required, width }) => {
  const acceptedMimeTypes = mimeTypes?.map(({ mimeType }) => mimeType).filter(Boolean) ?? []
  const accept = acceptedMimeTypes.length > 0 ? acceptedMimeTypes.join(',') : undefined

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
      <div className="rounded-md border border-dashed border-border bg-background p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
            <UploadCloud className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <Input
              accept={accept}
              aria-invalid={Boolean(errors[name])}
              className={`${inputClass} file:mr-4 file:rounded-md file:border-0 file:bg-accent file:px-3 file:text-sm file:font-semibold file:text-accent-foreground hover:file:bg-accent/90`}
              id={name}
              multiple={multiple}
              type="file"
              {...register(name, {
                validate: (value) =>
                  validateFiles(value, {
                    acceptedMimeTypes,
                    maxFileSize,
                    multiple,
                    required,
                  }),
              })}
            />
          </div>
        </div>
      </div>
      {errors[name] && <Error name={name} />}
    </Width>
  )
}

function validateFiles(
  value: unknown,
  options: {
    acceptedMimeTypes: string[]
    maxFileSize?: number
    multiple?: boolean
    required?: boolean
  },
) {
  const files = getFiles(value)

  if (options.required && files.length === 0) {
    return 'This field is required'
  }

  if (!options.multiple && files.length > 1) {
    return 'Only one file is allowed'
  }

  const oversizedFile = files.find((file) => options.maxFileSize && file.size > options.maxFileSize)

  if (oversizedFile && options.maxFileSize) {
    return `${oversizedFile.name} exceeds ${formatBytes(options.maxFileSize)}`
  }

  const invalidFile = files.find(
    (file) =>
      options.acceptedMimeTypes.length > 0 &&
      !options.acceptedMimeTypes.some((mimeType) => matchesMimeType(file.type, mimeType)),
  )

  if (invalidFile) {
    return `${invalidFile.name} is not an accepted file type`
  }

  return true
}

function getFiles(value: unknown) {
  if (typeof FileList !== 'undefined' && value instanceof FileList) {
    return Array.from(value)
  }

  if (typeof File !== 'undefined' && value instanceof File) {
    return [value]
  }

  if (
    Array.isArray(value) &&
    value.every((item) => typeof File !== 'undefined' && item instanceof File)
  ) {
    return value
  }

  return []
}

function matchesMimeType(fileType: string, allowedType: string) {
  if (allowedType === '*/*' || allowedType === fileType) return true

  if (allowedType.endsWith('/*')) {
    return fileType.startsWith(`${allowedType.slice(0, -1)}`)
  }

  return false
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
