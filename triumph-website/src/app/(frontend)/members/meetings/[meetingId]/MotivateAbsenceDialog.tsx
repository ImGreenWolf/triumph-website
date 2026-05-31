'use client'

import { CalendarX2, Send, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type MotivationRequest = {
  memberMessage?: string | null
  secretaryMessage?: string | null
  status: 'accepted' | 'pending' | 'rejected'
}

type Props = {
  absenceCount: number
  absencePercentage: number
  attendancePercentage: number
  existingRequest?: MotivationRequest | null
  meetingId: string
}

const statusLabels: Record<MotivationRequest['status'], string> = {
  accepted: 'Motivare acceptată',
  pending: 'Motivare trimisă spre verificare',
  rejected: 'Motivare respinsă',
}

const statusClasses: Record<MotivationRequest['status'], string> = {
  accepted: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  pending: 'border-amber-200 bg-amber-50 text-amber-800',
  rejected: 'border-red-200 bg-red-50 text-red-800',
}

export default function MotivateAbsenceDialog(props: Props) {
  const {
    absenceCount,
    absencePercentage,
    attendancePercentage,
    existingRequest,
    meetingId,
  } = props
  const router = useRouter()
  const [error, setError] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [memberMessage, setMemberMessage] = useState(existingRequest?.memberMessage || '')
  const [request, setRequest] = useState(existingRequest)

  useEffect(() => {
    if (!isOpen) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isOpen])

  const submitMotivation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/absence-motivations', {
        body: JSON.stringify({
          meeting: meetingId,
          memberMessage: memberMessage.trim() || undefined,
        }),
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.errors?.[0]?.message || 'Motivarea nu a putut fi trimisă.')
      }

      setRequest({
        memberMessage: memberMessage.trim() || null,
        status: 'pending',
      })
      setIsOpen(false)
      router.refresh()
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Motivarea nu a putut fi trimisă.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#00a2e0]/10 text-[#00a2e0]">
            <CalendarX2 className="size-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Motivarea absenței</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Trimite o cerere secretarului dacă nu poți participa la această întâlnire.
            </p>
          </div>
        </div>

        {request ? (
          <div className={`mt-5 rounded-lg border px-4 py-3 text-sm ${statusClasses[request.status]}`}>
            <p className="font-semibold">{statusLabels[request.status]}</p>
            {request.secretaryMessage && <p className="mt-2 leading-6">{request.secretaryMessage}</p>}
          </div>
        ) : (
          <Button className="mt-5" onClick={() => setIsOpen(true)} type="button">
            Motivează absența
          </Button>
        )}
      </div>

      {isOpen && (
        <div
          aria-labelledby="motivate-absence-title"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0f172c]/70 p-4 backdrop-blur-sm"
          role="dialog"
        >
          <div className="w-full max-w-lg rounded-xl border border-border bg-background p-6 text-foreground shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold" id="motivate-absence-title">
                  Motivează absența
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Cererea va fi trimisă secretarului pentru verificare.
                </p>
              </div>
              <button
                aria-label="Închide"
                className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <Stat label="Absențe" value={absenceCount} />
              <Stat label="Procent absențe" value={`${absencePercentage}%`} />
              <Stat label="Prezență" value={`${attendancePercentage}%`} />
            </div>

            <form className="mt-6 space-y-5" onSubmit={submitMotivation}>
              <div className="space-y-2">
                <Label htmlFor="absence-message">Mesaj opțional</Label>
                <Textarea
                  id="absence-message"
                  maxLength={1000}
                  onChange={(event) => setMemberMessage(event.target.value)}
                  placeholder="Poți adăuga un scurt context pentru secretar."
                  rows={5}
                  value={memberMessage}
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button onClick={() => setIsOpen(false)} type="button" variant="outline">
                  Anulează
                </Button>
                <Button disabled={isSubmitting} type="submit">
                  {isSubmitting ? 'Se trimite...' : 'Trimite motivarea'}
                  {!isSubmitting && <Send className="size-4" />}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

function Stat(props: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3">
      <p className="text-xs leading-4 text-muted-foreground">{props.label}</p>
      <p className="mt-1 text-xl font-semibold">{props.value}</p>
    </div>
  )
}
