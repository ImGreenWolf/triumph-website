'use client'
import type { FormFieldBlock, Form as FormType } from '@payloadcms/plugin-form-builder/types'

import { useRouter } from 'next/navigation'
import React, { useCallback, useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
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
    id?: string,
    introMedia: FormBlockProps['introMedia']

  } & FormBlockType
> = (props) => {
  const {
    enableIntro,
    form: formFromProps,
    form: { id: formID, confirmationMessage, confirmationType, redirect, submitButtonLabel } = {},
    introContent,
    introMedia
  } = props

  const formMethods = useForm({
    defaultValues: formFromProps.fields,
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
  const router = useRouter()

  const onSubmit = useCallback(
    (data: FormFieldBlock[]) => {
      let loadingTimerID: ReturnType<typeof setTimeout>
      const submitForm = async () => {
        setError(undefined)

        const dataToSend = Object.entries(data).map(([name, value]) => ({
          field: name,
          value,
        }))

        // delay loading indicator by 1s
        loadingTimerID = setTimeout(() => {
          setIsLoading(true)
        }, 1000)

        try {
          const req = await fetch(`${getClientSideURL()}/api/form-submissions`, {
            body: JSON.stringify({
              form: formID,
              submissionData: dataToSend,
            }),
            headers: {
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
    [router, formID, redirect, confirmationType],
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
             {introMedia && (
                  <Media
                    resource={introMedia}
                    imgClassName='rounded-lg'
                  />
              )}
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

              {!isLoading && !hasSubmitted && (
                <form id={formID} onSubmit={handleSubmit(onSubmit)}>
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
                    {formFromProps.fields?.map((field, index) => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const Field: React.FC<any> = fields?.[field.blockType as keyof typeof fields]
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
