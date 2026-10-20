'use client'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import { usePathname } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'

import type { Header } from '@/payload-types'

import CardNav from './Nav/CardNav'
import { UserIcon } from 'lucide-react'
import Logo from '@/components/Logo'

interface HeaderClientProps {
  data: Header
  links: any
}

export const HeaderClient: React.FC<HeaderClientProps> = ({ data, links}) => {
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

  // return (
  //   <header ref={header} className='w-full fixed top-0 h-25 z-100 grid grid-cols-[1fr_2fr_1fr] grid-rows-[75px] '>
  //     <div className=' rounded-br-xl bg-card flex relative px-6 py-4'>
  //       <Logo className='h-full'/>
  //       <div className='bg-background absolute inset-0 -z-1'></div>
  //     </div>
  //     <div className='bg-background w-full px-6 py inset-0 flex justify-evenly items-center'>
  //         {
  //           data.navItems!.map(link => <a href={link.link.url!}>{link.link.label}</a>)
  //         }
  //     </div>
  //   </header>
  // )
  return (
    <header ref={header} className=" fixed z-20 bg-blur-md w-full px-10 lg:px-50 " {...(theme ? { 'data-theme': theme } : {})}>
      <div className="py-8 flex justify-between">
        {/* <Link href="/">
          <Logo loading="eager" priority="high" className="invert dark:invert-0 max-w-[8em]" />
        </Link>
        <HeaderNav data={data} /> */}
        <CardNav baseColor='var(--card)' buttonTextColor='var(--card-foreground)' menuColor='var(--card-foreground)' buttonText={<UserIcon/>} buttonBgColor='background' buttonUrl='/members'
        className=''
         items={links}/>
         {/* data.navCategory!.map(i => {return {label: i.link.label!, link: i.link.url || getHref(i.link),
            bgColor: 'var(--background)', textColor: 'var(--card-foreground)',

          links: i. subItems!.map(si => ({href: getHref(si), label: si.label!, ariaLabel: si.label!})) }}) */}
      </div>
    </header>
  )
}
