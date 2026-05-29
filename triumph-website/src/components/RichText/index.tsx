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

import { CodeBlock, CodeBlockProps } from '@/blocks/Code/Component'

import type {
  BannerBlock as BannerBlockProps,
  CallToActionBlock as CTABlockProps,
  MediaBlock as MediaBlockProps,
} from '@/payload-types'
import { BannerBlock } from '@/blocks/Banner/Component'
import { CallToActionBlock } from '@/blocks/CallToAction/Component'
import { cn } from '@/utilities/ui'
import { TypographyHTMLConverters, TypographyJSXConverters } from 'payload-lexical-typography/converters'
import textStateConfig from '@/blocks/FullWidthBlock/textStateConfig'

type NodeTypes =
  | DefaultNodeTypes
  | SerializedBlockNode<CTABlockProps | MediaBlockProps | BannerBlockProps | CodeBlockProps>

const internalDocToHref = ({ linkNode }: { linkNode: SerializedLinkNode }) => {
  const { value, relationTo } = linkNode.fields.doc!
  if (typeof value !== 'object') {
    throw new Error('Expected value to be an object')
  }
  const slug = value.slug
  return relationTo === 'posts' ? `/posts/${slug}` : `/${slug}`
}

// Lexical serializes node state under the "$" key.
const NODE_STATE_KEY = '$'

// React's style prop requires camelCase, but TextStateFeature CSS uses hyphen-case.
function hyphenToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

const jsxConverters: JSXConvertersFunction<NodeTypes> = ({ defaultConverters }) => ({
  ...defaultConverters,
  ...LinkJSXConverter({ internalDocToHref }),
  ...TypographyJSXConverters,
  // text: (args) => {
  //   const { node } = args

  //   // Render standard formatting (bold, italic, etc.) using the default converter
  //   let text =
  //     typeof defaultConverters.text === 'function'
  //       ? defaultConverters.text(args)
  //       : node.text

  //   // Apply TextStateFeature styles from the "$" key in the serialized node
  //   const nodeState = (node as any)[NODE_STATE_KEY] as
  //     | Record<string, string>
  //     | undefined
  //   if (nodeState) {
  //     const styles: React.CSSProperties = {}
  //     for (const [stateKey, stateValue] of Object.entries(nodeState)) {
  //       const css = (textStateConfig as any)[stateKey]?.[stateValue]?.css
  //       if (css) {
  //         for (const [prop, value] of Object.entries(css)) {
  //           ;(styles as any)[hyphenToCamel(prop)] = value
  //         }
  //       }
  //     }
  //     if (Object.keys(styles).length > 0) {
  //       text = <span style={styles}>{text}</span>
  //     }
  //   }

  //   return text
  // },
  blocks: {
    banner: ({ node }) => <BannerBlock className="col-start-2 mb-4" {...node.fields} />,
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
    code: ({ node }) => <CodeBlock className="col-start-2" {...node.fields} />,
    cta: ({ node }) => <CallToActionBlock {...node.fields} />,
  },
})

type Props = {
  data: DefaultTypedEditorState
  enableGutter?: boolean
  enableProse?: boolean
} & React.HTMLAttributes<HTMLDivElement>

export default function RichText(props: Props) {
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
