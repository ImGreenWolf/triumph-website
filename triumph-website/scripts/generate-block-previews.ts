import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { build, type Plugin } from 'esbuild'
import fg from 'fast-glob'
import { chromium } from 'playwright'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import sharp from 'sharp'
import {
  Node,
  ObjectLiteralExpression,
  Project,
  PropertyAssignment,
  QuoteKind,
  SourceFile,
  SyntaxKind,
} from 'ts-morph'

const rootDir = process.cwd()
const blocksDir = path.join(rootDir, 'src/blocks')
const outputDir = path.join(rootDir, 'public/block-previews')
const iconOutputDir = path.join(outputDir, 'icons')
const bundleOutputDir = path.join(rootDir, '.tmp/block-preview-bundles')

type BlockDefinition = {
  blockConstName: string
  blockSlug: string
  componentPath: string
  configFile: string
  folderName: string
  interfaceName?: string
  objectLiteral: ObjectLiteralExpression
  previewPath?: string
  sourceFile: SourceFile
}

const mediaMock = {
  id: 'preview-media',
  alt: 'Preview image',
  filename: 'preview.webp',
  filesize: 1,
  height: 900,
  mimeType: 'image/webp',
  updatedAt: new Date(0).toISOString(),
  url: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1200 900%22%3E%3Cdefs%3E%3ClinearGradient id=%22g%22 x1=%220%22 x2=%221%22 y1=%220%22 y2=%221%22%3E%3Cstop stop-color=%22%230f172a%22/%3E%3Cstop offset=%221%22 stop-color=%22%2322c55e%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width=%221200%22 height=%22900%22 fill=%22url(%23g)%22/%3E%3Cpath d=%22M120 690 C310 420 470 540 650 310 C800 120 940 260 1080 140 L1080 780 L120 780 Z%22 fill=%22rgba(255,255,255,.2)%22/%3E%3C/svg%3E',
  width: 1200,
}

const richText = (heading: string, body = 'Automatic block preview content.') => ({
  root: {
    type: 'root',
    children: [
      {
        type: 'heading',
        children: [
          {
            type: 'text',
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: heading,
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        tag: 'h2',
        version: 1,
      },
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: body,
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        textFormat: 0,
        version: 1,
      },
    ],
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
  },
})

const toTitle = (value: string) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())

const toSlug = (value: string) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()

const resolveProjectPath = async (basePath: string) => {
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.jsx`,
    path.join(basePath, 'index.ts'),
    path.join(basePath, 'index.tsx'),
    path.join(basePath, 'index.js'),
    path.join(basePath, 'index.jsx'),
  ]

  for (const candidate of candidates) {
    if (await fileExists(candidate)) return candidate
  }

  return basePath
}

const propertyText = (objectLiteral: ObjectLiteralExpression, name: string) => {
  const property = objectLiteral.getProperty(name)
  if (!Node.isPropertyAssignment(property)) return undefined

  const initializer = property.getInitializer()
  if (!initializer) return undefined

  if (Node.isStringLiteral(initializer) || Node.isNoSubstitutionTemplateLiteral(initializer)) {
    return initializer.getLiteralText()
  }

  return undefined
}

const getObjectProperty = (
  objectLiteral: ObjectLiteralExpression,
  name: string,
): PropertyAssignment | undefined => {
  const property = objectLiteral.getProperty(name)
  return Node.isPropertyAssignment(property) ? property : undefined
}

const getOrCreateObjectProperty = (
  objectLiteral: ObjectLiteralExpression,
  name: string,
): ObjectLiteralExpression | undefined => {
  const existing = getObjectProperty(objectLiteral, name)

  if (existing) {
    const initializer = existing.getInitializer()
    return Node.isObjectLiteralExpression(initializer) ? initializer : undefined
  }

  objectLiteral.addPropertyAssignment({
    initializer: '{}',
    name,
  })

  const created = getObjectProperty(objectLiteral, name)?.getInitializer()
  return Node.isObjectLiteralExpression(created) ? created : undefined
}

const setStringProperty = (
  objectLiteral: ObjectLiteralExpression,
  name: string,
  value: string,
  { onlyIfMissing = false }: { onlyIfMissing?: boolean } = {},
) => {
  const existing = getObjectProperty(objectLiteral, name)

  if (existing) {
    if (!onlyIfMissing) existing.setInitializer(`'${value}'`)
    return
  }

  objectLiteral.addPropertyAssignment({
    initializer: `'${value}'`,
    name,
  })
}

const discoverBlocks = async (project: Project): Promise<BlockDefinition[]> => {
  const configFiles = await fg('src/blocks/**/config.ts', {
    absolute: true,
    cwd: rootDir,
  })

  const blocks: BlockDefinition[] = []

  for (const configFile of configFiles) {
    const sourceFile = project.addSourceFileAtPath(configFile)
    const folder = path.dirname(configFile)
    const folderName = path.basename(folder)
    const componentPath = await findComponentPath(folder)
    if (!componentPath) continue

    const previewPath = await fileExists(path.join(folder, 'preview.ts'))

    for (const statement of sourceFile.getVariableStatements()) {
      if (!statement.isExported()) continue

      for (const declaration of statement.getDeclarations()) {
        const initializer = declaration.getInitializer()
        if (!Node.isObjectLiteralExpression(initializer)) continue

        const blockSlug = propertyText(initializer, 'slug')
        if (!blockSlug) continue

        blocks.push({
          blockConstName: declaration.getName(),
          blockSlug,
          componentPath,
          configFile,
          folderName,
          interfaceName: propertyText(initializer, 'interfaceName'),
          objectLiteral: initializer,
          previewPath,
          sourceFile,
        })
      }
    }
  }

  return blocks
}

const findComponentPath = async (folder: string) => {
  const candidates = [path.join(folder, 'Component.tsx'), path.join(folder, 'index.tsx')]

  for (const candidate of candidates) {
    if (await fileExists(candidate)) return candidate
  }

  return undefined
}

const fileExists = async (filePath: string) => {
  try {
    await fs.access(filePath)
    return filePath
  } catch {
    return undefined
  }
}

const newestInputTime = async (block: BlockDefinition) => {
  const paths = [block.configFile, block.componentPath, block.previewPath].filter(
    Boolean,
  ) as string[]
  const mtimes = await Promise.all(paths.map(async (filePath) => (await fs.stat(filePath)).mtimeMs))
  return Math.max(...mtimes)
}

const shouldGenerate = async (block: BlockDefinition, outputPath: string) => {
  try {
    const outputStat = await fs.stat(outputPath)
    return (await newestInputTime(block)) > outputStat.mtimeMs
  } catch {
    return true
  }
}

const loadPreviewData = async (block: BlockDefinition) => {
  if (block.previewPath) {
    const previewModule = await import(pathToFileURL(block.previewPath).href)
    if (previewModule.default) return previewModule.default
  }

  return fallbackPreviewData(block.blockSlug)
}

const fallbackPreviewData = (blockSlug: string) => {
  const title = toTitle(blockSlug)

  return {
    alignment: 'center',
    blockName: title,
    blockType: blockSlug,
    categories: [],
    columns: [
      {
        enableLink: false,
        richText: richText(title, 'A flexible content area generated for block previews.'),
        size: 'full',
      },
    ],
    details: [
      { desc: 'Reusable across pages', title: 'Scope' },
      { desc: 'Generated automatically', title: 'Preview' },
    ],
    eyebrow: 'Preview',
    faqs: [
      {
        answer: 'This is safe fallback data used when a block has no preview.ts file.',
        question: 'How is this preview generated?',
      },
    ],
    features: [
      {
        description: 'Highlight an important homepage message.',
        label: '01',
        title: 'Feature one',
      },
      { description: 'Keep the preview stable and reusable.', label: '02', title: 'Feature two' },
      { description: 'Make the block easy to recognize.', label: '03', title: 'Feature three' },
    ],
    introContent: richText(title, 'Fallback content for automatic block thumbnails.'),
    limit: 3,
    links: [
      {
        link: {
          appearance: 'default',
          label: 'Learn more',
          type: 'custom',
          url: '#',
        },
      },
    ],
    logos: [
      { logo: mediaMock, name: 'Northstar' },
      { logo: mediaMock, name: 'Summit' },
      { logo: mediaMock, name: 'Beacon' },
      { logo: mediaMock, name: 'Orbit' },
    ],
    mandates: [
      {
        members: [
          { name: 'Alex Morgan', picture: mediaMock, role: 'Lead' },
          { name: 'Sam Rivera', picture: mediaMock, role: 'Producer' },
        ],
        year: new Date().getFullYear(),
      },
    ],
    media: blockSlug === 'masonryBlock' ? [mediaMock, mediaMock] : mediaMock,
    galery: [mediaMock, mediaMock],
    mediaPosition: 'right',
    populateBy: 'collection',
    relationTo: 'posts',
    richText: richText(title, 'Use preview.ts next to a block to customize this thumbnail.'),
    code: "export const preview = 'ready'",
    language: 'typescript',
    enableIntro: true,
    form: {
      id: 'preview-form',
      confirmationMessage: richText('Thanks', 'This is a form preview.'),
      confirmationType: 'message',
      fields: [],
      submitButtonLabel: 'Submit',
    },
    selectedDocs: [],
    stats: [
      { description: 'Preview metric', label: 'Blocks', value: '12' },
      { description: 'Fast generation', label: 'Images', value: '600x400' },
      { description: 'Payload drawer', label: 'Ready', value: '100%' },
    ],
    steps: [
      { description: 'Discover the block config.', title: 'Scan' },
      { description: 'Render isolated React output.', title: 'Render' },
      { description: 'Save a drawer thumbnail.', title: 'Capture' },
    ],
    testimonials: [
      {
        authorName: 'Preview Author',
        authorRole: 'Payload editor',
        avatar: mediaMock,
        quote: 'Automatic block previews make the page builder easier to scan.',
      },
    ],
  }
}

const resolveComponent = async (block: BlockDefinition) => {
  const bundledPath = await bundleComponent(block)
  const globalWithBrowserMocks = globalThis as typeof globalThis & {
    matchMedia?: (query: string) => MediaQueryList
    requestAnimationFrame?: (callback: FrameRequestCallback) => number
  }
  globalWithBrowserMocks.matchMedia ??= ((query: string) => ({
    addEventListener: () => undefined,
    addListener: () => undefined,
    dispatchEvent: () => false,
    media: query,
    matches: false,
    onchange: null,
    removeEventListener: () => undefined,
    removeListener: () => undefined,
  })) as (query: string) => MediaQueryList
  globalWithBrowserMocks.requestAnimationFrame ??= (callback) => {
    setTimeout(() => callback(Date.now()), 0)
    return 0
  }
  const componentModule = await import(`${pathToFileURL(bundledPath).href}?t=${Date.now()}`)
  const candidates = [
    block.interfaceName,
    block.blockConstName,
    `${block.blockConstName}Block`,
    `${block.folderName}Block`,
    block.folderName,
    'default',
  ].filter(Boolean) as string[]

  for (const candidate of candidates) {
    const component = componentModule[candidate]
    if (typeof component === 'function') return component
  }

  throw new Error(
    `No React component export found in ${path.relative(rootDir, block.componentPath)}`,
  )
}

const bundleComponent = async (block: BlockDefinition) => {
  await fs.mkdir(bundleOutputDir, { recursive: true })
  const outfile = path.join(bundleOutputDir, `${block.blockSlug}.mjs`)

  await build({
    bundle: true,
    entryPoints: [block.componentPath],
    external: ['react', 'react-dom', 'react-dom/server'],
    format: 'esm',
    jsx: 'automatic',
    loader: {
      '.css': 'empty',
      '.scss': 'empty',
      '.svg': 'dataurl',
    },
    logLevel: 'silent',
    outfile,
    platform: 'node',
    plugins: [previewMockPlugin()],
    target: 'es2022',
    tsconfig: path.join(rootDir, 'tsconfig.json'),
  })

  return outfile
}

const previewMockPlugin = (): Plugin => {
  const mockNamespace = 'block-preview-mock'

  const matchesLocalComponent = (candidate: string, componentName: string) => {
    const normalized = candidate.split(path.sep).join('/')
    return normalized.includes(`/src/components/${componentName}`)
  }

  const resolveRelativeCandidate = (args: { path: string; resolveDir: string }) => {
    if (!args.path.startsWith('.')) return undefined
    return path.resolve(args.resolveDir, args.path)
  }

  return {
    name: 'block-preview-mocks',
    setup(buildApi) {
      buildApi.onResolve({ filter: /^@\/(.*)$/ }, async (args) => {
        const modulePath = args.path.replace(/^@\//, '')

        if (modulePath === 'utilities/ui') {
          return { namespace: mockNamespace, path: 'cn' }
        }

        if (modulePath === 'utilities/getURL') {
          return { namespace: mockNamespace, path: 'get-url' }
        }

        if (modulePath === 'components/RichText') {
          return { namespace: mockNamespace, path: 'rich-text' }
        }

        if (modulePath === 'components/Media') {
          return { namespace: mockNamespace, path: 'media' }
        }

        if (modulePath === 'components/Link') {
          return { namespace: mockNamespace, path: 'link' }
        }

        if (modulePath === 'components/Logo/Logo') {
          return { namespace: mockNamespace, path: 'logo' }
        }

        if (modulePath === 'components/CollectionArchive') {
          return { namespace: mockNamespace, path: 'collection-archive' }
        }

        if (modulePath === 'components/Card' || modulePath === 'components/EventCard') {
          return { namespace: mockNamespace, path: 'card' }
        }

        if (modulePath.startsWith('components/ui/')) {
          return { namespace: mockNamespace, path: 'ui-control' }
        }

        return { path: await resolveProjectPath(path.join(rootDir, 'src', modulePath)) }
      })

      buildApi.onResolve({ filter: /^@payload-config$/ }, () => {
        return { namespace: mockNamespace, path: 'payload-config' }
      })

      buildApi.onResolve({ filter: /^payload$/ }, () => {
        return { namespace: mockNamespace, path: 'payload' }
      })

      buildApi.onResolve({ filter: /^next\/image$/ }, () => ({
        namespace: mockNamespace,
        path: 'next-image',
      }))

      buildApi.onResolve({ filter: /^next\/link$/ }, () => ({
        namespace: mockNamespace,
        path: 'next-link',
      }))

      buildApi.onResolve({ filter: /^next\/navigation$/ }, () => ({
        namespace: mockNamespace,
        path: 'next-navigation',
      }))

      buildApi.onResolve({ filter: /^react-hook-form$/ }, () => ({
        namespace: mockNamespace,
        path: 'react-hook-form',
      }))

      buildApi.onResolve({ filter: /^gsap(\/.*)?$/ }, () => ({
        namespace: mockNamespace,
        path: 'gsap',
      }))

      buildApi.onResolve({ filter: /^\.\/Component\.client$/ }, (args) => {
        if (args.resolveDir.endsWith(`${path.sep}src${path.sep}blocks${path.sep}Code`)) {
          return { namespace: mockNamespace, path: 'code-client' }
        }

        return undefined
      })

      buildApi.onResolve({ filter: /\.(css|scss)$/ }, () => ({
        namespace: mockNamespace,
        path: 'empty-style',
      }))

      buildApi.onResolve({ filter: /.*/ }, (args) => {
        const candidate = resolveRelativeCandidate(args)
        if (!candidate) return undefined

        if (matchesLocalComponent(candidate, 'RichText')) {
          return { namespace: mockNamespace, path: 'rich-text' }
        }

        if (matchesLocalComponent(candidate, 'Media')) {
          return { namespace: mockNamespace, path: 'media' }
        }

        if (matchesLocalComponent(candidate, 'Link')) {
          return { namespace: mockNamespace, path: 'link' }
        }

        if (matchesLocalComponent(candidate, 'Logo/Logo')) {
          return { namespace: mockNamespace, path: 'logo' }
        }

        if (matchesLocalComponent(candidate, 'ui')) {
          return { namespace: mockNamespace, path: 'ui-control' }
        }

        return undefined
      })

      buildApi.onLoad({ filter: /.*/, namespace: mockNamespace }, (args) => {
        return {
          contents: mockModule(args.path),
          loader: 'tsx',
        }
      })
    },
  }
}

const mockModule = (name: string) => {
  if (name === 'empty-style') return ''

  if (name === 'cn') {
    return `
      export function cn(...inputs) {
        return inputs.flatMap((input) => {
          if (!input) return []
          if (typeof input === 'string') return [input]
          if (Array.isArray(input)) return input
          if (typeof input === 'object') {
            return Object.entries(input).filter(([, value]) => Boolean(value)).map(([key]) => key)
          }
          return []
        }).join(' ')
      }
    `
  }

  if (name === 'get-url') {
    return `
      export function getClientSideURL() { return '' }
      export function getServerSideURL() { return '' }
    `
  }

  if (name === 'rich-text') {
    return `
      import React from 'react'
      const renderNode = (node, index) => {
        if (!node) return null
        if (node.type === 'text') return node.text || ''
        const children = Array.isArray(node.children) ? node.children.map(renderNode) : null
        if (node.type === 'heading') return React.createElement(node.tag || 'h2', { key: index }, children)
        if (node.type === 'paragraph') return React.createElement('p', { key: index }, children)
        if (node.type === 'link') return React.createElement('a', { key: index, href: node.fields?.url || '#' }, children)
        return React.createElement('div', { key: index }, children)
      }
      export default function RichText({ className, data }) {
        return React.createElement('div', { className }, data?.root?.children?.map(renderNode))
      }
    `
  }

  if (name === 'media' || name === 'next-image') {
    return `
      import React from 'react'
      const srcFrom = (props) => {
        if (typeof props.src === 'string') return props.src
        if (typeof props.resource === 'string') return props.resource
        return props.resource?.url || props.src?.src || ''
      }
      export function Media(props) {
        const src = srcFrom(props)
        return React.createElement('img', {
          alt: props.alt || props.resource?.alt || '',
          className: props.imgClassName || props.className,
          src,
        })
      }
      export default function Image(props) {
        const src = srcFrom(props)
        return React.createElement('img', {
          alt: props.alt || '',
          className: props.className,
          height: props.height,
          src,
          width: props.width,
        })
      }
    `
  }

  if (name === 'link' || name === 'next-link') {
    return `
      import React from 'react'
      export function CMSLink(props) {
        return React.createElement('a', { className: props.className, href: props.url || '#' }, props.children || props.label)
      }
      export default function Link(props) {
        return React.createElement('a', { className: props.className, href: props.href || '#' }, props.children)
      }
    `
  }

  if (name === 'ui-control') {
    return `
      import React from 'react'
      export function Button(props) {
        const Tag = props.asChild ? React.Fragment : 'button'
        if (props.asChild) return React.createElement(React.Fragment, null, props.children)
        return React.createElement(Tag, { className: props.className, type: props.type }, props.children)
      }
      export function Checkbox(props) { return React.createElement('input', { className: props.className, type: 'checkbox' }) }
      export function Input(props) { return React.createElement('input', { className: props.className, placeholder: props.placeholder }) }
      export function Label(props) { return React.createElement('label', { className: props.className }, props.children) }
      export function Select(props) { return React.createElement('select', { className: props.className }, props.children) }
      export function SelectContent(props) { return React.createElement(React.Fragment, null, props.children) }
      export function SelectItem(props) { return React.createElement('option', { value: props.value }, props.children) }
      export function SelectTrigger(props) { return React.createElement('div', { className: props.className }, props.children) }
      export function SelectValue(props) { return React.createElement('span', null, props.placeholder) }
      export function Textarea(props) { return React.createElement('textarea', { className: props.className, placeholder: props.placeholder }) }
    `
  }

  if (name === 'logo') {
    return `
      import React from 'react'
      export function Logo(props) {
        return React.createElement('div', { className: props.className }, 'Triumph')
      }
    `
  }

  if (name === 'next-navigation') {
    return `
      export function useRouter() {
        return { push() {} }
      }
    `
  }

  if (name === 'payload-config') {
    return `export default {}`
  }

  if (name === 'payload') {
    return `
      export async function getPayload() {
        return {
          async find() {
            return { docs: [] }
          }
        }
      }
    `
  }

  if (name === 'collection-archive') {
    return `
      import React from 'react'
      export function CollectionArchive() {
        return React.createElement('div', { className: 'grid gap-4 md:grid-cols-3' },
          ['Preview item', 'Featured story', 'Latest update'].map((title) =>
            React.createElement('article', { className: 'rounded border p-6', key: title },
              React.createElement('h3', { className: 'text-xl font-semibold mb-3' }, title),
              React.createElement('p', { className: 'text-sm text-muted-foreground' }, 'Generated collection preview content.')
            )
          )
        )
      }
    `
  }

  if (name === 'card') {
    return `
      import React from 'react'
      export function Card(props) { return React.createElement('article', { className: 'rounded border p-6' }, props.children || 'Preview card') }
      export function EventCard(props) { return React.createElement('article', { className: 'rounded border p-6' }, props.children || 'Preview event') }
    `
  }

  if (name === 'code-client') {
    return `
      import React from 'react'
      export function Code({ code }) {
        return React.createElement('pre', { className: 'rounded border p-6' }, code || 'const preview = true')
      }
    `
  }

  if (name === 'react-hook-form') {
    return `
      import React from 'react'
      export function useForm() {
        return {
          control: {},
          formState: { errors: {} },
          handleSubmit: () => (event) => event?.preventDefault?.(),
          register: () => ({}),
        }
      }
      export function useFormContext() {
        return {
          control: {},
          formState: { errors: {} },
          register: () => ({}),
        }
      }
      export function Controller(props) {
        return props.render?.({ field: { onChange() {}, value: '' } }) || null
      }
      export function FormProvider(props) {
        return React.createElement(React.Fragment, null, props.children)
      }
    `
  }

  if (name === 'gsap') {
    return `
      const chain = new Proxy(function () {}, { get: () => chain, apply: () => chain })
      export const gsap = chain
      export const ScrollTrigger = chain
      export default chain
    `
  }

  return ''
}

const renderBlockHtml = async (block: BlockDefinition) => {
  const Component = await resolveComponent(block)
  const props = await loadPreviewData(block)
  const element =
    Component.constructor.name === 'AsyncFunction'
      ? await Component(props)
      : React.createElement(Component, props)
  const markup = renderToStaticMarkup(element)

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=600, initial-scale=1" />
    <style>
      *, *::before, *::after { box-sizing: border-box; animation: none !important; transition: none !important; }
      html, body, #app { width: 600px; height: 400px; margin: 0; overflow: hidden; background: white; }
      body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111827; }
      a { color: inherit; text-decoration: none; }
      img, video, picture { display: block; max-width: 100%; }
      h1, h2, h3, h4, p { margin-top: 0; }
      .preview-shell { width: 600px; height: 400px; padding: 32px; overflow: hidden; background: #fff; display: flex; align-items: center; justify-content: center; }
      .preview-content { width: 100%; max-height: 336px; overflow: hidden; }
      .container { width: 100%; max-width: 100%; margin-left: auto; margin-right: auto; }
      .grid { display: grid; }
      .flex { display: flex; }
      .hidden { display: none; }
      .items-center { align-items: center; }
      .justify-center { justify-content: center; }
      .justify-between { justify-content: space-between; }
      .text-center { text-align: center; }
      .mx-auto { margin-left: auto; margin-right: auto; }
      .mb-0 { margin-bottom: 0; }
      .mb-2 { margin-bottom: .5rem; }
      .mb-3 { margin-bottom: .75rem; }
      .mb-4 { margin-bottom: 1rem; }
      .mb-5 { margin-bottom: 1.25rem; }
      .mb-6 { margin-bottom: 1.5rem; }
      .mb-8 { margin-bottom: 2rem; }
      .mb-10 { margin-bottom: 2.5rem; }
      .mt-2 { margin-top: .5rem; }
      .mt-3 { margin-top: .75rem; }
      .mt-6 { margin-top: 1.5rem; }
      .mt-8 { margin-top: 2rem; }
      .gap-3 { gap: .75rem; }
      .gap-4 { gap: 1rem; }
      .gap-8 { gap: 2rem; }
      .gap-10 { gap: 2.5rem; }
      .gap-12 { gap: 3rem; }
      .p-4 { padding: 1rem; }
      .p-5 { padding: 1.25rem; }
      .p-6 { padding: 1.5rem; }
      .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
      .py-6 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
      .py-32 { padding-top: 1rem; padding-bottom: 1rem; }
      .pl-5 { padding-left: 1.25rem; }
      .rounded, .rounded-lg, .rounded-\\[0\\.8rem\\] { border-radius: 8px; }
      .rounded-full { border-radius: 9999px; }
      .border, .border-y, .border-l { border-color: #e5e7eb; border-style: solid; }
      .border { border-width: 1px; }
      .border-y { border-top-width: 1px; border-bottom-width: 1px; }
      .border-l { border-left-width: 1px; }
      .bg-card, .bg-background { background: #fff; }
      .bg-accent { background: #f9fafb; }
      .bg-border { background: #e5e7eb; }
      .text-muted-foreground { color: #6b7280; }
      .font-medium { font-weight: 500; }
      .font-semibold { font-weight: 600; }
      .uppercase { text-transform: uppercase; }
      .tracking-normal { letter-spacing: 0; }
      .text-xs { font-size: 12px; line-height: 16px; }
      .text-sm { font-size: 14px; line-height: 20px; }
      .text-lg { font-size: 18px; line-height: 28px; }
      .text-xl { font-size: 20px; line-height: 28px; }
      .text-3xl { font-size: 30px; line-height: 36px; }
      .leading-6 { line-height: 24px; }
      .leading-8 { line-height: 32px; }
      .max-w-3xl { max-width: 48rem; }
      .max-w-\\[48rem\\] { max-width: 48rem; }
      .size-12 { width: 48px; height: 48px; }
      .h-28 { height: 112px; }
      .h-full { height: 100%; }
      .w-full { width: 100%; }
      .max-h-12 { max-height: 48px; }
      .max-w-36 { max-width: 144px; }
      .aspect-\\[4\\/3\\] { aspect-ratio: 4 / 3; }
      .aspect-video { aspect-ratio: 16 / 9; }
      .object-cover { object-fit: cover; }
      .object-contain { object-fit: contain; }
      .overflow-hidden { overflow: hidden; }
      .divide-y > * + * { border-top: 1px solid #e5e7eb; }
      .prose h1, .payload-richtext h1 { font-size: 36px; line-height: 40px; margin-bottom: 14px; }
      .prose h2, .payload-richtext h2 { font-size: 30px; line-height: 36px; margin-bottom: 12px; }
      .prose h3, .payload-richtext h3 { font-size: 22px; line-height: 30px; margin-bottom: 10px; }
      .prose p, .payload-richtext p { color: #4b5563; font-size: 16px; line-height: 26px; margin-bottom: 12px; }
      .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
      .col-span-4 { grid-column: span 4 / span 4; }
      @media (min-width: 768px) {
        .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .md\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .md\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        .md\\:flex-row { flex-direction: row; }
        .md\\:items-center { align-items: center; }
        .md\\:justify-between { justify-content: space-between; }
      }
      @media (min-width: 1024px) {
        .lg\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .lg\\:grid-cols-12 { grid-template-columns: repeat(12, minmax(0, 1fr)); }
        .lg\\:grid-cols-\\[0\\.8fr_1\\.2fr\\] { grid-template-columns: .8fr 1.2fr; }
        .lg\\:col-span-4 { grid-column: span 4 / span 4; }
        .lg\\:col-span-6 { grid-column: span 6 / span 6; }
        .lg\\:col-span-8 { grid-column: span 8 / span 8; }
        .lg\\:col-span-12 { grid-column: span 12 / span 12; }
        .lg\\:order-1 { order: 1; }
        .lg\\:order-2 { order: 2; }
      }
    </style>
  </head>
  <body>
    <div id="app" class="preview-shell">
      <main class="preview-content">${markup}</main>
    </div>
  </body>
</html>`
}

const writeIcon = async (blockSlug: string) => {
  const initials = blockSlug
    .split('-')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="${toTitle(
    blockSlug,
  )}">
  <rect width="64" height="64" rx="12" fill="#111827"/>
  <rect x="10" y="14" width="44" height="36" rx="6" fill="#ffffff" opacity=".14"/>
  <text x="32" y="39" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="700" fill="#ffffff">${initials}</text>
</svg>
`

  const iconPath = path.join(iconOutputDir, `${blockSlug}.svg`)
  await fs.writeFile(iconPath, icon)
}

const screenshotBlock = async (block: BlockDefinition, outputPath: string) => {
  const html = await renderBlockHtml(block)
  const browser = await chromium.launch()
  const page = await browser.newPage({
    deviceScaleFactor: 1,
    viewport: { height: 400, width: 600 },
  })

  await page.route('**/*', async (route) => {
    const url = route.request().url()
    if (url.startsWith('http://') || url.startsWith('https://')) {
      await route.abort()
      return
    }

    await route.continue()
  })

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setContent(html, { waitUntil: 'domcontentloaded' })
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(
      Array.from(document.images).map(async (image) => {
        if (image.complete) return
        await image.decode().catch(() => undefined)
      }),
    )
  })
  const screenshot = await page.screenshot({
    type: 'png',
  })
  await sharp(screenshot).webp({ quality: 90 }).toFile(outputPath)
  await browser.close()
}

const patchBlockConfig = (block: BlockDefinition) => {
  const admin = getOrCreateObjectProperty(block.objectLiteral, 'admin')
  if (!admin) {
    console.warn(`Skipping admin patch for ${block.blockSlug}: admin is not an object literal`)
    return
  }

  const images = getOrCreateObjectProperty(admin, 'images')
  if (!images) {
    console.warn(
      `Skipping images patch for ${block.blockSlug}: admin.images is not an object literal`,
    )
    return
  }

  setStringProperty(images, 'thumbnail', `/block-previews/${block.blockSlug}.webp`)
  setStringProperty(images, 'icon', `/block-previews/icons/${block.blockSlug}.svg`, {
    onlyIfMissing: true,
  })
}

const run = async () => {
  await fs.mkdir(outputDir, { recursive: true })
  await fs.mkdir(iconOutputDir, { recursive: true })
  await fs.mkdir(bundleOutputDir, { recursive: true })

  const project = new Project({
    manipulationSettings: {
      quoteKind: QuoteKind.Single,
    },
    tsConfigFilePath: path.join(rootDir, 'tsconfig.json'),
  })

  const blocks = await discoverBlocks(project)
  const browserErrors: string[] = []

  for (const block of blocks) {
    const outputPath = path.join(outputDir, `${block.blockSlug}.webp`)

    try {
      if (await shouldGenerate(block, outputPath)) {
        console.log(`Generating ${block.blockSlug}`)
        await screenshotBlock(block, outputPath)
      } else {
        console.log(`Skipping ${block.blockSlug}; preview is current`)
      }

      await writeIcon(block.blockSlug)
      patchBlockConfig(block)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      browserErrors.push(`${block.blockSlug}: ${message}`)
      console.error(`Failed ${block.blockSlug}: ${message}`)
    }
  }

  for (const sourceFile of new Set(blocks.map((block) => block.sourceFile))) {
    sourceFile.formatText()
    await sourceFile.save()
  }

  if (browserErrors.length) {
    console.error(`\n${browserErrors.length} block preview(s) failed:`)
    for (const error of browserErrors) console.error(`- ${error}`)
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
