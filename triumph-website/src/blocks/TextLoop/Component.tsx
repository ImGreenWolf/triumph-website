import type { BannerBlock as BannerBlockProps } from 'src/payload-types'

import { cn } from '@/utilities/ui'
import React from 'react'
import TextLoop from '@/components/TextLoop'
import {TextLoopBlock as TextLoopProps} from 'src/payload-types'

type Props = {
  className?: string
} & BannerBlockProps

export const TextLoopBlock: React.FC<TextLoopProps> = ({ color, textColor, curviness, fontSize, separator, text, width  }) => {
  return (
    <TextLoop className='-my-24 lg:-my-32 xl:-my-64' pauseOnHover={false} ribbonColor={color} color={textColor} curviness={curviness} fontSize={fontSize} separator={separator} text={text} ribbonWidth={width}/>
  )
}
