import { trackEvent } from './client'
import type { GA4EventParams } from './types'

export type TrackEventSignupParams = {
  day?: string
  eventId: string
  eventName?: string
  slot?: string
}

export type TrackSignupFormOpenParams = {
  eventId: string
  eventName?: string
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

export type TrackTeamMemberCardFlipParams = {
  mandateYear?: number
  memberId?: string
  memberName?: string
  memberRole?: string
}

export const trackSignupFormOpen = ({ eventId, eventName }: TrackSignupFormOpenParams) =>
  trackEvent('event_signup_form_open', {
    event_category: 'events',
    event_id: eventId,
    event_label: eventName,
    event_title: eventName,
    value: 1,
  } satisfies GA4EventParams)

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

export const trackTeamMemberCardFlip = ({
  mandateYear,
  memberId,
  memberName,
  memberRole,
}: TrackTeamMemberCardFlipParams) =>
  trackEvent('team_member_card_flip', {
    event_category: 'team',
    event_label: memberName,
    mandate_year: mandateYear,
    member_id: memberId,
    member_name: memberName,
    member_role: memberRole,
    value: 1,
  } satisfies GA4EventParams)
