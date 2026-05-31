import { getCachedGlobal } from '@/utilities/getGlobals'
import type { Footer as FooterData } from '@/payload-types'
import type { LucideIcon } from 'lucide-react'

import Link from 'next/link'
import React from 'react'

import { ThemeSelector } from '@/providers/Theme/ThemeSelector'
import { CMSLink } from '@/components/Link'
import { Logo } from '@/components/Logo'
import { cn } from '@/utilities/ui'
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
  'Interact Bucuresti Triumph brings students together for service, leadership, and community projects across Bucharest.'
const defaultLegalLinks: LegalLink[] = [
  {
    label: 'Cookie Policy',
    url: '/cookie-policy',
  },
  {
    label: 'Privacy Policy',
    url: '/privacy-policy',
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
  const footerData = await getCachedGlobal('footer', 1)()

  const navItems = footerData?.navItems || []
  const socialLinks = footerData?.socialLinks || []
  const legalLinks = footerData?.legalLinks ?? defaultLegalLinks
  const footerDescription = footerData?.description ?? defaultFooterDescription
  const wordmarkText = footerData?.wordmarkText ?? 'Triumph'
  const copyrightText = footerData?.copyrightText ?? 'Interact Bucuresti Triumph'
  const backToTopLabel = footerData?.backToTopLabel ?? 'Back to top'

  return (
    <footer className="mt-auto overflow-hidden border-t border-border bg-card text-card-foreground">
      <div className="container py-10 md:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1.4fr] lg:items-start">
          <div className="space-y-6">
            <Link className="inline-flex items-center" href="/">
              <Logo />
            </Link>
            {footerDescription && (
              <p className="max-w-md text-sm leading-6 text-muted-foreground">
                {footerDescription}
              </p>
            )}
            <div className="flex items-start gap-3 cols-full">
             
              {socialLinks.length > 0 && (
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {socialLinks.map((social: SocialLink, index) => {
                    const Icon = socialIcons[social.icon || 'instagram'] || Instagram
                    const openInNewTab = social.newTab || isExternalHref(social.url)

                    return (
                      <a
                        aria-label={social.label}
                        className={cn(
                          'group inline-flex size-10 items-center justify-center rounded-md border border-border bg-background/30 text-card-foreground transition-colors',
                          'hover:border-accent hover:bg-accent hover:text-accent-foreground',
                        )}
                        href={social.url}
                        key={social.id || index}
                        rel={openInNewTab ? 'noreferrer' : undefined}
                        target={openInNewTab ? '_blank' : undefined}
                      >
                        <Icon aria-hidden className="size-4" strokeWidth={1.8} />
                      </a>
                    )
                  })}
                </div>
              )}
               <ThemeSelector />
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-[1fr_auto] lg:justify-end">
            <nav
              aria-label="Footer navigation"
              className="flex flex-col gap-3 sm:items-end md:flex-row md:flex-wrap md:justify-end md:gap-x-6"
            >
              {navItems.map(({ link }, i) => {
                return (
                  <CMSLink
                    className="text-sm font-medium text-card-foreground/80 transition-colors hover:text-accent"
                    key={i}
                    {...link}
                  />
                )
              })}
            </nav>
          </div>
        </div>
      </div>

      {wordmarkText && (
        <div className="relative -mb-6 overflow-hidden border-t border-border/70">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-card from-15% via-card/30 via-55% to-card/80"
          />
          <p className="text-outline -mb-16 select-none text-center text-[5rem] font-bold uppercase leading-none tracking-normal text-card sm:text-[8rem] md:text-[12rem] lg:text-[17rem]">
            {wordmarkText}
          </p>
        </div>
      )}

      <div className="container py-6">
        <div className="flex flex-col gap-4 border-t border-primary/50 py-6 text-sm text-muted-foreground md:flex-row md:items-center">
          {copyrightText && (
            <span>
              © {new Date().getFullYear()} {copyrightText}
            </span>
          )}
          <span className="hidden grow md:block" />
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {legalLinks.map((link, index) => {
              const openInNewTab = link.newTab || isExternalHref(link.url)

              return (
                <a
                  className="transition-colors hover:text-accent"
                  href={link.url}
                  key={link.id || index}
                  rel={openInNewTab ? 'noreferrer' : undefined}
                  target={openInNewTab ? '_blank' : undefined}
                >
                  {link.label}
                </a>
              )
            })}
            {backToTopLabel && socialLinks.length > 0 && (
              <a
                className="inline-flex items-center gap-1 transition-colors hover:text-accent"
                href="#top"
              >
                {backToTopLabel}
                <ArrowUpRight aria-hidden className="size-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </footer>
  )
}
