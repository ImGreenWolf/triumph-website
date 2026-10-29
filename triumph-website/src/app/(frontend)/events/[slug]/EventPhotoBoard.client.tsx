'use client'

import { useMemo, useState } from 'react'

import Masonry from '@/blocks/Masonry/MasonyComponent'
import { Event } from '@/payload-types'
import { getContrastTextColor } from '@/utilities/eventDisplay'
import { normalizeInstagramUsername } from '@/utilities/instagram'

export type EventPhotoBoardImage = {
  caption?: string
  height: number
  id: string
  img: string
  url: string
  width: number
}

export type EventPhotoBoardMode = 'gallery' | 'inspoboard'

const modeLabels: Record<EventPhotoBoardMode, string> = {
  gallery: 'Galerie',
  inspoboard: 'Inspo',
}

export default function EventPhotoBoard(props: {
  defaultMode: EventPhotoBoardMode
  galleryItems: EventPhotoBoardImage[]
  inspoboardItems: EventPhotoBoardImage[]
  eventRef: Event
}) {
  const { defaultMode, galleryItems, inspoboardItems, eventRef } = props
  const [mode, setMode] = useState<EventPhotoBoardMode>(defaultMode)
  const hasGallery = galleryItems.length > 0
  const hasInspoboard = inspoboardItems.length > 0
  const availableModes = useMemo<EventPhotoBoardMode[]>(() => {
    return [hasInspoboard ? 'inspoboard' : null, hasGallery ? 'gallery' : null].filter(
      (value): value is EventPhotoBoardMode => value !== null,
    )
  }, [hasGallery, hasInspoboard])
  const activeMode = availableModes.includes(mode) ? mode : availableModes[0]
  const activeItems = activeMode === 'gallery' ? galleryItems : inspoboardItems
  const showToggle = hasGallery && hasInspoboard

  if (!activeMode || activeItems.length === 0) return null

  return (
    <section style={{ color: getContrastTextColor(eventRef.primaryColor) }}>
      <div className="mb-6 mt-12 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--event-accent)]">
            {activeMode === 'gallery' ? 'Galerie' : 'Inspoboard'}
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">
            {activeMode === 'gallery' ? 'Fotografii din eveniment' : 'Inspirație pentru eveniment'}
          </h2>
          {activeMode === 'gallery' && Boolean(eventRef.photographers?.length) && (
            <p className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm leading-6">
              <span>Fotografii de</span>
              {eventRef.photographers?.map((photographer, index) => {
                const username = normalizeInstagramUsername(photographer.instagram)

                return username ? (
                  <a
                    className="min-w-0 underline decoration-current/50 underline-offset-4 [overflow-wrap:anywhere] hover:decoration-current focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
                    href={`https://www.instagram.com/${username}/`}
                    key={photographer.id || index}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {photographer.name}
                  </a>
                ) : (
                  <span className="min-w-0 [overflow-wrap:anywhere]" key={photographer.id || index}>
                    {photographer.name}
                  </span>
                )
              })}
            </p>
          )}
        </div>

        {showToggle && (
          <div
            aria-label="Alege setul de fotografii"
            className="relative grid h-8 w-36 shrink-0 grid-cols-2 rounded-full border p-0.5 shadow-inner shadow-black/10 backdrop-blur"
            style={{
              borderColor: eventRef.secondaryColor!,
              color: getContrastTextColor(eventRef.secondaryColor),
            }}
            role="tablist"
          >
            <span
              aria-hidden
              className={`absolute bottom-0.5 left-0.5 top-0.5 w-[calc(50%-0.125rem)] rounded-full bg-foreground shadow-sm transition-transform duration-200 ease-out ${
                activeMode === 'gallery' ? 'translate-x-[calc(100%)]' : 'translate-x-0'
              }`}
              style={{
                backgroundColor: eventRef.cardColor!,
                color: getContrastTextColor(eventRef.cardColor),
              }}
            />
            {availableModes.map((option) => (
              <button
                aria-selected={activeMode === option}
                className={`relative z-10 rounded-full px-2 text-xs font-semibold transition ${
                  activeMode === option ? '' : 'opacity-50 hover:opacity-100'
                }`}
                key={option}
                onClick={() => setMode(option)}
                role="tab"
                style={{
                  color:
                    activeMode === option
                      ? getContrastTextColor(eventRef.cardColor)
                      : getContrastTextColor(eventRef.primaryColor),
                }}
                type="button"
              >
                {modeLabels[option]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl">
        <Masonry
          columnProps={[4, 4, 3, 2, 1]}
          items={activeItems}
          duration={0}
          colorShiftOnHover={eventRef.useColors!}
          colorShift={eventRef.secondaryColor!}
        />
      </div>
    </section>
  )
}
