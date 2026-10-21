import React from 'react'

import ServerRichText from '@/components/RichText/server'
import { Media } from '@/components/Media'
import type { FullWidthBlock as FullWidthBlockProps } from '@/payload-types'
import { cn } from '@/utilities/ui'

export const FullWidthBlock: React.FC<FullWidthBlockProps> = ({ content, media }) => {
  const image = media && typeof media === 'object' && media.url ? media : null

  return (
    <section className="relative isolate grid w-full lg:min-h-[40rem] lg:grid-cols-2">
      {image && (
        <Media className="relative aspect-[4/3] lg:absolute lg:inset-0 lg:aspect-auto" resource={image} fill imgClassName="object-cover" size="100vw" />
      )}
      <div className={cn('relative bg-primary px-5 py-10 text-primary-foreground sm:px-8 sm:py-12 lg:m-8 lg:rounded-xl lg:p-12', !image && 'lg:col-span-2 lg:mx-auto lg:w-full lg:max-w-5xl')}>
        <ServerRichText enableProse={false} enableGutter={false} className="block-intro relative max-w-prose" data={content} />
      </div>
    </section>
  )
}
