import { expect, test } from '@playwright/test'

for (const width of [320, 390, 768, 1280, 1440]) {
  test(`${width}px: accessible disclosure and interruptible motion`, async ({ page }) => {
    await page.setViewportSize({ width, height: 700 })
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Navigare principală' })
    const toggle = nav.getByRole('button', { name: /meniul/ })
    const reveal = nav.locator('.club-header__reveal')
    const directoryLink = nav.locator('.club-header__directory a').first()
    await expect(reveal).toHaveAttribute('inert', '')
    await expect(reveal).toHaveAttribute('aria-hidden', 'true')
    await expect(directoryLink).not.toBeVisible()
    await toggle.focus()
    await page.keyboard.press('Enter')
    await expect(reveal).not.toHaveAttribute('inert')
    await expect(directoryLink).toBeVisible()
    await page.keyboard.press('Tab')
    await expect(directoryLink).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(toggle).toBeFocused()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    // Reverse before the opening transition finishes, then reopen immediately.
    await toggle.click()
    await toggle.click()
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(directoryLink).toBeVisible()
    await page.locator('main h2').first().click({ force: true })
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(directoryLink).not.toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
    const shortcuts = nav.locator('.club-header__shortcuts')
    if (width >= 1200) await expect(shortcuts).toBeVisible()
    else await expect(shortcuts).not.toBeVisible()
  })
}

test('six long CMS groups remain reachable on a short mobile viewport and after resizing', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 480 })
  await page.goto('/?case=header-many')
  const toggle = page.getByRole('button', { name: /meniul/ })
  await toggle.click()
  const directory = page.locator('.club-header__directory')
  const lastLink = directory.locator('a').last()
  await lastLink.focus()
  await expect(lastLink).toBeInViewport()
  expect(
    await page.locator('.club-header__nav').evaluate((el) => el.getBoundingClientRect().bottom),
  ).toBeLessThanOrEqual(480)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320)
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(directory.locator('.club-header__group')).toHaveCount(6)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(1440)
})

test('reduced motion settles immediately and an empty menu keeps home and account access', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Deschide meniul' }).click()
  expect(
    await page
      .locator('.club-header__reveal')
      .evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe('0s')
  await page.getByRole('button', { name: 'Închide meniul' }).click()
  await expect(page.locator('.club-header__reveal')).toHaveAttribute('inert', '')
  await page.goto('/?case=header-empty')
  await expect(page.getByRole('button', { name: /meniul/ })).toHaveCount(0)
  await expect(page.getByRole('link', { name: /prima pagină/ })).toHaveAttribute('href', '/')
  await expect(page.getByRole('link', { name: 'Contul meu', exact: true })).toHaveAttribute(
    'href',
    '/members',
  )
})

test('real navigation closes the menu and marks the active destination', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('http://localhost:3000/')
  await page.getByRole('button', { name: 'Deschide meniul' }).click()
  await page
    .locator('.club-header__directory')
    .getByRole('link', { name: 'Evenimente', exact: true })
    .click()
  await expect(page).toHaveURL(/\/events$/)
  await expect(page.getByRole('button', { name: 'Deschide meniul' })).toHaveAttribute(
    'aria-expanded',
    'false',
  )
  await expect(page.locator('.club-header__shortcuts a[href="/events"]')).toHaveAttribute(
    'aria-current',
    'page',
  )
})
