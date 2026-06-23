'use client'

import React, { createContext, use } from 'react'

export interface SiteConfigContextValue {
  darkModeIcon?: string | null
  darkModeLogo?: string | null
  lightModeIcon?: string | null
  lightModeLogo?: string | null
}

const SiteConfigContext = createContext<SiteConfigContextValue>({})

export const SiteConfigProvider = ({
  children,
  value,
}: {
  children: React.ReactNode
  value?: SiteConfigContextValue
}) => {
  return <SiteConfigContext value={value || {}}>{children}</SiteConfigContext>
}

export const useSiteConfig = () => use(SiteConfigContext)
