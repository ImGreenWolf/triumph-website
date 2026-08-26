'use client'
import React, { useEffect, useState } from 'react'

import type { Page } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { Media } from '@/components/Media'
import RichText from '@/components/RichText'
import { ArrowDown } from 'lucide-react'
import { cn } from '@/utilities/ui'

function Title({title}: any) {
  return (
    <>
    {title && title?.inputType == 'text' ? <h1 className="text-6xl w-3/4 lg:text-[8em] lg:leading-28 text-center italic mb-8 text-primary">
          {title.text}
        </h1> :
        <Media
        resource={title?.media}
        className=' md:-mx-12 -my-8'
        />
        }
      </>
  )
}

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
    <div className="relative b-0 text-text -pt-24 max-h-[100vh] h-[100vh] flex flex-col justify-center items-end">
      <div 
        className={cn("mx-24 mb-8 z-10 overflow-hidden relative",
                  useVertical ? "flex flex-col justify-center align-items-center h-2/3" :
                  "grid text-right items-center justify-items-end h-1/3 w-1/3 align-right text-shadow-lg",
                  
        )}
                  >
        <Title title={title}/>

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
                  <CMSLink {...link}
                    className={cn('rounded-full px-6 border border-accent ',
                      link.appearance == 'outline' && 'bg-foreground/25 text-primary backdrop-blur-xl')}
                    />
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="absolute w-full top-2/3 inset-0 overflow-hidden bg-linear-to-t from-black to-transparent z-2">
        <ArrowDown className="absolute w-full bottom-8" stroke="white" />
      </div>

      <div className="select-none w-full absolute inset-0  h-full overflow-hidden bg-popover">
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
