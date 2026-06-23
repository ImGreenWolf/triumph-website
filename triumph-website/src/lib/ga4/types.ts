export type GA4Primitive = string | number | boolean | null | undefined

export type GA4Params = Record<string, GA4Primitive>

export type GA4ConsentValue = 'granted' | 'denied'

export type GA4ConsentOptions = Partial<{
  ad_personalization: GA4ConsentValue
  ad_storage: GA4ConsentValue
  ad_user_data: GA4ConsentValue
  analytics_storage: GA4ConsentValue
}>

export type GA4ConfigParams = GA4Params & {
  debug_mode?: boolean
  groups?: string
  page_location?: string
  page_path?: string
  page_title?: string
  send_page_view?: boolean
  user_id?: string | null
}

export type GA4EventParams = GA4Params & {
  currency?: string
  debug_mode?: boolean
  event_category?: string
  event_label?: string
  value?: number
}

export type TrackPageViewOptions = GA4ConfigParams & {
  measurementId?: string
}
