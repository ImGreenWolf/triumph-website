import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  getLocationMapEmbedURL,
  getLocationPhotoURL,
  normalizeGooglePlacePhotoURL,
} from '@/utilities/locationPhoto'

describe('location photo URLs', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('refreshes the key on stored Google Places photo URLs', () => {
    const url = normalizeGooglePlacePhotoURL(
      'https://places.googleapis.com/v1/places/place-id/photos/photo-id/media?maxWidthPx=4032&key=old-key',
      'new-key',
    )

    expect(url).toBe(
      'https://places.googleapis.com/v1/places/place-id/photos/photo-id/media?maxWidthPx=4032&key=new-key',
    )
  })

  it('keeps non-Google photo URLs unchanged', () => {
    const url = 'https://example.com/location.jpg'

    expect(normalizeGooglePlacePhotoURL(url, 'new-key')).toBe(url)
  })

  it('fetches a fresh Google Places photo when the saved location has no stored photos', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          photos: [
            {
              name: 'places/place-id/photos/photo-id',
            },
          ],
        }),
        { status: 200 },
      )
    })
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'fresh-key')
    vi.stubGlobal('fetch', fetchMock)

    const url = await getLocationPhotoURL({
      name: 'Mirador Rooftop',
      placeId: 'place-id',
    } as any)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://places.googleapis.com/v1/places/place-id',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Goog-Api-Key': 'fresh-key',
          'X-Goog-FieldMask': 'photos',
        }),
      }),
    )
    expect(url).toBe(
      'https://places.googleapis.com/v1/places/place-id/photos/photo-id/media?maxWidthPx=1200&key=fresh-key',
    )
  })

  it('drops stored Google photo URLs that return 404', async () => {
    const fetchMock = vi.fn(async () => new Response('', { status: 404 }))
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'fresh-key')
    vi.stubGlobal('fetch', fetchMock)

    const url = await getLocationPhotoURL({
      name: 'Green Hours Jazz Cafe',
      photos: [
        {
          photoURL:
            'https://places.googleapis.com/v1/places/place-id/photos/photo-id/media?maxWidthPx=4032&key=old-key',
        },
      ],
    } as any)

    expect(url).toBeNull()
    expect(fetchMock).toHaveBeenCalledWith(
      'https://places.googleapis.com/v1/places/place-id/photos/photo-id/media?maxWidthPx=4032&key=fresh-key',
      expect.objectContaining({
        method: 'HEAD',
      }),
    )
  })

  it('tries the next stored Google photo URL when the first one is broken', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(new Response('', { headers: { 'content-type': 'image/jpeg' } }))
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'fresh-key')
    vi.stubGlobal('fetch', fetchMock)

    const url = await getLocationPhotoURL({
      name: 'Green Hours Jazz Cafe',
      photos: [
        {
          photoURL:
            'https://places.googleapis.com/v1/places/place-id/photos/broken-photo/media?maxWidthPx=4032&key=old-key',
        },
        {
          photoURL:
            'https://places.googleapis.com/v1/places/place-id/photos/working-photo/media?maxWidthPx=4032&key=old-key',
        },
      ],
    } as any)

    expect(url).toBe(
      'https://places.googleapis.com/v1/places/place-id/photos/working-photo/media?maxWidthPx=4032&key=fresh-key',
    )
  })

  it('builds a Maps embed URL from coordinates', () => {
    const url = getLocationMapEmbedURL({
      coordinates: {
        lat: 44.4357137,
        lng: 26.094911,
      },
      name: 'Mirador Rooftop',
    } as any)

    expect(url).toBe(
      'https://www.google.com/maps?q=44.4357137%2C26.094911&z=16&output=embed',
    )
  })

  it('builds a Maps embed URL from the location text when coordinates are missing', () => {
    const url = getLocationMapEmbedURL({
      formattedAddress: 'Calea Victoriei 120, Bucuresti',
      name: 'Green Hours Jazz Cafe',
    } as any)

    expect(url).toBe(
      'https://www.google.com/maps?q=Calea+Victoriei+120%2C+Bucuresti&output=embed',
    )
  })
})
