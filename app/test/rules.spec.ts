import { expect, test } from '@playwright/test'
import { openApp, openRules } from './support/app'
import { RULES } from './support/fixture'

test.beforeEach(async ({ page }) => {
  await openApp(page)
})

test.describe('daftar aturan', () => {
  test('menampilkan seluruh aturan yang dijalankan', async ({ page }) => {
    const dialog = await openRules(page)

    await expect(dialog.locator('.rule')).toHaveCount(RULES.length)
    for (const id of RULES) await expect(dialog).toContainText(id)
  })

  test('setiap aturan berversi dan bersumber', async ({ page }) => {
    const dialog = await openRules(page)

    await expect(dialog.locator('.rule-version')).toHaveCount(RULES.length)
    await expect(dialog).toContainText('Sumber:')
  })

  test('menampilkan tabel kode yang diterima per diagnosis', async ({ page }) => {
    const dialog = await openRules(page)
    const table = dialog.locator('.rule-pairs')

    await expect(table).toContainText('K35.8')
    await expect(table).toContainText('47.09, 47.11, 47.12')
  })

  test('menjelaskan semantik pencabutan temuan', async ({ page }) => {
    const dialog = await openRules(page)

    await expect(dialog).toContainText('hanya menjalankan ulang aturan')
  })

  test('aturan ICD-10 mengutip pedoman publik, bukan aturan lokal', async ({ page }) => {
    const dialog = await openRules(page)

    // The other rules are synthetic demo data. This one is traceable to a
    // published guideline, which is the point of shipping it.
    await expect(dialog).toContainText('I.C.18')
  })

  test('dapat ditutup', async ({ page }) => {
    const dialog = await openRules(page)
    await page.getByRole('button', { name: 'Tutup aturan pemeriksaan' }).click()

    await expect(dialog).toHaveCount(0)
  })
})
