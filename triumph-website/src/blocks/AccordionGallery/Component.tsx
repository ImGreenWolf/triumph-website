import { cn } from '@/utilities/ui'
import React from 'react'
import ServerRichText from '@/components/RichText/server'

import type { AccordionGallery as AccordionGalleryProps } from '@/payload-types'
import AccordtionBlock from '@/components/AccordionGallery'
import { CMSLink } from '../../components/Link'

export const AccordionGallery: React.FC<AccordionGalleryProps> = (props) => {
  const { items, showLabels, oreintation, expandRatio } = props


  return (
    <div className="container my-16">
      <AccordtionBlock
      accentColor='var(--accent)'
      showLabels={showLabels!}
      orientation={oreintation!}
      expandRatio={expandRatio!}
      items={items?.map((item) => {
        return {image: typeof item.image == 'object' ? item.image!.url! : item.image!, label: item.label!, link: item.link.url!}
      })}
      />
    </div>
  )
}
