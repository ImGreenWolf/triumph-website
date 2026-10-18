'use client'

import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import QRCode from 'react-qr-code'
import { QrCode, ScanQrCode, XIcon } from 'lucide-react'

import type { User } from '@/payload-types'
import { boardRoles } from '@/utilities/membersAccess'

type MemberCodeUser = Pick<User, 'email' | 'id' | 'name' | 'role'>

export default function MemberCodeActions({
  member,
  children,
}: {
  member: MemberCodeUser
  children: ReactNode
}) {
  const [isCodeOpen, setIsCodeOpen] = useState(false)
  return (
    <>
      <div
        data-dashboard-footer="meeting"
        className="flex items-center gap-2 border-t border-border px-5 py-4 sm:px-6"
      >
        <div className="h-10 min-w-0 flex-1">{children}</div>
        <button
          aria-label="Arată codul QR"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition hover:border-accent/40 hover:bg-accent/10 hover:text-accent"
          onClick={() => setIsCodeOpen(true)}
          title="Arată codul QR"
          type="button"
        >
          <QrCode className="size-4" />
        </button>
        {boardRoles.includes(member.role as (typeof boardRoles)[number]) && (
          <Link
            aria-label="Deschide scannerul de prezență"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition hover:border-accent/40 hover:bg-accent/10 hover:text-accent"
            href="/members/check-in"
            title="Scanner de prezență"
          >
            <ScanQrCode className="size-4" />
          </Link>
        )}
      </div>
      {isCodeOpen && <MemberCode member={member} onClose={() => setIsCodeOpen(false)} />}
    </>
  )
}

function MemberCode(props: { member: MemberCodeUser; onClose: () => void }) {
  const { member, onClose } = props
  const memberCodeUrl = getMemberCodeUrl(member.id)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm">
      <div
        aria-labelledby="member-qr-title"
        aria-modal="true"
        className="relative w-full max-w-sm rounded-lg border border-border bg-card p-6 text-card-foreground shadow-2xl sm:p-8"
        role="dialog"
      >
        <button
          aria-label="Închide codul QR"
          className="absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
          onClick={onClose}
          type="button"
        >
          <XIcon className="size-5" />
        </button>

        <div className="pr-10">
          <p className="text-sm font-semibold text-muted-foreground">Prezență la întâlnire</p>
          <h2 id="member-qr-title" className="mt-1 text-2xl font-semibold">
            Codul tău QR
          </h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Prezintă acest cod operatorului pentru a-ți înregistra prezența.
        </p>

        <div className="my-6 rounded-md border border-border bg-white p-5">
          <QRCode className="h-auto w-full" value={memberCodeUrl} />
        </div>

        <p className="border-t border-border pt-4 text-sm font-medium text-muted-foreground">
          {member.name || member.email}
        </p>
      </div>
    </div>
  )
}

function getMemberCodeUrl(memberId: User['id']) {
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL?.replace(/\/$/, '') || ''

  return `${serverUrl}/members/checkin?member=${encodeURIComponent(String(memberId))}`
}
