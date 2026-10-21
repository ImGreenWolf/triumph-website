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
  InstagramIcon,
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
  instagram: InstagramIcon
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
      <div className="overflow-hidden rounded-xl border border-foreground/15 bg-card text-card-foreground">
        <div className="grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)]">
          <div className="contact-lead min-w-0 flex flex-col justify-between gap-12 bg-accent p-6 text-background sm:p-10 lg:p-12">
            <div>
              {eyebrow && (
                <p className="mb-5 text-sm font-semibold uppercase tracking-normal text-background">
                  {eyebrow}
                </p>
              )}
              {introContent && (
                <RichText
                  className="block-intro max-w-xl [&_h2]:text-3xl [&_h2]:leading-tight [&_h2]:md:text-5xl [&_p]:text-base [&_p]:leading-7 [&_p]:text-background/85"
                  data={introContent}
                  enableGutter={false}
                />
              )}
            </div>

            {(supportingLabel || supportingTitle || supportingText) && (
              <aside className="rounded-md border border-background/20 bg-background/5 p-5">
                {supportingLabel && (
                  <p className="text-xs font-semibold uppercase tracking-normal text-background">
                    {supportingLabel}
                  </p>
                )}
                {supportingTitle && (
                  <p className="mt-3 text-lg font-semibold leading-7">{supportingTitle}</p>
                )}
                {supportingText && (
                  <p className="mt-3 text-sm leading-6 text-background/85">{supportingText}</p>
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
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-accent text-background">
                      <Icon aria-hidden className="size-5" strokeWidth={1.8} />
                    </span>
                    {detail.href && (
                      <ArrowUpRight
                        aria-hidden
                        className="mt-1 size-7 shrink-0 text-card-foreground/90 transition-colors group-hover:text-accent"
                      />
                    )}
                  </div>
                  <div className="mt-8">
                    <h3 className="text-sm font-semibold uppercase tracking-normal text-card-foreground/90">
                      {detail.label}
                    </h3>
                    <p className="mt-2 [overflow-wrap:anywhere] text-2xl font-semibold leading-tight">
                      {detail.value}
                    </p>
                    {detail.description && (
                      <p className="mt-3 text-sm leading-6 text-card-foreground/90">
                        {detail.description}
                      </p>
                    )}
                  </div>
                </>
              )

              const className = cn(
                'group min-w-0 min-h-60 bg-card p-6 transition-colors md:p-8',
                detail.href && 'hover:bg-background/20',
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
