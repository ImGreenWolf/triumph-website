import type { Metadata } from 'next'

import { cn } from '@/utilities/ui'
import { GeistMono } from 'geist/font/mono'
import React from 'react'

import { AdminBar } from '@/components/AdminBar'
import { Footer } from '@/Footer/Component'
import { Header } from '@/Header/Component'
import { Providers } from '@/providers'
import { InitTheme } from '@/providers/Theme/InitTheme'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { draftMode } from 'next/headers'
import localFont from 'next/font/local'

import './globals.css'
import { getServerSideURL } from '@/utilities/getURL'
import { getCachedGlobal } from '@/utilities/getGlobals'
import type { Media } from '@/payload-types'

import { GoogleAnalytics } from '@/lib/ga4'

const getMediaURL = (media?: Media | string | null) =>
  typeof media === 'string' ? media : media?.url

const poppinsFont = localFont({
  src: [
    { path: '../../../public/fonts/Poppins-Thin.ttf', weight: '100', style: 'normal' },
    { path: '../../../public/fonts/Poppins-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../../../public/fonts/Poppins-Italic.ttf', weight: '400', style: 'italic' },
    { path: '../../../public/fonts/Poppins-Medium.ttf', weight: '500', style: 'normal' },
    { path: '../../../public/fonts/Poppins-SemiBold.ttf', weight: '600', style: 'normal' },
    { path: '../../../public/fonts/Poppins-Bold.ttf', weight: '700', style: 'normal' },
    { path: '../../../public/fonts/Poppins-BoldItalic.ttf', weight: '700', style: 'italic' },
    { path: '../../../public/fonts/Poppins-Black.ttf', weight: '900', style: 'normal' },
  ],
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
  variable: '--font-poppins',
})

// Keep the existing font exports without requiring network access during builds.
export const outlineFont = localFont({
  src: '../../../public/fonts/fonnts.com-Mont_Blanc_ExtraBold.ttf',
  weight: '800',
  display: 'swap',
})
export const fancyFont = localFont({
  src: '../../../public/fonts/fonnts.com-Mont_Blanc_Bold_Italic.ttf',
  weight: '700',
  style: 'italic',
  display: 'swap',
})

export const dynamic = 'force-dynamic'
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled } = await draftMode()
  const config = await getCachedGlobal('siteConfig', 1)()
  const icoUrl = getMediaURL(config.faviconIco)
  const svgUrl = getMediaURL(config.faviconSvg)
  const siteConfig = {
    darkModeIcon: getMediaURL(config.darkModeIcon),
    darkModeLogo: getMediaURL(config.darkModeLogo),
    lightModeIcon: getMediaURL(config.lightModeIcon),
    lightModeLogo: getMediaURL(config.lightModeLogo),
  }

  return (
    <html
      className={cn(poppinsFont.variable, GeistMono.variable, poppinsFont.className)}
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <InitTheme />
        <link href={icoUrl || '/favicon.ico'} rel="icon" sizes="32x32" />
        {/* {svgUrl && <link href={svgUrl || '/favicon.svg'} rel="icon" type="image/svg+xml" />} */}
      </head>
      <body suppressHydrationWarning>
        <GoogleAnalytics />
        <Providers siteConfig={siteConfig}>
          {/* <AdminBar
            adminBarProps={{
              preview: isEnabled,
              logo: <Logo/>,
              className:'z-100 fixed top-0'
            }}
          /> */}

          <Header />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  )
}

export const metadata: Metadata = {
  metadataBase: new URL(getServerSideURL()),
  openGraph: mergeOpenGraph(),
  twitter: {
    card: 'summary_large_image',
    creator: '@payloadcms',
  },
}
