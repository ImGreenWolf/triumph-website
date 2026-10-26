import { draftMode } from 'next/headers'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'
import { getCachedGlobal } from '@/utilities/getGlobals'
import type { Footer as FooterData } from '@/payload-types'
import type { LucideIcon } from 'lucide-react'

import Link from 'next/link'
import React from 'react'

import { ThemeSelector } from '@/providers/Theme/ThemeSelector'
import { CMSLink } from '@/components/Link'
import { Logo } from '@/components/Logo'
import { BackToTop, FooterReveal } from './Reveal.client'
import {
  ArrowUpRight,
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  MessageCircle,
  Music2,
  Send,
  Twitter,
  Youtube,
} from 'lucide-react'

type SocialLink = NonNullable<FooterData['socialLinks']>[number]
type LegalLink = NonNullable<FooterData['legalLinks']>[number]

const defaultFooterDescription =
  'Interact București Triumph aduce adolescenți împreună pentru voluntariat, leadership și proiecte în comunitatea bucureșteană.'
const defaultLegalLinks: LegalLink[] = [
  {
    label: 'Politica de cookie-uri',
    url: '/politica-cookies',
  },
  {
    label: 'Confidențialitate',
    url: '/politica-confidentialitate',
  },
]

const socialIcons: Record<string, LucideIcon> = {
  facebook: Facebook,
  globe: Globe,
  instagram: Instagram,
  linkedin: Linkedin,
  mail: Mail,
  messageCircle: MessageCircle,
  music: Music2,
  send: Send,
  twitter: Twitter,
  youtube: Youtube,
}

const isExternalHref = (href?: string | null) => Boolean(href?.startsWith('http'))

export async function Footer() {
  const { isEnabled: draft } = await draftMode()
  const footerData = draft ? await (await getPayload({ config: payloadConfig })).findGlobal({ slug: 'footer', draft: true, depth: 1 }) : await getCachedGlobal('footer', 1)()

  const navItems = footerData?.navItems || []
  const socialLinks = footerData?.socialLinks || []
  const legalLinks = footerData?.legalLinks ?? defaultLegalLinks
  const footerDescription = footerData?.description ?? defaultFooterDescription
  const wordmarkText = footerData?.wordmarkText ?? 'Triumph'
  const copyrightText = footerData?.copyrightText ?? 'Interact București Triumph'
  const backToTopLabel = footerData?.backToTopLabel === 'Back to top' ? 'Înapoi sus' : footerData?.backToTopLabel ?? 'Înapoi sus'

  return (
    <FooterReveal>
      <div className="container pt-[clamp(2.5rem,5vw,5rem)] pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="grid gap-10 pb-[clamp(2rem,4vw,4rem)] md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] md:gap-[clamp(3rem,8vw,9rem)]">
          <div className="min-w-0">
            <Link
              aria-label="Interact București Triumph — prima pagină"
              className="inline-flex max-w-full rounded-sm"
              data-theme="dark"
              href="/"
            >
              <Logo className="h-auto w-52 max-w-full" />
            </Link>
            {footerDescription && (
              <p className="mt-5 max-w-[43ch] text-sm leading-[1.8] wrap-anywhere text-sidebar-foreground/70">
                {footerDescription}
              </p>
            )}
            {socialLinks.length > 0 && (
              <div aria-label="Rețele sociale" className="mt-6 flex flex-wrap gap-2">
                {socialLinks.map((social: SocialLink, index) => {
                  const Icon = socialIcons[social.icon || 'instagram'] || Instagram
                  const openInNewTab = social.newTab || isExternalHref(social.url)

                  return (
                    <a
                      aria-label={social.label}
                      className="inline-flex size-11 items-center justify-center rounded-full border border-sidebar-foreground/20 transition-colors duration-200 hover:border-accent hover:bg-accent hover:text-sidebar motion-reduce:transition-none"
                      href={social.url}
                      key={social.id || index}
                      rel={openInNewTab ? 'noopener noreferrer' : undefined}
                      target={openInNewTab ? '_blank' : undefined}
                    >
                      <Icon aria-hidden className="size-4" strokeWidth={1.8} />
                    </a>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-col items-start justify-between gap-8 md:items-end">
            {navItems.length > 0 && (
              <nav aria-label="Navigare în subsol" className="grid w-full">
                {navItems.map(({ link }, i) => {
                  return (
                    <CMSLink
                      className="group flex min-h-11 items-center justify-between gap-6 border-b border-sidebar-foreground/20 py-2.5 text-[clamp(1rem,1.5vw,1.25rem)] leading-normal wrap-anywhere transition-colors duration-200 hover:text-accent motion-reduce:transition-none"
                      key={i}
                      {...link}
                    >
                      <ArrowUpRight
                        aria-hidden
                        className="size-4 shrink-0 text-sidebar-foreground/70 transition-[transform,color] duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent motion-reduce:transform-none motion-reduce:transition-none"
                        strokeWidth={1.5}
                      />
                    </CMSLink>
                  )
                })}
              </nav>
            )}
            {backToTopLabel && <BackToTop label={backToTopLabel} />}
          </div>
        </div>

        {wordmarkText && (
          <div
            aria-hidden
            className="@container border-t border-sidebar-foreground/20 py-[clamp(1.5rem,3vw,3rem)]"
          >
            <p
              className="text-[clamp(1.75rem,calc(130cqw/var(--wordmark-length)),11rem)] leading-none font-semibold tracking-[-0.04em] wrap-anywhere text-sidebar-foreground/90 uppercase select-none"
              style={
                {
                  '--wordmark-length': Math.max(Array.from(wordmarkText).length, 1),
                } as React.CSSProperties
              }
            >
              {wordmarkText}
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 border-t border-sidebar-foreground/20 pt-4 text-xs leading-relaxed wrap-anywhere text-sidebar-foreground/70">
          {copyrightText && (
            <span>
              © {new Date().getFullYear()} {copyrightText}
            </span>
          )}
          <div className="flex flex-wrap gap-x-5 md:ml-auto">
            {legalLinks.map((link, index) => {
              const openInNewTab = link.newTab || isExternalHref(link.url)

              return (
                <a
                  className="inline-flex min-h-11 items-center decoration-transparent underline-offset-4 transition-colors duration-200 hover:text-accent hover:underline motion-reduce:transition-none"
                  href={link.url}
                  key={link.id || index}
                  rel={openInNewTab ? 'noopener noreferrer' : undefined}
                  target={openInNewTab ? '_blank' : undefined}
                >
                  {link.label === 'Cookie Policy' ? 'Politica de cookie-uri' : link.label === 'Privacy Policy' ? 'Confidențialitate' : link.label}
                </a>
              )
            })}
          </div>
          <div className="ml-auto md:ml-0 [&_button]:min-h-11 [&_button]:text-xs [&_button]:text-sidebar-foreground/70">
            <ThemeSelector />
          </div>
        </div>
      </div>
    </FooterReveal>
  )
}
