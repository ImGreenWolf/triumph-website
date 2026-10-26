import { expect, test } from '@playwright/test'
for (const width of [320, 390, 768, 1440]) {
  test(`${width}px: draft event selection and keyboard navigation`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/')
    await expect(page.locator('[data-homepage-events] h3')).toHaveCount(4)
    await expect(page.getByRole('link', { name: 'Vezi toate evenimentele' })).toHaveAttribute(
      'href',
      '/events',
    )
    await expect(page.getByRole('link', { name: 'Contul meu', exact: true }).first()).toBeVisible()
    const toggle = page.getByRole('button', { name: /meniul/ })
    await toggle.focus()
    await page.keyboard.press('Enter')
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(
      page
        .locator('.club-header__directory')
        .getByRole('link', { name: 'Despre club', exact: true }),
    ).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(toggle).toBeFocused()
    await page.keyboard.press('Space')
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await page.keyboard.press('Escape')
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    )
    await page.screenshot({
      path: `.impeccable/review/site-improvements/events-${width}.png`,
      fullPage: true,
    })
    expect(errors).toEqual([])
  })
  test(`${width}px: upcoming feature, duplicate removal, and reduced motion`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/?case=upcoming')
    await expect(page.locator('[data-featured-upcoming]')).toBeVisible()
    await expect(page.locator('[data-homepage-events] h3')).toHaveCount(4)
    await expect(page.getByRole('link', { name: 'Înscrie-te la eveniment' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    )
    await page.screenshot({
      path: `.impeccable/review/site-improvements/upcoming-${width}.png`,
      fullPage: true,
    })
    await page.goto('/?case=empty')
    await expect(page.locator('[data-featured-upcoming]')).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Vezi toate evenimentele' })).toBeVisible()
  })
}
test('real public pages: language, login, registration counts, and recruitment', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('http://localhost:3000/members/login')
  await expect(page.locator('html')).toHaveAttribute('lang', 'ro')
  await expect(page).toHaveTitle(/Autentificare/)
  await expect(page.getByRole('button', { name: 'Autentifică-te', exact: true })).toBeVisible()
  await page.screenshot({
    path: '.impeccable/review/site-improvements/login-mobile.png',
    fullPage: true,
  })
  await page.goto('http://localhost:3000/events')
  await expect(page.getByText('0 participanți')).toHaveCount(0)
  await expect(page.getByText(/184 înscrieri|\d+ înscrieri/).first()).toBeVisible()
  await page.goto('http://localhost:3000/inscrie-te')
  await expect(
    page
      .getByText(
        'Perioada de înscrieri s-a încheiat. Urmărește anunțurile clubului pentru următoarea recrutare.',
      )
      .first(),
  ).toBeVisible()
  await expect(page.locator('form button[type="submit"]')).toHaveCount(0)
})

for (const width of [390, 1440]) {
  test(`${width}px: preserved gallery and integrated homepage section`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/?case=gallery')
    await expect(page.locator('[data-highlighted-gallery] .ag-panel')).toHaveCount(4)
    await expect(page.getByRole('link', { name: 'Vezi toate evenimentele' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    )
    await page.screenshot({
      path: `.impeccable/review/site-improvements/gallery-${width}.png`,
      fullPage: true,
    })
    await page.goto('http://localhost:3000/')
    await expect(page.locator('[data-homepage-events]')).toHaveCount(1)
    await expect(page.locator('[data-highlighted-gallery] .ag-panel')).toHaveCount(4)
    await expect(page.locator('[data-homepage-events] a[href="/events"]')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Lista evenimentelor' })).toHaveCount(0)
    await page.locator('[data-homepage-events]').scrollIntoViewIfNeeded()
    await page.screenshot({ path: `.impeccable/review/site-improvements/home-events-${width}.png` })
  })
}
