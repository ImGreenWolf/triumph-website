'use client'
import type { FormFieldBlock, Form as FormType } from '@payloadcms/plugin-form-builder/types'

import { useRouter } from 'next/navigation'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm, FormProvider, type FieldValues } from 'react-hook-form'
import RichText from '@/components/RichText'
import { Button } from '@/components/ui/button'
import type { DefaultTypedEditorState } from '@payloadcms/richtext-lexical'
import { AlertCircle, CheckCircle2, LoaderCircle, Send } from 'lucide-react'

import { fields } from './fields'
import { getClientSideURL } from '@/utilities/getURL'
import { FormBlock as FormBlockProps } from '@/payload-types'
import { Media } from '@/components/Media'
export type FormBlockType = {
  blockName?: string
  blockType?: 'formBlock'
  enableIntro: boolean
  form: FormType
  introContent?: DefaultTypedEditorState
}

export const FormBlock: React.FC<
  {
    id?: string
    introMedia: FormBlockProps['introMedia']
  } & FormBlockType
> = (props) => {
  const {
    enableIntro,
    form: formFromProps,
    form: { id: formID, confirmationMessage, confirmationType, redirect, submitButtonLabel } = {},
    introContent,
    introMedia,
  } = props

  const defaultValues = useMemo(
    () => getDefaultValues(formFromProps.fields),
    [formFromProps.fields],
  )

  const formMethods = useForm({
    defaultValues,
  })
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
  } = formMethods

  const [isLoading, setIsLoading] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState<boolean>()
  const [error, setError] = useState<{ message: string; status?: string } | undefined>()
  const [recruitmentWindow, setRecruitmentWindow] = useState<{
    isOpen: boolean
    isRecruitmentForm: boolean
    message: string
  } | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!formID) return

    let active = true
    void fetch(`/api/aspirement/recruitment-status?formId=${encodeURIComponent(formID)}`)
      .then(async (response) => {
        if (!response.ok) return null
        return (await response.json()) as {
          isOpen?: boolean
          isRecruitmentForm?: boolean
          message?: string
        }
      })
      .then((result) => {
        if (!active || !result) return
        setRecruitmentWindow({
          isOpen: result.isOpen !== false,
          isRecruitmentForm: result.isRecruitmentForm === true,
          message: result.message || 'Perioada de inscrieri s-a incheiat.',
        })
      })

    return () => {
      active = false
    }
  }, [formID])

  const onSubmit = useCallback(
    (data: FieldValues) => {
      let loadingTimerID: ReturnType<typeof setTimeout>
      const submitForm = async () => {
        setError(undefined)

        const { dataToSend, uploadEntries } = buildSubmissionData(formFromProps.fields, data)
        const hasUploadFiles = uploadEntries.some(({ files }) => files.length > 0)
        const payload = {
          form: formID,
          submissionData: dataToSend,
        }

        const body = hasUploadFiles ? new FormData() : JSON.stringify(payload)

        if (body instanceof FormData) {
          body.append('_payload', JSON.stringify(payload))

          uploadEntries.forEach(({ files, name }) => {
            files.forEach((file) => body.append(name, file))
          })
        }

        // delay loading indicator by 1s
        loadingTimerID = setTimeout(() => {
          setIsLoading(true)
        }, 1000)

        try {
          const req = await fetch(`${getClientSideURL()}/api/form-submissions`, {
            body,
            headers: hasUploadFiles
              ? undefined
              : {
                  'Content-Type': 'application/json',
                },
            method: 'POST',
          })

          const res = await req.json()

          clearTimeout(loadingTimerID)

          if (req.status >= 400) {
            setIsLoading(false)

            setError({
              message: res.errors?.[0]?.message || 'Internal Server Error',
              status: res.status,
            })

            return
          }

          setIsLoading(false)
          setHasSubmitted(true)

          if (confirmationType === 'redirect' && redirect) {
            const { url } = redirect

            const redirectUrl = url

            if (redirectUrl) router.push(redirectUrl)
          }
        } catch (err) {
          console.warn(err)
          setIsLoading(false)
          setError({
            message: 'Something went wrong.',
          })
        }
      }

      void submitForm()
    },
    [router, formID, redirect, confirmationType, formFromProps.fields],
  )

  const hasIntro = enableIntro && introContent && !hasSubmitted

  return (
    <section className="container py-12 sm:py-16">
      <div
        className={
          hasIntro
            ? 'grid gap-8 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1fr)] lg:items-start'
            : 'mx-auto max-w-3xl'
        }
      >
        {hasIntro && (
          <div className="lg:sticky lg:top-28 flex flex-col gap-4">
            {introMedia && <Media resource={introMedia} imgClassName="rounded-lg" />}
            <RichText
              className="max-w-2xl rounded-lg border border-border bg-card/70 p-5 shadow-sm sm:p-6"
              data={introContent}
              enableGutter={false}
            />
          </div>
        )}

        <div className="rounded-lg border border-border bg-card text-card-foreground shadow-xl shadow-black/5">
          <div className="border-b border-border px-5 py-5 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Formular
            </p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight">{formFromProps.title}</h2>
          </div>

          <div className="p-5 sm:p-6">
            <FormProvider {...formMethods}>
              {!isLoading && hasSubmitted && confirmationType === 'message' && (
                <div className="rounded-md border border-emerald-500/25 bg-emerald-500/10 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-600">
                    <CheckCircle2 className="size-4" />
                    Trimis
                  </div>
                  <RichText data={confirmationMessage} enableGutter={false} />
                </div>
              )}

              {isLoading && !hasSubmitted && (
                <div className="flex min-h-40 items-center justify-center rounded-md border border-border bg-sidebar/40 text-sm font-semibold text-muted-foreground">
                  <LoaderCircle className="mr-2 size-4 animate-spin text-accent" />
                  Se trimite...
                </div>
              )}

              {error && (
                <div className="mb-5 flex items-start gap-3 rounded-md border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-600">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{`${error.status || '500'}: ${error.message || ''}`}</span>
                </div>
              )}

              {recruitmentWindow?.isRecruitmentForm && !recruitmentWindow.isOpen && (
                <div className="rounded-md border border-amber-500/25 bg-amber-500/10 p-4 text-sm font-semibold text-amber-800">
                  {recruitmentWindow.message}
                </div>
              )}

              {!isLoading &&
                !hasSubmitted &&
                !(recruitmentWindow?.isRecruitmentForm && !recruitmentWindow.isOpen) && (
                  <form id={formID} onSubmit={handleSubmit(onSubmit)}>
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
                      {formFromProps.fields?.map((field, index) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const Field: React.FC<any> =
                          fields?.[field.blockType as keyof typeof fields]
                        if (Field) {
                          return (
                            <Field
                              form={formFromProps}
                              key={`${field.blockType}-${index}`}
                              {...field}
                              {...formMethods}
                              control={control}
                              errors={errors}
                              register={register}
                            />
                          )
                        }
                        return null
                      })}
                    </div>

                    <div className="mt-7 flex justify-end">
                      <Button
                        className="h-11 min-w-36 px-5"
                        disabled={isLoading}
                        form={formID}
                        type="submit"
                        variant="default"
                      >
                        {submitButtonLabel}
                        <Send className="size-4" />
                      </Button>
                    </div>
                  </form>
                )}
            </FormProvider>
          </div>
        </div>
      </div>
    </section>
  )
}

function getDefaultValues(fields?: FormFieldBlock[] | null): FieldValues {
  return (
    fields?.reduce<FieldValues>((values, field) => {
      if (fieldHasName(field) && 'defaultValue' in field && field.defaultValue != null) {
        const defaultValue =
          field.blockType === 'date' && typeof field.defaultValue === 'string'
            ? formatDateDefaultValue(field.defaultValue)
            : field.defaultValue

        if (defaultValue !== undefined) {
          values[field.name] = defaultValue
        }
      }

      return values
    }, {}) ?? {}
  )
}

function buildSubmissionData(fields: FormFieldBlock[] | null | undefined, data: FieldValues) {
  const dataToSend: Array<{ field: string; value: string }> = []
  const uploadEntries: Array<{ files: File[]; name: string }> = []

  fields?.forEach((field) => {
    if (!fieldHasName(field)) return

    const value = data[field.name]
    const files = getFilesFromValue(value)

    if (field.blockType === 'upload' || files) {
      if (files?.length) {
        uploadEntries.push({
          files,
          name: field.name,
        })
      }

      return
    }

    dataToSend.push({
      field: field.name,
      value: formatSubmissionValue(value),
    })
  })

  return { dataToSend, uploadEntries }
}

function fieldHasName(field: FormFieldBlock): field is FormFieldBlock & { name: string } {
  return 'name' in field && typeof field.name === 'string'
}

function getFilesFromValue(value: unknown): File[] | undefined {
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

  return undefined
}

function formatSubmissionValue(value: unknown) {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)

  return JSON.stringify(value) ?? ''
}

function formatDateDefaultValue(value: string) {
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10)
  }

  const date = new globalThis.Date(value)

  if (Number.isNaN(date.getTime())) {
    return undefined
  }

  return date.toISOString().slice(0, 10)
}
