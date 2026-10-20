import { createServer } from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { build } from 'esbuild'
import postcss from 'postcss'
import tailwind from '@tailwindcss/postcss'

const root = process.cwd()
const cssFile = path.join(root, 'src/app/(frontend)/globals.css')
const [stylesheet, client] = await Promise.all([
  postcss([tailwind()]).process(await readFile(cssFile, 'utf8'), { from: cssFile }),
  build({
    stdin: { contents: `
      import React from 'react'
      import { createRoot } from 'react-dom/client'
      import { InteractIntroBlock } from '@/blocks/InteractIntro/Component'
      import { InteractIntro } from '@/blocks/InteractIntro/config'
      const defaults = Object.fromEntries(InteractIntro.fields.filter(f => 'name' in f).map(f => [f.name, f.defaultValue]))
      const scenario = new URLSearchParams(location.search).get('scenario') || 'photo'
      const photo = { id:'fixture', url:'/fixture-photo.jpg', mimeType:'image/jpeg', alt:'Fotografie de test pentru aspectul blocului', width:1400, height:994 }
      const data = { ...defaults, blockType:'interactIntro', photo, caption:'Fotografie de test pentru verificarea aspectului.' }
      if (scenario === 'noPhoto') data.photo = null
      if (scenario === 'unpopulated') data.photo = 'media-id'
      if (scenario === 'nonImage') data.photo = { ...photo, mimeType:'video/mp4' }
      if (scenario === 'missingUrl') data.photo = { ...photo, url:null }
      if (scenario === 'noAlt') data.photo = { ...photo, alt:'' }
      if (scenario === 'minimal') { data.photo=null; data.eyebrow=''; data.caption='' }
      if (scenario === 'long') {
        data.title = 'Împreună descoperim ce înseamnă să fim Interact'
        data.introduction = defaults.introduction + '\\n\\n' + defaults.introduction
        data.clubTitle = 'București'.repeat(9)
        data.clubDescription = defaults.clubDescription + '\\n\\n' + 'Voluntariat'.repeat(16)
        data.caption = 'Comunitate'.repeat(16)
      }
      const count = scenario === 'repeated' ? 2 : 1
      createRoot(document.getElementById('root')).render(<main>{Array.from({length:count}, (_,i) => <div className="my-16" key={i}><InteractIntroBlock {...data} /></div>)}</main>)
    `, resolveDir: root, loader:'tsx' },
    bundle:true, write:false, platform:'browser', format:'iife',
    define:{'process.env':'{}', 'process.env.NODE_ENV':'"development"'},
    plugins:[{name:'next-image-entry', setup(build) {
      build.onResolve({filter:/^next\/image$/}, () => ({path:'next-image', namespace:'fixture-image'}))
      build.onLoad({filter:/.*/,namespace:'fixture-image'}, () => ({contents:'export { Image as default } from "next/dist/client/image-component.js"', loader:'js', resolveDir:root}))
    }}], logLevel:'silent'
  })
])
const fontCss = ['Regular','Medium','SemiBold','Bold'].map((name,i) => `@font-face{font-family:InteractFixture;src:url(/fonts/Poppins-${name}.ttf);font-weight:${[400,500,600,700][i]};font-display:block}`).join('')
const css = stylesheet.css + fontCss + ':root{--font-poppins:InteractFixture}body{font-family:InteractFixture,system-ui,sans-serif;margin:0}'
const photo = await readFile(path.join(root, 'public/media/DSC09767_resized-1400x994.jpg'))
const server = createServer(async (req,res) => {
  const url = new URL(req.url || '/', 'http://localhost')
  if(url.pathname === '/styles.css') { res.setHeader('Content-Type','text/css'); res.end(css) }
  else if(url.pathname === '/client.js') { res.setHeader('Content-Type','text/javascript'); res.end(client.outputFiles[0].text) }
  else if(url.pathname === '/fixture-photo.jpg' || url.pathname === '/_next/image') {res.setHeader('Content-Type','image/jpeg'); res.end(photo)}
  else if(/^\/fonts\/Poppins-(Regular|Medium|SemiBold|Bold)\.ttf$/.test(url.pathname)) {res.setHeader('Content-Type','font/ttf');res.end(await readFile(path.join(root,'public',url.pathname)))}
  else { res.setHeader('Content-Type','text/html; charset=utf-8'); res.end('<!doctype html><html lang="ro" data-theme="dark"><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><div id="root"></div><script src="/client.js"></script></body></html>') }
})
server.listen(3122, '127.0.0.1', () => console.log('Interact preview ready at http://127.0.0.1:3122'))
