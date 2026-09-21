import type { LocationValue } from '@/fields/location-selector'

const GOOGLE_PLACES_API_BASE = 'https://places.googleapis.com/v1'
const LOCATION_PHOTO_MAX_WIDTH = 1200
const LOCATION_PHOTO_REVALIDATE_SECONDS = 60 * 60 * 24

type GooglePlaceDetailsResponse = {
  photos?: Array<{
    name?: unknown
  }>
}

type NextFetchInit = RequestInit & {
  next?: {
    revalidate?: number
  }
}

export async function getLocationPhotoURL(location?: LocationValue | null) {
  if (!location) return null

  const freshPhotoURL = await getFreshGooglePlacePhotoURL(location.placeId)

  if (freshPhotoURL) return freshPhotoURL

  for (const storedPhotoURL of getStoredLocationPhotoURLs(location)) {
    const normalizedStoredPhotoURL = normalizeGooglePlacePhotoURL(storedPhotoURL)
    if (!normalizedStoredPhotoURL) continue
    if (!isGooglePlacePhotoMediaURL(normalizedStoredPhotoURL)) return normalizedStoredPhotoURL

    if (await isRemoteImageAvailable(normalizedStoredPhotoURL)) {
      return normalizedStoredPhotoURL
    }
  }

  return null
}

export function getLocationMapEmbedURL(location?: LocationValue | null) {
  if (!location) return null

  const url = new URL('https://www.google.com/maps')
  const coordinates = location.coordinates

  if (coordinates && Number.isFinite(coordinates.lat) && Number.isFinite(coordinates.lng)) {
    url.searchParams.set('q', `${coordinates.lat},${coordinates.lng}`)
    url.searchParams.set('z', '16')
  } else {
    const query = location.formattedAddress || location.name
    if (!query) return null

    url.searchParams.set('q', query)
  }

  url.searchParams.set('output', 'embed')
  return url.toString()
}

export function normalizeGooglePlacePhotoURL(photoURL?: string | null, apiKey = getGoogleMapsAPIKey()) {
  if (!photoURL) return null

  const trimmedPhotoURL = photoURL.trim()
  if (!trimmedPhotoURL) return null

  try {
    const url = new URL(trimmedPhotoURL)
    if (url.hostname !== 'places.googleapis.com' || !url.pathname.endsWith('/media')) {
      return trimmedPhotoURL
    }

    if (!apiKey) return null

    url.searchParams.set('key', apiKey)
    if (!url.searchParams.has('maxWidthPx') && !url.searchParams.has('maxHeightPx')) {
      url.searchParams.set('maxWidthPx', String(LOCATION_PHOTO_MAX_WIDTH))
    }

    return url.toString()
  } catch {
    return trimmedPhotoURL
  }
}

function getStoredLocationPhotoURLs(location: LocationValue) {
  return (
    location.photos
      ?.map((photo) => photo?.photoURL?.trim())
      .filter((photoURL): photoURL is string => Boolean(photoURL)) ?? []
  )
}

async function isRemoteImageAvailable(url: string) {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      next: {
        revalidate: LOCATION_PHOTO_REVALIDATE_SECONDS,
      },
    } satisfies NextFetchInit)
    const contentType = response.headers.get('content-type')

    return response.ok && (!contentType || contentType.startsWith('image/'))
  } catch {
    return false
  }
}

function isGooglePlacePhotoMediaURL(photoURL: string) {
  try {
    const url = new URL(photoURL)
    return url.hostname === 'places.googleapis.com' && url.pathname.endsWith('/media')
  } catch {
    return false
  }
}

async function getFreshGooglePlacePhotoURL(placeId?: string | null) {
  const apiKey = getGoogleMapsAPIKey()
  if (!placeId || !apiKey) return null

  try {
    const response = await fetch(`${GOOGLE_PLACES_API_BASE}/places/${encodeURIComponent(placeId)}`, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'photos',
      },
      next: {
        revalidate: LOCATION_PHOTO_REVALIDATE_SECONDS,
      },
    } satisfies NextFetchInit)

    if (!response.ok) return null

    const data = (await response.json()) as GooglePlaceDetailsResponse
    const photoName = data.photos?.find((photo) => typeof photo?.name === 'string')?.name
    if (typeof photoName !== 'string' || !photoName.trim()) return null

    return buildGooglePlacePhotoMediaURL(photoName, apiKey)
  } catch {
    return null
  }
}

function buildGooglePlacePhotoMediaURL(photoName: string, apiKey: string) {
  const normalizedPhotoName = photoName.replace(/^\/+/, '')
  const url = new URL(`${GOOGLE_PLACES_API_BASE}/${normalizedPhotoName}/media`)

  url.searchParams.set('maxWidthPx', String(LOCATION_PHOTO_MAX_WIDTH))
  url.searchParams.set('key', apiKey)

  return url.toString()
}

function getGoogleMapsAPIKey() {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.split('#')[0]?.trim() || ''
}
