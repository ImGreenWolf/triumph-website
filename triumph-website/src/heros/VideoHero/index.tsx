'use client'
import React from 'react'

import type { Page } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { Media } from '@/components/Media'
import RichText from '@/components/RichText'
import { ArrowBigDown, ArrowDown } from 'lucide-react'

export const VideoHero: React.FC<Page['hero']> = ({
  links,
  title,
  mediaVertical,
  mediaLandscape,
  richText,
}) => {
  return (
    <div className="relative b-0 text-text">
      <div className="container mb-8 z-10 max-h-[80vh] h-[75vh] overflow-hidden relative flex items-center justify-center text-shadow-lg">
        <div className="max-w-[36.5rem] md:text-center">
          <h1 className="text-[8em] leading-28 italic mb-8 text-primary">{title}</h1>
          {richText && (
            <RichText
              className="mb-6"
              data={richText}
              enableGutter={false}
              enableProse={false}
            />
          )}
          {Array.isArray(links) && links.length > 0 && (
            <ul className="flex md:justify-center gap-4">
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

      <div className="absolute w-full top-2/3 inset-0 overflow-hidden bg-linear-to-t from-black to-transparent z-2" >
          <ArrowDown className='absolute w-full bottom-8' stroke='white'/>
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
            resource={mediaLandscape}
          />
        )}
      </div>
    </div>
  )
}
