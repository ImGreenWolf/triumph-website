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
      <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card text-card-foreground shadow-[0_30px_100px_rgba(0,0,0,0.18)]">
        <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-accent/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-12 size-72 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative grid gap-8 p-5 md:p-8 lg:grid-cols-[0.86fr_1.14fr] lg:gap-12 lg:p-12">
          <div className="flex flex-col justify-between gap-10">
            <div>
              {eyebrow && (
                <p className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-normal text-accent">
                  <span className="h-px w-8 bg-accent" />
                  {eyebrow}
                  <span className="h-px w-8 bg-accent" />
                </p>
              )}
              {introContent && (
                <RichText
                  className="max-w-xl [&_h2]:text-3xl [&_h2]:leading-tight [&_h2]:md:text-5xl [&_p]:text-base [&_p]:leading-7 [&_p]:text-muted-foreground"
                  data={introContent}
                  enableGutter={false}
                />
              )}
            </div>

            {(supportingText || supportingLinkLabel) && (
              <aside className="max-w-md rounded-xl border-2 border-border bg-sidebar p-5 text-foreground backdrop-blur-sm">
                <MessageCircleQuestion aria-hidden className="size-6 text-accent" strokeWidth={1.8} />
                {supportingText && (
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">{supportingText}</p>
                )}
                {supportingLinkLabel && supportingLinkHref && (
                  <a
                    className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent transition-opacity hover:opacity-75"
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
