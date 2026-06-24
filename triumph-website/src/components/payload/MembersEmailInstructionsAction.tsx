'use client'

import { ConfirmationModal, PopupList, toast, useModal, useSelection } from '@payloadcms/ui'
import { Mail } from 'lucide-react'

import type { User } from '@/payload-types'

import './MembersPasswordResetAction.scss'

type MailInstructionsUser = Pick<User, 'clubMail' | 'email' | 'id' | 'name'>

type SelectedUsersResponse = {
  message?: string
  users?: MailInstructionsUser[]
}

const modalSlug = 'send-selected-member-mail-instructions'

export default function MembersEmailInstructionsAction() {
  const { openModal } = useModal()
  const { count, getQueryParams, selectAll, selectedIDs } = useSelection()
  const selectingAll = selectAll === 'allAvailable'

  const fetchSelectedUsers = async () => {
    const query = selectingAll ? getQueryParams() : ''
    const response = await fetch(`/api/users/send-mail-instuctions${query}`, {
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
    const data = (await response.json()) as SelectedUsersResponse

    if (!response.ok) {
      throw new Error(data.message || 'Selected users could not be fetched.')
    }

    
  }



  return (
    <>
      <PopupList.Button
        disabled={count === 0}
        id="send-selected-mail-instructions"
        onClick={() => openModal(modalSlug)}
      >
        <span className="members-password-reset-action">
          <Mail aria-hidden="true" size={15} strokeWidth={1.8} />
          Send mail instructions{count > 0 ? ` (${count})` : ''}
        </span>
      </PopupList.Button>

      <ConfirmationModal
        body={`This will fetch ${count} selected user${count === 1 ? '' : 's'} for the mail instructions flow.`}
        confirmingLabel="Fetching..."
        confirmLabel="Fetch selected users"
        heading="Fetch selected users?"
        modalSlug={modalSlug}
        onConfirm={fetchSelectedUsers}
      />
    </>
  )
}
