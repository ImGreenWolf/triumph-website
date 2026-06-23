import { Suspense } from 'react'
import Script from 'next/script'

import { GA4_INIT_SCRIPT_ID, GA4_LOADER_SCRIPT_ID, GA4_MEASUREMENT_ID } from './config'
import { GoogleAnalyticsPageViews } from './GoogleAnalyticsPageViews'
import { createGA4InitScript, getGA4ScriptSrc } from './script'
import type { GA4ConfigParams, GA4ConsentOptions } from './types'

type GoogleAnalyticsProps = {
  defaultConsent?: GA4ConsentOptions
  debugMode?: boolean
  measurementId?: string
  sendInitialPageView?: boolean
  trackRouteChanges?: boolean
}

export const GoogleAnalytics = ({
  defaultConsent,
  debugMode = false,
  measurementId = GA4_MEASUREMENT_ID,
  sendInitialPageView = true,
  trackRouteChanges = true,
}: GoogleAnalyticsProps) => {
  if (!measurementId) {
    return null
  }

  const initialConfig: GA4ConfigParams = {
    ...(debugMode ? { debug_mode: true } : {}),
    ...(sendInitialPageView ? {} : { send_page_view: false }),
  }

  return (
    <>
      <Script
        async
        id={GA4_LOADER_SCRIPT_ID}
        src={getGA4ScriptSrc(measurementId)}
        strategy="afterInteractive"
      />
      <Script id={GA4_INIT_SCRIPT_ID} strategy="afterInteractive">
        {createGA4InitScript({
          defaultConsent,
          initialConfig,
          measurementId,
        })}
      </Script>
      {trackRouteChanges ? (
        <Suspense fallback={null}>
          <GoogleAnalyticsPageViews measurementId={measurementId} />
        </Suspense>
      ) : null}
    </>
  )
}
