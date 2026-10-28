'use client'

import { useEffect, useId, useRef } from 'react'
import { CornerDownLeft } from 'lucide-react'
import { calculateEventPayment, type AgeGroup } from '@/utilities/eventPayment'

const currency = (amount: number) =>
  new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
  }).format(amount)

export function usePaymentDialogFocus() {
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => {
    const form = ref.current
    const previous = document.activeElement
    if (!form) return
    const focusable = () =>
      Array.from(
        form.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
        ),
      )
    const fields = Array.from(
      form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        'input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled)',
      ),
    )
    const incomplete = fields.find(
      (field) => !field.validity.valid || (field.required && !field.value.trim()),
    )
    ;(
      incomplete ??
      form.querySelector<HTMLElement>('[name="totalCollected"]:not(:disabled)') ??
      fields[0] ??
      focusable()[0]
    )?.focus()
    function trap(event: KeyboardEvent) {
      if (event.key === 'Enter' && event.repeat) {
        event.preventDefault()
        return
      }
      if (event.key !== 'Tab') return
      const elements = focusable()
      const first = elements[0]
      const last = elements.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    form.addEventListener('keydown', trap)
    return () => {
      form.removeEventListener('keydown', trap)
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus()
    }
  }, [])
  return ref
}

export function EventPaymentFields(props: {
  ageGroup: AgeGroup | ''
  onAgeGroupChange: (value: AgeGroup) => void
  totalCollected: string
  onTotalChange: (value: string) => void
  guests: string
  onGuestsChange: (value: string) => void
  event: { donation: number; minimumConsumation?: number | null }
  disabled: boolean
  legacy?: boolean
}) {
  const id = useId()
  const totalInput = useRef<HTMLInputElement>(null)
  const focusConfirmation = useRef(false)
  const guests = props.guests.trim() ? Number(props.guests) : NaN
  const payment = calculateEventPayment(props.event, guests, props.totalCollected)
  const canUseMinimum = !calculateEventPayment(props.event, guests, payment.minimumTotal).error
  const emptyTotal = props.totalCollected === ''

  useEffect(() => {
    if (!focusConfirmation.current) return
    focusConfirmation.current = false
    const form = totalInput.current?.form
    ;(
      form?.querySelector<HTMLElement>('button[type="submit"]:not(:disabled)') ??
      form?.querySelector<HTMLElement>('input:invalid, select:invalid, textarea:invalid') ??
      totalInput.current
    )?.focus()
  }, [props.totalCollected])

  function useMinimum() {
    if (props.disabled || !canUseMinimum) return
    focusConfirmation.current = true
    props.onTotalChange(String(payment.minimumTotal))
  }

  const inputClass =
    'h-12 w-full min-w-0 rounded-lg border border-[#d7dde6] bg-white px-3 text-base font-semibold text-[#152039] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60'

  return (
    <div className="space-y-4 text-[#344054]">
      <fieldset disabled={props.disabled} className="min-w-0">
        <legend className="mb-2 text-sm font-bold">Categorie de vârstă *</legend>
        <div className="flex flex-wrap gap-3">
          {(
            [
              ['minor', 'Minor — sub 18 ani'],
              ['adult', 'Major — 18+'],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-[#d7dde6] px-3 text-sm"
            >
              <input
                type="radio"
                name={`${id}-age`}
                value={value}
                required
                checked={props.ageGroup === value}
                onChange={() => props.onAgeGroupChange(value)}
                className="size-4 accent-emerald-700"
              />
              {label}
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-[#536071]">
          Categoria participantului înscris, nu a însoțitorilor.
        </p>
      </fieldset>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] items-end gap-3 sm:gap-4">
        <label className="flex min-w-0 flex-col gap-2 text-sm font-bold" htmlFor={`${id}-guests`}>
          Persoane însoțitoare
          <input
            id={`${id}-guests`}
            className={inputClass}
            type="number"
            min="0"
            max="50"
            step="1"
            required
            disabled={props.disabled}
            value={props.guests}
            onChange={(e) => props.onGuestsChange(e.target.value)}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-2 text-sm font-bold" htmlFor={`${id}-total`}>
          Total încasat — include consumația (RON)
          <div className="relative">
            <input
              ref={totalInput}
              id={`${id}-total`}
              name="totalCollected"
              className={`${inputClass} appearance-textfield pr-12 placeholder:text-[#536071] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
              type="number"
              min={payment.minimumTotal}
              max="1000000"
              step="0.01"
              required
              aria-describedby={`${id}-breakdown ${id}-help${emptyTotal ? ` ${id}-shortcut` : ''}`}
              aria-invalid={Boolean(props.totalCollected && payment.error)}
              disabled={props.disabled}
              value={props.totalCollected}
              placeholder={currency(payment.minimumTotal)}
              onChange={(e) => props.onTotalChange(e.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key !== 'Enter' ||
                  !emptyTotal ||
                  event.nativeEvent.isComposing ||
                  event.nativeEvent.keyCode === 229 ||
                  event.altKey ||
                  event.ctrlKey ||
                  event.metaKey ||
                  event.shiftKey
                )
                  return
                event.preventDefault()
                if (!event.repeat && !event.currentTarget.validity.badInput) useMinimum()
              }}
            />
            {emptyTotal && (
              <button
                type="button"
                aria-label={`Folosește totalul minim de ${currency(payment.minimumTotal)}`}
                title="Enter: folosește totalul minim"
                disabled={props.disabled || !canUseMinimum}
                onClick={useMinimum}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-[#536071] hover:bg-[#eef2f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
              >
                <CornerDownLeft aria-hidden className="size-4" />
              </button>
            )}
          </div>
        </label>
      </div>
      {emptyTotal && (
        <p id={`${id}-shortcut`} className="text-xs leading-5 text-[#536071]">
          <kbd className="rounded border border-[#d7dde6] px-1 py-0.5 font-sans font-semibold">
            Enter
          </kbd>{' '}
          completează totalul minim și trece la confirmare.
        </p>
      )}
      <p id={`${id}-help`} className="text-xs leading-5 text-[#536071]">
        Introdu întreaga sumă primită pentru participant și însoțitori. Consumația este inclusă;
        restul se înregistrează ca donație. Ambele minime se aplică fiecărei persoane.
      </p>
      {props.legacy && (
        <p className="text-xs leading-5 text-[#536071]">
          Consumația nu a fost înregistrată separat anterior. Totalul propus adaugă consumația
          minimă la donația existentă. Verifică suma efectiv încasată înainte de confirmare.
        </p>
      )}
      <dl
        id={`${id}-breakdown`}
        aria-live="polite"
        className="space-y-2 rounded-lg bg-[#f2f9fc] p-4 text-sm tabular-nums"
      >
        <div className="flex flex-wrap justify-between gap-x-3">
          <dt>Persoane</dt>
          <dd className="font-bold">{payment.people}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-x-3">
          <dt>Consumație inclusă</dt>
          <dd className="font-bold">{currency(payment.consumptionAmount)}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-x-3">
          <dt>Donație</dt>
          <dd className="font-bold">
            {payment.donation !== null && payment.donation >= 0 ? currency(payment.donation) : '—'}
          </dd>
        </div>
        <div className="flex flex-wrap justify-between gap-x-3">
          <dt>Total minim</dt>
          <dd className="font-bold">{currency(payment.minimumTotal)}</dd>
        </div>
      </dl>
      {props.totalCollected && payment.error && (
        <p role="status" className="text-sm font-semibold text-red-700">
          {payment.error}
        </p>
      )}
    </div>
  )
}
