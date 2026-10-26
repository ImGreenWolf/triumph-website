'use client'

import { useHeaderTheme } from '@/providers/HeaderTheme'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import CardNav, { type CardNavItem } from './Nav/CardNav'

interface HeaderClientProps {
  links: CardNavItem[]
}

export const HeaderClient = ({ links }: HeaderClientProps) => {
  const { headerTheme, setHeaderTheme } = useHeaderTheme()
  const pathname = usePathname()

  useEffect(() => {
    setHeaderTheme(null)
  }, [pathname, setHeaderTheme])

  return (
    <header
      className="pointer-events-none fixed inset-x-0 top-0 z-20 [&_nav]:pointer-events-auto"
      {...(headerTheme ? { 'data-theme': headerTheme } : {})}
    >
      <CardNav
        key={pathname}
        pathname={pathname}
        baseColor="var(--card)"
        buttonText="Contul meu"
        buttonUrl="/members"
        items={links}
      />
    </header>
  )
}
