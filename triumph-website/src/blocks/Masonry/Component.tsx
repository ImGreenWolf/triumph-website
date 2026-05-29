'use client'
import type { StaticImageData } from 'next/image'

import { cn } from '@/utilities/ui'
import React from 'react'
import RichText from '@/components/RichText'

import type { MasonryBlock as MasonryBlockProps } from '@/payload-types'

import Masonry from './MasonyComponent'

type Props = MasonryBlockProps & {
 
}

export const MasonryBlock: React.FC<Props> = (props) => {
  const {
    media
  } = props

  return (
    <div className='container flex h-auto'>
      <Masonry
      animateFrom='random'
      colorShiftOnHover={true}
      items={
        media.map((media, i) => {return (typeof media != 'string') ? {img: media.url!, caption: media.alt!, height: media.height!, width: media.width!, id: media.filename! || i.toFixed(), url: media.url!} : null}).filter((el) => el != null)
      }
      />
    </div>
  )
}


