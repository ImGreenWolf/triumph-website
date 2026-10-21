import type { StaticImageData } from 'next/image'

import { cn } from '@/utilities/ui'
import React from 'react'
import RichText from '@/components/RichText'

import type { MediaBlock as MediaBlockProps } from '@/payload-types'

import { Media } from '../../components/Media'

type Props = MediaBlockProps & {
  breakout?: boolean
  captionClassName?: string
  className?: string
  enableGutter?: boolean
  imgClassName?: string
  staticImage?: StaticImageData
  disableInnerContainer?: boolean
}

export const MediaBlock: React.FC<Props> = (props) => {
  const {
    captionClassName,
    className,
    enableGutter = true,
    imgClassName,
    media,
    staticImage,
    disableInnerContainer,
  } = props

  let caption
  if (media && typeof media === 'object') caption = media.caption

  return (
    <figure
      className={cn(
        '',
        {
          container: enableGutter,
        },
        className,
      )}
    >
      {((media && typeof media === 'object' && media.url) || staticImage) && (
        <Media
          imgClassName={cn('h-auto w-full rounded-xl', imgClassName)}
          resource={media}
          src={staticImage}
        />
      )}
      {caption && media && typeof media === 'object' && media.url && (
        <figcaption
          className={cn(
            'mt-5 border-t border-foreground/20 pt-4 text-sm leading-6 text-foreground/80',
            {
              container: !disableInnerContainer,
            },
            captionClassName,
          )}
        >
          <RichText data={caption} enableProse={false} enableGutter={false} />
        </figcaption>
      )}
    </figure>
  )
}
