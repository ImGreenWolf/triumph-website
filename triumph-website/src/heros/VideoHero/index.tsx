'use client'
import React from 'react'

import type { Media as MediaType, Page } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { Media } from '@/components/Media'
import RichText from '@/components/RichText'
import { ArrowDown } from 'lucide-react'

type VideoHeroTitle =
  | Page['hero']['title']
  | string
  | {
      inputType?: 'text' | 'media' | null
      media?: (string | null) | MediaType
      text?: string | null
    }

const renderTitle = (title: VideoHeroTitle) => {
  if (!title) {
    return null
  }

  if (typeof title === 'string') {
    return <h1 className="text-[8em] leading-28 italic mb-8 text-primary">{title}</h1>
  }

  if (title.inputType === 'media') {
    return title.media && typeof title.media === 'object' ? (
      <Media
        className="mx-auto mb-8 w-full max-w-[20rem]"
        imgClassName="mx-auto max-h-48 max-w-full object-contain"
        priority
        resource={title.media}
        videoClassName="mx-auto max-h-48 max-w-full object-contain"
      />
    ) : null
  }

  return title.text ? (
    <h1 className="text-[8em] leading-28 italic mb-8 text-primary">{title.text}</h1>
  ) : null
}

export const VideoHero: React.FC<Page['hero']> = ({
  links,
  title,
  mediaVertical,
  mediaLandscape,
  richText,
}) => {
  return (
    <div className="relative b-0 text-text">
      <div className="container mb-8 z-10 max-h-[80vh] h-[75vh] overflow-hidden relative flex items-center justify-left text-shadow-lg">
        <div className="max-w-[36.5rem] md:text-lft">
          {renderTitle(title)}
          {richText && (
            <RichText className="mb-6" data={richText} enableGutter={false} enableProse={false} />
          )}
          {Array.isArray(links) && links.length > 0 && (
            <ul className="flex md:justify-left gap-4">
              {links.map(({ link }, i) => {
                return (
                  <li key={i}>
                    <CMSLink {...link} />
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="absolute w-full top-2/3 inset-0 overflow-hidden bg-linear-to-t from-black to-transparent z-2">
        <ArrowDown className="absolute w-full bottom-8" stroke="white" />
      </div>

      <div className="select-none w-full absolute inset-0 h-full overflow-hidden">
        {mediaVertical && typeof mediaVertical === 'object' && (
          <Media
            fill
            videoClassName="-z-10 object-cover h-full w-full"
            className="md:hidden h-full"
            priority
            resource={mediaVertical}
          />
        )}
        {mediaLandscape && typeof mediaLandscape === 'object' && (
          <Media
            fill
            videoClassName="-z-10 object-cover h-full w-full"
            className="not-md:hidden h-full"
            priority
            // src={{src:`${mediaLandscape.url}`, height: 512, width: 512}}
            resource={mediaLandscape}
          />
        )}
      </div>
    </div>
  )
}
