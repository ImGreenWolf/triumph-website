import { trackEvent } from './client'
import type { GA4EventParams } from './types'

export type TrackEventSignupParams = {
  day?: string
  eventId: string
  eventName?: string
  slot?: string
}

export type TrackMemberLoginParams = {
  method?: 'email_password'
  redirectTo?: string
}

export type TrackGalleryUploadParams = {
  attachedEventCount?: number
  heifCount?: number
  photoCount: number
  privateCount?: number
  publicCount?: number
}

export const trackEventSignup = ({
  day,
  eventId,
  eventName,
  slot,
}: TrackEventSignupParams) =>
  trackEvent('event_signup', {
    day,
    event_category: 'events',
    event_id: eventId,
    event_label: eventName,
    event_title: eventName,
    slot,
    value: 1,
  } satisfies GA4EventParams)

export const trackMemberLogin = ({
  method = 'email_password',
  redirectTo,
}: TrackMemberLoginParams = {}) =>
  trackEvent('member_login', {
    event_category: 'members',
    method,
    redirect_to: redirectTo,
    value: 1,
  } satisfies GA4EventParams)

export const trackGalleryUpload = ({
  attachedEventCount,
  heifCount,
  photoCount,
  privateCount,
  publicCount,
}: TrackGalleryUploadParams) =>
  trackEvent('gallery_upload', {
    attached_event_count: attachedEventCount,
    event_category: 'gallery',
    heif_count: heifCount,
    photo_count: photoCount,
    private_count: privateCount,
    public_count: publicCount,
    value: photoCount,
  } satisfies GA4EventParams)
