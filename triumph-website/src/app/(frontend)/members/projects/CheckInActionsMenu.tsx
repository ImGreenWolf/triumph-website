'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, History, Trash2, Upload } from 'lucide-react'

export function CheckInActionsMenu(props: {
  onImport: () => void
  onRemoveDuplicates: () => void
  onHistory?: () => void
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const lastOnOpen = useRef(false)
  const id = useId()
  useEffect(() => {
    if (!open) return
    const buttons = root.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')
    ;(lastOnOpen.current ? buttons?.[buttons.length - 1] : buttons?.[0])?.focus()
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  function close() {
    setOpen(false)
    trigger.current?.focus()
  }
  const itemClass =
    'flex min-h-11 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold hover:bg-[#f2f4f7] focus-visible:bg-[#f2f4f7] focus-visible:outline-2 focus-visible:outline-accent'
  return (
    <div
      ref={root}
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault()
          close()
          return
        }
        if (!open || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
        event.preventDefault()
        const items = Array.from(
          root.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [],
        )
        const index = items.indexOf(document.activeElement as HTMLButtonElement)
        const next =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? items.length - 1
              : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
        items[next]?.focus()
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#cfd6df] bg-white px-3 text-xs font-bold text-[#344054] hover:bg-[#f5f7fa] sm:w-auto sm:px-4"
        onClick={() => {
          lastOnOpen.current = false
          setOpen((value) => !value)
        }}
        onKeyDown={(event) => {
          if (!open && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
            event.preventDefault()
            event.stopPropagation()
            lastOnOpen.current = event.key === 'ArrowUp'
            setOpen(true)
          }
        }}
      >
        Acțiuni <ChevronDown aria-hidden className="size-3.5" />
      </button>
      {open && (
        <div
          id={id}
          role="menu"
          aria-label="Acțiuni check-in"
          className="absolute right-0 top-full z-30 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-[#d7dde6] bg-white p-1.5 text-[#344054] shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() => {
              close()
              props.onImport()
            }}
          >
            <Upload aria-hidden className="size-4" /> Importă CSV
          </button>
          <button
            type="button"
            role="menuitem"
            className={`${itemClass} text-red-700`}
            onClick={() => {
              close()
              props.onRemoveDuplicates()
            }}
          >
            <Trash2 aria-hidden className="size-4" /> Elimină duplicatele…
          </button>
          {props.onHistory && (
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={() => {
                close()
                props.onHistory?.()
              }}
            >
              <History aria-hidden className="size-4" /> Istoric și anulare modificări
            </button>
          )}
        </div>
      )}
    </div>
  )
}
