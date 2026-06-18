'use client'

import { useRouter } from 'next/navigation'
import { type DragEvent, type FormEvent, useEffect, useMemo, useRef, useState } from 'react'

import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ImagePlus,
  Images,
  Lock,
  Send,
  Trash2,
  Users,
  X,
  XCircle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type EventOption = {
  id: string
  name: string
}

type PhotoVisibility = 'private' | 'public'

type SelectedPhoto = {
  caption: string
  detailsOpen: boolean
  eventId: string
  file: File
  id: string
  isHEIF: boolean
  preview: string
  selected: boolean
  visibility: PhotoVisibility
}

type EditablePhotoFields = Pick<
  SelectedPhoto,
  'caption' | 'detailsOpen' | 'eventId' | 'selected' | 'visibility'
>

type SubmitState = {
  message: string
  type: 'error' | 'success'
}

const ACCEPTED_IMAGE_TYPES =
  'image/jpeg,image/png,image/webp,image/avif,image/gif,image/tiff,image/heic,image/heif,.heic,.heif,.hif'
const HEIF_EXTENSIONS = ['.heic', '.heif', '.hif']
const HEIF_MIME_TYPES = new Set([
  'image/heic',
  'image/heic-sequence',
  'image/heif',
  'image/heif-sequence',
])
const SUPPORTED_IMAGE_EXTENSIONS = [
  '.avif',
  '.gif',
  '.heic',
  '.heif',
  '.hif',
  '.jpeg',
  '.jpg',
  '.png',
  '.tif',
  '.tiff',
  '.webp',
]
const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  'image/avif',
  'image/gif',
  'image/heic',
  'image/heic-sequence',
  'image/heif',
  'image/heif-sequence',
  'image/jpeg',
  'image/png',
  'image/tiff',
  'image/webp',
])

export default function GalleryUploadForm(props: { events: EventOption[] }) {
  const { events } = props
  const router = useRouter()
  const dragDepth = useRef(0)
  const photosRef = useRef<SelectedPhoto[]>([])
  const [bulkEvent, setBulkEvent] = useState('')
  const [bulkVisibility, setBulkVisibility] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [photos, setPhotos] = useState<SelectedPhoto[]>([])
  const [state, setState] = useState<SubmitState | null>(null)

  const selectedCount = useMemo(
    () => photos.reduce((count, photo) => count + Number(photo.selected), 0),
    [photos],
  )
  const eventNames = useMemo(() => new Map(events.map((event) => [event.id, event.name])), [events])
  const allSelected = photos.length > 0 && selectedCount === photos.length

  useEffect(() => {
    photosRef.current = photos
  }, [photos])

  useEffect(() => {
    return () => {
      photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.preview))
    }
  }, [])

  function addPhotos(files: FileList | File[]) {
    setState(null)

    const selectedFiles = Array.from(files)
    const supportedFiles = selectedFiles.filter(isSupportedImage)

    if (!supportedFiles.length) {
      setState({
        message: 'Momentan, putem accepta JPEG, PNG, WebP, AVIF, GIF, TIFF sau HEIC.',
        type: 'error',
      })
      return
    }

    if (supportedFiles.length !== selectedFiles.length) {
      setState({
        message: 'Unele fișiere nu au fost adăugate deoarece formatul nu este acceptat.',
        type: 'error',
      })
    }

    setPhotos((current) => [
      ...current,
      ...supportedFiles.map((file) => ({
        caption: '',
        detailsOpen: false,
        eventId: '',
        file,
        id: createPhotoID(),
        isHEIF: isHEIFImage(file),
        preview: URL.createObjectURL(file),
        selected: false,
        visibility: 'public' as const,
      })),
    ])
  }

  function updatePhoto(photoID: string, updates: Partial<EditablePhotoFields>) {
    setPhotos((current) =>
      current.map((photo) => (photo.id === photoID ? { ...photo, ...updates } : photo)),
    )
  }

  function updateSelectedPhotos(updates: Partial<EditablePhotoFields>) {
    setPhotos((current) =>
      current.map((photo) => (photo.selected ? { ...photo, ...updates } : photo)),
    )
  }

  function removePhoto(photoID: string) {
    setPhotos((current) => {
      const photo = current.find((item) => item.id === photoID)
      if (photo) URL.revokeObjectURL(photo.preview)

      return current.filter((item) => item.id !== photoID)
    })
  }

  function toggleAllPhotos(checked: boolean) {
    setPhotos((current) => current.map((photo) => ({ ...photo, selected: checked })))
  }

  function applyBulkEvent(value: string) {
    setBulkEvent(value)
    if (!value || !selectedCount) return

    updateSelectedPhotos({ eventId: value === '__none' ? '' : value })
    setBulkEvent('')
  }

  function applyBulkVisibility(value: string) {
    setBulkVisibility(value)
    if ((value !== 'private' && value !== 'public') || !selectedCount) return

    updateSelectedPhotos({ visibility: value })
    setBulkVisibility('')
  }

  function handleDragEnter(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    dragDepth.current += 1
    setIsDragging(true)
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setIsDragging(false)
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    dragDepth.current = 0
    setIsDragging(false)
    addPhotos(event.dataTransfer.files)
  }

  async function submitPhotos(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setState(null)

    if (!photos.length) {
      setState({ message: 'Selectează cel puțin o imagine.', type: 'error' })
      return
    }

    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append(
        'photoMetadata',
        JSON.stringify(
          photos.map((photo) => ({
            caption: photo.caption,
            event: photo.eventId,
            visibility: photo.visibility,
          })),
        ),
      )

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
      setBulkEvent('')
      setBulkVisibility('')
      setPhotos([])
      setState({
        message: data.message || 'Pozele au fost încărcate.',
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
            Poze
          </Label>
          <label
            className={`flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 py-8 text-center transition ${
              isDragging
                ? 'border-[#00a2e0] bg-[#00a2e0]/15'
                : 'border-white/25 bg-white/[0.04] hover:bg-white/[0.08]'
            }`}
            htmlFor="photos"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <ImagePlus className="size-10 text-[#00a2e0]" />
            <span className="mt-4 text-sm font-semibold">
              {isDragging ? 'Eliberează pozele' : 'Alege sau trage pozele aici'}
            </span>
            <input
              accept={ACCEPTED_IMAGE_TYPES}
              className="sr-only"
              id="photos"
              multiple
              onChange={(event) => {
                if (event.target.files) addPhotos(event.target.files)
                event.target.value = ''
              }}
              type="file"
            />
          </label>
        </div>

        {photos.length > 0 && (
          <>
            <section className="border-y border-white/10 py-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    aria-label="Selectează toate pozele"
                    checked={allSelected ? true : selectedCount > 0 ? 'indeterminate' : false}
                    className="border-white/35 data-[state=checked]:border-[#00a2e0] data-[state=checked]:bg-[#00a2e0]"
                    onCheckedChange={(checked) => toggleAllPhotos(checked === true)}
                  />
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {selectedCount} din {photos.length} selectate
                    </p>
                    <button
                      className="mt-1 text-xs font-semibold text-[#00a2e0] hover:text-[#40bce9]"
                      onClick={() => toggleAllPhotos(!allSelected)}
                      type="button"
                    >
                      {allSelected ? 'Deselectează toate' : 'Selectează toate'}
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:w-[34rem]">
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-white/70" htmlFor="bulk-event">
                      Eveniment pentru selecție
                    </Label>
                    <select
                      className="h-10 rounded-md border border-white/15 bg-white px-3 text-sm text-[#0f172c] outline-none transition focus-visible:ring-4 focus-visible:ring-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!selectedCount}
                      id="bulk-event"
                      onChange={(event) => applyBulkEvent(event.target.value)}
                      value={bulkEvent}
                    >
                      <option value="">Alege evenimentul</option>
                      <option value="__none">Fără eveniment</option>
                      {events.map((event) => (
                        <option key={event.id} value={event.id}>
                          {event.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-1.5">
                    <Label className="text-xs text-white/70" htmlFor="bulk-visibility">
                      Galerie pentru selecție
                    </Label>
                    <select
                      className="h-10 rounded-md border border-white/15 bg-white px-3 text-sm text-[#0f172c] outline-none transition focus-visible:ring-4 focus-visible:ring-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!selectedCount}
                      id="bulk-visibility"
                      onChange={(event) => applyBulkVisibility(event.target.value)}
                      value={bulkVisibility}
                    >
                      <option value="">Alege galeria</option>
                      <option value="public">Publică</option>
                      <option value="private">Doar membri</option>
                    </select>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {photos.map((photo, index) => (
                <article
                  className={`relative overflow-visible rounded-lg border bg-white/[0.04] transition ${
                    photo.detailsOpen ? 'z-40' : 'z-0'
                  } ${photo.selected ? 'border-[#00a2e0]' : 'border-white/10'}`}
                  key={photo.id}
                >
                  <div className="relative aspect-square overflow-hidden rounded-t-[7px] bg-white/10">
                    {photo.isHEIF ? (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center text-white">
                        <Images className="size-8 text-[#00a2e0]" />
                        <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                          HEIC
                        </span>
                        <span className="max-w-[80%] truncate text-xs text-white/70">
                          {photo.file.name}
                        </span>
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt="" className="h-full w-full object-cover" src={photo.preview} />
                    )}

                    <div className="absolute left-2 top-2 flex items-center gap-1.5">
                      <Checkbox
                        aria-label={`Selectează poza ${index + 1}`}
                        checked={photo.selected}
                        className="size-5 border-white/70 bg-black/45 data-[state=checked]:border-[#00a2e0] data-[state=checked]:bg-[#00a2e0]"
                        onCheckedChange={(checked) =>
                          updatePhoto(photo.id, { selected: checked === true })
                        }
                      />
                      <span className="rounded bg-black/55 px-1.5 py-0.5 text-xs font-semibold text-white">
                        {index + 1}
                      </span>
                    </div>

                    <button
                      aria-label="Șterge poza"
                      className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-md bg-black/55 text-white transition hover:bg-red-600"
                      onClick={() => removePhoto(photo.id)}
                      title="Șterge poza"
                      type="button"
                    >
                      <Trash2 className="size-4" />
                    </button>

                    <div className="pointer-events-none absolute inset-x-2 bottom-2 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-white/20 bg-[#0f172c]/55 px-2.5 text-[11px] font-semibold text-white shadow-sm backdrop-blur-md backdrop-saturate-150">
                        {photo.visibility === 'private' ? (
                          <Lock className="size-3" />
                        ) : (
                          <Users className="size-3" />
                        )}
                        {photo.visibility === 'private' ? 'Membri' : 'Publică'}
                      </span>

                      {photo.eventId && (
                        <span className="inline-flex h-7 min-w-0 max-w-full items-center gap-1.5 rounded-full border border-white/20 bg-[#0f172c]/55 px-2.5 text-[11px] font-semibold text-white shadow-sm backdrop-blur-md backdrop-saturate-150">
                          <CalendarDays className="size-3 shrink-0" />
                          <span className="truncate">
                            {eventNames.get(photo.eventId) || 'Eveniment'}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex h-11 items-center gap-2 border-t border-white/10 px-3">
                    <span
                      className="min-w-0 flex-1 truncate text-xs text-white/70"
                      title={photo.file.name}
                    >
                      {photo.file.name}
                    </span>
                    <button
                      aria-controls={`photo-details-${photo.id}`}
                      aria-expanded={photo.detailsOpen}
                      aria-label={photo.detailsOpen ? 'Închide detaliile' : 'Editează detaliile'}
                      className={`relative inline-flex size-8 shrink-0 items-center justify-center rounded-md border transition ${
                        photo.detailsOpen
                          ? 'border-[#00a2e0] bg-[#00a2e0]/15 text-white'
                          : 'border-white/15 text-white/70 hover:bg-white/[0.08] hover:text-white'
                      }`}
                      onClick={() => updatePhoto(photo.id, { detailsOpen: !photo.detailsOpen })}
                      title={photo.detailsOpen ? 'Închide detaliile' : 'Editează detaliile'}
                      type="button"
                    >
                      <ChevronDown
                        className={`size-4 transition-transform ${
                          photo.detailsOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {photo.detailsOpen && (
                    <div
                      className="absolute inset-x-0 top-[calc(100%-2.75rem)] z-40 mt-1 grid max-h-80 content-start gap-3 overflow-y-auto overscroll-contain rounded-lg border border-white/15 bg-[#0f172c]/95 p-3 shadow-2xl backdrop-blur-xl"
                      id={`photo-details-${photo.id}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase text-white/75">
                          Detalii poză
                        </p>
                        <button
                          aria-label="Închide detaliile"
                          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-white/15 text-white/75 transition hover:bg-white/10 hover:text-white"
                          onClick={() => updatePhoto(photo.id, { detailsOpen: false })}
                          title="Închide detaliile"
                          type="button"
                        >
                          <X className="size-4" />
                        </button>
                      </div>

                      <div className="grid gap-1.5">
                        <Label className="text-xs text-white/75" htmlFor={`caption-${photo.id}`}>
                          Descriere
                        </Label>
                        <Textarea
                          className="min-h-16 border-white/15 bg-white text-sm text-[#0f172c]"
                          id={`caption-${photo.id}`}
                          maxLength={500}
                          onChange={(event) =>
                            updatePhoto(photo.id, { caption: event.target.value })
                          }
                          value={photo.caption}
                        />
                      </div>

                      <div className="grid gap-1.5">
                        <Label className="text-xs text-white/75" htmlFor={`event-${photo.id}`}>
                          Eveniment
                        </Label>
                        <select
                          className="h-9 min-w-0 rounded-md border border-white/15 bg-white px-2 text-xs text-[#0f172c] outline-none transition focus-visible:ring-4 focus-visible:ring-white/20"
                          id={`event-${photo.id}`}
                          onChange={(event) =>
                            updatePhoto(photo.id, { eventId: event.target.value })
                          }
                          value={photo.eventId}
                        >
                          <option value="">Fără eveniment</option>
                          {events.map((event) => (
                            <option key={event.id} value={event.id}>
                              {event.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <fieldset className="grid gap-1.5">
                        <legend className="text-xs font-medium text-white/75">Galerie</legend>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            aria-pressed={photo.visibility === 'public'}
                            className={`flex h-9 items-center justify-center gap-1.5 rounded-md border px-2 text-xs font-semibold transition ${
                              photo.visibility === 'public'
                                ? 'border-[#00a2e0] bg-[#00a2e0]/15 text-white'
                                : 'border-white/15 text-white/70 hover:bg-white/[0.08]'
                            }`}
                            onClick={() => updatePhoto(photo.id, { visibility: 'public' })}
                            type="button"
                          >
                            <Users className="size-3.5" />
                            Publică
                          </button>
                          <button
                            aria-pressed={photo.visibility === 'private'}
                            className={`flex h-9 items-center justify-center gap-1.5 rounded-md border px-2 text-xs font-semibold transition ${
                              photo.visibility === 'private'
                                ? 'border-[#00a2e0] bg-[#00a2e0]/15 text-white'
                                : 'border-white/15 text-white/70 hover:bg-white/[0.08]'
                            }`}
                            onClick={() => updatePhoto(photo.id, { visibility: 'private' })}
                            type="button"
                          >
                            <Lock className="size-3.5" />
                            Membri
                          </button>
                        </div>
                      </fieldset>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </>
        )}

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
          disabled={isSubmitting || !photos.length}
          type="submit"
        >
          <Send className="size-4" />
          {isSubmitting
            ? 'Se încarcă...'
            : photos.length
              ? `Trimite ${photos.length} ${photos.length === 1 ? 'Poză' : 'Poze'}`
              : 'Trimite Pozele'}
        </Button>
      </div>
    </form>
  )
}

function createPhotoID() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`
}

function isSupportedImage(file: File) {
  if (SUPPORTED_IMAGE_MIME_TYPES.has(file.type)) return true

  const fileName = file.name.toLowerCase()
  return SUPPORTED_IMAGE_EXTENSIONS.some((extension) => fileName.endsWith(extension))
}

function isHEIFImage(file: File) {
  if (HEIF_MIME_TYPES.has(file.type)) return true

  const fileName = file.name.toLowerCase()
  return HEIF_EXTENSIONS.some((extension) => fileName.endsWith(extension))
}
