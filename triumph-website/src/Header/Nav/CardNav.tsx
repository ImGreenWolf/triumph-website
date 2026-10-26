'use client'

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactElement } from 'react'
import { ArrowUpRight, UserRound } from 'lucide-react'
import { Logo } from '@/components/Logo'
import Link from 'next/link'

export type CardNavItem = {
  label: string
  bgColor: string
  textColor: string
  link: string
  links: { label: string; href: string; ariaLabel: string }[]
}
export interface CardNavProps {
  logo?: string
  logoAlt?: string
  items: CardNavItem[]
  className?: string
  baseColor?: string
  menuColor?: string
  buttonTextColor?: string
  buttonUrl: string
  buttonText: string | ReactElement
  pathname?: string
}

function isCurrent(href: string, pathname?: string) {
  if (!pathname || !href.startsWith('/') || href.includes('#')) return false
  const path = href.split('?')[0].replace(/\/$/, '') || '/'
  return path === pathname || (path === '/home' && pathname === '/')
}

export default function CardNav({
  logo,
  logoAlt = 'Interact București Triumph',
  items,
  className = '',
  baseColor,
  menuColor,
  buttonUrl,
  buttonText,
  pathname,
}: CardNavProps) {
  const [open, setOpen] = useState(false)
  const menuID = useId()
  const toggle = useRef<HTMLButtonElement>(null)
  const nav = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!nav.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open])

  const columns = items.length > 4 ? 3 : Math.max(1, items.length)
  return (
    <div
      className={`club-header absolute inset-x-3 top-3 mx-auto max-w-[1200px] text-foreground selection:bg-accent selection:text-background md:inset-x-4 md:top-4 [&_:is(a,button):focus-visible]:outline-2 [&_:is(a,button):focus-visible]:outline-offset-4 [&_:is(a,button):focus-visible]:outline-accent motion-reduce:[&_*]:transition-none! motion-reduce:[&_*]:duration-0! motion-reduce:[&_*]:delay-0! ${className}`}
    >
      <nav
        ref={nav}
        aria-label="Navigare principală"
        data-open={open}
        style={{ '--header-surface': baseColor, '--header-columns': columns } as CSSProperties}
        className="club-header__nav group/header overflow-hidden rounded-2xl bg-[var(--header-surface,var(--card))] shadow-[0_8px_28px_rgb(0_0_0/0.18)]"
        onClick={(event) => {
          if ((event.target as Element).closest('a')) setOpen(false)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) {
            event.preventDefault()
            setOpen(false)
            toggle.current?.focus()
          }
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
        }}
      >
        <div className="club-header__bar flex min-h-17 items-center gap-3 px-3 py-1.5 md:min-h-20 md:gap-6 md:px-5 md:py-2">
          <Link
            href="/"
            aria-label="Interact București Triumph — prima pagină"
            data-theme="dark"
            className="club-header__brand flex min-h-11 min-w-0 flex-[0_1_148px] items-center rounded-sm md:basis-44"
          >
            {logo ? (
              // Runtime CMS logos can use hosts outside the Next image allowlist.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo}
                alt={logoAlt}
                className="club-header__logo h-[54px] w-[148px] max-w-full object-contain object-left md:h-15 md:w-44"
              />
            ) : (
              <Logo
                loading="eager"
                priority="high"
                className="club-header__logo h-[54px] w-[148px] max-w-full object-contain object-left md:h-15 md:w-44"
              />
            )}
          </Link>
          <div className="club-header__shortcuts hidden min-w-0 flex-1 justify-center gap-1 min-[1200px]:flex">
            {items.map((item, index) => (
              <Link
                key={`${item.label}-${index}`}
                href={item.link || '/'}
                aria-current={isCurrent(item.link, pathname) ? 'page' : undefined}
                title={item.label}
                className="club-header__shortcut relative flex min-h-11 min-w-0 items-center rounded-sm px-3 py-2 text-[13px] font-semibold hover:text-accent [&_span]:truncate aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-3 aria-[current=page]:after:bottom-1 aria-[current=page]:after:h-0.5 aria-[current=page]:after:rounded-[1px] aria-[current=page]:after:bg-accent aria-[current=page]:after:content-['']"
              >
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
          <div className="club-header__actions ml-auto flex shrink-0 items-center gap-2 md:gap-3">
            <Link
              href={buttonUrl}
              aria-label={typeof buttonText === 'string' ? undefined : 'Contul meu'}
              aria-current={isCurrent(buttonUrl, pathname) ? 'page' : undefined}
              className="club-header__account inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-2.5 py-2.5 text-xs font-semibold text-background transition-colors duration-[160ms] hover:bg-[color-mix(in_srgb,var(--accent)_82%,var(--foreground))] md:px-4 md:text-[13px] aria-[current=page]:underline aria-[current=page]:decoration-accent aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-[6px]"
            >
              <UserRound
                aria-hidden="true"
                className="club-header__user-icon hidden size-4 md:block"
              />
              {typeof buttonText === 'string' ? buttonText : 'Contul meu'}
            </Link>
            {items.length > 0 && (
              <button
                ref={toggle}
                type="button"
                aria-label={open ? 'Închide meniul' : 'Deschide meniul'}
                aria-expanded={open}
                aria-controls={menuID}
                onClick={() => setOpen((value) => !value)}
                style={{ color: menuColor }}
                className="club-header__toggle inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-3 rounded-lg p-2.5 text-[13px] font-semibold transition-colors duration-[160ms] hover:bg-foreground/10 md:min-w-[108px] md:px-3"
              >
                <span className="club-header__toggle-label hidden md:inline">
                  {open ? 'Închide' : 'Meniu'}
                </span>
                <span
                  className="club-header__menu-icon relative h-[18px] w-[22px] shrink-0"
                  aria-hidden="true"
                >
                  <span className="absolute top-2 left-0 h-0.5 w-[22px] rounded-[1px] bg-current transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] [transform:translateY(-4px)] group-data-[open=true]/header:[transform:rotate(45deg)]" />
                  <span className="absolute top-2 left-0 h-0.5 w-[22px] rounded-[1px] bg-current transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] [transform:translateY(4px)] group-data-[open=true]/header:[transform:rotate(-45deg)]" />
                </span>
              </button>
            )}
          </div>
        </div>
        <div
          id={menuID}
          inert={!open}
          aria-hidden={!open}
          className="club-header__reveal invisible grid grid-rows-[0fr] [transition:grid-template-rows_220ms_cubic-bezier(0.16,1,0.3,1),visibility_0s_220ms] group-data-[open=true]/header:visible group-data-[open=true]/header:grid-rows-[1fr] group-data-[open=true]/header:[transition:grid-template-rows_360ms_cubic-bezier(0.16,1,0.3,1),visibility_0s]"
        >
          <div className="club-header__clip min-h-0 overflow-hidden">
            <div className="club-header__directory max-h-[calc(100svh-104px)] overflow-y-auto overscroll-contain bg-background px-5 pt-2 pb-6 [scrollbar-width:thin] [scrollbar-color:var(--accent)_var(--background)] md:max-h-[calc(100svh-128px)] md:p-8">
              <div className="club-header__groups grid grid-cols-1 gap-4 md:grid-cols-[repeat(var(--header-columns),minmax(0,1fr))] md:gap-8">
                {items.map((item, index) => (
                  <div
                    key={`${item.label}-${index}`}
                    className="club-header__group min-w-0 border-t border-foreground/24 pt-4"
                  >
                    <Link
                      href={item.link || '/'}
                      aria-current={isCurrent(item.link, pathname) ? 'page' : undefined}
                      className="club-header__group-link flex min-h-11 items-start justify-between gap-3 rounded-xs text-[22px] leading-[1.35] font-semibold [overflow-wrap:anywhere] hover:text-accent [&_svg]:mt-1 [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:text-accent [&_svg]:transition-transform [&_svg]:duration-[220ms] [&_svg]:ease-[cubic-bezier(0.16,1,0.3,1)] hover:[&_svg]:translate-x-0.5 hover:[&_svg]:-translate-y-0.5 md:text-[clamp(18px,1.7vw,24px)] aria-[current=page]:underline aria-[current=page]:decoration-accent aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-[6px]"
                    >
                      <span>{item.label}</span>
                      <ArrowUpRight aria-hidden="true" />
                    </Link>
                    {item.links.length > 0 && (
                      <ul className="club-header__links mt-0 grid list-none p-0 md:mt-2">
                        {item.links.map((link, linkIndex) => (
                          <li key={`${link.href}-${linkIndex}`}>
                            <Link
                              href={link.href}
                              aria-label={link.ariaLabel}
                              aria-current={isCurrent(link.href, pathname) ? 'page' : undefined}
                              className="club-header__link flex min-h-11 items-center justify-between gap-3 rounded-xs text-sm leading-normal text-foreground/84 [overflow-wrap:anywhere] hover:text-accent [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:transition-transform [&_svg]:duration-[220ms] [&_svg]:ease-[cubic-bezier(0.16,1,0.3,1)] hover:[&_svg]:translate-x-0.5 hover:[&_svg]:-translate-y-0.5 aria-[current=page]:underline aria-[current=page]:decoration-accent aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-[6px]"
                            >
                              <span>{link.label}</span>
                              <ArrowUpRight aria-hidden="true" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </nav>
    </div>
  )
}
