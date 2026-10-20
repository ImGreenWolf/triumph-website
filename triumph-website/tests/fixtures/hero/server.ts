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
    entryPoints: ['tests/fixtures/hero/client.tsx'],
    outfile: 'hero.js',
    bundle: true,
    write: false,
    platform: 'browser',
    format: 'iife',
    define: {
      'process.env': '{}',
      'process.env.NODE_ENV': '"development"',
      'process.env.NEXT_PUBLIC_SERVER_URL': '""',
    },
    // Isolate the hero from unrelated rich-text blocks and their server dependencies.
    plugins: [
      {
        name: 'fixture-rich-text',
        setup(build) {
          // Next's bundler unwraps this CJS export; give standalone esbuild its named component.
          build.onResolve({ filter: /^next\/image$/ }, () => ({
            path: 'next-image',
            namespace: 'fixture-image',
          }))
          build.onLoad({ filter: /.*/, namespace: 'fixture-image' }, () => ({
            contents: 'export { Image as default } from "next/dist/client/image-component.js"',
            loader: 'js',
            resolveDir: root,
          }))
          build.onResolve({ filter: /^@\/components\/RichText$/ }, () => ({
            path: 'rich-text',
            namespace: 'fixture',
          }))
          build.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
            contents:
              'import React from "react"; export default function RichText({className}) { return <p className={className}>Împreună transformăm ideile în fapte.</p> }',
            loader: 'jsx',
            resolveDir: root,
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
  '@font-face{font-family:HeroFixture;src:url(/fonts/Poppins-Regular.ttf);font-weight:400;font-display:block}' +
  '@font-face{font-family:HeroFixture;src:url(/fonts/Poppins-Medium.ttf);font-weight:500;font-display:block}' +
  ':root{--font-poppins:HeroFixture}body{font-family:HeroFixture,system-ui,sans-serif}'
const js = client.outputFiles.find((file) => file.path.endsWith('.js'))!.text
const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', 'http://localhost')
  if (url.pathname === '/styles.css') {
    response.setHeader('Content-Type', 'text/css')
    response.end(css)
  } else if (url.pathname === '/client.js') {
    response.setHeader('Content-Type', 'text/javascript')
    response.end(js)
  } else if (/^\/fonts\/Poppins-(Regular|Medium)\.ttf$/.test(url.pathname)) {
    response.setHeader('Content-Type', 'font/ttf')
    response.end(await readFile(path.join(root, 'public', url.pathname)))
  } else if (url.pathname === '/poster.svg') {
    response.setHeader('Content-Type', 'image/svg+xml')
    response.end(
      '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#1d454a"/><stop offset="1" stop-color="#182b24"/></linearGradient></defs><rect width="1600" height="1000" fill="url(#g)"/><path d="M0 800 Q400 300 800 700 T1600 500 V1000 H0Z" fill="#63724a" opacity=".5"/></svg>',
    )
  } else if (url.pathname.endsWith('.mp4')) {
    // Unavailable video deliberately exercises the poster and independent animation.
    response.writeHead(404).end()
  } else {
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.end(
      '<!doctype html><html data-theme="dark"><head><meta name="viewport" content="width=device-width,initial-scale=1"/><link rel="stylesheet" href="/styles.css"/></head><body style="margin:0"><header style="position:fixed;top:32px;left:40px;z-index:20;color:white">TRIUMPH</header><div id="root"></div><script src="/client.js"></script></body></html>',
    )
  }
})
server.listen(3118, '127.0.0.1', () => console.log('Hero fixture ready on 3118'))
