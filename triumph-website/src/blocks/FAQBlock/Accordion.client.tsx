'use client'

import React, { useId, useState } from 'react'
import { Plus } from 'lucide-react'

import { cn } from '@/utilities/ui'

type FAQItem = {
  answer: string
  id?: string | null
  question: string
}

type Props = {
  items: FAQItem[]
  openFirstItem?: boolean | null
}

export const FAQAccordion: React.FC<Props> = ({ items, openFirstItem }) => {
  const accordionID = useId()
  const [openItem, setOpenItem] = useState<number | null>(openFirstItem && items.length ? 0 : null)

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const isOpen = openItem === index
        const contentID = `${accordionID}-answer-${item.id || index}`

        return (
          <article
            className={cn(
              'group overflow-hidden rounded-xl border-2 bg-card/75 text-card-foreground transition-all duration-300',
              isOpen
                ? 'border-accent/60 shadow-[0_18px_48px_rgba(0,0,0,0.12)]'
                : 'border-border hover:border-accent/35 hover:bg-card',
            )}
            key={item.id || index}
          >
            <h3>
              <button
                aria-controls={contentID}
                aria-expanded={isOpen}
                className="flex w-full items-start gap-4 p-5 text-left md:gap-5 md:p-6"
                onClick={() => setOpenItem(isOpen ? null : index)}
                type="button"
              >
                <span className="pt-0.5 text-xs font-semibold tabular-nums tracking-normal text-accent">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="flex-1 text-base font-semibold leading-6 md:text-lg">
                  {item.question}
                </span>
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-background/70 text-muted-foreground transition-all duration-300',
                    isOpen && 'rotate-45 border-accent/40 bg-accent text-accent-foreground',
                  )}
                >
                  <Plus aria-hidden className="size-4" strokeWidth={2} />
                </span>
              </button>
            </h3>

            <div
              aria-hidden={!isOpen}
              className={cn(
                'grid transition-[grid-template-rows] duration-300 ease-out',
                isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
              )}
              id={contentID}
            >
              <div className="overflow-hidden">
                <p className="border-t border-border/70 px-5 py-5 pl-14 text-sm leading-7 text-muted-foreground md:px-6 md:pl-[4.65rem]">
                  {item.answer}
                </p>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
