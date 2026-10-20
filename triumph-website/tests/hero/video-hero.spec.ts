import { expect, test } from '@playwright/test'

test('handwriting and video pause offscreen and in hidden tabs, then resume without restarting', async ({
  page,
}) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () {
      this.dataset.playCalls = String(Number(this.dataset.playCalls ?? 0) + 1)
      return Promise.resolve()
    }
    HTMLMediaElement.prototype.pause = function () {
      this.dataset.pauseCalls = String(Number(this.dataset.pauseCalls ?? 0) + 1)
    }
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent('hero-config', {
        detail: {
          entries: [{ text: 'Împreună' }],
          initialDelay: 0,
          writingDuration: 10,
        },
      }),
    ),
  )
  const path = page.locator('[data-handwriting-entry="0"] [data-reveal-path]')
  const offset = () =>
    path.evaluate((element) => Number.parseFloat(getComputedStyle(element).strokeDashoffset))
  await expect.poll(offset).toBeLessThan(0.97)
  await page.evaluate(() => {
    const spacer = document.createElement('div')
    spacer.style.height = '200vh'
    document.body.append(spacer)
    window.scrollTo({ top: innerHeight * 1.5, behavior: 'instant' })
  })
  const video = page.locator('video')
  await expect.poll(() => video.getAttribute('data-pause-calls')).not.toBeNull()
  await page.waitForTimeout(150)
  const pausedOffset = await offset()
  await page.waitForTimeout(300)
  expect(await offset()).toBe(pausedOffset)
  const plays = Number(await video.getAttribute('data-play-calls'))
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await expect.poll(offset).toBeLessThan(pausedOffset)
  expect(Number(await video.getAttribute('data-play-calls'))).toBeGreaterThan(plays)

  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  const hiddenOffset = await offset()
  await page.waitForTimeout(300)
  expect(await offset()).toBe(hiddenOffset)
  await page.evaluate(() => {
    Reflect.deleteProperty(document, 'hidden')
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect.poll(offset).toBeLessThan(hiddenOffset)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(video).not.toHaveAttribute('autoplay', '')
  await expect(video).toHaveCSS('opacity', '0')
  await expect(page.getByRole('link', { name: 'Alătură-te nouă' })).toBeVisible()
})

test('reduced motion never starts background video, even after video becomes ready', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () {
      this.dataset.playCalls = String(Number(this.dataset.playCalls ?? 0) + 1)
      return Promise.resolve()
    }
  })
  await page.goto('/')
  const video = page.locator('video')
  await expect(video).not.toHaveAttribute('autoplay', '')
  await expect(video).toHaveCSS('opacity', '0')
  await video.dispatchEvent('loadeddata')
  await expect(video).toHaveCSS('opacity', '0')
  expect(await video.getAttribute('data-play-calls')).toBeNull()
  await expect(page.getByRole('link', { name: 'Alătură-te nouă' })).toBeVisible()
})

test('parallel reveal overlaps every transition smoothly and can be disabled in live preview', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  const configure = (parallelReveal: boolean) =>
    page.evaluate(
      (parallelReveal) =>
        window.dispatchEvent(
          new CustomEvent('hero-config', {
            detail: {
              parallelReveal,
              loop: true,
              entries: [{ text: 'Împreună' }, { text: 'Schimbăm lumea' }, { text: 'Triumph' }],
              initialDelay: 0.2,
              writingDuration: 0.4,
              holdDuration: 0.12,
              fadeDuration: 0.3,
              finalDelay: 0.2,
              entryGap: 0.1,
            },
          }),
        ),
      parallelReveal,
    )
  await configure(true)
  const sample = (duration: number) =>
    page.locator('[data-hero-stage]').evaluate(async (stage, duration) => {
      const entries = Array.from(stage.querySelectorAll('[data-handwriting-entry]'))
      const pairs: Record<string, number> = {}
      let overlapFrames = 0
      let maxVisible = 0
      const started = performance.now()
      await new Promise<void>((resolve) => {
        const frame = (now: number) => {
          const values = entries.map((entry) => ({
            opacity: Number(getComputedStyle(entry).opacity),
            offset: Number.parseFloat(
              getComputedStyle(entry.querySelector('[data-reveal-path]')!).strokeDashoffset,
            ),
          }))
          maxVisible = Math.max(maxVisible, values.filter(({ opacity }) => opacity > 0).length)
          const outgoing = values.findIndex(({ opacity }) => opacity > 0 && opacity < 1)
          const incoming = values.findIndex(
            ({ opacity, offset }) => opacity === 1 && offset > 0 && offset < 1,
          )
          if (outgoing >= 0 && incoming >= 0 && outgoing !== incoming) {
            const key = `${outgoing}-${incoming}`
            pairs[key] = (pairs[key] ?? 0) + 1
            overlapFrames++
          }
          if (now - started < duration) requestAnimationFrame(frame)
          else resolve()
        }
        requestAnimationFrame(frame)
      })
      return { pairs, overlapFrames, maxVisible }
    }, duration)
  const parallel = await sample(4200)
  expect(parallel.maxVisible).toBe(2)
  for (const pair of ['0-1', '1-2', '2-0']) expect(parallel.pairs[pair]).toBeGreaterThan(15)
  await expect(page.getByRole('link', { name: 'Alătură-te nouă' })).toBeVisible()
  await configure(false)
  const sequential = await sample(2200)
  expect(sequential.overlapFrames).toBe(0)
  expect(sequential.maxVisible).toBe(1)
})

test('final delay keeps the last entry visible before the closing title appears', async ({
  page,
}) => {
  await page.goto('/?case=onceTitle')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent('hero-config', {
        detail: {
          loop: false,
          entries: [{ text: 'Final' }],
          initialDelay: 0,
          writingDuration: 0.1,
          holdDuration: 0,
          finalDelay: 1.5,
          fadeDuration: 0.2,
        },
      }),
    ),
  )
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Final')
  await expect(page.locator('[data-reveal-path]')).toHaveCSS('stroke-dashoffset', '0px')
  await page.waitForTimeout(500)
  await expect(page.locator('[data-hero-final-title]')).toBeHidden()
  await expect(page.locator('[data-handwriting-entry="0"]')).toHaveCSS('opacity', '1')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Existing title')
})

for (const scenario of ['onceTitle', 'onceMedia']) {
  test(`${scenario}: finishes once, displays the closing content, and keeps buttons stationary`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/?case=${scenario}`)
    await expect(page.locator('[data-hero-final-title]')).toBeHidden()
    await expect(page.getByRole('link', { name: 'Alătură-te nouă' })).toBeVisible()
    const position = () =>
      page.locator('[data-hero-links]').evaluate((element) => {
        const rect = element.getBoundingClientRect()
        return { x: rect.x, y: rect.y + scrollY, width: rect.width, height: rect.height }
      })
    const before = await position()
    if (scenario === 'onceTitle')
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Existing title')
    else {
      await expect(page.getByRole('img', { name: 'Triumph' })).toBeVisible()
      await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('Triumph')
    }
    await expect(page.locator('[data-hero-final-title]')).toBeVisible()
    expect(await position()).toEqual(before)
    await page.waitForTimeout(1000)
    expect(
      await page
        .locator('[data-handwriting-entry]')
        .evaluateAll((entries) =>
          entries.every((entry) => getComputedStyle(entry).visibility === 'hidden'),
        ),
    ).toBe(true)
    await expect(page.locator('[data-hero-final-title]')).toBeVisible()
  })
}

test('without a closing title, a finite sequence rests on its final entry', async ({ page }) => {
  await page.goto('/?case=onceEmpty')
  await expect(page.getByRole('link', { name: 'Alătură-te nouă' })).toBeVisible()
  await expect(page.locator('[data-handwriting-entry="2"]')).toBeVisible()
  await expect(page.locator('[data-hero-final-title]')).toHaveCount(0)
  await page.waitForTimeout(1000)
  expect(
    await page
      .locator('[data-handwriting-entry="2"] [data-reveal-path]')
      .evaluate((path) => getComputedStyle(path).strokeDashoffset),
  ).toBe('0px')
  await expect(page.locator('[data-handwriting-entry="0"]')).toBeHidden()
})

test('reduced motion immediately displays the closing title or media for a finite sequence', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/?case=onceTitle')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Existing title')
  await expect(page.getByRole('link', { name: 'Alătură-te nouă' })).toBeVisible()
  await page.goto('/?case=onceMedia')
  await expect(page.getByRole('img', { name: 'Triumph' })).toBeVisible()
})

test('changing the loop checkbox in live preview resets completed playback', async ({ page }) => {
  await page.goto('/?case=onceTitle')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Existing title')
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent('hero-config', {
        detail: {
          loop: true,
          entries: [{ text: 'Repetăm' }],
          initialDelay: 0.1,
          writingDuration: 0.2,
          holdDuration: 0.2,
          fadeDuration: 0.1,
        },
      }),
    ),
  )
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Repetăm')
  await expect(page.locator('[data-hero-final-title]')).toHaveCount(0)
  await page.waitForFunction(
    () =>
      getComputedStyle(document.querySelector('[data-handwriting-entry="0"]')!).visibility ===
      'hidden',
  )
  await expect(page.locator('[data-handwriting-entry="0"]')).toBeVisible()
})

test('a whole phrase has one SVG shape and a smoothly decreasing reveal offset', async ({
  page,
}, testInfo) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent('hero-config', {
        detail: {
          entries: [{ text: 'Împreună schimbăm lumea' }],
          initialDelay: 0.5,
          writingDuration: 3,
        },
      }),
    ),
  )
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Împreună schimbăm lumea')
  const entry = page.locator('[data-handwriting-entry="0"]')
  await expect(entry.locator('[data-ink]')).toHaveCount(1)
  await expect(entry.locator('mask')).toHaveCount(1)
  await expect(entry.locator('[data-reveal-path]')).toHaveCount(1)
  await expect(entry.locator('[data-glyph-complete]')).toHaveCount(0)
  const metrics = await entry.evaluate(async (element) => {
    const path = element.querySelector('[data-reveal-path]')!
    const offsets: number[] = []
    const started = performance.now()
    await new Promise<void>((resolve) => {
      const sample = (now: number) => {
        offsets.push(Number.parseFloat(getComputedStyle(path).strokeDashoffset))
        if (now - started < 2000) requestAnimationFrame(sample)
        else resolve()
      }
      requestAnimationFrame(sample)
    })
    return {
      sampledFrames: offsets.length,
      intermediateFrames: offsets.filter((value) => value > 0 && value < 1).length,
      monotonic: offsets.every((value, index) => index === 0 || value <= offsets[index - 1]),
      largestStep: Math.max(...offsets.slice(1).map((value, index) => offsets[index] - value)),
      continuousPath: (path.getAttribute('d')!.match(/M/g) || []).length === 1,
    }
  })
  expect(metrics.continuousPath).toBe(true)
  expect(metrics.monotonic).toBe(true)
  expect(metrics.intermediateFrames).toBeGreaterThan(20)
  expect(metrics.largestStep).toBeLessThan(0.1)
  await testInfo.attach('animation-frame-sampling.json', {
    body: JSON.stringify(metrics),
    contentType: 'application/json',
  })
})

for (const [width, height] of [
  [1440, 900],
  [768, 1024],
  [390, 844],
  [320, 568],
  [844, 390],
]) {
  test(`${width}×${height}: stable looping layout and responsive video`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height })
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Împreună · Schimbăm lumea · Triumph',
    )
    await expect(page.locator('video')).toHaveAttribute('src', width >= 1024 ? /desktop/ : /mobile/)
    await expect(page.getByRole('link', { name: 'Alătură-te nouă' })).toBeVisible()
    // Visible ink must be the font's filled contours; animated centerlines belong only in masks.
    const ink = page.locator('[data-handwriting-entry="0"] [data-ink]')
    expect(await ink.count()).toBe(1)
    expect(
      await ink.evaluateAll((paths) =>
        paths.every(
          (path) =>
            path.getAttribute('fill') === 'currentColor' &&
            /[zZ]/.test(path.getAttribute('d') || '') &&
            path.getAttribute('mask')?.startsWith('url(#'),
        ),
      ),
    ).toBe(true)
    expect(
      await page
        .locator('[data-reveal-path]')
        .evaluateAll((paths) => paths.every((path) => Boolean(path.closest('mask')))),
    ).toBe(true)
    await page.evaluate(() => document.fonts.ready)
    const before = await page.locator('[data-hero-links]').evaluate((element) => {
      const rect = element.getBoundingClientRect()
      return { x: rect.x, y: rect.y + scrollY, width: rect.width, height: rect.height }
    })
    await page.screenshot({ path: testInfo.outputPath('hero.png'), fullPage: true })
    await expect(page.locator('[data-handwriting-entry="1"]')).toBeVisible()
    const after = await page.locator('[data-hero-links]').evaluate((element) => {
      const rect = element.getBoundingClientRect()
      return { x: rect.x, y: rect.y + scrollY, width: rect.width, height: rect.height }
    })
    expect(after).toEqual(before)
    await expect(page.getByRole('link', { name: 'Alătură-te nouă' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    )
    await expect(page.locator('[data-hero-stage]')).toHaveCSS(
      'font-size',
      height <= 500
        ? '72px'
        : width >= 1024
          ? '160px'
          : width >= 768
            ? `${width * 0.12}px`
            : '72px',
    )
    const composition = await page.locator('[data-hero-stage]').evaluate((stage) => {
      const svg = stage.querySelector<SVGSVGElement>('svg')!
      const ink = Array.from(stage.querySelectorAll<SVGPathElement>('[data-ink]'))
      const scale = stage.getBoundingClientRect().width / svg.viewBox.baseVal.width
      const bottomEdges = ink.map((path) => {
        const box = path.getBBox()
        return stage.getBoundingClientRect().top + (box.y + box.height) * scale
      })
      const support = document.querySelector('[data-hero-support]')!.getBoundingClientRect()
      const root = stage.closest('section')!
      const content = root.firstElementChild!.getBoundingClientRect()
      const hero = root.getBoundingClientRect()
      return {
        bottomSpread: Math.max(...bottomEdges) - Math.min(...bottomEdges),
        copyGap: support.top - Math.max(...bottomEdges),
        centerOffset: Math.abs((content.top + content.bottom) / 2 - (hero.top + hero.bottom) / 2),
      }
    })
    expect(composition.bottomSpread).toBeLessThan(1)
    expect(composition.copyGap).toBeGreaterThanOrEqual(24)
    expect(composition.copyGap).toBeLessThan(40)
    expect(composition.centerOffset).toBeLessThan(1)
    const heading = await page.locator('[data-hero-stage]').boundingBox()
    expect(heading!.y + (await page.evaluate(() => scrollY))).toBeGreaterThanOrEqual(120)
    expect(errors).toEqual([])
  })
}

test('buttons are unavailable before writing completes; keyboard access works', async ({
  page,
}) => {
  await page.goto('/?case=delayed')
  await expect(page.locator('[data-hero-actions]')).toHaveAttribute('inert', '')
  await expect(page.getByRole('link', { name: 'Alătură-te nouă' })).toHaveCount(0)
  await page.keyboard.press('Tab')
  expect(
    await page
      .locator('[data-hero-actions]')
      .evaluate((element) => element.contains(document.activeElement)),
  ).toBe(false)
  await expect(page.getByRole('link', { name: 'Alătură-te nouă' })).toBeVisible({ timeout: 6000 })
  await page.getByRole('link', { name: 'Alătură-te nouă' }).focus()
  await expect(page.getByRole('link', { name: 'Alătură-te nouă' })).toBeFocused()
  await expect(page.getByRole('link', { name: 'Alătură-te nouă' })).toHaveCSS(
    'outline-width',
    '2px',
  )
  await expect(page.getByRole('link', { name: 'Alătură-te nouă' })).toHaveCSS(
    'outline-offset',
    '4px',
  )
})

test('reduced motion is static, reveals buttons immediately, and responds to preference changes', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/?case=delayed')
  await expect(page.getByRole('link', { name: 'Alătură-te nouă' })).toBeVisible()
  await expect(page.locator('[data-handwriting-entry="0"]')).toBeVisible()
  await expect(page.locator('[data-handwriting-entry="1"]')).toBeHidden()
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect(page.locator('[data-hero-actions]')).toHaveAttribute('inert', '')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.getByRole('link', { name: 'Alătură-te nouă' })).toBeVisible()
  await expect(page.locator('[data-handwriting-entry="0"]')).toBeVisible()
})

test('long phrases wrap without clipping; single entries loop and unknown characters remain text', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/?case=long')
  await expect(page.getByRole('link', { name: 'Alătură-te nouă' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320)
  await page.goto('/?case=single')
  await expect(page.getByRole('link', { name: 'Alătură-te nouă' })).toBeVisible()
  await page.waitForFunction(
    () =>
      getComputedStyle(document.querySelector('[data-handwriting-entry="0"]')!).visibility ===
      'hidden',
  )
  await expect(page.locator('[data-handwriting-entry="0"]')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Alătură-te nouă' })).toBeVisible()
  await page.goto('/?case=unsupported')
  await expect(page.locator('svg text')).toHaveText(['漢', '🎉'])
})

test('live-preview edits restart writing, resize preserves revealed buttons, and unmount cleans up', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Alătură-te nouă' })).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('link', { name: 'Alătură-te nouă' })).toBeVisible()
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent('hero-config', {
        detail: {
          entries: [{ text: 'Nou' }],
          initialDelay: 0.1,
          writingDuration: 1,
          color: '#ffcc00',
        },
      }),
    ),
  )
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nou')
  await expect(page.locator('[data-hero-actions]')).toHaveAttribute('inert', '')
  await expect(page.getByRole('link', { name: 'Alătură-te nouă' })).toBeVisible()
  await page.evaluate(() => window.dispatchEvent(new Event('hero-unmount')))
  await expect(page.getByText('Unmounted')).toBeVisible()
  await page.waitForTimeout(250)
  expect(errors).toEqual([])
})

test('empty entries retain the existing text or image title and immediate buttons', async ({
  page,
}) => {
  await page.goto('/?case=fallback')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Existing title')
  await expect(page.getByRole('link', { name: 'Alătură-te nouă' })).toBeVisible()
  await expect(page.locator('[data-handwriting-entry]')).toHaveCount(0)
  await page.goto('/?case=mediaTitle')
  await expect(page.getByRole('img', { name: 'Triumph' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('Triumph')
  await expect(page.getByRole('link', { name: 'Alătură-te nouă' })).toBeVisible()
})
