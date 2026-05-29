import { cn } from '@/utilities/ui'
import React from 'react'
import RichText from '@/components/RichText'

import type { FullWidthBlock as FullWidthBlockProps } from '@/payload-types'

import { CMSLink } from '../../components/Link'
import { Media } from '@/components/Media'

export const FullWidthBlock: React.FC<FullWidthBlockProps> = (props) => {
  const { content,media } = props

  return (
    <div className="relative w-full my-32 min-h-200 grid lg:grid-cols-2 p-0 text-card! flex flex-col">
      <div className="relative z-2">
        <div className='h-full lg:rounded-e-[20] not-lg:rounded-t-[20] bg-primary lg:bg-primary/80 backdrop-blur-xl shadow-xl lg:-mr-10 not-lg:-mt-10 not-lg:mb-10 shadow-lg p-8 border-[#0194ce]/30 lg:border-r-1'>
        <RichText enableProse={false} enableGutter={false} className='z-1 px-8 relative lg:text-xl ' data={content}/>
        </div>
      </div>
      <Media className='not-lg:order-first lg:absolute inset-0 lg:my-10' imgClassName='object-cover h-full' resource={media}/>
      
    </div>
  )
}
