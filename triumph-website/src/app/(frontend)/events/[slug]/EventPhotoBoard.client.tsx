'use client'

import { useMemo, useState } from 'react'

import Masonry from '@/blocks/Masonry/MasonyComponent'

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
  inspoboard: 'Inspoboard',
}

export default function EventPhotoBoard(props: {
  defaultMode: EventPhotoBoardMode
  galleryItems: EventPhotoBoardImage[]
  inspoboardItems: EventPhotoBoardImage[]
}) {
  const { defaultMode, galleryItems, inspoboardItems } = props
  const [mode, setMode] = useState<EventPhotoBoardMode>(defaultMode)
  const hasGallery = galleryItems.length > 0
  const hasInspoboard = inspoboardItems.length > 0
  const availableModes = useMemo<EventPhotoBoardMode[]>(() => {
    return [
      hasInspoboard ? 'inspoboard' : null,
      hasGallery ? 'gallery' : null,
    ].filter((value): value is EventPhotoBoardMode => value !== null)
  }, [hasGallery, hasInspoboard])
  const activeMode = availableModes.includes(mode) ? mode : availableModes[0]
  const activeItems = activeMode === 'gallery' ? galleryItems : inspoboardItems
  const showToggle = hasGallery && hasInspoboard

  if (!activeMode || activeItems.length === 0) return null

  return (
    <section>
      <div className="mb-6 mt-12 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--event-accent)]">
            {activeMode === 'gallery' ? 'Galerie' : 'Inspoboard'}
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">
            {activeMode === 'gallery' ? 'Fotografii din eveniment' : 'Inspirație pentru eveniment'}
          </h2>
        </div>

        {showToggle && (
          <div
            aria-label="Alege setul de fotografii"
            className="relative grid w-full grid-cols-2 rounded-md border border-border bg-card p-1 sm:w-auto sm:min-w-64"
            role="tablist"
          >
            <span
              aria-hidden
              className={`absolute bottom-1 left-1 top-1 w-[calc(50%-0.25rem)] rounded bg-foreground transition-transform duration-200 ease-out ${
                activeMode === 'gallery' ? 'translate-x-[calc(100%+0.25rem)]' : 'translate-x-0'
              }`}
            />
            {availableModes.map((option) => (
              <button
                aria-selected={activeMode === option}
                className={`relative z-10 h-9 rounded px-3 text-sm font-semibold transition ${
                  activeMode === option
                    ? 'text-background'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                key={option}
                onClick={() => setMode(option)}
                role="tab"
                type="button"
              >
                {modeLabels[option]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl">
        <Masonry columnProps={[4, 4, 3, 2]} items={activeItems} />
      </div>
    </section>
  )
}
