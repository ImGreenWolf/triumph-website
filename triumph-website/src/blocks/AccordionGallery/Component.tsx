import React from 'react'
import ServerRichText from '@/components/RichText/server'

import type { AccordionGallery as AccordionGalleryProps } from '@/payload-types'
import AccordtionBlock from '@/components/AccordionGallery'

export const AccordionGallery: React.FC<AccordionGalleryProps> = (props) => {
  const { introContent, items, showLabels, oreintation, expandRatio } = props

  return (
    <section className="container my-16">
      {introContent && (
        <ServerRichText
          className="mx-auto mb-10 max-w-3xl text-center [&_h2]:text-3xl [&_h2]:leading-tight [&_h2]:md:text-5xl [&_p]:text-base [&_p]:leading-7 [&_p]:text-muted-foreground"
          data={introContent}
          enableGutter={false}
        />
      )}
      <AccordtionBlock
        accentColor="var(--accent)"
        showLabels={showLabels!}
        orientation={oreintation!}
        expandRatio={expandRatio!}
        items={items?.map((item) => {
          return {
            image: typeof item.image == 'object' ? item.image!.url! : item.image!,
            label: item.label!,
            link: item.link.url!,
          }
        })}
      />
    </section>
  )
}
