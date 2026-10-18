/* eslint-disable @next/next/no-head-element, @next/next/no-css-tags -- Standalone HTTP fixture, outside the Next router. */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { renderToPipeableStream, renderToString } from 'react-dom/server'
import { build } from 'esbuild'
import postcss from 'postcss'
import tailwind from '@tailwindcss/postcss'
import DashboardContent from '@/app/(frontend)/members/(dashboard)/DashboardContent'
import DashboardShell from '@/app/(frontend)/members/_components/DashboardShell'
import { deferredData, fixtureShell, scenarios, type Scenario } from './data'

const root = process.cwd()
const cssFile = path.join(root, 'src/app/(frontend)/globals.css')
const [stylesheet, client] = await Promise.all([
  postcss([tailwind()]).process(await readFile(cssFile, 'utf8'), { from: cssFile }),
  build({
    entryPoints: ['tests/fixtures/dashboard/client.tsx'],
    bundle: true,
    write: false,
    platform: 'browser',
    format: 'iife',
    define: {
      'process.env': '{}',
      'process.env.NODE_ENV': '"development"',
      'process.env.NEXT_PUBLIC_SERVER_URL': '""',
    },
    logLevel: 'silent',
  }),
])
const fontCss = [
  ['400', 'Regular'],
  ['500', 'Medium'],
  ['600', 'SemiBold'],
  ['700', 'Bold'],
]
  .map(
    ([weight, name]) =>
      `@font-face{font-family:DashboardFixture;src:url('/fonts/Poppins-${name}.ttf');font-weight:${weight};font-display:block}`,
  )
  .join('')
const css =
  stylesheet.css +
  fontCss +
  ':root{--font-poppins:DashboardFixture;--font-geist-mono:monospace}body{margin:0}'
const runs = new Map<string, ReturnType<typeof deferredData>>()
const observer = `window.dashboardLayoutShifts=[];new PerformanceObserver(list=>list.getEntries().forEach(e=>{if(!e.hadRecentInput)window.dashboardLayoutShifts.push(e.value)})).observe({type:'layout-shift',buffered:true})`

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', 'http://localhost')
  if (url.pathname === '/styles.css') {
    response.setHeader('Content-Type', 'text/css')
    response.end(css)
    return
  }
  if (url.pathname === '/client.js') {
    response.setHeader('Content-Type', 'text/javascript')
    response.end(client.outputFiles[0].text)
    return
  }
  if (/^\/fonts\/Poppins-(Regular|Medium|SemiBold|Bold)\.ttf$/.test(url.pathname)) {
    response.setHeader('Content-Type', 'font/ttf')
    response.end(await readFile(path.join(root, 'public', url.pathname)))
    return
  }
  if (url.pathname === '/avatar.svg') {
    response.setHeader('Content-Type', 'image/svg+xml')
    response.end(
      '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#3090a0" /></svg>',
    )
    return
  }
  if (url.pathname === '/resolve') {
    const key = url.searchParams.get('slot') || 'all'
    const run = runs.get(url.searchParams.get('run') || '')
    if (!run || !['all', 'avatar', 'attendance', 'dues', 'meeting', 'inbox'].includes(key)) {
      response.writeHead(404)
      response.end()
      return
    }
    run.resolve(key as keyof typeof run.data | 'all')
    response.end('resolved')
    return
  }
  if (url.pathname === '/MarkOfExcellence_Simple.svg') {
    response.setHeader('Content-Type', 'image/svg+xml')
    response.end(await readFile(path.join(root, 'public/MarkOfExcellence_Simple.svg')))
    return
  }
  if (url.pathname !== '/' && url.pathname !== '/interactive') {
    response.writeHead(404)
    response.end()
    return
  }
  const scenarioValue = url.searchParams.get('scenario') as Scenario
  const scenario = scenarios.includes(scenarioValue) ? scenarioValue : 'populated'
  response.setHeader('Content-Type', 'text/html; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  if (url.pathname === '/interactive') {
    const html = renderToString(<DashboardShell {...fixtureShell()} />)
    response.end(
      `<!doctype html><html data-theme="dark"><head><link rel="stylesheet" href="/styles.css"><script>${observer}</script></head><body><div id="fixture-root">${html}</div><script src="/client.js"></script></body></html>`,
    )
    return
  }
  const runId = url.searchParams.get('run') || 'default'
  const run = deferredData(scenario)
  runs.set(runId, run)
  const stream = renderToPipeableStream(
    <html data-theme="dark">
      <head>
        <link rel="stylesheet" href="/styles.css" />
        <script dangerouslySetInnerHTML={{ __html: observer }} />
      </head>
      <body>
        <DashboardContent shell={fixtureShell(scenario)} data={run.data} />
      </body>
    </html>,
    {
      onShellReady() {
        stream.pipe(response)
      },
      onError(error) {
        if (!response.destroyed) console.error(error)
      },
    },
  )
  response.on('close', () => {
    run.resolve('all')
    runs.delete(runId)
    if (!response.writableEnded) stream.abort()
  })
})
server.listen(3117, '127.0.0.1', () => console.log('Dashboard fixture ready on 3117'))
