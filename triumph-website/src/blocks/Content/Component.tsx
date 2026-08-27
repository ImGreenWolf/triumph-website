import { cn } from '@/utilities/ui'
import React from 'react'
import ServerRichText from '@/components/RichText/server'

import type { ContentBlock as ContentBlockProps } from '@/payload-types'

import { CMSLink } from '../../components/Link'

export const ContentBlock: React.FC<ContentBlockProps> = (props) => {
  const { columns } = props

  const colsSpanClasses = {
    full: '12',
    half: '6',
    oneThird: '4',
    twoThirds: '8',
    twoThirdsCentered: '',
  }

  return (
    <div className="container my-16">
      <div className="grid grid-cols-4 lg:grid-cols-12 gap-y-8 gap-x-16">
        {columns &&
          columns.length > 0 &&
          columns.map((col, index) => {
            const { enableLink, link, richText, size } = col

            return (
              <div
                className={cn(`col-span-4 lg:col-span-${colsSpanClasses[size!]}`, {
                  'md:col-span-2': size !== 'full' && size !== "twoThirdsCentered",
                  ' lg:col-start-3! lg:col-end-11! text-center': size == 'twoThirdsCentered'
                })}
                key={index}
              >
                {richText && <ServerRichText data={richText} enableGutter={false} />}

                {enableLink && <CMSLink className='mt-4' {...link} />}
              </div>
            )
          })}
      </div>
    </div>
  )
}
