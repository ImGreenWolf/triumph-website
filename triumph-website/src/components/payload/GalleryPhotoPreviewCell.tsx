'use client'

import { useEffect, useState, type FocusEvent, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'

import { useConfig, useListRelationships } from '@payloadcms/ui'
import type { DefaultCellComponentProps } from 'payload'

import type { Media } from '@/payload-types'
import { getMediaUrl } from '@/utilities/getMediaUrl'

import './GalleryPhotoPreviewCell.scss'

type PreviewPosition = {
  left: number
  top: number
}

export default function GalleryPhotoPreviewCell({ cellData }: DefaultCellComponentProps) {
  const mediaId = getMediaId(cellData)
  const { config } = useConfig()
  const { documents, getRelationships } = useListRelationships()
  const mediaDocument = mediaId ? documents.media?.[mediaId] : undefined
  const [previewPosition, setPreviewPosition] = useState<PreviewPosition | null>(null)

  useEffect(() => {
    if (mediaId && mediaDocument === undefined) {
      getRelationships([{ relationTo: 'media', value: mediaId }])
    }
  }, [getRelationships, mediaDocument, mediaId])

  const media = mediaDocument && typeof mediaDocument === 'object' ? (mediaDocument as Media) : null
  const thumbnailUrl = media
    ? getMediaUrl(media.sizes?.thumbnail?.url || media.thumbnailURL || media.url, media.updatedAt)
    : ''
  const previewUrl = media
    ? getMediaUrl(media.sizes?.medium?.url || media.sizes?.small?.url || media.url, media.updatedAt)
    : ''

  const showPreview = (target: HTMLElement) => {
    if (!previewUrl) return

    const rect = target.getBoundingClientRect()
    const gap = 12
    const padding = 12
    const previewWidth = Math.min(420, window.innerWidth - padding * 2)
    const previewHeight = Math.min(315, window.innerHeight - padding * 2)
    const left = Math.min(
      Math.max(padding, rect.left + rect.width / 2 - previewWidth / 2),
      window.innerWidth - previewWidth - padding,
    )
    const fitsBelow = rect.bottom + gap + previewHeight <= window.innerHeight - padding
    const top = fitsBelow ? rect.bottom + gap : Math.max(padding, rect.top - gap - previewHeight)

    setPreviewPosition({ left, top })
  }

  const handleMouseEnter = (event: MouseEvent<HTMLAnchorElement>) => {
    showPreview(event.currentTarget)
  }

  const handleFocus = (event: FocusEvent<HTMLAnchorElement>) => {
    showPreview(event.currentTarget)
  }

  return (
    <>
      <a
        aria-label={`Editeaza ${media?.alt || media?.filename || 'fotografia'}`}
        className="gallery-photo-preview-cell"
        href={mediaId ? `${config.routes.admin}/collections/media/${mediaId}` : undefined}
        onBlur={() => setPreviewPosition(null)}
        onFocus={handleFocus}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setPreviewPosition(null)}
        title="Editeaza fotografia"
      >
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="" src={thumbnailUrl} />
        ) : (
          <span>Se incarca...</span>
        )}
      </a>

      {previewPosition && previewUrl
        ? createPortal(
            <div aria-hidden className="gallery-photo-preview-popup" style={previewPosition}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" src={previewUrl} />
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

function getMediaId(value: unknown) {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (!value || typeof value !== 'object') return null

  if ('value' in value && (typeof value.value === 'string' || typeof value.value === 'number')) {
    return String(value.value)
  }

  if ('id' in value && (typeof value.id === 'string' || typeof value.id === 'number')) {
    return String(value.id)
  }

  return null
}
