import type { Metadata } from 'next'

import { cn } from '@/utilities/ui'
import { GeistMono } from 'geist/font/mono'
import { Montserrat, Poppins, Bungee_Outline, Lobster} from 'next/font/google'
import { GeistSans } from 'geist/font/sans'
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
import Logo from '@/components/Logo'
const mainFont = 
// localFont({src: [
//   {path: '../../../public/fonts/fonnts.com-Mont_ExtraLight_DEMO.ttf', weight: '400', style: 'normal'},
//   {path: '../../../public/fonts/fonnts.com-Mont_Bold.ttf', weight: '600', style: 'normal'}
// ]}) 

Poppins({weight: ['600', '300', '400', '800', '500', '200']});
export const outlineFont = Bungee_Outline({weight: '400'})
export const fancyFont = Lobster({weight: '400'})
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled } = await draftMode()

  return (
    <html className={cn(GeistSans.variable, GeistMono.variable, mainFont.className)} lang="en" suppressHydrationWarning>
      <head>
        <InitTheme />
        <link href="/favicon.ico" rel="icon" sizes="32x32" />
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
      </head>
      <body suppressHydrationWarning>
        <Providers>
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
