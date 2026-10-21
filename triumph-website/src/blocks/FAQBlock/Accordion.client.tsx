'use client'

import React, { useId, useState } from 'react'
import { Plus } from 'lucide-react'

import { cn } from '@/utilities/ui'
import RichText from '@/components/RichText'
import { DefaultTypedEditorState } from '@payloadcms/richtext-lexical'

type FAQItem = {
  answer: DefaultTypedEditorState
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
        const triggerID = `${accordionID}-trigger-${item.id || index}`

        return (
          <article
            className={cn(
              'group overflow-hidden rounded-xl border bg-card/70 text-foreground transition-colors duration-200',
              isOpen
                ? 'border-accent/60 shadow-[0_18px_48px_rgba(0,0,0,0.12)]'
                : 'border-foreground/20 hover:border-accent/60 hover:bg-background',
            )}
            key={item.id || index}
          >
            <h3>
              <button
                id={triggerID}
                aria-controls={contentID}
                aria-expanded={isOpen}
                className="flex min-h-14 w-full items-start gap-4 p-5 text-left md:gap-5 md:p-6"
                onClick={() => setOpenItem(isOpen ? null : index)}
                type="button"
              >
                <span className="pt-0.5 text-lg font-semibold tabular-nums tracking-normal text-accent">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0 flex-1 text-lg font-semibold leading-snug md:text-xl">
                  {item.question}
                </span>
                <span
                  className={cn(
                    'block-faq-indicator flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-sidebar text-muted-foreground',
                    isOpen && 'rotate-45 border-accent/40 bg-accent text-background',
                  )}
                >
                  <Plus aria-hidden className="size-4" strokeWidth={2} />
                </span>
              </button>
            </h3>

            <div
              inert={!isOpen}
              role="region"
              aria-labelledby={triggerID}
              aria-hidden={!isOpen}
              className={cn(
                'block-faq-answer grid',
                isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
              )}
              id={contentID}
            >
              <div className="overflow-hidden">
                <RichText enableProse={false} enableGutter={false} className="[&_a]:text-accent border-t border-foreground/15 px-5 py-5 text-sm leading-7 text-foreground/85 md:px-6" data={item.answer}/>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
