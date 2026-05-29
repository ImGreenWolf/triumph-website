'use client'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'

import type { Event, Header, Page, Post } from '@/payload-types'

import { Logo } from '@/components/Logo'
import { HeaderNav } from './Nav'
import CardNav from './Nav/CardNav'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'
import { UserIcon } from 'lucide-react'

interface HeaderClientProps {
  data: Header
  links: any
}

export const HeaderClient: React.FC<HeaderClientProps> = ({ data, links }) => {
  /* Storing the value in a useState to avoid hydration errors */
  const [theme, setTheme] = useState<string | null>(null)
  const { headerTheme, setHeaderTheme } = useHeaderTheme()
  const pathname = usePathname()

  useEffect(() => {
    setHeaderTheme(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  useEffect(() => {
    if (headerTheme && headerTheme !== theme) setTheme(headerTheme)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerTheme])

  let header = useRef<HTMLDivElement>(null)
  return (
    <header ref={header} className=" fixed z-20 bg-blur-md w-full px-10 lg:px-50 " {...(theme ? { 'data-theme': theme } : {})}>
      <div className="py-8 flex justify-between">
        {/* <Link href="/">
          <Logo loading="eager" priority="high" className="invert dark:invert-0 max-w-[8em]" />
        </Link>
        <HeaderNav data={data} /> */}
        <CardNav logo='/logo_full.png' baseColor='#141e34cc' menuColor='var(--card-foreground)' buttonText={<UserIcon/>} buttonBgColor='background' buttonUrl='/members'
        className=''
         items={links}/>
         {/* data.navCategory!.map(i => {return {label: i.link.label!, link: i.link.url || getHref(i.link),
            bgColor: 'var(--background)', textColor: 'var(--card-foreground)',

          links: i. subItems!.map(si => ({href: getHref(si), label: si.label!, ariaLabel: si.label!})) }}) */}
      </div>
    </header>
  )
}
type si = {
    label?: string | null | undefined;
    sectionId?: string | null | undefined;
    reference?: {
        relationTo: "pages";
        value: string | Page;
    } | {
        relationTo: "events";
        value: string | Event;
    } | {
        relationTo: "posts";
        value: string | Post;
    } | null | undefined;
    id?: string | null;
}


