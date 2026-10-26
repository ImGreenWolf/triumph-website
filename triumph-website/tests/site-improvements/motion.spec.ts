import { expect, test } from '@playwright/test'

const home = 'http://localhost:3000/'
const transition = '[data-page-transition]'

for (const width of [390, 1440]) {
  test(`${width}px: blinds cover before navigation and clear after arrival and history changes`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(home)
    const overlay = page.locator(transition)
    await expect(overlay).toHaveAttribute('data-phase', 'idle')
    await page.getByRole('button', { name: 'Deschide meniul' }).click()
    const link = page.locator('.club-header__directory a[href="/events"]').first()
    await link.focus()
    await page.keyboard.press('Enter')
    await expect(overlay).toHaveAttribute('data-phase', 'covering')
    expect(new URL(page.url()).pathname).toBe('/')
    await expect(page).toHaveURL(/\/events$/)
    await expect(overlay).toHaveAttribute('data-phase', 'idle')
    await expect(page.locator('[data-site-page]')).not.toHaveAttribute('aria-busy')
    expect(await overlay.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none')
    await page.goBack()
    await expect(page).toHaveURL(home)
    await expect(overlay).toHaveAttribute('data-phase', 'idle')
    await page.goForward()
    await expect(page).toHaveURL(/\/events$/)
    await expect(overlay).toHaveAttribute('data-phase', 'idle')
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
  })

  test(`${width}px: footer comes into focus and stays readable for keyboard input`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto(home)
    const footer = page.locator('[data-footer]')
    const panel = page.locator('[data-footer-panel]')
    await expect(footer).toHaveAttribute('data-sticky', /true|false/)
    const sticky = (await footer.getAttribute('data-sticky')) === 'true'
    if (sticky) {
      await page.evaluate(() => {
        const anchor = document.querySelector('[data-footer-anchor]')!
        const panel = document.querySelector('[data-footer-panel]')! as HTMLElement
        const top = anchor.getBoundingClientRect().top + window.scrollY
        window.scrollTo({ top: top - innerHeight + panel.offsetHeight / 2, behavior: 'instant' })
      })
      await expect
        .poll(async () =>
          panel.evaluate((el) =>
            parseFloat(getComputedStyle(el).filter.match(/[\d.]+/)?.[0] || '0'),
          ),
        )
        .toBeGreaterThan(1)
    }
    await page.evaluate(() =>
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }),
    )
    await expect
      .poll(async () => panel.evaluate((el) => getComputedStyle(el).filter))
      .toMatch(/none|blur\(0px\)/)
    await footer.locator('a,button').first().focus()
    await expect(footer.locator('a,button').first()).toBeFocused()
    await expect
      .poll(async () => panel.evaluate((el) => getComputedStyle(el).filter))
      .toMatch(/none|blur\(0px\)/)
  })
}

test('reduced motion skips blinds and footer blur, including a live preference change', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(home)
  await page.getByRole('button', { name: 'Deschide meniul' }).click()
  await page.locator('.club-header__directory a[href="/events"]').first().click()
  await expect(page).toHaveURL(/\/events$/)
  await expect(page.locator(transition)).toHaveAttribute('data-phase', 'idle')
  await expect(page.locator(transition)).not.toBeVisible()
  await expect(page.locator('[data-footer]')).toHaveAttribute('data-sticky', 'false')
  await expect
    .poll(async () =>
      page.locator('[data-footer-panel]').evaluate((el) => getComputedStyle(el).filter),
    )
    .toBe('none')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.getByRole('button', { name: 'Deschide meniul' }).click()
  await page.locator('.club-header__brand').click()
  await expect(page.locator(transition)).toHaveAttribute('data-phase', /covering|covered/)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator(transition)).toHaveAttribute('data-phase', 'idle')
  await expect(page).toHaveURL(home)
  await expect(page.locator('[data-site-page]')).not.toHaveAttribute('aria-busy')
})

test('stalled navigation releases the overlay, and Escape can dismiss it early', async ({
  page,
}) => {
  await page.goto(home)
  // A unique destination avoids Next's existing prefetch cache.
  const target = '/events?motion-stall=1'
  await page.route('**/events?motion-stall=1*', async (route) => {
    await new Promise<void>((resolve) => page.once('close', () => resolve()))
    await route.abort().catch(() => {})
  })
  await page.evaluate((target) => {
    const link = document.createElement('a')
    link.href = target
    link.textContent = 'Slow route test'
    link.id = 'slow-route-test'
    document.body.append(link)
  }, target)
  await page.locator('#slow-route-test').click()
  await expect(page.locator(transition)).toHaveAttribute('data-phase', 'covered')
  await expect(page.locator(transition)).toHaveAttribute('data-phase', 'idle', { timeout: 6000 })
  await page.locator('#slow-route-test').click()
  await expect(page.locator(transition)).toHaveAttribute('data-phase', 'covering')
  await page.keyboard.press('Escape')
  await expect(page.locator(transition)).toHaveAttribute('data-phase', 'idle')
})

test('public content is visible without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('http://localhost:3000/events')
  await expect(page.locator('main h1')).toBeVisible()
  await expect(page.locator(transition)).not.toBeVisible()
  await context.close()
})

test('content entrances run once and leave styles clean after settling or keyboard focus', async ({
  page,
}) => {
  await page.goto(home)
  const block = page.locator('.cms-block--homepageEvents')
  await expect(block).toBeVisible()
  await block.evaluate((element) => {
    const samples: string[] = []
    const observer = new MutationObserver(() => samples.push(element.getAttribute('style') || ''))
    observer.observe(element, { attributes: true, attributeFilter: ['style', 'data-reveal'] })
    Object.assign(window, { entranceSamples: samples, entranceObserver: observer })
    window.scrollTo({
      top: element.getBoundingClientRect().top + scrollY - innerHeight / 2,
      behavior: 'instant',
    })
  })
  await expect
    .poll(async () =>
      page.evaluate(() =>
        (window as Window & { entranceSamples?: string[] }).entranceSamples?.some((value) =>
          value.includes('opacity'),
        ),
      ),
    )
    .toBe(true)
  // Wait for the block wrapper to settle; animation styles may be driven by WAAPI.
  await expect.poll(async () => block.getAttribute('data-reveal')).toBe('visible')
  const sampleCount = await page.evaluate(
    () => (window as Window & { entranceSamples?: string[] }).entranceSamples!.length,
  )
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await block.evaluate((element) =>
    window.scrollTo({
      top: element.getBoundingClientRect().top + scrollY - innerHeight / 2,
      behavior: 'instant',
    }),
  )
  await page.waitForTimeout(450)
  expect(
    await page.evaluate(
      () => (window as Window & { entranceSamples?: string[] }).entranceSamples!.length,
    ),
  ).toBe(sampleCount)
  // On a fresh visit, focusing a link ends an in-progress entrance immediately.
  await page.goto('http://localhost:3000/events')
  await page.locator('main a').first().focus()
  await expect
    .poll(async () =>
      page
        .locator('main > section')
        .first()
        .evaluate((element) => (element as HTMLElement).style.transform),
    )
    .toBe('')
})

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`page navigation resets to the top before showing the destination (${reducedMotion})`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion })
    await page.goto(home)
    await page.evaluate(() =>
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }),
    )
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(1000)
    await page.evaluate(() => {
      const positions: number[] = []
      Object.assign(window, { routeScrollPositions: positions })
      const sample = () => {
        const overlay = document.querySelector('[data-page-transition]')
        if (location.pathname === '/events' && overlay?.getAttribute('data-phase') !== 'covered')
          positions.push(scrollY)
        requestAnimationFrame(sample)
      }
      requestAnimationFrame(sample)
    })
    await page.locator('[data-footer] a[href="/events"]').first().click()
    await expect(page).toHaveURL(/\/events$/)
    await expect(page.locator(transition)).toHaveAttribute('data-phase', 'idle')
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)
    await page.waitForTimeout(150)
    expect(
      await page.evaluate(() =>
        (window as Window & { routeScrollPositions?: number[] }).routeScrollPositions!.every(
          (y) => y <= 1,
        ),
      ),
    ).toBe(true)
    await page.goBack()
    await expect(page).toHaveURL(home)
    await expect(page.locator(transition)).toHaveAttribute('data-phase', 'idle')
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)
  })
}

test('each block reveals independently, including tall blocks, forms and existing motion', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?case=block-motion')
  for (let index = 0; index < 4; index++) {
    await expect
      .poll(() =>
        page
          .locator(`#entrance-block-${index}`)
          .locator('..')
          .evaluate((el) => getComputedStyle(el).opacity),
      )
      .toBe('0')
  }
  for (let index = 0; index < 4; index++) {
    const block = page.locator(`#entrance-block-${index}`).locator('..')
    await block.evaluate((element) =>
      window.scrollTo({
        top: element.getBoundingClientRect().top + scrollY - 300,
        behavior: 'instant',
      }),
    )
    await expect.poll(() => block.evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
    await expect.poll(() => block.getAttribute('data-reveal')).toBe('visible')
    if (index < 3)
      await expect
        .poll(() =>
          page
            .locator(`#entrance-block-${index + 1}`)
            .locator('..')
            .evaluate((el) => getComputedStyle(el).opacity),
        )
        .toBe('0')
  }
})

test('focus and reduced motion restore blocks that have not entered yet', async ({ page }) => {
  await page.goto(home)
  const block = page.locator('.cms-block--homepageEvents')
  await expect.poll(() => block.evaluate((el) => getComputedStyle(el).opacity)).toBe('0')
  await block.locator('a').first().focus()
  await expect.poll(() => block.evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
  await page.goto(home)
  await expect
    .poll(() =>
      page.locator('.cms-block--homepageEvents').evaluate((el) => getComputedStyle(el).opacity),
    )
    .toBe('0')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect
    .poll(() =>
      page.locator('.cms-block--homepageEvents').evaluate((el) => getComputedStyle(el).opacity),
    )
    .toBe('1')
})

for (const reduced of [false, true]) {
  test(`stats reveal in order and remain readable (reduced motion: ${reduced})`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' })
    await page.goto(home)
    const row = page.locator('[data-stats-reveal]').first()
    await expect(row.locator('[data-stat]')).toHaveCount(4)
    if (!reduced) await expect(row).toHaveAttribute('data-reveal', 'waiting')
    await row.evaluate((element) => {
      const samples: number[][] = []
      Object.assign(window, { statRevealSamples: samples })
      let frames = 0
      const sample = () => {
        samples.push(
          Array.from(element.querySelectorAll('[data-stat]'), (stat) =>
            Number(getComputedStyle(stat).opacity),
          ),
        )
        if (++frames < 90) requestAnimationFrame(sample)
      }
      requestAnimationFrame(sample)
      window.scrollTo({
        top: element.getBoundingClientRect().top + scrollY - innerHeight / 2,
        behavior: 'instant',
      })
    })
    await expect(row).toHaveAttribute('data-reveal', 'visible')
    for (const stat of await row.locator('[data-stat]').all())
      await expect(stat).toHaveCSS('opacity', '1')
    const staggered = await page.evaluate(() =>
      (window as Window & { statRevealSamples?: number[][] }).statRevealSamples!.some(
        (values) => values[0] > values[values.length - 1] + 0.1,
      ),
    )
    expect(staggered).toBe(!reduced)
  })
}
