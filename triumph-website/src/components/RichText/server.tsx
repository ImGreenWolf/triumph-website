import { MediaBlock } from '@/blocks/MediaBlock/Component'
import {
  DefaultNodeTypes,
  SerializedBlockNode,
  SerializedLinkNode,
  type DefaultTypedEditorState,
} from '@payloadcms/richtext-lexical'
import {
  JSXConvertersFunction,
  LinkJSXConverter,
  RichText as ConvertRichText,
} from '@payloadcms/richtext-lexical/react'

import { ArchiveBlock } from '@/blocks/ArchiveBlock/Component'
import { BannerBlock } from '@/blocks/Banner/Component'
import { CallToActionBlock } from '@/blocks/CallToAction/Component'
import { CodeBlock } from '@/blocks/Code/Component'
import { EventsBlock } from '@/blocks/EventsBlock/Component'
import { FormBlock } from '@/blocks/Form/Component'
import { LogoLoopBlock } from '@/blocks/LogoLoop/Component'
import { MasonryBlock } from '@/blocks/Masonry/Component'
import type {
  ArchiveBlock as ArchiveBlockProps,
  BannerBlock as BannerBlockProps,
  CallToActionBlock as CTABlockProps,
  CodeBlock as CodeBlockProps,
  EventsBlock as EventsBlockProps,
  FormBlock as FormBlockProps,
  LogoLoopBlock as LogoLoopBlockProps,
  MasonryBlock as MasonryBlockProps,
  MediaBlock as MediaBlockProps,
} from '@/payload-types'
import { cn } from '@/utilities/ui'
import { TypographyJSXConverters } from 'payload-lexical-typography/converters'

type NodeTypes =
  | DefaultNodeTypes
  | SerializedBlockNode<
      | ArchiveBlockProps
      | BannerBlockProps
      | CTABlockProps
      | CodeBlockProps
      | EventsBlockProps
      | FormBlockProps
      | LogoLoopBlockProps
      | MasonryBlockProps
      | MediaBlockProps
    >

const internalDocToHref = ({ linkNode }: { linkNode: SerializedLinkNode }) => {
  const { value, relationTo } = linkNode.fields.doc!
  if (typeof value !== 'object') {
    throw new Error('Expected value to be an object')
  }
  const slug = value.slug
  return relationTo === 'posts' ? `/posts/${slug}` : `/${slug}`
}

const jsxConverters: JSXConvertersFunction<NodeTypes> = ({ defaultConverters }) => ({
  ...defaultConverters,
  ...LinkJSXConverter({ internalDocToHref }),
  ...TypographyJSXConverters,
  blocks: {
    archive: ({ node }) => <ArchiveBlock {...node.fields}  />,
    banner: ({ node }) => <BannerBlock className="col-start-2 mb-4" {...node.fields} />,
    code: ({ node }) => (
      <CodeBlock
        className="col-start-2"
        {...node.fields}
        language={node.fields.language ?? undefined}
      />
    ),
    cta: ({ node }) => <CallToActionBlock {...node.fields} />,
    eventsBlock: ({ node }) => <EventsBlock {...node.fields} />,
    formBlock: ({ node }) => <FormBlock {...(node.fields as React.ComponentProps<typeof FormBlock>)} />,
    logoLoopBlock: ({ node }) => <LogoLoopBlock {...node.fields} />,
    masonryBlock: ({ node }) => <MasonryBlock {...node.fields} />,
    mediaBlock: ({ node }) => (
      <MediaBlock
        className="col-start-1 col-span-3"
        imgClassName="m-0"
        {...node.fields}
        captionClassName="mx-auto max-w-[48rem]"
        enableGutter={false}
        disableInnerContainer={true}
      />
    ),
  },
})

type Props = {
  data: DefaultTypedEditorState
  enableGutter?: boolean
  enableProse?: boolean
} & React.HTMLAttributes<HTMLDivElement>

export default function ServerRichText(props: Props) {
  const { className, enableProse = true, enableGutter = true, ...rest } = props
  return (
    <ConvertRichText
      converters={jsxConverters}
      className={cn(
        'payload-richtext',
        {
          container: enableGutter,
          'max-w-none': !enableGutter,
          'mx-auto prose md:prose-md dark:prose-invert': enableProse,
        },
        className,
      )}
      {...rest}
    />
  )
}
