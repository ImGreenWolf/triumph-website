'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

import { CheckCircle2, ImagePlus, Lock, Send, Users, XCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type EventOption = {
  id: string
  name: string
}

type SelectedPhoto = {
  file: File
  preview: string
}

type SubmitState = {
  message: string
  type: 'error' | 'success'
}

export default function GalleryUploadForm(props: { events: EventOption[] }) {
  const { events } = props
  const router = useRouter()
  const [caption, setCaption] = useState('')
  const [eventId, setEventId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [photos, setPhotos] = useState<SelectedPhoto[]>([])
  const photosRef = useRef<SelectedPhoto[]>([])
  const [state, setState] = useState<SubmitState | null>(null)
  const [visibility, setVisibility] = useState<'private' | 'public'>('public')

  const visibilityOptions = useMemo(
    () => [
      {
        icon: Users,
        label: 'Galerie Publică',
        value: 'public' as const,
      },
      {
        icon: Lock,
        label: 'Galeria Membrilor',
        value: 'private' as const,
      },
    ],
    [],
  )

  useEffect(() => {
    photosRef.current = photos
  }, [photos])

  useEffect(() => {
    return () => {
      photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.preview))
    }
  }, [])

  function selectPhotos(files: FileList | null) {
    setState(null)
    if (!files) return

    const nextPhotos = Array.from(files).filter((file) => file.type.startsWith('image/'))

    if (!nextPhotos.length) {
      setState({ message: 'Momentan, putem accepta doar imagini.', type: 'error' })
      return
    }

    setPhotos((current) => [
      ...current,
      ...nextPhotos.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      })),
    ])
  }

  function removePhoto(index: number) {
    setPhotos((current) => {
      const photo = current[index]
      if (photo) URL.revokeObjectURL(photo.preview)

      return current.filter((_, photoIndex) => photoIndex !== index)
    })
  }

  async function submitPhotos(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setState(null)

    if (!photos.length) {
      setState({ message: 'Selectează cel puțin o imagine.', type: 'error' })
      return
    }

    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('caption', caption)
      formData.append('visibility', visibility)

      if (eventId) {
        formData.append('event', eventId)
      }

      photos.forEach((photo) => {
        formData.append('photos', photo.file)
      })

      const response = await fetch('/members/gallery/upload/submit', {
        body: formData,
        credentials: 'include',
        method: 'POST',
      })

      const data = (await response.json().catch(() => ({}))) as { message?: string }

      if (!response.ok) {
        throw new Error(data.message || 'Pozele selectate nu au putut fi procesate.')
      }

      photos.forEach((photo) => URL.revokeObjectURL(photo.preview))
      setCaption('')
      setEventId('')
      setPhotos([])
      setState({
        message:
          visibility === 'public'
            ? 'Pozele au fost trimise pentru verificare.'
            : 'Poze adaugate in galeria membrilor.',
        type: 'success',
      })
      router.refresh()
    } catch (error) {
      setState({
        message: error instanceof Error ? error.message : 'Pozele nu au putut fi încărcate.',
        type: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form
      className="rounded-lg border border-white/10 bg-white/[0.06] p-5 shadow-xl shadow-black/10"
      onSubmit={submitPhotos}
    >
      <div className="grid gap-6">
        <div className="grid gap-3">
          <Label className="text-white" htmlFor="photos">
            Photos
          </Label>
          <label
            className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-white/25 bg-white/[0.04] px-4 py-8 text-center transition hover:bg-white/[0.08]"
            htmlFor="photos"
          >
            <ImagePlus className="size-10 text-[#00a2e0]" />
            <span className="mt-4 text-sm font-semibold">Alege imagini</span>
            <input
              accept="image/*"
              className="sr-only"
              id="photos"
              multiple
              onChange={(event) => selectPhotos(event.target.files)}
              type="file"
            />
          </label>
        </div>

        {photos.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((photo, index) => (
              <div
                className="group relative aspect-square overflow-hidden rounded-md border border-white/10 bg-white/10"
                key={`${photo.file.name}-${photo.preview}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="" className="h-full w-full object-cover" src={photo.preview} />
                <button
                  aria-label="Remove photo"
                  className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-md bg-black/55 text-white opacity-100 transition hover:bg-black/75 sm:opacity-0 sm:group-hover:opacity-100"
                  onClick={() => removePhoto(index)}
                  type="button"
                >
                  <XCircle className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <fieldset className="grid gap-3">
          <legend className="text-sm font-medium">Alege Galeria</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {visibilityOptions.map((option) => (
              <button
                className={`flex min-h-16 items-center gap-3 rounded-md border px-4 text-left transition ${
                  visibility === option.value
                    ? 'border-[#00a2e0] bg-[#00a2e0]/15 text-white'
                    : 'border-white/15 bg-white/[0.04] text-white/75 hover:bg-white/[0.08]'
                }`}
                key={option.value}
                onClick={() => setVisibility(option.value)}
                type="button"
              >
                <option.icon className="size-5 shrink-0" />
                <span className="font-semibold">{option.label}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-2">
          <Label className="text-white" htmlFor="event">
            Eveniment
          </Label>
          <select
            className="h-11 rounded-md border border-white/15 bg-white px-3 text-sm text-[#0f172c] outline-none transition focus-visible:ring-4 focus-visible:ring-white/20"
            id="event"
            onChange={(event) => setEventId(event.target.value)}
            value={eventId}
          >
            <option value="">No event</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <Label className="text-white" htmlFor="caption">
            Caption
          </Label>
          <Textarea
            className="min-h-24 border-white/15 bg-white text-[#0f172c]"
            id="caption"
            maxLength={500}
            onChange={(event) => setCaption(event.target.value)}
            value={caption}
          />
        </div>

        {state && (
          <div
            className={`flex items-start gap-3 rounded-md border px-4 py-3 text-sm ${
              state.type === 'success'
                ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100'
                : 'border-red-300/30 bg-red-400/10 text-red-100'
            }`}
          >
            {state.type === 'success' ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            ) : (
              <XCircle className="mt-0.5 size-4 shrink-0" />
            )}
            <span>{state.message}</span>
          </div>
        )}

        <Button
          className="h-11 bg-white text-[#0f172c] hover:bg-white/90"
          disabled={isSubmitting}
          type="submit"
        >
          <Send className="size-4" />
          {isSubmitting ? 'Se încarcă...' : 'Trimite Pozele'}
        </Button>
      </div>
    </form>
  )
}
