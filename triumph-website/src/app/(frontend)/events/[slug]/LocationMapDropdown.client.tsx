'use client'

import { ExternalLink, MapPinned } from 'lucide-react'
import { useState } from 'react'

export default function LocationMapDropdown(props: {
  googleMapsURL?: string | null
  locationName: string
  mapEmbedURL?: string | null
}) {
  const { googleMapsURL, locationName, mapEmbedURL } = props
  const [isOpen, setIsOpen] = useState(false)

  if (!mapEmbedURL && !googleMapsURL) return null

  return (
    <div className="mt-5 space-y-3">
      {mapEmbedURL && (
        <button
          aria-expanded={isOpen}
          className="inline-flex items-center gap-1.5 text-base font-bold text-[var(--event-accent)] transition hover:opacity-50"
          onClick={() => setIsOpen((value) => !value)}
          type="button"
        >
          <MapPinned aria-hidden className="size-4" />
          Vezi locația
        </button>
      )}

      {isOpen && mapEmbedURL && (
        <div className="space-y-3 rounded-xl bg-background/10 p-3">
          <div className="aspect-[16/9] overflow-hidden rounded-lg bg-background/10">
            <iframe
              className="size-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={mapEmbedURL}
              title={`Hartă ${locationName}`}
            />
          </div>
          {googleMapsURL && (
            <a
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--event-accent)] px-3 py-2 text-sm font-bold text-background transition hover:opacity-85"
              href={googleMapsURL}
              rel="noreferrer"
              target="_blank"
            >
              Deschide în Google Maps
              <ExternalLink aria-hidden className="size-3.5" />
            </a>
          )}
        </div>
      )}

      {!mapEmbedURL && googleMapsURL && (
        <a
          className="inline-flex items-center gap-1.5 text-base font-bold text-[var(--event-accent)] transition hover:opacity-50"
          href={googleMapsURL}
          rel="noreferrer"
          target="_blank"
        >
          Deschide în Google Maps
          <ExternalLink aria-hidden className="size-3.5" />
        </a>
      )}
    </div>
  )
}
