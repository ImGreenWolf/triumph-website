'use client'

import { ArrowRight, List, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { cn } from '@/utilities/ui'

const previewItemCount = 4

type TimelineItem = {
  action?: {
    href: string
    label: string
  }
  date?: string
  detailDate?: string
  details?: string[]
  label: string
  empty?: boolean
  tone: 'success' | 'warning' | 'danger' | 'neutral'
}

export default function TimelineDots(props: {
  emptyLabel: string
  items: TimelineItem[]
  modalTitle: string
}) {
  const { emptyLabel, items, modalTitle } = props
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const originalOverflow = document.body.style.overflow

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.body.style.overflow = originalOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  if (!items.length) {
    return (
      <div className="mt-6 rounded-md border border-dashed border-border p-5 text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    )
  }

  const previewItems = items.slice(-previewItemCount)

  return (
    <>
      <div className="mt-6 border-t border-border pt-5">
        <div className="flex items-center gap-2">
          <div className="grid min-w-0 flex-1 grid-cols-4 gap-2">
            {previewItems.map((item, index) => (
              <TimelineDot item={item} key={`${item.label}-${item.date || index}-${index}`} />
            ))}
          </div>

          <button
            aria-label={`Vezi toate înregistrările din ${modalTitle.toLowerCase()}`}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => setIsOpen(true)}
            title="Vezi toate înregistrările"
            type="button"
          >
            <List className="size-4" />
          </button>
        </div>
      </div>

      {isOpen && (
        <div
          aria-labelledby="timeline-dialog-title"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsOpen(false)
            }
          }}
          role="dialog"
        >
          <div className="flex max-h-[min(42rem,calc(100dvh-2rem))] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-lg font-semibold" id="timeline-dialog-title">
                {modalTitle}
              </h2>
              <button
                aria-label="Închide"
                className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-5">
              {[...items].reverse().map((item, index) => (
                <div
                  className="flex flex-col gap-3 rounded-md border border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  key={`${item.label}-${item.date || index}-${index}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={cn('size-3 shrink-0 rounded-full', toneClassName(item))} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.label}</p>
                      {item.details?.map((detail) => (
                        <p className="mt-1 text-xs text-muted-foreground" key={detail}>
                          {detail}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
                    <span className="text-sm text-muted-foreground">
                      {item.detailDate || item.date || '-'}
                    </span>
                    {item.action && (
                      <Link
                        className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
                        href={item.action.href}
                      >
                        {item.action.label}
                        <ArrowRight className="size-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function TimelineDot(props: { item: TimelineItem }) {
  const { item } = props

  return (
    <span
      className={cn(
        'relative inline-flex h-7 min-w-0 items-center justify-center rounded-full border px-2 text-[10px] font-semibold',
        toneClassName(item),
      )}
      title={`${item.label}${item.date ? ` · ${item.date}` : ''}`}
    >
      <span className="truncate">{item.date || item.label}</span>
    </span>
  )
}

function toneClassName(item: TimelineItem) {
  return cn(
    item.tone === 'success' && 'border-emerald-500/25 bg-emerald-500 text-white',
    item.tone === 'warning' && 'border-[#f7a81b]/25 bg-[#f7a81b] text-[#241400]',
    item.tone === 'danger' && 'border-red-500/25 bg-red-500 text-white',
    item.tone === 'neutral' && 'border-border bg-muted text-muted-foreground',
    item.empty && 'border-white/20 bg-white/10 text-white/80',
  )
}
