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
    entryPoints: ['tests/fixtures/event-registration/client.tsx'],
    outfile: 'fixture.js',
    jsx: 'automatic',
    bundle: true,
    write: false,
    platform: 'browser',
    format: 'iife',
    define: { 'process.env': '{}', 'process.env.NODE_ENV': '"development"' },
    plugins: [
      {
        name: 'fixture-adapters',
        setup(builder) {
          const adapters: Record<string, string> = {
            'next/navigation':
              'export const useRouter=()=>({refresh(){}});export const usePathname=()=>"/";',
            'next/link':
              'import React from "react";export default function Link({children,...props}){return React.createElement("a",props,children)}',
            '@/components/Media': 'export const Media=()=>null;',
            '../_components/QrScannerSurface': 'export const QrScannerSurface=()=>null;',
          }
          builder.onResolve({ filter: /.*/ }, (args) =>
            args.path in adapters ? { path: args.path, namespace: 'fixture' } : undefined,
          )
          builder.onLoad({ filter: /.*/, namespace: 'fixture' }, (args) => ({
            contents: adapters[args.path],
            loader: 'js',
            resolveDir: root,
          }))
        },
      },
    ],
    logLevel: 'silent',
  }),
])
const css = stylesheet.css
const js = client.outputFiles.find((file) => file.path.endsWith('.js'))!.text
createServer(async (request, response) => {
  if (request.url === '/fonts/Poppins-Regular.ttf' || request.url === '/fonts/Poppins-Bold.ttf') {
    response.setHeader('Content-Type', 'font/ttf')
    response.end(await readFile(path.join(root, 'public', request.url)))
    return
  }
  if (request.url === '/fixture.js') {
    response.setHeader('Content-Type', 'text/javascript')
    response.end(js)
  } else if (request.url === '/styles.css') {
    response.setHeader('Content-Type', 'text/css')
    response.end(css)
  } else {
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.end(
      '<!doctype html><html lang="ro" data-theme="light"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><style>@font-face{font-family:MetricFixture;src:url(/fonts/Poppins-Regular.ttf);font-weight:400}@font-face{font-family:MetricFixture;src:url(/fonts/Poppins-Bold.ttf);font-weight:700}.metric-fixture{font-family:MetricFixture,sans-serif}</style></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>',
    )
  }
}).listen(3121, '127.0.0.1', () => console.log('Event registration fixture ready on 3121'))
