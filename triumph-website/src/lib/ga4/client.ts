import { GA4_MEASUREMENT_ID } from './config'
import type {
  GA4ConfigParams,
  GA4ConsentOptions,
  GA4EventParams,
  GA4Params,
  TrackPageViewOptions,
} from './types'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

const cleanParams = <T extends GA4Params>(params?: T) => {
  if (!params) {
    return {}
  }

  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined))
}

export const isGA4Ready = () => typeof window !== 'undefined' && typeof window.gtag === 'function'

export const sendGA4Command = (...args: unknown[]) => {
  if (!isGA4Ready()) {
    return false
  }

  window.gtag?.(...args)
  return true
}

export const trackEvent = (eventName: string, params?: GA4EventParams) => {
  const normalizedEventName = eventName.trim()

  if (!normalizedEventName) {
    return false
  }

  return sendGA4Command('event', normalizedEventName, cleanParams(params))
}

export const trackPageView = ({
  measurementId = GA4_MEASUREMENT_ID,
  page_location,
  page_path,
  page_title,
  ...params
}: TrackPageViewOptions = {}) => {
  if (!measurementId) {
    return false
  }

  const config: GA4ConfigParams = cleanParams({
    ...params,
    page_location,
    page_path,
    page_title,
  })

  return sendGA4Command('config', measurementId, config)
}

export const setDefaultEventParams = (params: GA4Params) =>
  sendGA4Command('set', cleanParams(params))

export const setUserId = (userId: string | null) =>
  sendGA4Command('set', cleanParams({ user_id: userId }))

export const setUserProperties = (properties: GA4Params) =>
  sendGA4Command('set', 'user_properties', cleanParams(properties))

export const updateConsent = (consent: GA4ConsentOptions) =>
  sendGA4Command('consent', 'update', cleanParams(consent))

export const grantAnalyticsConsent = () => updateConsent({ analytics_storage: 'granted' })

export const denyAnalyticsConsent = () => updateConsent({ analytics_storage: 'denied' })
