'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'

import { trackPageView } from './client'

type GoogleAnalyticsPageViewsProps = {
  measurementId: string
}

export const GoogleAnalyticsPageViews = ({ measurementId }: GoogleAnalyticsPageViewsProps) => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isInitialPageView = useRef(true)

  useEffect(() => {
    if (!pathname) {
      return
    }

    if (isInitialPageView.current) {
      isInitialPageView.current = false
      return
    }

    const queryString = searchParams.toString()
    const page_path = queryString ? `${pathname}?${queryString}` : pathname

    trackPageView({ measurementId, page_path })
  }, [measurementId, pathname, searchParams])

  return null
}
