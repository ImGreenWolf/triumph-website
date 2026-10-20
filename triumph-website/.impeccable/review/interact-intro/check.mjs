import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'
const base = 'http://127.0.0.1:3122'
const output = '.impeccable/review/interact-intro'
const browser = await chromium.launch({headless:true})
const page = await browser.newPage()
const failures=[]
page.on('pageerror', error=>failures.push(error.message))
const scenarios=['photo','noPhoto','unpopulated','nonImage','missingUrl','noAlt','minimal','long','repeated']
const results=[]
for(const width of [320,390,768,1440]) {
  await page.setViewportSize({width,height:1000})
  for(const scenario of scenarios) {
    await page.goto(`${base}/?scenario=${scenario}`)
    await page.locator('section').first().waitFor()
    await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})))})
    const count=scenario==='repeated'?2:1
    const hasPhoto=!['noPhoto','unpopulated','nonImage','missingUrl','minimal'].includes(scenario)
    assert.equal(await page.locator('section').count(),count)
    assert.equal(await page.locator('figure').count(),hasPhoto?count:0)
    assert.equal(await page.locator('h2').count(),count)
    assert.equal(await page.locator('h3').count(),count)
    assert.equal(await page.locator('figcaption').count(),hasPhoto?count:0)
    assert.equal(await page.locator('a,button,video').count(),0)
    const layout=await page.evaluate(()=>({
      visible: [...document.querySelectorAll('html,body,main,section')].every(e => getComputedStyle(e).opacity === '1' && getComputedStyle(e).visibility === 'visible'),
      overflow:document.documentElement.scrollWidth>innerWidth,
      duplicateIds:[...document.querySelectorAll('[id]')].map(e=>e.id).filter((id,i,all)=>all.indexOf(id)!==i),
      images:[...document.images].map(img=>({loaded:img.complete && img.naturalWidth>0,alt:img.alt})),
      order:[...document.querySelectorAll('section')].map(s=>{
        const title=s.querySelector('h2').getBoundingClientRect()
        const image=s.querySelector('figure')?.getBoundingClientRect()
        return !image || (innerWidth<1024 ? image.top>title.bottom : image.left>title.right)
      }),
      measured:[...document.querySelectorAll('h2,h3,p,figcaption')].map(e=>({tag:e.tagName,color:getComputedStyle(e).color,font:getComputedStyle(e).fontFamily,fontSize:getComputedStyle(e).fontSize,lineHeight:getComputedStyle(e).lineHeight}))
    }))
    assert.equal(layout.visible,true,`Visible at ${width} ${scenario}`)
    assert.equal(layout.overflow,false,`Overflow at ${width} ${scenario}`)
    assert.equal(layout.duplicateIds.length,0)
    assert.ok(layout.order.every(Boolean),`Reading order at ${width} ${scenario}`)
    assert.ok(layout.images.every(img=>img.loaded && img.alt),`Image load/alt at ${width} ${scenario}`)
    if(scenario==='noAlt') assert.equal(layout.images[0].alt,'Comunitatea Interact București Triumph')
    results.push({width,scenario,...layout})
    const shot = scenario==='photo' ? ({1440:'desktop',390:'mobile',320:'small',768:'tablet'}[width])
      : width===1440 && scenario==='noPhoto' ? 'no-photo'
      : width===390 && scenario==='long' ? 'long-mobile'
      : width===320 && scenario==='repeated' ? 'repeated-small' : null
    if(shot) await page.screenshot({path:`${output}/${shot}.png`,fullPage:true})
  }
}
assert.deepEqual(failures,[])
await writeFile(`${output}/results.json`,JSON.stringify({checks:results.length,errors:failures,results},null,2))
console.log(`Passed ${results.length} responsive scenarios; 7 screenshots captured; no browser errors.`)
await browser.close()
