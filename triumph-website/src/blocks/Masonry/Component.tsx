'use client'
import React from 'react'

import type { MasonryBlock as MasonryBlockProps } from '@/payload-types'

import Masonry from './MasonyComponent'

type Props = MasonryBlockProps & {
 
}

export const MasonryBlock: React.FC<Props> = (props) => {
  const {
    media
  } = props

  return (
    <div className='container min-w-0'>
      <Masonry
      columnProps={[3, 3, 2, 2, 1]}
      animateFrom='random'
      colorShiftOnHover={true}
      items={
        (media || []).map((media, i) => {return (media && typeof media === 'object' && media.url && media.mimeType?.startsWith('image/')) ? {img: media.url!, caption: media.alt!, height: media.height || 900, width: media.width || 1200, id: `${media.id || media.filename || i}-${i}`, url: media.url!} : null}).filter((el) => el != null)
      }
      />
    </div>
  )
}


