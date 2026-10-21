import React from 'react'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'
import type { Form as FormType } from '@payloadcms/plugin-form-builder/types'
import type { FormBlock as FormBlockProps } from '@/payload-types'
import { FormBlock } from './Component'

export async function EmbeddedFormBlock(props: FormBlockProps) {
  let form = typeof props.form === 'object' ? props.form : null
  if (typeof props.form === 'string') {
    const payload = await getPayload({ config: payloadConfig })
    form = await payload.findByID({
      collection: 'forms',
      id: props.form,
      depth: 1,
      overrideAccess: false,
      disableErrors: true,
    })
  }
  if (!form) return null

  return (
    <div className="cms-block cms-block--formBlock not-prose my-8">
      <FormBlock
        disableGutter
        enableIntro={Boolean(props.enableIntro)}
        introMedia={props.introMedia}
        introContent={props.introContent ?? undefined}
        form={form as FormType}
      />
    </div>
  )
}
