import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { build } from 'esbuild'
import postcss from 'postcss'
import tailwind from '@tailwindcss/postcss'
const root = process.cwd()
const cssFile = path.join(root, 'src/app/(frontend)/globals.css')
const [stylesheet, client] = await Promise.all([
  postcss([tailwind()]).process(await readFile(cssFile, 'utf8'), { from: cssFile }),
  build({
    entryPoints: ['tests/fixtures/site-improvements/client.tsx'],
    outfile: 'preview.js',
    jsx: 'automatic',
    bundle: true,
    write: false,
    platform: 'browser',
    format: 'iife',
    define: {
      'process.env': '{}',
      'process.env.NODE_ENV': '"development"',
      'process.env.NEXT_PUBLIC_SERVER_URL': '""',
    },
    plugins: [
      {
        name: 'preview-next-adapters',
        setup(builder) {
          builder.onResolve({ filter: /^next\/image$/ }, () => ({
            path: 'image',
            namespace: 'preview-image',
          }))
          builder.onLoad({ filter: /.*/, namespace: 'preview-image' }, () => ({
            contents:
              'import React from "react"; import { Image } from "next/dist/client/image-component.js"; export default function PreviewImage(props) { return React.createElement(Image, {...props, unoptimized:true}) }',
            loader: 'js',
            resolveDir: root,
          }))
          builder.onResolve({ filter: /^next\/navigation$/ }, () => ({
            path: 'navigation',
            namespace: 'preview-navigation',
          }))
          builder.onLoad({ filter: /.*/, namespace: 'preview-navigation' }, () => ({
            contents:
              'export const usePathname=()=>location.pathname;export const useRouter=()=>({push:(url)=>{location.href=url},prefetch:()=>{}})',
            loader: 'js',
          }))
        },
      },
    ],
    logLevel: 'silent',
  }),
])
const css =
  stylesheet.css +
  (client.outputFiles.find((file) => file.path.endsWith('.css'))?.text ?? '') +
  [
    ['400', 'Regular'],
    ['600', 'SemiBold'],
    ['700', 'Bold'],
  ]
    .map(
      ([weight, name]) =>
        `@font-face{font-family:Preview;src:url('/fonts/Poppins-${name}.ttf');font-weight:${weight};font-display:block}`,
    )
    .join('') +
  ':root{--font-poppins:Preview}body{font-family:Preview,system-ui;margin:0}'
const js = client.outputFiles.find((file) => file.path.endsWith('.js'))!.text
const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', 'http://localhost')
  if (url.pathname === '/styles.css') {
    response.setHeader('Content-Type', 'text/css')
    response.end(css)
  } else if (url.pathname === '/client.js') {
    response.setHeader('Content-Type', 'text/javascript')
    response.end(js)
  } else if (
    url.pathname.startsWith('/_next/image') ||
    url.pathname.startsWith('/api/media/file/')
  ) {
    try {
      const result = await fetch(`http://localhost:3000${request.url}`)
      response.writeHead(result.status, {
        'Content-Type': result.headers.get('content-type') || 'image/jpeg',
      })
      response.end(Buffer.from(await result.arrayBuffer()))
    } catch {
      response.writeHead(502).end()
    }
  } else if (
    /^\/fonts\/Poppins-(Regular|SemiBold|Bold)\.ttf$/.test(url.pathname) ||
    url.pathname === '/logo_full.png'
  ) {
    response.end(await readFile(path.join(root, 'public', url.pathname)))
  } else {
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.end(
      '<!doctype html><html lang="ro" data-theme="dark"><head><title>Previzualizare locală</title><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><div id="root"></div><script src="/client.js"></script></body></html>',
    )
  }
})
server.listen(3119, '127.0.0.1', () => console.log('Local draft component fixture ready on 3119'))
