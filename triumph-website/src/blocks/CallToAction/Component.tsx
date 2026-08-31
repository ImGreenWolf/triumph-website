import React from 'react'

import type { CallToActionBlock as CTABlockProps } from '@/payload-types'

import RichText from '@/components/RichText'
import { CMSLink } from '@/components/Link'
import { cn } from '@/utilities/ui'
import { ArrowUpRightIcon } from 'lucide-react'

export const CallToActionBlock: React.FC<CTABlockProps> = ({ links, richText }) => {
  const actionLinks = links || []

  return (
    <section className="container">
      <div className="relative overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
        <div
          aria-hidden
          className="halftone-background pointer-events-none absolute inset-0 opacity-20 [--halftone-color:var(--accent)]"
        />
        <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-accent" />

        <div className="relative grid gap-8 p-6 md:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-12 lg:p-12">
          <div className="min-w-0">
            <div aria-hidden className="mb-6 flex items-center gap-3">
              <span className="h-px w-10 bg-accent" />
              <span className="h-px w-16 bg-card-foreground/30" />
            </div>

            {richText && (
              <RichText
                className="max-w-3xl text-card-foreground [&_a]:text-accent [&_a]:underline-offset-4 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:leading-tight [&_h1]:md:text-5xl [&_h2]:text-3xl [&_h2]:font-bold [&_h2]:leading-tight [&_h2]:md:text-5xl [&_h3]:text-2xl [&_h3]:font-bold [&_h3]:leading-tight [&_p]:mt-4 [&_p]:max-w-2xl [&_p]:text-base [&_p]:leading-7 [&_p]:text-card-foreground/75 [&_strong]:text-white"
                data={richText}
                enableGutter={false}
                enableProse={false}
              />
            )}
          </div>

          {actionLinks.length > 0 && (
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap lg:w-72 lg:flex-col lg:items-stretch">
              {actionLinks.map(({ link }, i) => {
                const isOutline = link.appearance === 'outline'

                return (
                  <CMSLink
                    className={cn(
                      'min-h-11 w-full px-6 font-bold shadow-none sm:w-auto lg:w-full',
                      isOutline
                        ? 'border-card-foreground/30 bg-transparent text-card-foreground hover:border-accent hover:bg-accent hover:text-white'
                        : 'bg-accent text-white hover:bg-accent/90',
                    )}
                    key={i}
                    size="lg"
                    {...link}
                  >
                    <ArrowUpRightIcon aria-hidden className="size-4" />
                  </CMSLink>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
