'use client'

import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps'
import { MapPin, Search } from 'lucide-react'
import { useEffect, useRef } from 'react'

import type { GooglePlaceLocation } from '@/utilities/googlePlace'

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

export function GooglePlaceAutocomplete(props: {
  disabled?: boolean
  onChange: (location: GooglePlaceLocation | null) => void
  value: GooglePlaceLocation | null
}) {
  if (!apiKey) {
    return (
      <div className="flex h-9 items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-2 text-xs font-semibold text-amber-800">
        <MapPin className="size-3.5 shrink-0" />
        Configureaza cheia Google Maps pentru cautarea locatiei.
      </div>
    )
  }

  return (
    <APIProvider apiKey={apiKey} language="ro" region="RO">
      <PlaceAutocompleteControl {...props} />
    </APIProvider>
  )
}

function PlaceAutocompleteControl(props: {
  disabled?: boolean
  onChange: (location: GooglePlaceLocation | null) => void
  value: GooglePlaceLocation | null
}) {
  const places = useMapsLibrary('places')
  const containerRef = useRef<HTMLDivElement>(null)
  const autocompleteRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(null)
  const onChangeRef = useRef(props.onChange)
  onChangeRef.current = props.onChange

  useEffect(() => {
    if (!places || !containerRef.current) return

    const autocomplete = new google.maps.places.PlaceAutocompleteElement({
      value: props.value?.name || '',
    })
    autocomplete.name = 'interview-location-search'
    autocomplete.placeholder = 'Cauta pe Google Maps'
    autocomplete.style.display = 'block'
    autocomplete.style.height = '100%'
    autocomplete.style.minWidth = '0'
    autocomplete.style.width = '100%'
    autocompleteRef.current = autocomplete
    containerRef.current.replaceChildren(autocomplete)

    const listener: EventListener = async (event) => {
      const place = (
        event as google.maps.places.PlacePredictionSelectEvent
      ).placePrediction.toPlace()
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

    autocomplete.addEventListener('gmp-select', listener)
    return () => {
      autocomplete.removeEventListener('gmp-select', listener)
      autocompleteRef.current = null
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
        className="google-place-autocomplete h-9 w-full min-w-0 rounded-md border border-[#dfe5ec] bg-white pl-8"
        ref={containerRef}
      />
    </div>
  )
}
