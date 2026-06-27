import type { WidgetServerProps } from 'payload'

import type { GalleryPhoto, User } from '@/payload-types'

import { CompactTable, StatGrid, StatItem, WidgetCard } from './shared'
import { formatDateTime, formatNumber } from './widgetUtils'

function getUploaderName(photo: GalleryPhoto) {
  const uploader = photo.uploadedBy

  if (uploader && typeof uploader === 'object') {
    return (uploader as User).name || (uploader as User).email || 'Member'
  }

  return 'Member'
}

export default async function GallerySubmissionWidget({ req }: WidgetServerProps) {
  const { payload } = req
  const [pending, approved, rejected, publicPhotos, privatePhotos, latestPending] =
    await Promise.all([
      payload.count({
        collection: 'gallery-photos',
        where: {
          status: {
            equals: 'pending',
          },
        },
      }),
      payload.count({
        collection: 'gallery-photos',
        where: {
          status: {
            equals: 'approved',
          },
        },
      }),
      payload.count({
        collection: 'gallery-photos',
        where: {
          status: {
            equals: 'rejected',
          },
        },
      }),
      payload.count({
        collection: 'gallery-photos',
        where: {
          visibility: {
            equals: 'public',
          },
        },
      }),
      payload.count({
        collection: 'gallery-photos',
        where: {
          visibility: {
            equals: 'private',
          },
        },
      }),
      payload.find({
        collection: 'gallery-photos',
        depth: 1,
        limit: 5,
        sort: '-submittedAt',
        where: {
          status: {
            equals: 'pending',
          },
        },
      }),
    ])
  const pendingPhotos = latestPending.docs as GalleryPhoto[]

  return (
    <WidgetCard
      actionHref="/admin/collections/gallery-photos"
      actionLabel="Review"
      eyebrow="Galerie"
      title="Submisii Galerie"
    >
      <StatGrid>
        <StatItem
          label="În așteptare"
          tone={pending.totalDocs > 0 ? 'warning' : undefined}
          value={formatNumber(pending.totalDocs)}
        />
        <StatItem label="Acceptate" value={formatNumber(approved.totalDocs)} />
        <StatItem label="Respinse" tone="danger" value={formatNumber(rejected.totalDocs)} />
        <StatItem
          helper={`${formatNumber(privatePhotos.totalDocs)} private`}
          label="Poze Publice"
          value={formatNumber(publicPhotos.totalDocs)}
        />
      </StatGrid>
      <CompactTable
        emptyLabel="Nu exista poze care necesită verificare."
        rows={pendingPhotos.map((photo) => ({
          href: `/admin/collections/gallery-photos/${photo.id}`,
          label: getUploaderName(photo),
          meta: formatDateTime(photo.submittedAt || photo.createdAt),
          value: photo.visibility,
        }))}
      />
    </WidgetCard>
  )
}
