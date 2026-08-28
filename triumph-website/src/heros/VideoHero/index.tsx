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
        className='not-lg:mx-auto not-lg:max-w-100 w-full'
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
    <div className="relative b-0 text-text -pt-24 max-h-[100dvh] h-[100dvh] flex flex-col justify-center items-end">
      <div className='lg:container h-full flex align-right items-center justify-end mx-auto'>
        
        <div 
          className={cn("mb-8 z-10 overflow-hidden relative",
                    useVertical ? "flex flex-col text-center justify-center align-items-center h-2/3" :
                    "flex flex-col text-right items-end justify-center justify-items-end h-1/2 my-auto w-1/3 align-right text-shadow-lg",
                    
          )}
                    >
          <Title title={title}/>

          {richText && (
            <RichText
              className="mb-16 text-sm lg:text-md not-lg:mx-12"
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
                      className={cn('rounded-full transition-50 px-4 h-8 lg:h-10 lg:px-6 text-xs xl:text-base border border-accent ',
                        link.appearance == 'outline' && 'bg-foreground/25 text-primary backdrop-blur-xl ',
                      link.appearance != 'outline' && 'bg-accent text-primary hover:text-accent'
                      )
                         }
                      />
                  </li>
                )
              })}
            </ul>
          )}
        </div>

      </div>
      <div className="absolute w-full top-1/2 inset-0 overflow-hidden bg-linear-to-t lg:bg-radial-[at_100%_100%] from-black to-60% to-transparent z-2">
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
