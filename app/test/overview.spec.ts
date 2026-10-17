import { expect, test } from '@playwright/test'
import { detailScore, detailStatus, flagMessages, openApp, selectClaim, visibleRows } from './support/app'
import { COUNTS, FINDING, IDS, SCORES } from './support/fixture'

test.beforeEach(async ({ page }) => {
  await openApp(page)
})

test.describe('ringkasan', () => {
  test('menampilkan seluruh klaim sintetis', async ({ page }) => {
    await expect(page.getByText('Ikhtisar klaim')).toBeVisible()
    await expect(visibleRows(page)).toHaveCount(COUNTS.total)
    await expect(page.locator('.stats').first()).toContainText(String(COUNTS.total))
  })

  test('rata-rata risiko dihitung dari klaim, bukan angka tetap', async ({ page }) => {
    await expect(page.locator('.stats')).toContainText(String(SCORES.average))
  })

  test('memisahkan jumlah perlu ditinjau dan siap dikirim', async ({ page }) => {
    await expect(page.locator('.stats')).toContainText(String(COUNTS.review))
    await expect(page.locator('.stats')).toContainText(String(COUNTS.ready))
  })
})

test.describe('temuan pemeriksaan', () => {
  test('menampilkan temuan beserta aturan yang memicunya', async ({ page }) => {
    await selectClaim(page, IDS.dxMismatch)

    await expect(detailScore(page)).toContainText(String(SCORES.dxMismatch))
    await expect(page.getByText(FINDING.dxMismatch)).toBeVisible()
    await expect(page.getByText(FINDING.missingEvidence)).toBeVisible()
  })

  test('membedakan peringatan dari informasi', async ({ page }) => {
    await selectClaim(page, IDS.dxMismatch)

    await expect(page.locator('.flags .flag.warn')).toHaveCount(1)
    await expect(page.locator('.flags .flag.info')).toHaveCount(1)
  })

  test('setiap temuan menautkan ke ruleId-nya', async ({ page }) => {
    await selectClaim(page, IDS.duplicateB)
    const texts = await flagMessages(page)

    await expect(texts.some((t) => /Kemiripan/.test(t))).toBe(true)
    await expect(texts.some((t) => /Durasi rawat/.test(t))).toBe(true)
  })

  test('klaim bersih lolos tanpa temuan', async ({ page }) => {
    await selectClaim(page, IDS.clean)

    await expect(page.getByText('Tidak ada temuan aktif')).toBeVisible()
    await expect(detailStatus(page)).toHaveText('Siap submit')
  })

  test('disclaimer posisi koder selalu tampil', async ({ page }) => {
    await expect(page.getByText('Asisten, bukan hakim.')).toBeVisible()
  })
})
