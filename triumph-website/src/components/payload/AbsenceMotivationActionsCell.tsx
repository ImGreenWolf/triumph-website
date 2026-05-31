'use client'

import { Check, CheckCircle2, X, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type FormEvent, type MouseEvent, useEffect, useState } from 'react'

import { toast } from '@payloadcms/ui'
import type { DefaultCellComponentProps } from 'payload'

import './AbsenceMotivationActionsCell.scss'

type MotivationStatus = 'accepted' | 'pending' | 'rejected'
type ReviewStatus = Exclude<MotivationStatus, 'pending'>

const actionLabels: Record<ReviewStatus, string> = {
  accepted: 'Acceptă motivarea',
  rejected: 'Respinge motivarea',
}

export default function AbsenceMotivationActionsCell({
  rowData,
}: DefaultCellComponentProps) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<ReviewStatus | null>(null)
  const [visualStatus, setVisualStatus] = useState<MotivationStatus>(
    rowData.status as MotivationStatus,
  )

  useEffect(() => {
    setVisualStatus(rowData.status as MotivationStatus)
  }, [rowData.status])

  const closeModal = () => {
    if (isSubmitting) return

    setError('')
    setMessage('')
    setSelectedStatus(null)
  }

  useEffect(() => {
    if (!selectedStatus) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        setError('')
        setMessage('')
        setSelectedStatus(null)
      }
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isSubmitting, selectedStatus])

  const openRejectModal = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setError('')
    setSelectedStatus('rejected')
  }

  const saveReview = async (status: ReviewStatus, secretaryMessage?: string) => {
    setError('')
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/absence-motivations/${rowData.id}`, {
        body: JSON.stringify({
          secretaryMessage,
          status,
        }),
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'PATCH',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.errors?.[0]?.message || 'Decizia nu a putut fi salvată.')
      }

      toast.success('Decizia a fost salvată.')
      setVisualStatus(status)
      setMessage('')
      setSelectedStatus(null)
      router.refresh()
    } catch (submitError) {
      const errorMessage =
        submitError instanceof Error ? submitError.message : 'Decizia nu a putut fi salvată.'

      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const acceptMotivation = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    await saveReview('accepted')
  }

  const submitReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    event.stopPropagation()

    const secretaryMessage = message.trim()

    if (!secretaryMessage) {
      setError('Adaugă un mesaj pentru membru.')
      return
    }

    await saveReview('rejected', secretaryMessage)
  }

  if (visualStatus === 'accepted') {
    return (
      <span
        aria-label="Motivare acceptată"
        className="absence-motivation-actions__status absence-motivation-actions__status--accepted"
        role="img"
        title="Motivare acceptată"
      >
        <CheckCircle2 aria-hidden="true" />
      </span>
    )
  }

  if (visualStatus === 'rejected') {
    return (
      <span
        aria-label="Motivare respinsă"
        className="absence-motivation-actions__status absence-motivation-actions__status--rejected"
        role="img"
        title="Motivare respinsă"
      >
        <XCircle aria-hidden="true" />
      </span>
    )
  }

  return (
    <>
      <div className="absence-motivation-actions">
        <button
          aria-label="Acceptă motivarea"
          className="absence-motivation-actions__button absence-motivation-actions__button--accepted"
          disabled={isSubmitting}
          onClick={acceptMotivation}
          title="Acceptă motivarea"
          type="button"
        >
          <Check aria-hidden="true" />
        </button>
        <button
          aria-label="Respinge motivarea"
          className="absence-motivation-actions__button absence-motivation-actions__button--rejected"
          disabled={isSubmitting}
          onClick={openRejectModal}
          title="Respinge motivarea"
          type="button"
        >
          <X aria-hidden="true" />
        </button>
      </div>

      {selectedStatus && (
        <div
          aria-labelledby={`absence-motivation-review-${rowData.id}`}
          aria-modal="true"
          className="absence-motivation-actions__backdrop"
          onClick={closeModal}
          role="dialog"
        >
          <form
            className="absence-motivation-actions__modal"
            onClick={(event) => event.stopPropagation()}
            onSubmit={submitReview}
          >
            <div className="absence-motivation-actions__modalHeader">
              <div>
                <h2 id={`absence-motivation-review-${rowData.id}`}>
                  {actionLabels[selectedStatus]}
                </h2>
                <p>Adaugă mesajul care va fi afișat membrului în dashboard.</p>
              </div>
              <button
                aria-label="Închide"
                className="absence-motivation-actions__close"
                disabled={isSubmitting}
                onClick={closeModal}
                title="Închide"
                type="button"
              >
                <X aria-hidden="true" />
              </button>
            </div>

            <label htmlFor={`absence-motivation-message-${rowData.id}`}>Mesaj pentru membru</label>
            <textarea
              autoFocus
              id={`absence-motivation-message-${rowData.id}`}
              maxLength={1000}
              onChange={(event) => setMessage(event.target.value)}
              rows={5}
              value={message}
            />

            {error && <p className="absence-motivation-actions__error">{error}</p>}

            <div className="absence-motivation-actions__modalFooter">
              <button
                aria-label="Închide"
                className="absence-motivation-actions__close"
                disabled={isSubmitting}
                onClick={closeModal}
                title="Închide"
                type="button"
              >
                <X aria-hidden="true" />
              </button>
              <button
                aria-label={actionLabels[selectedStatus]}
                className={`absence-motivation-actions__submit absence-motivation-actions__submit--${selectedStatus}`}
                disabled={isSubmitting}
                title={actionLabels[selectedStatus]}
                type="submit"
              >
                {selectedStatus === 'accepted' ? (
                  <Check aria-hidden="true" />
                ) : (
                  <X aria-hidden="true" />
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
