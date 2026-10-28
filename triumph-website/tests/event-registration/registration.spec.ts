import { test, expect } from '@playwright/test'
import { checkInSearchPattern, checkInSearchTerms } from '../../src/utilities/eventCheckInSearch'

test.describe('single-result search shortcut', () => {
  test.beforeEach(async ({ page }) => {
    const now = new Date('2026-10-27T12:00:00Z')
    await page.clock.install({ time: now })
    await page.clock.pauseAt(new Date(now.getTime() + 1000))
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto('/?mode=list')
  })

  test('waits 250 ms before Enter opens the named result and restores search focus', async ({
    page,
  }) => {
    const search = page.getByRole('searchbox', { name: 'Caută participanți' })
    const action = page.getByRole('button', { name: /Deschide confirmarea pentru Ana/ })
    await search.fill('ana')
    await page.clock.runFor(249)
    await expect(action).toHaveCount(0)
    await search.press('Enter')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.clock.runFor(1)
    await expect(action).toBeVisible()
    await expect(search).toHaveAttribute('aria-keyshortcuts', 'Enter')
    await expect(search).toHaveAttribute('aria-describedby', 'checkin-search-hint')
    await search.press('Enter')
    await expect(page.getByRole('dialog')).toHaveCount(1)
    await expect(
      page.getByRole('dialog').getByRole('heading', { name: 'Ana', exact: true }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Închide', exact: true }).click()
    await expect(search).toBeFocused()
    await expect(action).toHaveCount(0)
  })

  test('restarts the delay on every query edit even when the same participant matches', async ({
    page,
  }) => {
    const search = page.getByRole('searchbox')
    const action = page.getByRole('button', { name: /Deschide confirmarea pentru Ana/ })
    await search.fill('ana')
    await page.clock.runFor(250)
    await expect(action).toBeVisible()
    await search.fill('ana@')
    await expect(action).toHaveCount(0)
    await search.press('Enter')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.clock.runFor(249)
    await expect(action).toHaveCount(0)
    await page.clock.runFor(1)
    await expect(action).toBeVisible()
  })

  test('cancels stale timers when the result count or matching participant changes', async ({
    page,
  }) => {
    const search = page.getByRole('searchbox')
    await search.fill('ana')
    await page.clock.runFor(200)
    await search.fill('an')
    await page.clock.runFor(100)
    await expect(page.getByRole('button', { name: /Deschide confirmarea pentru/ })).toHaveCount(0)
    await search.press('Enter')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await search.fill('zoe')
    await page.clock.runFor(149)
    await search.press('Enter')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.clock.runFor(101)
    await expect(
      page.getByRole('button', { name: /Deschide confirmarea pentru Zoe/ }),
    ).toBeVisible()
    await search.press('Enter')
    await expect(
      page.getByRole('dialog').getByRole('heading', { name: 'Zoe', exact: true }),
    ).toBeVisible()
  })

  test('requires a nonempty search for confirmation and offers add participant for zero results', async ({
    page,
  }) => {
    const search = page.getByRole('searchbox')
    const action = page.getByRole('button', { name: /Deschide confirmarea pentru/ })
    await page.locator('select').nth(1).selectOption('registered')
    await page.clock.runFor(250)
    await search.press('Enter')
    await expect(action).toHaveCount(0)
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await search.fill('ana')
    await page.clock.runFor(250)
    await expect(action).toBeVisible()
    await page.locator('select').nth(1).selectOption('all')
    await expect(action).toHaveCount(0)
    await search.press('Enter')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.clock.runFor(250)
    await expect(action).toBeVisible()
    await page.locator('select').nth(1).selectOption('present')
    await expect(action).toHaveCount(0)
    await search.fill('zzzz')
    await page.clock.runFor(250)
    await search.press('Enter')
    await expect(action).toHaveCount(0)
    await expect(
      page.getByRole('dialog').getByRole('heading', { name: 'Adaugă participant la eveniment' }),
    ).toBeVisible()
  })

  test('waits 250 ms for an empty result, ignores modified Enter and restores search focus', async ({
    page,
  }) => {
    const search = page.getByRole('searchbox')
    const action = page.getByRole('button', { name: 'Adaugă participant nou' })
    await search.fill('participant inexistent')
    await page.clock.runFor(249)
    await expect(action).toHaveCount(0)
    await search.press('Enter')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.clock.runFor(1)
    await expect(action).toBeVisible()
    await expect(search).toHaveAttribute('aria-keyshortcuts', 'Enter')
    for (const flags of [
      { isComposing: true },
      { keyCode: 229 },
      { repeat: true },
      { ctrlKey: true },
      { shiftKey: true },
    ]) {
      await search.dispatchEvent('keydown', { key: 'Enter', ...flags })
      await expect(page.getByRole('dialog')).toHaveCount(0)
    }
    await search.press('Enter')
    await expect(
      page.getByRole('dialog').getByRole('textbox', { name: 'Nume *', exact: true }),
    ).toBeFocused()
    await page.getByRole('button', { name: 'Închide', exact: true }).click()
    await expect(search).toBeFocused()
    await expect(action).toHaveCount(0)
    await search.fill('ana')
    await page.clock.runFor(250)
    await expect(
      page.getByRole('button', { name: /Deschide confirmarea pentru Ana/ }),
    ).toBeVisible()
    await expect(action).toHaveCount(0)
  })

  test('opens add participant when the whole list is empty without a search query', async ({
    page,
  }) => {
    await page.goto('/?mode=list&empty-list=1')
    const search = page.getByRole('searchbox')
    await search.focus()
    await page.clock.runFor(250)
    await expect(page.getByRole('button', { name: 'Adaugă participant nou' })).toBeVisible()
    await search.press('Enter')
    await expect(page.getByRole('dialog')).toHaveAccessibleName('Adaugă participant la eveniment')
  })

  test('ignores composing, repeated and modified Enter keys', async ({ page }) => {
    const search = page.getByRole('searchbox')
    await search.fill('ana')
    await page.clock.runFor(250)
    await expect(
      page.getByRole('button', { name: /Deschide confirmarea pentru Ana/ }),
    ).toBeVisible()
    for (const flags of [
      { isComposing: true },
      { keyCode: 229 },
      { repeat: true },
      { ctrlKey: true },
      { metaKey: true },
      { altKey: true },
      { shiftKey: true },
    ]) {
      await search.dispatchEvent('keydown', { key: 'Enter', ...flags })
      await expect(page.getByRole('dialog')).toHaveCount(0)
    }
    await search.press('Enter')
    await expect(page.getByRole('dialog')).toHaveCount(1)
  })

  test('keeps participant names masked in the visible shortcut when personal data is hidden', async ({
    page,
  }) => {
    await page.goto('/?mode=list&private=1')
    await page.getByRole('searchbox').fill('ana')
    await page.clock.runFor(250)
    const action = page.getByRole('button', { name: /Deschide confirmarea pentru/ })
    await expect(action).toContainText('A••')
    await expect(action).not.toContainText('Ana')
  })
})

for (const width of [320, 390, 1440]) {
  test(`search shortcut at ${width}px is visible, clickable and opens the matching dialog`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 })
    const writes: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('/members/projects/check-in') && request.method() !== 'GET')
        writes.push(request.method())
    })
    await page.goto('/?mode=list&long-name=1')
    await page.getByRole('searchbox').fill('ana')
    const action = page.getByRole('button', { name: /Deschide confirmarea pentru Ana Popescu/ })
    await expect(action).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `/tmp/triumph-search-shortcut-${width}.png` })
    await action.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog').getByRole('heading')).toContainText('Ana Popescu')
    expect(writes).toEqual([])
    await page.getByRole('button', { name: 'Închide', exact: true }).click()
    await expect(page.getByRole('searchbox')).toBeFocused()
  })
}

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
      const guests = page.getByRole('spinbutton', { name: 'Persoane însoțitoare' })
      await expect(page.getByRole('radio', { name: 'Minor — sub 18 ani' })).toBeFocused()
      const totalBounds = await total.boundingBox()
      const guestBounds = await guests.boundingBox()
      expect(totalBounds).not.toBeNull()
      expect(guestBounds).not.toBeNull()
      expect(Math.abs(totalBounds!.y - guestBounds!.y)).toBeLessThan(1)
      expect(guestBounds!.x + guestBounds!.width).toBeLessThan(totalBounds!.x)
      await expect(total).toHaveValue('')
      await expect(total).toHaveAttribute('placeholder', /100,00\s+RON/)
      await expect(
        page.getByText('Consumația nu a fost înregistrată', { exact: false }),
      ).toHaveCount(0)
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
      await expect(page.getByRole('textbox', { name: /^Nume/ })).toBeFocused()
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
      await expect(total).toBeFocused()
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

    test('focuses the incomplete total when age is already recorded', async ({ page }) => {
      await page.goto('/?age=adult&unpaid=1')
      const total = page.getByRole('spinbutton', { name: 'Total încasat' })
      await expect(page.getByRole('radio', { name: 'Major — 18+' })).toBeChecked()
      await expect(total).toHaveValue('')
      await expect(total).toHaveAttribute('placeholder', /100,00\s+RON/)
      await expect(total).toBeFocused()
      await expect(total).toHaveAttribute('aria-invalid', 'false')
      await expect(page.getByRole('button', { name: 'Confirmă check-in' })).toBeDisabled()
      await total.fill('100')
      await expect(total).toBeFocused()
      await expect(page.getByRole('button', { name: 'Confirmă check-in' })).toBeEnabled()
      await page.screenshot({ path: `/tmp/triumph-event-payment-row-${width}.png` })
    })

    test('empty total accepts the current group minimum and focuses confirmation without saving', async ({
      page,
    }) => {
      await page.goto('/?age=adult')
      const total = page.getByRole('spinbutton', { name: 'Total încasat' })
      const confirm = page.getByRole('button', { name: 'Confirmă check-in' })
      await expect(total).toHaveValue('')
      await expect(total).toHaveAttribute('placeholder', /100,00\s+RON/)
      await expect(
        page.getByText('completează totalul minim și trece la confirmare.', { exact: false }),
      ).toBeVisible()
      await page.getByRole('spinbutton', { name: 'Persoane însoțitoare' }).fill('2')
      await expect(total).toHaveAttribute('placeholder', /150,00\s+RON/)
      await expect(
        page.getByRole('button', { name: /Folosește totalul minim de 150,00/ }),
      ).toBeVisible()
      expect(
        await page.getByRole('dialog').evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true)
      await page.screenshot({ path: `/tmp/triumph-minimum-placeholder-${width}.png` })
      await total.focus()
      await page.keyboard.down('Enter')
      await expect(total).toHaveValue('150')
      await expect(confirm).toBeFocused()
      await expect(page.getByTestId('saved')).toBeEmpty()
      // Holding Enter must not turn accepting the suggestion into saving the record.
      await page.keyboard.down('Enter')
      await page.keyboard.up('Enter')
      await expect(page.getByTestId('saved')).toBeEmpty()
      await confirm.press('Enter')
      await expect(page.getByTestId('saved')).toContainText('"totalCollected":150')
      await expect(page.getByTestId('saved')).toContainText('"guests":2')
    })

    test('walk-in can tap the Enter icon to fill the minimum and focus confirmation', async ({
      page,
    }) => {
      await page.goto('/?mode=walkin')
      await page.getByRole('textbox', { name: /^Nume/ }).fill('Participant nou')
      await page.getByRole('radio', { name: 'Major — 18+' }).check()
      const total = page.getByRole('spinbutton', { name: 'Total încasat' })
      await expect(total).toHaveValue('')
      await expect(total).toHaveAttribute('placeholder', /50,00\s+RON/)
      await page.getByRole('button', { name: /Folosește totalul minim de 50,00/ }).click()
      await expect(total).toHaveValue('50')
      await expect(page.getByRole('button', { name: 'Adaugă și marchează prezent' })).toBeFocused()
      await expect(page.getByTestId('saved')).toBeEmpty()
    })
  })
}

test('minimum shortcut preserves validation and explicit amounts', async ({ page }) => {
  await page.goto('/')
  const total = page.getByRole('spinbutton', { name: 'Total încasat' })
  await total.focus()
  for (const flags of [
    { isComposing: true },
    { keyCode: 229 },
    { repeat: true },
    { ctrlKey: true },
    { metaKey: true },
    { altKey: true },
    { shiftKey: true },
  ]) {
    await total.dispatchEvent('keydown', { key: 'Enter', ...flags })
    await expect(total).toHaveValue('')
  }
  await total.press('Enter')
  await expect(total).toHaveValue('100')
  await expect(page.getByRole('radio', { name: 'Minor — sub 18 ani' })).toBeFocused()
  await expect(page.getByRole('button', { name: 'Confirmă check-in' })).toBeDisabled()
  await page.getByRole('radio', { name: 'Major — 18+' }).check()
  await total.clear()
  await page.getByRole('spinbutton', { name: 'Persoane însoțitoare' }).fill('-1')
  await total.press('Enter')
  await expect(total).toHaveValue('')
  await page.getByRole('spinbutton', { name: 'Persoane însoțitoare' }).fill('0')
  await total.fill('0')
  await total.press('Enter')
  await expect(total).toHaveValue('0')
  await expect(page.getByTestId('saved')).toBeEmpty()
  await total.fill('50.05')
  await total.press('Enter')
  await expect(page.getByTestId('saved')).toContainText('"totalCollected":50.05')
})

for (const [query, minimum] of [
  ['zero-minimums', '0'],
  ['decimal-minimums', '0.6'],
]) {
  test(`minimum shortcut handles ${query}`, async ({ page }) => {
    await page.goto(`/?age=adult&${query}=1`)
    const total = page.getByRole('spinbutton', { name: 'Total încasat' })
    await total.press('Enter')
    await expect(total).toHaveValue(minimum)
    await expect(page.getByRole('button', { name: 'Confirmă check-in' })).toBeFocused()
    await expect(page.getByTestId('saved')).toBeEmpty()
  })
}

test('check-in sorting toggles each data column in ascending and descending order', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/?mode=list')
  const names = page.locator('tbody tr td:first-child p:first-child')
  await expect(names).toHaveText(['Zoe', 'Ștefan', 'Ana'])
  const orders = [
    ['Participant', ['Ana', 'Ștefan', 'Zoe']],
    ['Tură', ['Ștefan', 'Zoe', 'Ana']],
    ['Status', ['Ștefan', 'Ana', 'Zoe']],
    ['Grup', ['Ana', 'Ștefan', 'Zoe']],
    ['Donație', ['Ștefan', 'Zoe', 'Ana']],
  ] as const
  for (const [label, ascending] of orders) {
    await page
      .getByRole('button', { name: `Sortează după ${label}, crescător`, exact: true })
      .click()
    const header = page.getByRole('columnheader').filter({ hasText: label })
    await expect(header).toHaveAttribute('aria-sort', 'ascending')
    await expect(names).toHaveText([...ascending])
    await page
      .getByRole('button', { name: `Sortează după ${label}, descrescător`, exact: true })
      .press('Enter')
    await expect(header).toHaveAttribute('aria-sort', 'descending')
    await expect(names).toHaveText([...ascending].reverse())
    await expect(page.locator('th[aria-sort="descending"]')).toHaveCount(1)
  }
  await expect(page.getByRole('columnheader', { name: 'Acțiuni' }).getByRole('button')).toHaveCount(
    0,
  )
  await page.screenshot({ path: '/tmp/triumph-checkin-sort-desktop.png' })
})

test('sorting remains selected while filters or participant values change', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/?mode=list')
  const names = page.locator('tbody tr td:first-child p:first-child')
  await page.getByRole('button', { name: 'Sortează după Donație, crescător', exact: true }).click()
  await page.getByRole('searchbox').fill('an')
  await expect(names).toHaveText(['Ștefan', 'Ana'])
  await page.getByRole('searchbox').clear()
  await page.locator('select').nth(1).selectOption('registered')
  await expect(names).toHaveText(['Ana'])
  await page.locator('select').nth(1).selectOption('all')
  await expect(names).toHaveText(['Ștefan', 'Zoe', 'Ana'])
  await page.route('**/members/projects/check-in', (route) =>
    route.fulfill({
      json: {
        registration: {
          id: 'ana',
          ageGroup: 'adult',
          consumptionAmount: 20,
          donation: 1,
          guests: 0,
          status: 'present',
          timeOfArrival: '2099-06-21T10:00:00Z',
        },
      },
    }),
  )
  await page
    .locator('tbody tr')
    .filter({ hasText: 'Ana' })
    .getByRole('button', { name: 'Confirmă', exact: true })
    .click()
  await page.getByRole('radio', { name: 'Major — 18+' }).check()
  await page.getByRole('spinbutton', { name: 'Total încasat' }).fill('21')
  await page.getByRole('button', { name: 'Confirmă check-in' }).click()
  await expect(names).toHaveText(['Ana', 'Ștefan', 'Zoe'])
  await expect(page.locator('th[aria-sort="ascending"]')).toContainText('Donație')
})

for (const width of [320, 390]) {
  test(`mobile sorting controls at ${width}px share desktop order without overflow`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto('/?mode=list')
    await page
      .getByRole('button', { name: 'Sortează după Donație, crescător', exact: true })
      .click()
    await page.setViewportSize({ width, height: 900 })
    const names = page.locator('article p:first-child').filter({ hasText: /^(Ana|Ștefan|Zoe)$/ })
    await expect(names).toHaveText(['Ștefan', 'Zoe', 'Ana'])
    await page.getByRole('button', { name: 'Sortează descrescător', exact: true }).click()
    await expect(names).toHaveText(['Ana', 'Zoe', 'Ștefan'])
    await page.getByRole('combobox', { name: 'Sortează după' }).selectOption('group')
    await expect(names).toHaveText(['Ana', 'Ștefan', 'Zoe'])
    await page.getByRole('button', { name: 'Sortează descrescător', exact: true }).click()
    await expect(names).toHaveText(['Zoe', 'Ștefan', 'Ana'])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `/tmp/triumph-checkin-sort-${width}.png` })
  })
}

for (const width of [320, 390, 1440]) {
  test(`check-in warning labels at ${width}px identify duplicates and low donations`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/?mode=list&warnings=1')
    const rows = width >= 768 ? page.locator('tbody tr') : page.locator('article')
    const row = (name: string) => rows.filter({ has: page.getByText(name, { exact: true }) })
    await expect(row('Zoe').getByText('Posibil duplicat', { exact: true })).toBeVisible()
    await expect(row('Zoe').getByText('Sub donația minimă', { exact: true })).toBeVisible()
    await expect(row('Zoe').getByText(/Minim\s+300\s+RON\s+\/\s+grup/)).toBeVisible()
    await expect(
      row('Zoe duplicat').getByText('Posibil duplicat', { exact: true }),
    ).toHaveAttribute('title', 'Aceeași adresă de email')
    await expect(row('Zoe duplicat').getByText('Sub donația minimă', { exact: true })).toHaveCount(
      0,
    )
    await expect(row('Ștefan').getByText('Sub donația minimă', { exact: true })).toHaveCount(0)
    await expect(row('Ana').getByText('Posibil duplicat', { exact: true })).toHaveCount(0)
    await expect(row('Ana').getByText('Sub donația minimă', { exact: true })).toHaveCount(0)
    await expect(
      row('Participant fără donație').getByText('Sub donația minimă', { exact: true }),
    ).toHaveCount(0)
    await page.getByRole('searchbox').fill('Zoe duplicat')
    await expect(rows).toHaveCount(1)
    await expect(row('Zoe duplicat').getByText('Posibil duplicat', { exact: true })).toBeVisible()
    await page.getByRole('searchbox').clear()
    if (width >= 768)
      await page
        .getByRole('button', { name: 'Sortează după Donație, crescător', exact: true })
        .click()
    else await page.getByRole('combobox', { name: 'Sortează după' }).selectOption('donation')
    await expect(row('Zoe').getByText('Posibil duplicat', { exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `/tmp/triumph-checkin-warnings-${width}.png` })
    await page.route('**/members/projects/check-in', (route) =>
      route.fulfill({
        json: {
          registration: {
            id: 'unpaid',
            ageGroup: 'adult',
            consumptionAmount: 20,
            donation: 30,
            guests: 0,
            status: 'present',
            timeOfArrival: '2099-06-21T10:00:00Z',
          },
        },
      }),
    )
    await row('Participant fără donație')
      .getByRole('button', { name: 'Confirmă', exact: true })
      .click()
    await page.getByRole('radio', { name: 'Major — 18+' }).check()
    await page.getByRole('spinbutton', { name: 'Total încasat' }).fill('50')
    await page.getByRole('button', { name: 'Confirmă check-in' }).click()
    await expect(
      row('Participant fără donație').getByText('Sub donația minimă', { exact: true }),
    ).toHaveCount(0)
  })
}

for (const width of [320, 390, 1440]) {
  test(`warning filter at ${width}px includes duplicates and checked-in donation issues`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/?mode=list&warnings=1')
    const rows = width >= 768 ? page.locator('tbody tr') : page.locator('article')
    const row = (name: string) => rows.filter({ has: page.getByText(name, { exact: true }) })
    await page.getByRole('combobox', { name: 'Filtrează după status' }).selectOption('warnings')
    await expect(rows).toHaveCount(2)
    await expect(row('Zoe')).toBeVisible()
    await expect(row('Zoe duplicat')).toBeVisible()
    await expect(row('Participant fără donație')).toHaveCount(0)
    await expect(row('Ștefan')).toHaveCount(0)
    await page.getByRole('searchbox').fill('Zoe duplicat')
    await expect(rows).toHaveCount(1)
    await expect(row('Zoe duplicat').getByText('Posibil duplicat')).toBeVisible()
    await page.getByRole('searchbox').clear()
    await page.locator('select').first().selectOption('earlier:early')
    await expect(rows).toHaveCount(0)
    await page.locator('select').first().selectOption('all')
    await expect(rows).toHaveCount(2)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `/tmp/triumph-warning-filter-${width}.png` })
    await expect(page.getByRole('button', { name: 'Acțiuni', exact: true })).toHaveCount(0)
  })

  test(`duplicate cleanup at ${width}px requires review and updates the active list`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 })
    const actions: string[] = []
    const plan = {
      removals: [{ id: 'unpaid-duplicate', keepId: 'zoe' }],
      protectedCount: 2,
      remainingDuplicateCount: 2,
    }
    await page.route('**/members/projects/check-in', async (route) => {
      const body = route.request().postDataJSON()
      actions.push(body.action)
      await route.fulfill({
        json:
          body.action === 'preview-duplicates'
            ? { plan }
            : {
                message: '1 duplicat eliminat din lista activă.',
                registrations: [
                  { id: 'unpaid-duplicate', status: 'cancelled', timeOfArrival: null },
                ],
              },
      })
    })
    await page.goto('/?mode=list&warnings=1&manager=1&cleanup=1')
    const rows = width >= 768 ? page.locator('tbody tr') : page.locator('article')
    await page.getByRole('searchbox').fill('Ana')
    const trigger = page.getByRole('button', { name: 'Acțiuni', exact: true })
    await trigger.click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('menuitem', { name: 'Importă CSV' })).toBeVisible()
    await page.getByRole('menuitem', { name: 'Elimină duplicatele…' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('1 duplicat de eliminat', { exact: true })).toBeVisible()
    await expect(page.getByText('Se elimină: Zoe duplicat neplătit', { exact: true })).toBeVisible()
    await expect(page.getByText('Se păstrează: Zoe', { exact: true })).toBeVisible()
    await expect(page.getByText(/indiferent de filtre/)).toBeVisible()
    await expect(page.getByText('2 înscrieri cu prezență sau plată sunt protejate.')).toBeVisible()
    expect(actions).toEqual(['preview-duplicates'])
    await page.getByRole('button', { name: 'Anulează', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(trigger).toBeFocused()
    expect(actions).toEqual(['preview-duplicates'])
    await page.getByRole('searchbox').clear()
    await page.getByRole('combobox', { name: 'Filtrează după status' }).selectOption('warnings')
    await expect(rows).toHaveCount(3)
    await trigger.click()
    await page.getByRole('menuitem', { name: 'Elimină duplicatele…' }).click()
    await expect(page.getByText('1 duplicat de eliminat', { exact: true })).toBeVisible()
    expect(await page.getByRole('dialog').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
      true,
    )
    await page.screenshot({ path: `/tmp/triumph-duplicate-cleanup-${width}.png` })
    await page.getByRole('button', { name: 'Confirmă eliminarea', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(rows).toHaveCount(2)
    await expect(page.getByText('Zoe duplicat neplătit', { exact: true })).toHaveCount(0)
    await expect(
      page.getByText('1 duplicat eliminat din lista activă.', { exact: true }),
    ).toBeVisible()
    expect(actions).toEqual(['preview-duplicates', 'preview-duplicates', 'remove-duplicates'])
  })
}

test('actions menu supports keyboard navigation, Escape, outside clicks and CSV import', async ({
  page,
}) => {
  await page.goto('/?mode=list&manager=1')
  const trigger = page.getByRole('button', { name: 'Acțiuni', exact: true })
  await trigger.focus()
  await trigger.press('ArrowDown')
  const csv = page.getByRole('menuitem', { name: 'Importă CSV' })
  const duplicates = page.getByRole('menuitem', { name: 'Elimină duplicatele…' })
  await expect(csv).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(duplicates).toBeFocused()
  await page.keyboard.press('Home')
  await expect(csv).toBeFocused()
  await page.keyboard.press('End')
  await expect(duplicates).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await expect(page.getByRole('menu')).toHaveCount(0)
  await trigger.press('ArrowUp')
  await expect(duplicates).toBeFocused()
  await page.getByRole('heading', { name: 'Lista de check-in' }).click()
  await expect(page.getByRole('menu')).toHaveCount(0)
  await trigger.click()
  await csv.click()
  await expect(page.getByText('Coloanele CSV', { exact: true })).toBeVisible()
})

test('cleanup masks names and requires a fresh confirmation when the server plan changes', async ({
  page,
}) => {
  let removals = 0
  const plan = {
    removals: [{ id: 'unpaid-duplicate', keepId: 'zoe' }],
    protectedCount: 2,
    remainingDuplicateCount: 2,
  }
  await page.route('**/members/projects/check-in', async (route) => {
    const body = route.request().postDataJSON()
    if (body.action === 'remove-duplicates') {
      removals += 1
      await route.fulfill({
        status: 409,
        json: {
          message: 'Înscrierile s-au schimbat. Verifică lista actualizată și confirmă din nou.',
          plan: { ...plan, removals: [] },
        },
      })
    } else await route.fulfill({ json: { plan } })
  })
  await page.goto('/?mode=list&warnings=1&manager=1&cleanup=1&private=1')
  await page.getByRole('button', { name: 'Acțiuni', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Elimină duplicatele…' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Se elimină: Z••')
  await expect(dialog).not.toContainText('Zoe')
  await page.getByRole('button', { name: 'Confirmă eliminarea', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('Înscrierile s-au schimbat')
  await expect(dialog).toContainText('Nu există duplicate care pot fi eliminate automat.')
  await expect(
    page.getByRole('button', { name: 'Confirmă eliminarea', exact: true }),
  ).toBeDisabled()
  expect(removals).toBe(1)
})

for (const width of [320, 390, 1440]) {
  test(`pagination at ${width}px starts above 100 records and navigates every page`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 })
    const rows = width >= 768 ? page.locator('tbody tr') : page.locator('article')
    await page.goto('/?mode=list&count=100')
    await expect(rows).toHaveCount(100)
    await expect(page.getByRole('navigation', { name: /Paginare/ })).toHaveCount(0)
    await page.goto('/?mode=list&count=101')
    await expect(rows).toHaveCount(100)
    const top = page.getByRole('navigation', { name: 'Paginare sus', exact: true })
    await expect(top.getByRole('button', { name: 'Pagina anterioară' })).toBeDisabled()
    await expect(page.getByText('1–100 din 101 rezultate', { exact: true })).toHaveCount(2)
    await top.getByRole('button', { name: 'Pagina următoare' }).click()
    await expect(rows).toHaveCount(1)
    await expect(rows.first()).toContainText('Participant 101')
    const previousBounds = await top
      .getByRole('button', { name: 'Pagina anterioară' })
      .boundingBox()
    const nextBounds = await top.getByRole('button', { name: 'Pagina următoare' }).boundingBox()
    expect(previousBounds).not.toBeNull()
    expect(nextBounds).not.toBeNull()
    expect(previousBounds!.y).toBe(nextBounds!.y)
    await expect(top.getByRole('combobox', { name: 'Pagina de check-in' })).toHaveValue('2')
    await expect(top.getByRole('button', { name: 'Pagina următoare' })).toBeDisabled()
    await expect(page.getByText('101–101 din 101 rezultate', { exact: true })).toHaveCount(2)
    const bottom = page.getByRole('navigation', { name: 'Paginare jos', exact: true })
    await bottom.getByRole('button', { name: 'Pagina anterioară' }).click()
    await expect(rows).toHaveCount(100)
    await expect(top.getByRole('combobox')).toHaveValue('1')
    await expect(top.getByRole('combobox')).toBeFocused()
    await page.goto('/?mode=list&count=205')
    await top.getByRole('combobox').selectOption('3')
    await expect(rows).toHaveCount(5)
    await expect(rows.first()).toContainText('Participant 201')
    await expect(rows.last()).toContainText('Participant 205')
    await expect(page.getByText('201–205 din 205 rezultate', { exact: true })).toHaveCount(2)
    await top.getByRole('combobox').selectOption('2')
    await expect(rows).toHaveCount(100)
    await expect(rows.first()).toContainText('Participant 101')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `/tmp/triumph-pagination-${width}.png` })
  })

  test(`pagination at ${width}px searches, filters and sorts the entire registration list`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/?mode=list&count=205&cross-page-duplicate=1')
    const rows = width >= 768 ? page.locator('tbody tr') : page.locator('article')
    const top = page.getByRole('navigation', { name: 'Paginare sus', exact: true })
    await expect(rows.first().getByText('Posibil duplicat', { exact: true })).toBeVisible()
    await top.getByRole('combobox').selectOption('3')
    await expect(rows.last().getByText('Posibil duplicat', { exact: true })).toBeVisible()
    await page.getByRole('searchbox').fill('Participant 205')
    await expect(rows).toHaveCount(1)
    await expect(page.getByRole('navigation', { name: /Paginare/ })).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: /Deschide confirmarea pentru Participant 205/ }),
    ).toBeVisible()
    await page.getByRole('searchbox').press('Enter')
    await expect(page.getByRole('dialog').getByRole('heading')).toContainText('Participant 205')
    await page.getByRole('button', { name: 'Închide', exact: true }).click()
    await page.getByRole('searchbox').clear()
    await expect(top.getByRole('combobox')).toHaveValue('1')
    await top.getByRole('combobox').selectOption('3')
    await page.getByRole('combobox', { name: 'Filtrează după status' }).selectOption('registered')
    await expect(top.getByRole('combobox')).toHaveValue('1')
    await expect(rows.first()).toContainText('Ana')
    await page.getByRole('combobox', { name: 'Filtrează după status' }).selectOption('all')
    await top.getByRole('combobox').selectOption('3')
    await page.locator('select').first().selectOption('earlier:early')
    await expect(rows).toHaveCount(1)
    await expect(rows.first()).toContainText('Ștefan')
    await page.locator('select').first().selectOption('all')
    await expect(top.getByRole('combobox')).toHaveValue('1')
    await top.getByRole('combobox').selectOption('3')
    if (width >= 768)
      await page
        .getByRole('button', { name: 'Sortează după Donație, crescător', exact: true })
        .click()
    else await page.getByRole('combobox', { name: 'Sortează după' }).selectOption('donation')
    await expect(top.getByRole('combobox')).toHaveValue('1')
    await top.getByRole('combobox').selectOption('3')
    if (width >= 768)
      await page
        .getByRole('button', { name: 'Sortează după Donație, descrescător', exact: true })
        .click()
    else await page.getByRole('button', { name: 'Sortează descrescător', exact: true }).click()
    await expect(top.getByRole('combobox')).toHaveValue('1')
    await expect(rows.first()).toContainText('Ana')
    await page.getByRole('combobox', { name: 'Filtrează după status' }).selectOption('warnings')
    await expect(rows).toHaveCount(2)
    await expect(page.getByRole('navigation', { name: /Paginare/ })).toHaveCount(0)
  })
}

test('one row on the last page does not activate the single search result shortcut', async ({
  page,
}) => {
  await page.goto('/?mode=list&count=104')
  const search = page.getByRole('searchbox')
  await search.fill('Participant')
  await page
    .getByRole('navigation', { name: 'Paginare sus', exact: true })
    .getByRole('combobox')
    .selectOption('2')
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await search.press('Enter')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Deschide confirmarea pentru/ })).toHaveCount(0)
})

test('pagination clamps to the previous page when the last registration is removed', async ({
  page,
}) => {
  await page.route('**/members/projects/check-in', (route) =>
    route.fulfill({
      json: {
        registration: { id: 'bulk-201', status: 'cancelled', timeOfArrival: null },
      },
    }),
  )
  await page.goto('/?mode=list&count=201&manager=1')
  const top = page.getByRole('navigation', { name: 'Paginare sus', exact: true })
  await top.getByRole('combobox').selectOption('3')
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await page.locator('tbody tr').getByRole('button', { name: 'Confirmă', exact: true }).click()
  await page.getByRole('button', { name: 'Șterge', exact: true }).click()
  await page.getByRole('button', { name: 'Confirmă ștergerea', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(top.getByRole('combobox')).toHaveValue('2')
  await expect(page.locator('tbody tr')).toHaveCount(100)
  await expect(page.getByText('101–200 din 200 rezultate', { exact: true })).toHaveCount(2)
})

async function metricGeometry(card: import('@playwright/test').Locator) {
  return card.evaluate((el) => {
    const digits = [...el.querySelectorAll('span.relative.inline-flex.overflow-hidden')].map(
      (digit) => {
        const bounds = digit.getBoundingClientRect()
        const spans = [...digit.children] as HTMLElement[]
        const visible = spans.find(
          (span) => Math.abs(span.getBoundingClientRect().top - bounds.top) < 0.05,
        )
        return visible
          ? {
              text: visible.textContent,
              top: visible.getBoundingClientRect().top,
              font: getComputedStyle(visible).fontSize,
              height: bounds.height,
            }
          : null
      },
    )
    const unit = [...el.querySelectorAll('p, span')].find(
      (item) => item.textContent === 'RON' && item.children.length === 0,
    ) as HTMLElement | undefined
    return {
      digits,
      unit: unit
        ? { top: unit.getBoundingClientRect().top, font: getComputedStyle(unit).fontSize }
        : null,
    }
  })
}

async function expectAlignedMetric(
  card: import('@playwright/test').Locator,
  value: string,
  fontSize: number,
) {
  await expect
    .poll(async () => (await metricGeometry(card)).digits.map((digit) => digit?.text).join(''))
    .toBe(value)
  const geometry = await metricGeometry(card)
  expect(geometry.unit?.font).toBe(`${fontSize}px`)
  for (const digit of geometry.digits) {
    expect(digit?.font).toBe(geometry.unit?.font)
    expect(digit?.height).toBe(fontSize)
    expect(Math.abs(digit!.top - geometry.unit!.top)).toBeLessThan(1)
  }
}

for (const width of [320, 390, 1440]) {
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    test(`metric counter digits align at ${width}px with motion ${reducedMotion}`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion })
      await page.setViewportSize({ width, height: 1000 })
      await page.goto('/?mode=metrics')
      await page.evaluate(() => document.fonts.ready)
      const fontSize = width >= 640 ? 30 : 20
      const overview = page
        .getByRole('article')
        .filter({ has: page.getByText('Fonduri înregistrate', { exact: true }) })
      await expectAlignedMetric(overview, '12345', fontSize)
      await overview.screenshot({
        path: `/tmp/triumph-metric-overview-${width}-${reducedMotion}.png`,
      })
      await page.getByRole('button', { name: 'Raport final', exact: true }).click()
      const report = page
        .getByRole('article')
        .filter({ has: page.getByText('Fonduri strânse', { exact: true }) })
      const average = page
        .getByRole('article')
        .filter({ has: page.getByText('Donație medie', { exact: true }) })
      await expectAlignedMetric(report, '12345', fontSize)
      await expectAlignedMetric(average, '12345', fontSize)
      await report.screenshot({ path: `/tmp/triumph-metric-report-${width}-${reducedMotion}.png` })
      await page.getByRole('button', { name: 'Overview', exact: true }).click()
      await expectAlignedMetric(overview, '12345', fontSize)
      // A responsive resize must not leave the rollers using their old pixel height.
      const resizedWidth = width < 640 ? 1440 : 320
      await page.setViewportSize({ width: resizedWidth, height: 1000 })
      await expectAlignedMetric(overview, '12345', resizedWidth >= 640 ? 30 : 20)
    })
  }
}

test('metric counters show the new amount after updating a participant and returning to a hidden tab', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.route('**/members/projects/check-in', (route) =>
    route.fulfill({
      json: {
        registration: {
          id: 'zoe',
          ageGroup: 'adult',
          status: 'present',
          donation: 54321,
          consumptionAmount: 200,
          guests: 9,
          timeOfArrival: '2026-10-27T12:00:00Z',
        },
      },
    }),
  )
  await page.goto('/?mode=metrics')
  const overview = page
    .getByRole('article')
    .filter({ has: page.getByText('Fonduri înregistrate', { exact: true }) })
  await expectAlignedMetric(overview, '12345', 30)
  await page.getByRole('button', { name: /^Check-in/ }).click()
  await page.getByRole('button', { name: 'Editează', exact: true }).click()
  await page.getByRole('spinbutton', { name: 'Total încasat' }).fill('54521')
  await page.getByRole('button', { name: 'Confirmă check-in', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Overview', exact: true }).click()
  await expectAlignedMetric(overview, '54321', 30)
})

for (const width of [320, 390, 1440]) {
  test(`check-in attendance statistic at ${width}px counts companions across all pages and filters`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/?mode=list&count=205')
    const statistic = page.getByRole('status', { name: 'Prezență la eveniment', exact: true })
    await expect(statistic).toContainText('10 persoane prezente')
    await expect(statistic).toContainText('3,3% din capacitate (10 / 300)')
    await expect(statistic).toContainText('Total eveniment · include însoțitorii.')
    await page.screenshot({ path: `/tmp/triumph-checkin-attendance-${width}.png` })
    await page
      .getByRole('navigation', { name: 'Paginare sus', exact: true })
      .getByRole('combobox')
      .selectOption('3')
    await expect(statistic).toContainText('10 persoane prezente')
    await page.getByRole('combobox', { name: 'Filtrează după status' }).selectOption('registered')
    await page.getByRole('searchbox').fill('Ana')
    await expect(statistic).toContainText('3,3% din capacitate (10 / 300)')
    await page.getByRole('searchbox').clear()
    await page.locator('select').first().selectOption('earlier:early')
    await expect(statistic).toContainText('10 persoane prezente')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

test('check-in attendance statistic updates immediately after confirming a group', async ({
  page,
}) => {
  await page.route('**/members/projects/check-in', (route) =>
    route.fulfill({
      json: {
        registration: {
          id: 'ana',
          ageGroup: 'adult',
          status: 'present',
          donation: 90,
          consumptionAmount: 60,
          guests: 2,
          timeOfArrival: '2026-10-27T12:00:00Z',
        },
      },
    }),
  )
  await page.goto('/?mode=list')
  const statistic = page.getByRole('status', { name: 'Prezență la eveniment', exact: true })
  await expect(statistic).toContainText('10 persoane prezente')
  await page
    .locator('tbody tr')
    .filter({ has: page.getByText('Ana', { exact: true }) })
    .getByRole('button', { name: 'Confirmă', exact: true })
    .click()
  await page.getByRole('radio', { name: 'Major — 18+' }).check()
  await page.getByRole('spinbutton', { name: 'Persoane însoțitoare' }).fill('2')
  await page.getByRole('spinbutton', { name: 'Total încasat' }).fill('150')
  await page.getByRole('button', { name: 'Confirmă check-in', exact: true }).click()
  await expect(statistic).toContainText('13 persoane prezente')
  await expect(statistic).toContainText('4,3% din capacitate (13 / 300)')
})

test('check-in attendance statistic handles no arrivals, zero capacity, and excess attendance', async ({
  page,
}) => {
  const statistic = page.getByRole('status', { name: 'Prezență la eveniment', exact: true })
  await page.goto('/?mode=list&empty-attendance=1')
  await expect(statistic).toContainText('0 persoane prezente')
  await expect(statistic).toContainText('0% din capacitate (0 / 300)')
  await page.goto('/?mode=list&slot-capacity=0')
  await expect(statistic).toContainText('10 persoane prezente')
  await expect(statistic).toContainText('Capacitate neconfigurată')
  await expect(statistic).not.toContainText('%')
  await page.goto('/?mode=list&slot-capacity=1')
  await expect(statistic).toContainText('333,3% din capacitate (10 / 3)')
  await page.goto('/?mode=list&present-guests=0')
  await expect(statistic).toContainText('1 persoană prezentă')
  await expect(statistic).toContainText('0,3% din capacitate (1 / 300)')
})

async function mockRemoteOperations(context: import('@playwright/test').BrowserContext) {
  let revision = 1
  const rows = Array.from({ length: 201 }, (_, i) => ({
    id: `r${i + 1}`,
    name: `Participant ${String(i + 1).padStart(3, '0')}`,
    email: `p${i + 1}@example.com`,
    phone: '',
    day: 'day',
    slot: 'slot',
    guests: 0,
    donation: i === 0 ? 30.15 : 0,
    consumptionAmount: i === 0 ? 20.25 : null,
    ageGroup: 'adult',
    status: i === 0 ? 'present' : 'registered',
    createdAt: '2026-10-27T12:00:00Z',
    timeOfArrival: null,
    operationVersion: 1,
    lastHandledName: i === 0 ? 'Maria Voluntar' : '',
    lastHandledAt: null,
  }))
  let shift = {
    id: 'shift',
    day: 'day',
    slot: 'slot',
    members: [{ id: 'staff', name: 'Maria Voluntar' }],
    handoverNote: 'Registrul și restul sunt pregătite pentru următoarea echipă.',
    updatedBy: 'Maria Voluntar',
    updatedAt: '2026-10-27T12:00:00Z',
    closing: null as any,
  }
  let logs = [
    {
      id: 'log',
      action: 'check-in',
      actorName: 'Maria Voluntar',
      createdAt: '2026-10-27T12:00:00Z',
      registrationId: 'r1',
      participantName: rows[0].name,
      reason: '',
      version: 1,
      canUndo: true,
      changes: [{ field: 'status', before: 'registered', after: 'present' }],
    },
  ]
  const requests: URL[] = [],
    mutations: any[] = []
  const summary = () => {
    const present = rows.filter((row) => row.status === 'present')
    const donation = Math.round(present.reduce((sum, row) => sum + row.donation * 100, 0)) / 100,
      consumptionAmount =
        Math.round(present.reduce((sum, row) => sum + (row.consumptionAmount || 0) * 100, 0)) / 100
    return {
      day: 'day',
      slot: 'slot',
      capacity: 500,
      activeCount: rows.length,
      reservedPeople: rows.length,
      presentCount: present.length,
      presentPeople: present.length,
      pendingPeople: rows.length - present.length,
      absentCount: 0,
      donation,
      consumptionAmount,
      totalCollected: Math.round((donation + consumptionAmount) * 100) / 100,
      legacyConsumptionCount: 0,
    }
  }
  await context.route('**/members/projects/data?**', async (route) => {
    const url = new URL(route.request().url())
    requests.push(url)
    if (route.request().headers()['if-none-match'] === `"${revision}"`)
      return route.fulfill({ status: 304 })
    const s = summary(),
      q = url.searchParams.get('q') || '',
      status = url.searchParams.get('status'),
      selected = url.searchParams.get('shift')
    let filtered = rows.filter(
      (row) =>
        (!q ||
          checkInSearchTerms(q).every((term) =>
            [row.name, row.email, row.phone].some((value) =>
              new RegExp(checkInSearchPattern(term), 'i').test(value),
            ),
          )) &&
        (selected === 'all' || !selected || `${row.day}:${row.slot}` === selected) &&
        (!status || status === 'all' || row.status === status),
    )
    if (url.searchParams.get('sort') === 'participant')
      filtered = [...filtered].sort(
        (a, b) =>
          a.name.localeCompare(b.name) *
          (url.searchParams.get('direction') === 'descending' ? -1 : 1),
      )
    const pageNumber = Math.min(
      Math.max(1, Number(url.searchParams.get('page') || 1)),
      Math.max(1, Math.ceil(filtered.length / 100)),
    )
    const metrics = {
      activeCount: 201,
      presentCount: s.presentCount,
      absentCount: 0,
      activePeople: 201,
      unprocessed: 201 - s.presentCount,
      capacity: 1500,
      funds: s.donation,
      consumptionAmount: s.consumptionAmount,
      totalCollected: s.totalCollected,
      legacyConsumptionCount: 0,
      companions: 0,
      peoplePresent: s.presentPeople,
      attendanceRate: 100,
      averageDonation: s.donation / s.presentCount,
      averageGroupSize: 1,
      checkInProgress: 1,
      donationPerPerson: s.donation / s.presentCount,
      missingDonations: 0,
      noShowRate: 0,
      occupancy: 13,
      remainingCapacity: 1299,
      topSlotLabel: '21 iunie',
      days: [],
    }
    return route.fulfill({
      headers: { ETag: `"${revision}"` },
      json: {
        eventId: 'event',
        viewerId: 'staff',
        revision,
        event: {},
        page: pageNumber,
        totalDocs: filtered.length,
        totalPages: Math.max(1, Math.ceil(filtered.length / 100)),
        registrations: filtered.slice((pageNumber - 1) * 100, pageNumber * 100),
        warnings: {},
        metrics,
        slots: [
          s,
          {
            ...s,
            day: 'earlier',
            slot: 'early',
            activeCount: 0,
            reservedPeople: 0,
            presentCount: 0,
            presentPeople: 0,
            pendingPeople: 0,
          },
        ],
        recentRegistrations: [],
        shifts: [shift],
      },
    })
  })
  await context.route('**/members/projects/check-in', async (route) => {
    const body = route.request().postDataJSON()
    mutations.push(body)
    const row = rows.find((row) => row.id === body.registrationId)!
    if (body.expectedVersion !== row.operationVersion)
      return route.fulfill({
        status: 409,
        json: {
          message: 'Alt membru a modificat această înscriere. Verifică datele actualizate.',
          registration: row,
        },
      })
    Object.assign(row, {
      ...body,
      donation: body.totalCollected - 20 * (1 + body.guests),
      consumptionAmount: 20 * (1 + body.guests),
      status: 'present',
      operationVersion: row.operationVersion + 1,
      lastHandledName: 'Maria Voluntar',
      lastHandledAt: '2026-10-27T13:00:00Z',
    })
    revision++
    return route.fulfill({ json: { registration: row } })
  })
  await context.route('**/members/projects/operations**', async (route) => {
    if (route.request().method() === 'GET')
      return route.fulfill({ json: { items: logs, page: 1, totalPages: 1 } })
    const body = route.request().postDataJSON()
    mutations.push(body)
    revision++
    if (body.action === 'close-shift')
      shift = {
        ...shift,
        closing: {
          ...summary(),
          id: 'closing',
          actorName: 'Manager',
          createdAt: '2026-10-27T13:00:00Z',
          countedAmount: Number(body.countedAmount),
          difference:
            Math.round((Number(body.countedAmount) - summary().totalCollected) * 100) / 100,
          note: body.note,
        },
      }
    if (body.action === 'reopen-shift') shift = { ...shift, closing: null }
    if (body.action === 'save-shift') shift = { ...shift, handoverNote: body.handoverNote }
    if (body.action === 'undo')
      logs = [{ ...logs[0], id: 'undo', action: 'undo', reason: body.reason, canUndo: false }]
    return route.fulfill({ json: { message: 'Salvat' } })
  })
  return { requests, mutations, rows }
}

for (const width of [320, 1440]) {
  test(`remote shift operations and reconciliation at ${width}px`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 1000 })
    const state = await mockRemoteOperations(context)
    await page.goto('/?mode=list&remote=1&manager=1&warnings=1&slot-capacity=500')
    const shifts = page.getByRole('combobox', { name: 'Filtrează după tură' })
    await expect(shifts).toHaveValue('earlier:early')
    await shifts.selectOption('day:slot')
    const panel = page.getByRole('region', { name: 'Tura selectată' })
    await expect(panel).toContainText('Maria Voluntar')
    await expect(panel).toContainText('Registrul și restul')
    await expect(page.locator('tbody tr')).toHaveCount(100)
    await expect(
      page.getByRole('status', { name: 'Prezență la eveniment', exact: true }),
    ).toContainText('1 persoană prezentă')
    await panel.screenshot({ path: `/tmp/event-shift-${width}.png` })
    await page.getByRole('button', { name: 'Închide tura', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('spinbutton')).toBeFocused()
    await expect(dialog).toContainText('50,40')
    await dialog.getByRole('spinbutton').fill('50.39')
    await expect(dialog.getByRole('button', { name: 'Confirmă închiderea' })).toBeDisabled()
    await dialog.getByRole('textbox').fill('Diferență verificată în registru')
    await expect(dialog.getByRole('button', { name: 'Confirmă închiderea' })).toBeEnabled()
    await expect(dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).resolves.toBe(true)
    await dialog.screenshot({ path: `/tmp/event-closing-${width}.png` })
    await dialog.getByRole('button', { name: 'Confirmă închiderea' }).click()
    await expect(panel).toContainText('Tură închisă')
    expect(state.mutations.at(-1)).toMatchObject({
      action: 'close-shift',
      countedAmount: '50.39',
      note: 'Diferență verificată în registru',
    })
    await page.getByRole('button', { name: 'Redeschide tura', exact: true }).click()
    await dialog.getByRole('textbox').fill('Corectare aprobată de manager')
    await dialog.getByRole('button', { name: 'Confirmă redeschiderea' }).click()
    await expect(panel).not.toContainText('Tură închisă')
    await page.getByRole('button', { name: 'Acțiuni' }).click()
    await page.getByRole('menuitem', { name: 'Istoric și anulare modificări' }).click()
    await expect(dialog).toContainText('Maria Voluntar')
    await dialog.getByRole('button', { name: 'Anulează această modificare…' }).click()
    await dialog
      .getByRole('textbox', { name: 'Motivul anulării' })
      .fill('Participant confirmat din greșeală')
    await dialog.screenshot({ path: `/tmp/event-history-${width}.png` })
    await dialog.getByRole('button', { name: 'Confirmă anularea', exact: true }).click()
    await expect(dialog).toContainText('Modificare anulată')
  })
}

test('remote pagination, sorting, and single-result shortcut query the full event', async ({
  page,
  context,
}) => {
  const state = await mockRemoteOperations(context)
  await page.goto('/?mode=list&remote=1&manager=1&warnings=1&slot-capacity=500')
  await page.getByRole('combobox', { name: 'Filtrează după tură' }).selectOption('day:slot')
  await expect(page.locator('tbody tr')).toHaveCount(100)
  await page.getByRole('button', { name: 'Pagina următoare' }).first().click()
  await expect(page.locator('tbody tr').first()).toContainText('Participant 101')
  await page.getByRole('button', { name: 'Sortează după Participant, crescător' }).click()
  await page.getByRole('button', { name: 'Sortează după Participant, descrescător' }).click()
  await expect(page.locator('tbody tr').first()).toContainText('Participant 201')
  const search = page.getByRole('searchbox')
  await search.fill('Participant 201')
  await expect(
    page.getByRole('button', { name: /Deschide confirmarea pentru Participant 201/ }),
  ).toBeVisible()
  await search.press('Enter')
  await expect(page.getByRole('dialog')).toContainText('Participant 201')
  expect(state.requests.some((url) => url.searchParams.get('page') === '2')).toBe(true)
  expect(state.requests.some((url) => url.searchParams.get('direction') === 'descending')).toBe(
    true,
  )
  expect(state.requests.at(-1)?.searchParams.get('q')).toBe('Participant 201')
})

test('two check-in devices reject stale confirmation and refresh live attendance', async ({
  page,
  context,
}) => {
  await mockRemoteOperations(context)
  const second = await context.newPage()
  for (const device of [page, second]) {
    await device.goto('/?mode=list&remote=1&manager=1&warnings=1&slot-capacity=500')
    await device.getByRole('combobox', { name: 'Filtrează după tură' }).selectOption('day:slot')
    await device.getByRole('searchbox').fill('Participant 201')
    await device
      .getByRole('button', { name: /Deschide confirmarea pentru Participant 201/ })
      .click()
    await device.getByRole('dialog').getByRole('spinbutton', { name: 'Total încasat' }).fill('50')
  }
  await page.getByRole('button', { name: 'Confirmă check-in', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await second.getByRole('button', { name: 'Confirmă check-in', exact: true }).click()
  await expect(second.getByRole('dialog')).toContainText('Alt membru a modificat')
  await expect(second.getByRole('dialog')).toContainText('Maria Voluntar')
  await second.getByRole('button', { name: 'Închide', exact: true }).click()
  await expect(
    second.getByRole('status', { name: 'Prezență la eveniment', exact: true }),
  ).toContainText('2 persoane prezente')
})

for (const width of [320, 1440]) {
  test(`Romanian check-in search ignores diacritics and word order at ${width}px`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/?mode=list')
    const search = page.getByRole('searchbox', { name: 'Caută participanți' })
    for (const query of ['stefan', 'ȘTEFAN', 'Ştefan', 'S\u0326tefan']) {
      await search.fill(query)
      await expect(
        page.getByRole('button', { name: 'Deschide confirmarea pentru Ștefan' }),
      ).toBeVisible()
    }
    await search.press('Enter')
    await expect(
      page.getByRole('dialog').getByRole('heading', { name: 'Ștefan', exact: true }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Închide', exact: true }).click()
    await page.goto('/?mode=list&long-name=1')
    for (const query of ['popescu ana', 'ANA POPESCU', '  popescu    ana  ']) {
      await search.fill(query)
      await expect(
        page.getByRole('button', { name: /Deschide confirmarea pentru Ana Popescu/ }),
      ).toBeVisible()
    }
    await search.press('Enter')
    await expect(page.getByRole('dialog')).toContainText('Ana Popescu')
    await page.getByRole('button', { name: 'Închide', exact: true }).click()
    const state = await mockRemoteOperations(context)
    state.rows.at(-1)!.name = 'Ștefan Țiriac'
    await page.goto('/?mode=list&remote=1&manager=1&warnings=1&slot-capacity=500')
    await page.getByRole('combobox', { name: 'Filtrează după tură' }).selectOption('day:slot')
    for (const query of [
      'stefan tiriac',
      'Ștefan Țiriac',
      'ŞTEFAN ŢIRIAC',
      '  tiriac   stefan  ',
      'ŢIRIAC ȘTEFAN',
    ]) {
      await search.fill(query)
      await expect(
        page.getByRole('button', { name: 'Deschide confirmarea pentru Ștefan Țiriac' }),
      ).toBeVisible()
      await expect(page.locator('tbody tr')).toHaveCount(1)
    }
    await search.press('Enter')
    await expect(page.getByRole('dialog')).toContainText('Ștefan Țiriac')
    expect(state.requests.at(-1)?.searchParams.get('q')).toBe('ŢIRIAC ȘTEFAN')
  })
}

for (const width of [320, 1440]) {
  test(`empty-result add participant shortcut at ${width}px is visible and clickable`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 })
    const writes: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('/members/projects/check-in') && request.method() !== 'GET')
        writes.push(request.method())
    })
    await page.goto('/?mode=list')
    const search = page.getByRole('searchbox')
    await search.fill('Participant nou')
    const action = page.getByRole('button', { name: 'Adaugă participant nou' })
    await expect(action).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `/tmp/checkin-empty-search-${width}.png`, fullPage: true })
    await action.click()
    await expect(page.getByRole('dialog')).toHaveAccessibleName('Adaugă participant la eveniment')
    await expect(
      page.getByRole('dialog').getByRole('textbox', { name: 'Nume *', exact: true }),
    ).toBeFocused()
    expect(writes).toEqual([])
    await page.getByRole('button', { name: 'Închide', exact: true }).click()
    await expect(search).toBeFocused()
  })
}

test('empty-result shortcut waits for server results and stays disabled on refresh failures', async ({
  page,
  context,
}) => {
  await mockRemoteOperations(context)
  let release: (() => void) | undefined
  let fail = false
  await page.route('**/members/projects/data?**', async (route) => {
    if (fail)
      return route.fulfill({ status: 503, json: { message: 'Lista este temporar indisponibilă.' } })
    if (new URL(route.request().url()).searchParams.get('q') === 'Participant nou' && !release)
      await new Promise<void>((resolve) => {
        release = resolve
      })
    await route.fallback()
  })
  await page.goto('/?mode=list&remote=1&manager=1&warnings=1')
  await page.getByRole('combobox', { name: 'Filtrează după tură' }).selectOption('day:slot')
  await expect(page.locator('tbody tr')).toHaveCount(100)
  const search = page.getByRole('searchbox')
  await search.fill('Participant nou')
  await expect.poll(() => Boolean(release)).toBe(true)
  await search.press('Enter')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Adaugă participant nou' })).toHaveCount(0)
  release!()
  await expect(page.getByRole('button', { name: 'Adaugă participant nou' })).toBeVisible()
  fail = true
  await page.getByRole('button', { name: 'Actualizează', exact: true }).click()
  await expect(page.getByText(/Actualizarea este întreruptă/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Adaugă participant nou' })).toHaveCount(0)
  await search.press('Enter')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  fail = false
  await page.getByRole('button', { name: 'Actualizează', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Adaugă participant nou' })).toBeVisible()
  await search.press('Enter')
  await expect(page.getByRole('dialog')).toHaveAccessibleName('Adaugă participant la eveniment')
})
