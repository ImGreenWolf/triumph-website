'use client'

import { useState } from 'react'

export default function LocationVisual(props: {
  alt: string
  photoURL?: string | null
}) {
  const { alt, photoURL } = props
  const [photoFailed, setPhotoFailed] = useState(false)
  const showPhoto = Boolean(photoURL && !photoFailed)

  if (!showPhoto) return null

  return (
    <div className="mb-4 aspect-[16/9] overflow-hidden rounded-xl bg-background/10">
      <img
        alt={alt}
        className="size-full object-cover"
        loading="lazy"
        onError={() => setPhotoFailed(true)}
        referrerPolicy="no-referrer"
        src={photoURL || ''}
      />
    </div>
  )
}
