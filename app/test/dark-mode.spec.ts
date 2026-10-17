import { expect, test } from '@playwright/test'
import { luminance, openApp, openRules } from './support/app'

/**
 * Dark mode had no coverage, so a dozen tinted surfaces kept their light pastel
 * fills and rendered as bright patches on the dark page. These assert computed
 * background luminance, which fails for any element left light.
 */
const TINTED: { selector: string; needsRulesPanel?: boolean }[] = [
  { selector: '.score-card' },
  { selector: '.status.warn' },
  { selector: '.risk.high' },
  { selector: '.filters .filter-active' },
  { selector: 'nav button.active' },
  { selector: 'nav em' },
  { selector: '.flag.info .flag-icon' },
  { selector: '.rule-id', needsRulesPanel: true },
]

test.describe('mode gelap', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page, { dark: true })
  })

  for (const { selector, needsRulesPanel } of TINTED) {
    test(`${selector} digelapkan`, async ({ page }) => {
      if (needsRulesPanel) await openRules(page)

      expect(await luminance(page, selector)).toBeLessThan(0.5)
    })
  }

  test('bertahan setelah muat ulang', async ({ page }) => {
    await page.reload()

    await expect(page.locator('.shell')).toHaveClass(/theme-dark/)
    expect(await luminance(page, '.score-card')).toBeLessThan(0.5)
  })

  test('modal revisi ikut gelap', async ({ page }) => {
    await page.getByRole('button', { name: '↺ Revisi kode' }).click()

    expect(await luminance(page, '.revision-box')).toBeLessThan(0.5)
    expect(await luminance(page, '.modal-card input:not([type="checkbox"])')).toBeLessThan(0.25)
    expect(await luminance(page, '.modal-card textarea')).toBeLessThan(0.25)
  })

  test('drawer navigasi dan modal aturan mengikuti dark mode di mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: 'Buka navigasi' }).click()
    expect(await luminance(page, '#mobile-navigation.mobile-nav-open')).toBeLessThan(0.2)

    await page.getByRole('button', { name: 'Aturan pemeriksaan' }).click()
    expect(await luminance(page, '.rules-panel')).toBeLessThan(0.2)
  })
})

test.describe('mode terang', () => {
  test('tidak terpengaruh oleh gaya mode gelap', async ({ page }) => {
    await openApp(page)
    await page.getByRole('button', { name: /Gunakan mode gelap/ }).click()
    await page.getByRole('button', { name: /Gunakan mode terang/ }).click()

    await expect(page.locator('.shell')).not.toHaveClass(/theme-dark/)
    expect(await luminance(page, '.score-card')).toBeGreaterThan(0.8)
  })
})
