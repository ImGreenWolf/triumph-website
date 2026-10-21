import React from 'react'

import type { CallToActionBlock as CTABlockProps } from '@/payload-types'

import RichText from '@/components/RichText'
import { CMSLink } from '@/components/Link'
import { cn } from '@/utilities/ui'
import { ArrowUpRightIcon } from 'lucide-react'
import { ActionRules } from './ActionRules.client'

export const CallToActionBlock: React.FC<CTABlockProps> = ({ links, richText }) => {
  const actionLinks = links || []

  return (
    <section className="container">
      <div className="block-cta relative overflow-hidden rounded-xl bg-accent text-background">
        <div
          aria-hidden
          className="halftone-background pointer-events-none absolute inset-0 opacity-10 [--halftone-color:var(--background)]"
        />
        <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-background/20" />

        <div className="relative grid gap-10 px-6 py-10 sm:p-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-16 lg:p-16">
          <div className="min-w-0">
            <ActionRules />

            {richText && (
              <RichText
                className="block-intro max-w-3xl [&_a]:text-background [&_a]:underline-offset-4 [&_h1]:font-bold [&_h2]:font-bold [&_h3]:text-2xl [&_h3]:font-bold [&_p]:mt-6 [&_p]:max-w-prose [&_p]:text-base [&_p]:leading-7 [&_p]:text-background/85 [&_strong]:text-background sm:[&_p]:text-lg"
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
                      'min-h-14 w-full px-6 text-base font-semibold shadow-none sm:w-auto lg:w-full',
                      isOutline
                        ? 'border-background/50 bg-transparent text-background hover:border-background hover:bg-background/10 hover:text-background'
                        : 'bg-background text-accent hover:bg-background/90',
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
