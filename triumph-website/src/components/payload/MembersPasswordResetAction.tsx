'use client'

import { ConfirmationModal, PopupList, toast, useModal, useSelection } from '@payloadcms/ui'
import { Mail } from 'lucide-react'

import './MembersPasswordResetAction.scss'

type PasswordResetResponse = {
  errors?: {
    email: string
    id: string
    message: string
  }[]
  message?: string
  sent?: {
    email: string
    id: string
  }[]
}

const modalSlug = 'send-selected-member-password-resets'

export default function MembersPasswordResetAction() {
  const { openModal } = useModal()
  const { count, getQueryParams, selectAll, selectedIDs, setSelection, toggleAll } = useSelection()
  const selectingAll = selectAll === 'allAvailable'

  const clearSelection = () => {
    if (selectAll === 'some') {
      selectedIDs.forEach((id) => setSelection(id))
      return
    }

    toggleAll()
  }

  const sendPasswordResets = async () => {
    try {
      const query = selectingAll ? getQueryParams() : ''
      const response = await fetch(`/api/users/send-password-reset${query}`, {
        body: JSON.stringify({
          all: selectingAll,
          ids: selectingAll ? [] : selectedIDs,
        }),
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })
      const data = (await response.json()) as PasswordResetResponse
      const sentCount = data.sent?.length ?? 0
      const errorCount = data.errors?.length ?? 0

      if (!response.ok) {
        toast.error(data.message || 'Password reset emails could not be sent.')
        return
      }

      if (sentCount > 0) {
        toast.success(`Sent ${sentCount} password reset email${sentCount === 1 ? '' : 's'}.`)
      }

      if (errorCount > 0) {
        toast.error(`${errorCount} password reset email${errorCount === 1 ? '' : 's'} failed.`)
      }

      clearSelection()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Password reset emails could not be sent.',
      )
    }
  }

  return (
    <>
      <PopupList.Button
        disabled={count === 0}
        id="send-selected-password-resets"
        onClick={() => openModal(modalSlug)}
      >
        <span className="members-password-reset-action">
          <Mail aria-hidden="true" size={15} strokeWidth={1.8} />
          Send password reset{count > 0 ? ` (${count})` : ''}
        </span>
      </PopupList.Button>

      <ConfirmationModal
        body={`This will send a new password reset link to ${count} selected user${count === 1 ? '' : 's'}. Any previous reset link for these users will stop working.`}
        confirmingLabel="Sending..."
        confirmLabel="Send reset emails"
        heading="Send password reset emails?"
        modalSlug={modalSlug}
        onConfirm={sendPasswordResets}
      />
    </>
  )
}
