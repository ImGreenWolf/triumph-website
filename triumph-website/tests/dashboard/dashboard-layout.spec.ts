import { expect, test, type Page } from '@playwright/test'
import { scenarios } from '../fixtures/dashboard/data'

async function geometry(page: Page) {
  return page.evaluate(() =>
    Object.fromEntries(
      Array.from(
        document.querySelectorAll<HTMLElement>(
          '[data-dashboard-panel], [data-dashboard-footer], [data-dashboard-slot]',
        ),
      ).map((element) => {
        const key = element.dataset.dashboardPanel
          ? `panel:${element.dataset.dashboardPanel}`
          : element.dataset.dashboardFooter
            ? `footer:${element.dataset.dashboardFooter}`
            : `slot:${element.dataset.dashboardSlot}`
        const rect = element.getBoundingClientRect()
        return [
          key,
          { x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: rect.height },
        ]
      }),
    ),
  )
}
function expectStable(
  before: Awaited<ReturnType<typeof geometry>>,
  after: Awaited<ReturnType<typeof geometry>>,
) {
  expect(Object.keys(after)).toEqual(Object.keys(before))
  for (const key of Object.keys(before)) {
    for (const property of ['x', 'y', 'width', 'height'] as const) {
      expect(
        Math.abs(after[key][property] - before[key][property]),
        `${key}.${property}`,
      ).toBeLessThanOrEqual(1)
    }
  }
}
async function painted(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  )
}

for (const width of [390, 768, 1024, 1440]) {
  for (const scenario of scenarios) {
    test(`${width}px ${scenario}: data resolves inside an unchanged shell`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 1000 })
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      const run = `${width}-${scenario}`
      await page.goto(`/?run=${run}&scenario=${scenario}`, { waitUntil: 'commit' })
      try {
        await expect(page.locator('[data-dashboard-panel="attendance"]')).toBeVisible()
        await page.evaluate(() => document.fonts.ready)
        await painted(page)
        const before = await geometry(page)
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
          width,
        )
        if (scenario === 'populated')
          await page.screenshot({ path: testInfo.outputPath('pending.png'), fullPage: true })
        expect(before['slot:avatar'].width).toBe(80)
        expect(before['slot:avatar'].height).toBe(80)
        expect(before['slot:attendance-value'].height).toBe(40)
        expect(before['slot:attendance-progress'].height).toBe(8)
        await expect(page.getByRole('link', { name: 'Profil', exact: true })).toBeVisible()
        await expect(page.getByRole('link', { name: 'Deconectare', exact: true })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Arată codul QR' })).toBeEnabled()
        await expect(
          page.getByRole('button', { name: 'Vezi întâlnirea', exact: true }),
        ).toBeDisabled()
        await expect(page.getByRole('button', { name: /Vezi toate înregistrările/ })).toHaveCount(2)
        expect(await page.locator('[data-dashboard-panel="email"]').count()).toBe(
          scenario === 'member' ? 0 : 1,
        )
        expect(await page.getByRole('link', { name: 'Proiectele mele', exact: true }).count()).toBe(
          scenario === 'member' ? 0 : 1,
        )
        expect(await page.getByRole('link', { name: 'Comisiile mele', exact: true }).count()).toBe(
          scenario === 'member' ? 0 : 1,
        )
        if (scenario !== 'member')
          await expect(page.getByRole('link', { name: 'Deschide Webmail' })).toBeVisible()
        await page.evaluate(() => {
          window.dashboardLayoutShifts = []
        })
        for (const slot of ['meeting', 'attendance', 'dues', 'inbox', 'avatar']) {
          await page.request.get(`/resolve?run=${run}&slot=${slot}`)
          await painted(page)
          expectStable(before, await geometry(page))
        }
        await expect(page.locator('[data-dashboard-slot="attendance-value"]')).toHaveText('83%')
        if (scenario === 'empty') {
          await expect(page.getByText('Nu există întâlniri programate.')).toBeVisible()
          await expect(
            page.getByRole('button', { name: 'Vezi întâlnirea', exact: true }),
          ).toBeDisabled()
        } else {
          await expect(
            page.getByRole('link', { name: 'Vezi întâlnirea', exact: true }),
          ).toBeEnabled()
        }
        if (scenario === 'failure')
          await expect(page.getByText('Nu am putut încărca mesajele recente.')).toBeVisible()
        const cls = await page.evaluate(() =>
          (window.dashboardLayoutShifts ?? []).reduce((total, value) => total + value, 0),
        )
        expect(cls).toBeLessThan(0.001)
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
          width,
        )
        if (scenario === 'populated')
          await page.screenshot({ path: testInfo.outputPath('resolved.png'), fullPage: true })
        expect(errors).toEqual([])
      } finally {
        await page.request.get(`/resolve?run=${run}&slot=all`)
      }
    })
  }

  test(`${width}px: QR works before data and delayed/failed avatars retain their space`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.route('**/delayed-avatar.svg', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 150))
      await route.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="teal" /></svg>',
      })
    })
    await page.route('**/failed-avatar.svg', (route) => route.fulfill({ status: 404 }))
    await page.goto('/interactive', { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => window.dashboardFixtureReady)
    await page.evaluate(() => document.fonts.ready)
    await page.getByRole('button', { name: 'Arată codul QR' }).click()
    await expect(page.getByRole('dialog', { name: 'Codul tău QR' })).toBeVisible()
    await page.getByRole('button', { name: 'Închide codul QR' }).click()
    const before = await geometry(page)
    await page.evaluate(() => window.resolveFixtureAvatar?.('/delayed-avatar.svg'))
    await expect(page.locator('[data-dashboard-slot="avatar"] img')).not.toHaveClass(/opacity-0/)
    expectStable(before, await geometry(page))
    await page.evaluate(() => window.resolveFixtureAvatar?.('/failed-avatar.svg'))
    await expect(page.locator('[data-dashboard-slot="avatar"] img')).toHaveCount(0)
    await expect(page.locator('[data-dashboard-slot="avatar"] svg')).toBeVisible()
    expectStable(before, await geometry(page))
    await expect(page.getByRole('button', { name: 'Vezi întâlnirea', exact: true })).toBeDisabled()
  })
}
