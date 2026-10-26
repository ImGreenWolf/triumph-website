import React, { Fragment } from 'react'
import { BlockReveal } from './BlockReveal.client'

import type { Page } from '@/payload-types'

import { ArchiveBlock } from '@/blocks/ArchiveBlock/Component'
import { CallToActionBlock } from '@/blocks/CallToAction/Component'
import { ContentBlock } from '@/blocks/Content/Component'
import { FormBlock } from '@/blocks/Form/Component'
import { MediaBlock } from '@/blocks/MediaBlock/Component'
import { TeamBlock } from '@/blocks/TeamBlock/Component'
import { MasonryBlock } from './Masonry/Component'
import { EventsBlock } from './EventsBlock/Component'

import {
  FeatureGridBlock,
  LogoCloudBlock,
  ProcessBlock,
  SectionIntroBlock,
  SectionTitleBlock,
  SplitMediaBlock,
  StatsBlock,
  TestimonialBlock,
} from './HomepageBlocks/Component'
import { LogoLoopBlock } from './LogoLoop/Component'
import { FullWidthBlock } from './FullWidthBlock/Component'
import { AboutUsBlock } from './AboutUs/Component'
import { TriumphIntroBlock } from './TriumphIntro/Component'
import { InteractIntroBlock } from './InteractIntro/Component'
import { DownloadFilesBlock } from './DownloadBlock/Component'
import { TimelineBlock } from './TimelineHistory/Component'
import { ContactBlock } from './ContactBlock/Component'
import { FAQBlock } from './FAQBlock/Component'
import { TextLoopBlock } from './TextLoop/Component'
import { AccordionGallery } from './AccordionGallery/Component'
import { ScrollingGallery } from './ScrollingGallery/Component'
import './blocks.css'
import { HomepageEventsBlockComponent } from './HomepageEvents/Component'
const blockComponents: Partial<
  Record<Page['layout'][number]['blockType'], React.ComponentType<any>>
> = {
  archive: ArchiveBlock,
  content: ContentBlock,
  cta: CallToActionBlock,
  formBlock: FormBlock,
  mediaBlock: MediaBlock,
  teamBlock: TeamBlock,
  masonryBlock: MasonryBlock,
  eventsBlock: EventsBlock,
  homepageEvents: HomepageEventsBlockComponent,
  sectionIntro: SectionIntroBlock,
  featureGrid: FeatureGridBlock,
  statsBlock: StatsBlock,
  splitMediaBlock: SplitMediaBlock,
  processBlock: ProcessBlock,
  testimonialBlock: TestimonialBlock,
  faqBlock: FAQBlock,
  logoCloudBlock: LogoCloudBlock,
  logoLoopBlock: LogoLoopBlock,
  sectionTitle: SectionTitleBlock,
  fullWidthBlock: FullWidthBlock,
  aboutUs: AboutUsBlock,
  triumphIntro: TriumphIntroBlock,
  interactIntro: InteractIntroBlock,
  downloadFiles: DownloadFilesBlock,
  eventTimeline: TimelineBlock,
  contactBlock: ContactBlock,
  textLoop: TextLoopBlock,
  accordionGallery: AccordionGallery,
  scrollingGallery: ScrollingGallery,
}

export const RenderBlocks: React.FC<{
  blocks: Page['layout'][0][]
}> = (props) => {
  const { blocks } = props

  const hasBlocks = blocks && Array.isArray(blocks) && blocks.length > 0

  if (hasBlocks) {
    return (
      <Fragment>
        {blocks.map((block, index) => {
          const { blockType } = block
          const compactSpacing = blockType === 'statsBlock' || blockType === 'eventsBlock'

          if (blockType && blockType in blockComponents) {
            const Block = blockComponents[blockType]

            if (Block) {
              return (
                <BlockReveal
                  blockType={blockType}
                  className={`cms-block cms-block--${blockType} ${blockType === 'textLoop' ? 'my-0' : compactSpacing ? 'my-10 sm:my-12 lg:my-16' : 'my-16 sm:my-20 lg:my-24'}`}
                  key={block.id || index}
                >
                  <Block {...block} disableInnerContainer />
                </BlockReveal>
              )
            }
          }
          return null
        })}
      </Fragment>
    )
  }

  return null
}
