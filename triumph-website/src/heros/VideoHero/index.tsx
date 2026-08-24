'use client'
import React, { useEffect, useState } from 'react'

import type { Page } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { Media } from '@/components/Media'
import RichText from '@/components/RichText'
import { ArrowDown } from 'lucide-react'

export const VideoHero: React.FC<Page['hero']> = ({
  links,
  title,
  mediaVertical,
  mediaLandscape,
  richText,
}) => {
  const [useVertical, setUseVertical] = useState(false)

  useEffect(() => {
    const updateVideoOrientation = () => {
      setUseVertical(window.innerWidth < 1024)
    }

    updateVideoOrientation()
    window.addEventListener('resize', updateVideoOrientation)

    return () => window.removeEventListener('resize', updateVideoOrientation)
  }, [])

  const selectedMedia = useVertical ? mediaVertical : mediaLandscape

  return (
    <div className="relative b-0 text-text -pt-24">
      <div className="container mb-8 z-10 max-h-[100vh] max-w-[36.5rem] flex-col h-[100vh] overflow-hidden relative flex text-center items-center justify-center text-shadow-lg">
        {title && title?.inputType == 'text' ? <h1 className="text-6xl w-3/4 lg:text-[8em] lg:leading-28 text-center italic mb-8 text-primary">
          {title.text}
        </h1> :
        <Media
        resource={title?.media}
        className='w-1/2'
        />
        }
        {richText && (
          <RichText
            className="mb-6"
            data={richText}
            enableGutter={false}
            enableProse={false}
          />
        )}
        {Array.isArray(links) && links.length > 0 && (
          <ul className="flex justify-center gap-4">
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

      <div className="absolute w-full top-2/3 inset-0 overflow-hidden bg-linear-to-t from-black to-transparent z-2">
        <ArrowDown className="absolute w-full bottom-8" stroke="white" />
      </div>

      <div className="select-none w-full absolute inset-0  h-full overflow-hidden">
        {selectedMedia && typeof selectedMedia === 'object' && (
          <Media
            fill
            videoClassName="-z-10 object-cover h-full w-full"
            className="h-full"
            priority
            resource={selectedMedia}
          />
        )}
      </div>
    </div>
  )
}
