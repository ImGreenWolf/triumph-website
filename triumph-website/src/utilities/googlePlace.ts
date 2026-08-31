export type GooglePlaceLocation = {
  coordinates?: { lat: number; lng: number }
  description?: string | null
  formattedAddress?: string
  name: string
  placeId?: string
  rating?: number | null
  viewport?: {
    east: number
    north: number
    south: number
    west: number
  }
}

export function getGooglePlaceLabel(value: unknown) {
  if (typeof value === 'string') return value.trim()
  if (value && typeof value === 'object' && 'name' in value && typeof value.name === 'string') {
    return value.name.trim()
  }
  return ''
}

export function normalizeGooglePlace(value: unknown): GooglePlaceLocation | null {
  if (typeof value === 'string') {
    const name = value.trim()
    return name ? { name } : null
  }
  if (!value || typeof value !== 'object') return null

  const name = getGooglePlaceLabel(value)
  if (!name) return null

  const source = value as Record<string, unknown>
  return {
    coordinates: isCoordinate(source.coordinates) ? source.coordinates : undefined,
    description: typeof source.description === 'string' ? source.description : null,
    formattedAddress:
      typeof source.formattedAddress === 'string' ? source.formattedAddress : undefined,
    name,
    placeId: typeof source.placeId === 'string' ? source.placeId : undefined,
    rating: typeof source.rating === 'number' ? source.rating : null,
    viewport: isViewport(source.viewport) ? source.viewport : undefined,
  }
}

function isCoordinate(value: unknown): value is GooglePlaceLocation['coordinates'] {
  return Boolean(
    value &&
    typeof value === 'object' &&
    typeof (value as { lat?: unknown }).lat === 'number' &&
    typeof (value as { lng?: unknown }).lng === 'number',
  )
}

function isViewport(value: unknown): value is NonNullable<GooglePlaceLocation['viewport']> {
  if (!value || typeof value !== 'object') return false

  const source = value as Record<string, unknown>
  return ['east', 'north', 'south', 'west'].every((key) => typeof source[key] === 'number')
}
