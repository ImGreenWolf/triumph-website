'use client'

import {
  APIProvider,
  AdvancedMarker,
  ControlPosition,
  Map,
  MapControl,
  useAdvancedMarkerRef,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps'
import { FieldDescription, FieldError, FieldLabel, useField } from '@payloadcms/ui'
import { JSONFieldClientProps } from 'payload'
import { useEffect, useRef, useState } from 'react'
import { LocationEditIcon } from 'lucide-react'

const DEFAULT_CENTER = {
  lat: 44.429663,
  lng: 26.096306,
}

export type LocationValue = {
  coordinates?: google.maps.LatLngLiteral
  description?: string | null
  formattedAddress?: string
  name: string
  placeId?: string
  photos?: {
    authorAttributions: {
      displayName: string
      photoURI?: string | null
      uri?: string | null
    }[]
    googleMapsURI?: string | null
    heightPx: number
    photoURL: string
    widthPx: number
  }[]
  rating?: number | null
  viewport?: {
    east: number
    north: number
    south: number
    west: number
  }
}

const getPlaceName = (place: google.maps.places.Place) =>
  place.displayName || place.formattedAddress || ''

const getFieldPath = ({ field, path }: JSONFieldClientProps) => path || field.name

const getPhotoValue = (photo: google.maps.places.Photo) => ({
  authorAttributions: photo.authorAttributions.map((author) => ({
    displayName: author.displayName,
    photoURI: author.photoURI,
    uri: author.uri,
  })),
  googleMapsURI: photo.googleMapsURI,
  heightPx: photo.heightPx,
  photoURL: photo.getURI(),
  widthPx: photo.widthPx,
})

const getLocationValue = (place: google.maps.places.Place): LocationValue => ({
  coordinates: place.location?.toJSON(),
  description: place.editorialSummary ?? place.generativeSummary?.overview ?? null,
  formattedAddress: place.formattedAddress ?? undefined,
  name: getPlaceName(place),
  placeId: place.id,
  photos: place.photos?.map(getPhotoValue) ?? [],
  rating: place.rating,
  viewport: place.viewport?.toJSON(),
})

function LocationSelectorField(props: JSONFieldClientProps) {
  const { field, path, readOnly } = props
  const fieldPath = getFieldPath(props)
  const { setValue, value, disabled, showError } = useField<LocationValue | null>({ path: fieldPath })
  const [selectedLocation, setSelectedLocation] = useState<LocationValue | null>(null)
  const [markerRef, marker] = useAdvancedMarkerRef()

  const actualReadOnly = readOnly || field.admin?.readOnly || false
  const locationValue = value && typeof value === 'object' && 'name' in value ? value : null
  const locationName = locationValue?.name || ''

  const handlePlaceSelect = (place: google.maps.places.Place | null) => {
    if (!place) {
      setSelectedLocation(null)
      setValue(null)
      return
    }

    const nextValue = getLocationValue(place)

    setSelectedLocation(nextValue)
    setValue(nextValue)
  }

  return (
    <div>
      <FieldLabel
        label={field.label ?? undefined}
        localized={field.localized}
        path={fieldPath}
        required={field.required}
      />
      <div className="container flex gap-4">
          <div style={{display: 'flex', alignItems: 'center', margin: 8, padding: 8, gap: 4}}>
            <LocationEditIcon/>
            <b style={{fontSize: 16,  display: 'block', textDecoration: 'underline', textUnderlineOffset: 3}}>{selectedLocation?.name || locationName}</b>
          </div>
        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''} language='ro' region='RO'>
          <Map
            defaultCenter={DEFAULT_CENTER}
            defaultZoom={12}
            style={{ height: '400px', width: '100%' }}
            mapId={process.env.NEXT_PUBLIC_GOOGLE_MAP_ID}
          >
            <AdvancedMarker ref={markerRef} position={DEFAULT_CENTER} />

            <MapControl position={ControlPosition.TOP_LEFT}>
              <div className="autocomplete-control rounded-md bg-white p-2 shadow" style={{width: '200%'}}>
                <PlaceAutocomplete
                  disabled={actualReadOnly || disabled}
                  onPlaceSelect={handlePlaceSelect}
                  value={locationName}
                />
              </div>
            </MapControl>

            <SavedLocationLoader
              onLoad={setSelectedLocation}
              selectedLocation={selectedLocation}
              value={locationValue}
            />
            <MapHandler marker={marker} place={selectedLocation} />
          </Map>
        </APIProvider>
      </div>
      {locationValue && (
        <div style={{ marginTop: 12 }}>
          {typeof locationValue.rating === 'number' && (
            <p>
              <strong>Rating:</strong> {locationValue.rating.toFixed(1)}
            </p>
          )}
          {locationValue.description && (
            <p>
              <strong>Description:</strong> {locationValue.description}
            </p>
          )}
          {!!locationValue.photos?.length && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8, overflowX: 'auto' }}>
              {locationValue.photos.slice(0, 3).map((photo, index) => (
                <img
                  key={`${photo.photoURL}-${index}`}
                  alt={`${locationValue.name} photo ${index + 1}`}
                  src={photo.photoURL}
                  style={{ borderRadius: 8, height: 96, objectFit: 'cover', width: 144 }}
                />
              ))}
            </div>
          )}
        </div>
      )}
      <FieldError showError={showError} path={fieldPath} />
      <FieldDescription description={field.admin?.description} path={fieldPath} />
    </div>
  )
}

interface MapHandlerProps {
  marker: google.maps.marker.AdvancedMarkerElement | null
  place: LocationValue | null
}

function MapHandler({ place, marker }: MapHandlerProps) {
  const map = useMap()

  useEffect(() => {
    if (!map || !place || !marker) return

    if (place.viewport) {
      map.fitBounds(place.viewport)
    } else if (place.coordinates) {
      map.panTo(place.coordinates)
      map.setZoom(16)
    }

    marker.position = place.coordinates || DEFAULT_CENTER
  }, [map, place, marker])

  return null
}

interface SavedLocationLoaderProps {
  onLoad: (location: LocationValue | null) => void
  selectedLocation: LocationValue | null
  value: LocationValue | null
}

function SavedLocationLoader({ onLoad, selectedLocation, value }: SavedLocationLoaderProps) {
  const map = useMap()

  useEffect(() => {
    if (!map) return

    if (!value) {
      if (selectedLocation) onLoad(null)
      return
    }

    if (selectedLocation?.name === value.name) return

    onLoad(value)
  }, [map, onLoad, selectedLocation, value])

  return null
}

interface PlaceAutocompleteProps {
  disabled?: boolean
  onPlaceSelect: (place: google.maps.places.Place | null) => void
  value: string
}

function PlaceAutocomplete({ disabled, onPlaceSelect, value }: PlaceAutocompleteProps) {
  const places = useMapsLibrary('places')
  const containerRef = useRef<HTMLDivElement>(null)
  const autocompleteRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(null)

  useEffect(() => {
    if (!places || !containerRef.current) return

    const autocomplete = new google.maps.places.PlaceAutocompleteElement({
      value,
    })

    autocomplete.name = 'location-search'
    autocomplete.placeholder = 'Search for a location'
    autocompleteRef.current = autocomplete
    containerRef.current.innerHTML = ''
    containerRef.current.appendChild(autocomplete)

    const listener: EventListener = async (event) => {
      const place = (event as google.maps.places.PlacePredictionSelectEvent).placePrediction.toPlace()

      await place.fetchFields({
        fields: [
          'displayName',
          'editorialSummary',
          'formattedAddress',
          'generativeSummary',
          'id',
          'location',
          'photos',
          'rating',
          'viewport',
          'userRatingCount',
        ],
      })

      onPlaceSelect(place)
    }

    autocomplete.addEventListener('gmp-select', listener)

    return () => {
      autocomplete.removeEventListener('gmp-select', listener)
      autocompleteRef.current = null
    }
  }, [onPlaceSelect, places])

  useEffect(() => {
    if (!autocompleteRef.current) return

    autocompleteRef.current.value = value
    autocompleteRef.current.toggleAttribute('disabled', Boolean(disabled))
  }, [disabled, value])

  return <div ref={containerRef} />
}

export default LocationSelectorField
