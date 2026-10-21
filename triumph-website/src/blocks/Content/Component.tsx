import { cn } from '@/utilities/ui'
import React from 'react'
import ServerRichText from '@/components/RichText/server'

import type { ContentBlock as ContentBlockProps } from '@/payload-types'

import { CMSLink } from '../../components/Link'

export const ContentBlock: React.FC<ContentBlockProps> = (props) => {
  const { columns } = props

  const colsSpanClasses = {
    full: 'lg:col-span-12',
    half: 'md:col-span-6 lg:col-span-6',
    oneThird: 'md:col-span-6 lg:col-span-4',
    twoThirds: 'md:col-span-6 lg:col-span-8',
    twoThirdsCentered: 'lg:col-span-8 lg:col-start-3 text-center',
  }

  return (
    <section className="container">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-12 lg:gap-12">
        {columns &&
          columns.length > 0 &&
          columns.map((col, index) => {
            const { enableLink, link, richText, size, justifyText } = col

            return (
              <div
                className={cn('min-w-0 md:col-span-12', colsSpanClasses[size || 'full'], {
                  'text-justify': justifyText
                })}
                key={index}
              >
                {richText && <ServerRichText data={richText} enableGutter={false} />}

                {enableLink && <CMSLink className='mt-4' {...link} />}
              </div>
            )
          })}
      </div>
    </section>
  )
}
