'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

type GoogleAnalyticsPageViewsProps = {
  measurementId: string
}

export const GoogleAnalyticsPageViews = ({ measurementId }: GoogleAnalyticsPageViewsProps) => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isInitialPageView = useRef(true)

  useEffect(() => {
    if (!pathname || typeof window.gtag !== 'function') {
      return
    }

    if (isInitialPageView.current) {
      isInitialPageView.current = false
      return
    }

    const queryString = searchParams.toString()
    const pagePath = queryString ? `${pathname}?${queryString}` : pathname

    window.gtag('config', measurementId, {
      page_path: pagePath,
    })
  }, [measurementId, pathname, searchParams])

  return null
}
