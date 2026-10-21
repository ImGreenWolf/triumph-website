import React from 'react'
import ServerRichText from '@/components/RichText/server'

import type { AccordionGallery as AccordionGalleryProps } from '@/payload-types'
import AccordtionBlock from '@/components/AccordionGallery'

export const AccordionGallery: React.FC<AccordionGalleryProps> = (props) => {
  const { introContent, items, showLabels, expandRatio } = props

  return (
    <section className="container">
      {introContent && (
        <ServerRichText
          className="block-intro mb-12 [&_h2]:text-3xl [&_h2]:leading-tight [&_h2]:md:text-5xl [&_p]:text-base [&_p]:text-foreground/80"
          data={introContent}
          enableGutter={false}
        />
      )}
      <AccordtionBlock
        height={560}
        accentColor="var(--accent)"
        showLabels={showLabels!}
        orientation="auto"
        expandRatio={expandRatio!}
        items={(items || []).flatMap((item) => {
          if (!item.image || typeof item.image !== 'object' || !item.image.url) return []
          return [{
            image: item.image.url,
            alt: item.image.alt || item.label || '',
            label: item.label!,
            link: item.link.type === 'reference' && typeof item.link.reference?.value === 'object' ? `${item.link.reference.relationTo === 'posts' ? '/posts' : ''}/${item.link.reference.value.slug}` : item.link.url || '',
          }]
        })}
      />
    </section>
  )
}
