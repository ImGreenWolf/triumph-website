'use client'

import { Check, CheckCircle2, X, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type FormEvent, type MouseEvent, useEffect, useState } from 'react'

import { toast } from '@payloadcms/ui'
import type { DefaultCellComponentProps } from 'payload'

import './AbsenceMotivationActionsCell.scss'

type ReviewStatus = 'accepted' | 'rejected'

type ReviewActionsCellLabels = {
  acceptAction: string
  acceptedStatus: string
  errorMessage: string
  messageDescription: string
  messageLabel: string
  rejectAction: string
  rejectedStatus: string
  requiredMessage: string
  successMessage: string
}

type ReviewActionsCellConfig = {
  allowRejectAfterAccepted?: boolean
  acceptedStatus: string
  endpoint: string
  labels: ReviewActionsCellLabels
  messageFieldName: string
  pendingStatus: string
  rejectedStatus: string
  statusFieldName?: string
}

type ReviewActionsCellProps = DefaultCellComponentProps & {
  config: ReviewActionsCellConfig
}

export default function ReviewActionsCell({ config, rowData }: ReviewActionsCellProps) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<ReviewStatus | null>(null)
  const [visualStatus, setVisualStatus] = useState(String(rowData.status || config.pendingStatus))

  const isAccepted = visualStatus === config.acceptedStatus
  const isRejected = visualStatus === config.rejectedStatus
  const statusFieldName = config.statusFieldName || 'status'

  useEffect(() => {
    setVisualStatus(String(rowData.status || config.pendingStatus))
  }, [config.pendingStatus, rowData.status])

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

  const saveReview = async (status: ReviewStatus, reviewMessage?: string) => {
    const nextStatus = status === 'accepted' ? config.acceptedStatus : config.rejectedStatus

    setError('')
    setIsSubmitting(true)

    try {
      const response = await fetch(`${config.endpoint}/${rowData.id}`, {
        body: JSON.stringify({
          [config.messageFieldName]: reviewMessage,
          [statusFieldName]: nextStatus,
        }),
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'PATCH',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.errors?.[0]?.message || config.labels.errorMessage)
      }

      toast.success(config.labels.successMessage)
      setVisualStatus(nextStatus)
      setMessage('')
      setSelectedStatus(null)
      router.refresh()
    } catch (submitError) {
      const errorMessage =
        submitError instanceof Error ? submitError.message : config.labels.errorMessage

      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const acceptReview = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    await saveReview('accepted')
  }

  const submitReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    event.stopPropagation()

    const reviewMessage = message.trim()

    if (!reviewMessage) {
      setError(config.labels.requiredMessage)
      return
    }

    await saveReview('rejected', reviewMessage)
  }

  if (isAccepted && !config.allowRejectAfterAccepted) {
    return (
      <span
        aria-label={config.labels.acceptedStatus}
        className="absence-motivation-actions__status absence-motivation-actions__status--accepted"
        role="img"
        title={config.labels.acceptedStatus}
      >
        <CheckCircle2 aria-hidden="true" />
      </span>
    )
  }

  if (isRejected) {
    return (
      <span
        aria-label={config.labels.rejectedStatus}
        className="absence-motivation-actions__status absence-motivation-actions__status--rejected"
        role="img"
        title={config.labels.rejectedStatus}
      >
        <XCircle aria-hidden="true" />
      </span>
    )
  }

  return (
    <>
      <div className="absence-motivation-actions">
        {isAccepted ? (
          <span
            aria-label={config.labels.acceptedStatus}
            className="absence-motivation-actions__status absence-motivation-actions__status--accepted"
            role="img"
            title={config.labels.acceptedStatus}
          >
            <CheckCircle2 aria-hidden="true" />
          </span>
        ) : (
          <button
            aria-label={config.labels.acceptAction}
            className="absence-motivation-actions__button absence-motivation-actions__button--accepted"
            disabled={isSubmitting}
            onClick={acceptReview}
            title={config.labels.acceptAction}
            type="button"
          >
            <Check aria-hidden="true" />
          </button>
        )}
        <button
          aria-label={config.labels.rejectAction}
          className="absence-motivation-actions__button absence-motivation-actions__button--rejected"
          disabled={isSubmitting}
          onClick={openRejectModal}
          title={config.labels.rejectAction}
          type="button"
        >
          <X aria-hidden="true" />
        </button>
      </div>

      {selectedStatus && (
        <div
          aria-labelledby={`review-actions-${rowData.id}`}
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
                <h2 id={`review-actions-${rowData.id}`}>{config.labels.rejectAction}</h2>
                <p>{config.labels.messageDescription}</p>
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

            <label htmlFor={`review-actions-message-${rowData.id}`}>
              {config.labels.messageLabel}
            </label>
            <textarea
              autoFocus
              id={`review-actions-message-${rowData.id}`}
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
                aria-label={config.labels.rejectAction}
                className="absence-motivation-actions__submit absence-motivation-actions__submit--rejected"
                disabled={isSubmitting}
                title={config.labels.rejectAction}
                type="submit"
              >
                <X aria-hidden="true" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
