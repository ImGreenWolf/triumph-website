import type { ContactBlock as ContactBlockProps } from '@/payload-types'
import type { LucideIcon } from 'lucide-react'

import React from 'react'
import RichText from '@/components/RichText'
import { cn } from '@/utilities/ui'
import {
  ArrowUpRight,
  Building2,
  Calendar,
  Clock,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  Users,
} from 'lucide-react'

const contactIcons: Record<string, LucideIcon> = {
  building: Building2,
  calendar: Calendar,
  clock: Clock,
  globe: Globe,
  mail: Mail,
  mapPin: MapPin,
  messageCircle: MessageCircle,
  phone: Phone,
  send: Send,
  users: Users,
}

const isExternalHref = (href?: string | null) => Boolean(href?.startsWith('http'))

export const ContactBlock: React.FC<ContactBlockProps> = ({
  contactDetails,
  eyebrow,
  introContent,
  supportingLabel,
  supportingText,
  supportingTitle,
}) => {
  return (
    <section className="container">
      <div className="overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
        <div className="grid lg:grid-cols-[0.95fr_1.35fr]">
          <div className="flex flex-col justify-between gap-12 border-b border-border bg-background/90 p-6 text-foreground md:p-10 lg:border-b-0 lg:border-r">
            <div>
              {eyebrow && (
                <p className="mb-5 text-sm font-semibold uppercase tracking-normal text-accent">
                  {eyebrow}
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

            {(supportingLabel || supportingTitle || supportingText) && (
              <aside className="rounded-md border border-border bg-card/10 p-5">
                {supportingLabel && (
                  <p className="text-xs font-semibold uppercase tracking-normal text-accent">
                    {supportingLabel}
                  </p>
                )}
                {supportingTitle && (
                  <p className="mt-3 text-lg font-semibold leading-7">{supportingTitle}</p>
                )}
                {supportingText && (
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{supportingText}</p>
                )}
              </aside>
            )}
          </div>

          <div className="grid gap-px bg-border sm:grid-cols-2">
            {(contactDetails || []).map((detail, index) => {
              const Icon = contactIcons[detail.icon || 'mail'] || Mail
              const content = (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                      <Icon aria-hidden className="size-5" strokeWidth={1.8} />
                    </span>
                    {detail.href && (
                      <ArrowUpRight
                        aria-hidden
                        className="mt-1 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-accent"
                      />
                    )}
                  </div>
                  <div className="mt-8">
                    <h3 className="text-sm font-semibold uppercase tracking-normal text-muted-foreground">
                      {detail.label}
                    </h3>
                    <p className="mt-2 text-balance text-xl font-semibold leading-7">
                      {detail.value}
                    </p>
                    {detail.description && (
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        {detail.description}
                      </p>
                    )}
                  </div>
                </>
              )

              const className = cn(
                'group min-h-64 bg-card p-6 transition-colors md:p-8',
                detail.href && 'hover:bg-secondary',
              )

              if (detail.href) {
                return (
                  <a
                    className={className}
                    href={detail.href}
                    key={index}
                    rel={detail.newTab || isExternalHref(detail.href) ? 'noreferrer' : undefined}
                    target={detail.newTab || isExternalHref(detail.href) ? '_blank' : undefined}
                  >
                    {content}
                  </a>
                )
              }

              return (
                <article className={className} key={index}>
                  {content}
                </article>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
