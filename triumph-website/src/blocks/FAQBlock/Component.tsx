import React from 'react'
import { ArrowUpRight, MessageCircleQuestion } from 'lucide-react'

import type { FAQBlock as FAQBlockProps } from '@/payload-types'

import RichText from '@/components/RichText'
import { FAQAccordion } from './Accordion.client'

const isExternalHref = (href?: string | null) => Boolean(href?.startsWith('http'))

export const FAQBlock: React.FC<FAQBlockProps> = ({
  eyebrow,
  faqs,
  introContent,
  openFirstItem,
  supportingLinkHref,
  supportingLinkLabel,
  supportingText,
}) => {
  return (
    <section className="container">
      <div className="relative overflow-hidden rounded-xl text-foreground">

        <div className="relative grid gap-10 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:gap-16">
          <div className="flex flex-col justify-between gap-10">
            <div>
              {eyebrow && (
                <p className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-normal text-[var(--block-accent-text)]">
                  <span className="h-px w-8 bg-accent" />
                  {eyebrow}
                  <span className="h-px w-8 bg-accent" />
                </p>
              )}
              {introContent && (
                <RichText
                  className="block-intro max-w-xl [&_h2]:text-3xl [&_h2]:leading-tight [&_h2]:md:text-5xl [&_p]:text-base [&_p]:leading-7 [&_p]:text-card-foreground/90"
                  data={introContent}
                  enableGutter={false}
                />
              )}
            </div>

            {(supportingText || supportingLinkLabel) && (
              <aside className="min-w-0 max-w-md rounded-xl border border-foreground/15 bg-sidebar p-5 text-foreground backdrop-blur-sm">
                <MessageCircleQuestion aria-hidden className="size-6 text-accent" strokeWidth={1.8} />
                {supportingText && (
                  <p className="mt-4 text-sm leading-6 text-card-foreground/90">{supportingText}</p>
                )}
                {supportingLinkLabel && supportingLinkHref && (
                  <a
                    className="mt-5 inline-flex items-center gap-2 min-h-11 text-sm font-semibold text-accent transition-opacity hover:opacity-75"
                    href={supportingLinkHref}
                    rel={isExternalHref(supportingLinkHref) ? 'noreferrer' : undefined}
                    target={isExternalHref(supportingLinkHref) ? '_blank' : undefined}
                  >
                    {supportingLinkLabel}
                    <ArrowUpRight aria-hidden className="size-4" />
                  </a>
                )}
              </aside>
            )}
          </div>

          <FAQAccordion items={faqs || []} openFirstItem={openFirstItem} />
        </div>
      </div>
    </section>
  )
}
