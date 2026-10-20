import React from 'react'

import { Media } from '@/components/Media'
import type { InteractIntroBlock as InteractIntroProps } from '@/payload-types'
import { cn } from '@/utilities/ui'

export const InteractIntroBlock: React.FC<InteractIntroProps> = ({
  eyebrow,
  title,
  introduction,
  clubTitle,
  clubDescription,
  photo,
  caption,
}) => {
  const image =
    photo && typeof photo === 'object' && photo.url && photo.mimeType?.startsWith('image/')
      ? photo
      : null

  return (
    <section className="container py-6 sm:py-10">
      <div
        className={cn(
          'grid min-w-0 items-center gap-10 lg:gap-16',
          image ? 'lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]' : 'mx-auto max-w-3xl',
        )}
      >
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-5 whitespace-pre-line text-sm font-medium text-accent [overflow-wrap:anywhere] sm:mb-6">
              {eyebrow}
            </p>
          )}
          <h2 className="max-w-[11ch] text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.03em] text-foreground [overflow-wrap:anywhere] sm:text-6xl xl:text-7xl">
            {title}
          </h2>
          <p className="mt-6 max-w-prose whitespace-pre-line text-base leading-8 text-foreground/85 [overflow-wrap:anywhere] sm:mt-8 sm:text-lg">
            {introduction}
          </p>

          <div className="mt-9 border-t border-foreground/20 pt-7 sm:mt-12 sm:pt-8">
            <h3 className="max-w-[30ch] text-balance text-xl font-medium leading-snug text-foreground [overflow-wrap:anywhere] sm:text-2xl">
              {clubTitle}
            </h3>
            <p className="mt-4 max-w-prose whitespace-pre-line text-base leading-7 text-foreground/75 [overflow-wrap:anywhere]">
              {clubDescription}
            </p>
          </div>
        </div>

        {image && (
          <figure className="min-w-0">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-card lg:aspect-[4/5]">
              <Media
                resource={image}
                alt={image.alt || 'Comunitatea Interact București Triumph'}
                fill
                size="(min-width: 1376px) 600px, (min-width: 1024px) 45vw, (min-width: 768px) calc(100vw - 4rem), calc(100vw - 2rem)"
                imgClassName="h-full w-full object-cover"
              />
            </div>
            {caption && (
              <figcaption className="mt-4 whitespace-pre-line text-sm leading-6 text-foreground/75 [overflow-wrap:anywhere]">
                {caption}
              </figcaption>
            )}
          </figure>
        )}
      </div>
    </section>
  )
}
