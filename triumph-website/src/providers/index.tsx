import React from 'react'

import { HeaderThemeProvider } from './HeaderTheme'
import { SiteConfigProvider, type SiteConfigContextValue } from './SiteConfig'
import { ThemeProvider } from './Theme'

export const Providers: React.FC<{
  children: React.ReactNode
  siteConfig?: SiteConfigContextValue
}> = ({ children, siteConfig }) => {
  return (
    <SiteConfigProvider value={siteConfig}>
      <ThemeProvider>
        <HeaderThemeProvider>{children}</HeaderThemeProvider>
      </ThemeProvider>
    </SiteConfigProvider>
  )
}
