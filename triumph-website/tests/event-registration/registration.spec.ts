import { test, expect } from '@playwright/test'

for (const width of [320, 390, 1440]) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: 900 } })

    test('public signup requires age and sends the selected category', async ({ page }) => {
      let submitted: Record<string, unknown> | undefined
      await page.route('**/api/event-registrations', async (route) => {
        submitted = route.request().postDataJSON()
        await route.fulfill({ json: { doc: { id: 'reg' } } })
      })
      await page.goto('/?mode=signup')
      await page.getByRole('textbox', { name: 'Nume', exact: true }).fill('Ana Popescu')
      await page.getByRole('textbox', { name: 'Email', exact: true }).fill('ana@example.com')
      await page.getByRole('textbox', { name: 'Telefon', exact: true }).fill('0700000000')
      await page.getByRole('checkbox').check()
      await expect(page.getByRole('button', { name: 'Confirmă înscrierea' })).toBeDisabled()
      await page.getByRole('radio', { name: 'Minor — sub 18 ani' }).check()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
      await page.screenshot({ path: `/tmp/triumph-event-signup-${width}.png` })
      await page.getByRole('button', { name: 'Confirmă înscrierea' }).click()
      await expect(page.getByRole('heading', { name: 'Înscriere confirmată' })).toBeVisible()
      expect(submitted?.ageGroup).toBe('minor')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
    })

    test('check-in recalculates group minimums and submits with Enter', async ({ page }) => {
      await page.goto('/')
      const total = page.getByRole('spinbutton', { name: 'Total încasat' })
      await expect(total).toHaveValue('100')
      await expect(
        page.getByText('Consumația nu a fost înregistrată', { exact: false }),
      ).toBeVisible()
      await expect(page.getByRole('button', { name: 'Confirmă check-in' })).toBeDisabled()
      await page.getByRole('radio', { name: 'Major — 18+' }).check()
      await page.getByRole('spinbutton', { name: 'Persoane însoțitoare' }).fill('2')
      await expect(page.getByRole('button', { name: 'Confirmă check-in' })).toBeDisabled()
      await total.fill('150.50')
      await total.press('Enter')
      await expect(page.getByTestId('saved')).toContainText('"totalCollected":150.5')
      await expect(page.getByTestId('saved')).toContainText('"guests":2')
      await page.getByRole('button', { name: 'Confirmă check-in' }).focus()
      await page.keyboard.press('Tab')
      await expect(page.getByRole('button', { name: 'Închide' })).toBeFocused()
      await page.keyboard.press('Shift+Tab')
      await expect(page.getByRole('button', { name: 'Confirmă check-in' })).toBeFocused()
      expect(
        await page.getByRole('dialog').evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true)
      await page.screenshot({ path: `/tmp/triumph-event-checkin-${width}.png` })
    })

    test('walk-in requires age, includes consumption, and keeps server errors in the dialog', async ({
      page,
    }) => {
      await page.goto('/?mode=walkin&fail=1')
      await page.getByRole('textbox', { name: /^Nume/ }).fill('Participant nou')
      const total = page.getByRole('spinbutton', { name: 'Total încasat' })
      await total.fill('50')
      await expect(page.getByRole('button', { name: 'Adaugă și marchează prezent' })).toBeDisabled()
      await page.getByRole('radio', { name: 'Minor — sub 18 ani' }).check()
      await total.press('Enter')
      await expect(page.getByRole('alert')).toContainText('Totalul minim s-a schimbat')
      await expect(page.getByRole('dialog')).toBeVisible()
      expect(
        await page.getByRole('dialog').evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true)
      await page.screenshot({ path: `/tmp/triumph-event-walkin-${width}.png` })
      await page.goto('/?mode=walkin')
      await page.getByRole('textbox', { name: /^Nume/ }).fill('Participant nou')
      await page.getByRole('radio', { name: 'Major — 18+' }).check()
      await total.fill('50.05')
      await total.press('Enter')
      await expect(page.getByTestId('saved')).toContainText('"totalCollected":50.05')
      await expect(page.getByTestId('saved')).toContainText('"ageGroup":"adult"')
    })

    test('reopens a split payment and keeps check-in errors inside the dialog', async ({
      page,
    }) => {
      await page.goto('/?split=1&fail=1')
      const total = page.getByRole('spinbutton', { name: 'Total încasat' })
      await expect(total).toHaveValue('100')
      await expect(page.getByRole('radio', { name: 'Major — 18+' })).toBeChecked()
      await expect(
        page.getByText('Consumația nu a fost înregistrată', { exact: false }),
      ).toHaveCount(0)
      await total.press('Enter')
      await expect(page.getByRole('alert')).toContainText('Totalul minim s-a schimbat')
      await total.fill('99')
      await total.press('Enter')
      await expect(page.getByTestId('saved')).toBeEmpty()
    })
  })
}
