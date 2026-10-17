import { expect, test } from '@playwright/test'
import { detailStatus, openApp, selectClaim, visibleRows } from './support/app'
import { COUNTS, IDS, REVIEW_IDS, RISKY_IDS } from './support/fixture'

const semuaChip = (page: import('@playwright/test').Page) => page.getByRole('button', { name: /^Semua/ })
const berisikoChip = (page: import('@playwright/test').Page) => page.getByRole('button', { name: /Berisiko/ })

test.beforeEach(async ({ page }) => {
  await openApp(page)
})

test.describe('filter berisiko', () => {
  test('menampilkan klaim berskor tinggi saja', async ({ page }) => {
    await berisikoChip(page).click()

    await expect(page.getByText('Klaim berisiko tinggi')).toBeVisible()
    await expect(visibleRows(page)).toHaveCount(RISKY_IDS.length)
  })

  test('badge cocok dengan jumlah baris yang dimunculkan', async ({ page }) => {
    const badge = await berisikoChip(page).innerText()
    const count = Number(badge.match(/\d+/)![0])

    await berisikoChip(page).click()

    await expect(visibleRows(page)).toHaveCount(count)
    expect(count).toBe(COUNTS.risky)
  })

  test('tidak menyertakan klaim berisiko rendah', async ({ page }) => {
    await berisikoChip(page).click()

    await expect(page.getByRole('button', { name: new RegExp(IDS.clean) })).toHaveCount(0)
  })
})

test.describe('filter perlu ditinjau', () => {
  test('memfilter berdasarkan status', async ({ page }) => {
    await page
      .getByRole('button', { name: /Perlu ditinjau/ })
      .first()
      .click()

    await expect(page.getByText('Klaim perlu ditinjau')).toBeVisible()
    await expect(visibleRows(page)).toHaveCount(REVIEW_IDS.length)
  })

  test('tidak menyertakan klaim siap kirim', async ({ page }) => {
    await page
      .getByRole('button', { name: /Perlu ditinjau/ })
      .first()
      .click()

    await expect(page.getByRole('button', { name: new RegExp(IDS.clean) })).toHaveCount(0)
  })
})

test.describe('filter semua', () => {
  test('bisa kembali dari berisiko', async ({ page }) => {
    await berisikoChip(page).click()
    await expect(visibleRows(page)).toHaveCount(RISKY_IDS.length)

    await semuaChip(page).click()

    await expect(page.getByText('Ikhtisar klaim')).toBeVisible()
    await expect(visibleRows(page)).toHaveCount(COUNTS.total)
  })

  test('hanya satu chip aktif pada satu waktu', async ({ page }) => {
    await expect(semuaChip(page)).toHaveClass(/filter-active/)
    await expect(berisikoChip(page)).not.toHaveClass(/filter-active/)

    await berisikoChip(page).click()

    await expect(berisikoChip(page)).toHaveClass(/filter-active/)
    await expect(semuaChip(page)).not.toHaveClass(/filter-active/)
  })
})

test.describe('panel detail mengikuti filter', () => {
  test('tidak menampilkan klaim yang tersaring keluar', async ({ page }) => {
    await selectClaim(page, IDS.clean)
    await berisikoChip(page).click()

    // `clean` scores 8 and is not in the risky set, so the pane must move on.
    await expect(page.locator('.claim-id')).not.toHaveText(IDS.clean)
    await expect(detailStatus(page)).toHaveText('Perlu ditinjau')
  })

  test('berpindah ke klaim pertama saat daftar jadi kosong', async ({ page }) => {
    await page.getByRole('button', { name: /Semua/ }).click()
    await expect(visibleRows(page)).toHaveCount(COUNTS.total)
  })
})
