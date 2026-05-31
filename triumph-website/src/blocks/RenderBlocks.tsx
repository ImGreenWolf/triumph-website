import React, { Fragment } from 'react'

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
import {DownloadFilesBlock} from './DownloadBlock/Component'
import { TimelineBlock } from './TimelineHistory/Component'
import { ContactBlock } from './ContactBlock/Component'
import { FAQBlock } from './FAQBlock/Component'

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
  downloadFiles: DownloadFilesBlock,
  eventTimeline: TimelineBlock,
  contactBlock: ContactBlock,
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

          if (blockType && blockType in blockComponents) {
            const Block = blockComponents[blockType]

            if (Block) {
              return (
                <div className="my-16" key={index}>
                  <Block {...block} disableInnerContainer />
                </div>
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
