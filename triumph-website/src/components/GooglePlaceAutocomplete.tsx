'use client'

import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps'
import { MapPin, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import type { GooglePlaceLocation } from '@/utilities/googlePlace'

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.split('#')[0]?.trim() || ''

export function GooglePlaceAutocomplete(props: {
  disabled?: boolean
  onChange: (location: GooglePlaceLocation | null) => void
  value: GooglePlaceLocation | null
}) {
  const [useFallback, setUseFallback] = useState(!apiKey)

  if (useFallback) return <ManualLocationInput {...props} />

  return (
    <APIProvider apiKey={apiKey} language="ro" region="RO">
      <PlaceAutocompleteControl {...props} onError={() => setUseFallback(true)} />
    </APIProvider>
  )
}

function ManualLocationInput(props: {
  disabled?: boolean
  onChange: (location: GooglePlaceLocation | null) => void
  value: GooglePlaceLocation | null
}) {
  const [manualValue, setManualValue] = useState(props.value?.name ?? '')

  useEffect(() => {
    setManualValue(props.value?.name ?? '')
  }, [props.value?.name])

  return (
    <div className="relative z-10 min-w-0">
      <MapPin className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#748094]" />
      <input
        className="h-9 w-full min-w-0 rounded-md border border-[#dfe5ec] bg-white px-8 text-sm font-medium text-[#1f2733] outline-none transition focus:border-[#1f6feb] focus:ring-2 focus:ring-[#1f6feb]/15 disabled:cursor-not-allowed disabled:bg-[#f3f5f8] disabled:text-[#748094]"
        disabled={props.disabled}
        onChange={(event) => {
          const nextValue = event.target.value
          setManualValue(nextValue)
          props.onChange(nextValue.trim() ? { name: nextValue.trim() } : null)
        }}
        placeholder="Introdu locatia manual"
        value={manualValue}
      />
    </div>
  )
}

function PlaceAutocompleteControl(props: {
  disabled?: boolean
  onError: () => void
  onChange: (location: GooglePlaceLocation | null) => void
  value: GooglePlaceLocation | null
}) {
  const places = useMapsLibrary('places')
  const containerRef = useRef<HTMLDivElement>(null)
  const autocompleteRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(null)
  const onChangeRef = useRef(props.onChange)
  const onErrorRef = useRef(props.onError)
  onChangeRef.current = props.onChange
  onErrorRef.current = props.onError

  useEffect(() => {
    if (!places || !containerRef.current) return

    const autocomplete = new google.maps.places.PlaceAutocompleteElement({
      value: props.value?.name || '',
    })
    ;(
      autocomplete as google.maps.places.PlaceAutocompleteElement & {
        includedRegionCodes?: string[]
      }
    ).includedRegionCodes = ['ro']
    autocomplete.name = 'interview-location-search'
    autocomplete.placeholder = 'Cauta pe Google Maps'
    autocomplete.setAttribute('aria-label', 'Cauta locatie')
    autocomplete.style.display = 'block'
    autocomplete.style.height = '100%'
    autocomplete.style.minWidth = '0'
    autocomplete.style.width = '100%'
    autocompleteRef.current = autocomplete
    containerRef.current.innerHTML = ''
    containerRef.current.appendChild(autocomplete)

    const listener: EventListener = async (event) => {
      const place = (
        event as google.maps.places.PlacePredictionSelectEvent
      ).placePrediction.toPlace()
      try {
        await place.fetchFields({
          fields: [
            'displayName',
            'editorialSummary',
            'formattedAddress',
            'generativeSummary',
            'id',
            'location',
            'rating',
            'viewport',
          ],
        })
      } catch {
        onErrorRef.current()
        return
      }

      const name = place.displayName || place.formattedAddress || ''
      if (!name) return

      onChangeRef.current({
        coordinates: place.location?.toJSON(),
        description: place.editorialSummary ?? place.generativeSummary?.overview ?? null,
        formattedAddress: place.formattedAddress ?? undefined,
        name,
        placeId: place.id,
        rating: place.rating ?? null,
        viewport: place.viewport?.toJSON(),
      })
    }

    const errorListener: EventListener = () => {
      onErrorRef.current()
    }

    autocomplete.addEventListener('gmp-select', listener)
    autocomplete.addEventListener('gmp-error', errorListener)
    autocomplete.addEventListener('error', errorListener)
    return () => {
      autocomplete.removeEventListener('gmp-select', listener)
      autocomplete.removeEventListener('gmp-error', errorListener)
      autocomplete.removeEventListener('error', errorListener)
      autocompleteRef.current = null
      autocomplete.remove()
    }
  }, [places])

  useEffect(() => {
    if (!autocompleteRef.current) return
    autocompleteRef.current.value = props.value?.name || ''
    autocompleteRef.current.toggleAttribute('disabled', Boolean(props.disabled))
  }, [props.disabled, props.value?.name])

  return (
    <div className="relative z-20 min-w-0">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 z-10 size-3.5 -translate-y-1/2 text-[#748094]" />
      <div
        className="google-place-autocomplete h-9 w-full min-w-0 rounded-md border border-[#dfe5ec] bg-white pl-8 [&_gmp-place-autocomplete]:h-full [&_gmp-place-autocomplete]:w-full"
        ref={containerRef}
      />
    </div>
  )
}
