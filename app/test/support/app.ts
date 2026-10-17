import { expect, type Page } from '@playwright/test'

/**
 * Page-object-ish helpers shared by the spec files.
 *
 * Kept out of the specs themselves so a flow change is edited once, and so
 * each spec file reads as a list of behaviours rather than a wall of selectors.
 */

/** Load the app from a clean slate. */
export const openApp = async (page: Page, { dark }: { dark?: boolean } = {}) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()

  if (dark) {
    await page.getByRole('button', { name: /Gunakan mode gelap/ }).click()
    await expect(page.locator('.shell')).toHaveClass(/theme-dark/)
  }
}

/** Reload without clearing anything. */
export const reloadApp = async (page: Page) => {
  await page.reload()
}

/** Put a raw value into localStorage, for the corrupt-store cases. */
export const seedStorage = (page: Page, key: string, value: string) =>
  page.evaluate(([k, v]) => localStorage.setItem(k, v as string), [key, value] as const)

// ------------------------------------------------------------------ claims

export const selectClaim = async (page: Page, id: string) => {
  await page.getByRole('button', { name: new RegExp(id) }).click()
  await expect(page.locator('.claim-id')).toHaveText(id)
}

export const visibleRows = (page: Page) => page.locator('.table .tr.row')

export const detailStatus = (page: Page) => page.locator('.detail-top .status')

export const detailScore = (page: Page) => page.locator('.detail .score-card strong')

export const flagMessages = (page: Page) => page.locator('.flags .flag b').allTextContents()

export const auditTrail = (page: Page) => page.locator('.audit-trail')

// ------------------------------------------------------------------ storage

export const auditLog = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('preclaim-audit-log') ?? '[]'))

export const storedClaims = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('preclaim-claims') ?? '{"claims":[]}'))

export const lastEvent = async (page: Page) => {
  const log = await auditLog(page)
  return log.at(-1)?.events.at(-1)
}

// ------------------------------------------------------------------ revision

export const openRevision = async (page: Page) => {
  await page.getByRole('button', { name: '↺ Revisi kode' }).click()
  await expect(page.locator('.revision-box')).toBeVisible()
}

export const revise = async (page: Page, opts: { code?: string; reason: string; evidence?: boolean }) => {
  await openRevision(page)
  if (opts.code) await page.getByLabel('Kode tindakan koreksi').fill(opts.code)
  await page.getByLabel('Alasan perubahan').fill(opts.reason)
  if (opts.evidence !== false) await page.locator('.revision-box input[type="checkbox"]').check()
  await page.getByRole('button', { name: 'Konfirmasi revisi' }).click()
}

// ------------------------------------------------------------------ approval

export const writeNote = (page: Page, note: string) => page.locator('#coder-note').fill(note)

export const approve = async (page: Page, note?: string) => {
  if (note) await writeNote(page, note)
  await page.getByRole('button', { name: '✓ Setujui dengan catatan' }).click()
}

// ------------------------------------------------------------------ add claim

export const openAdd = async (page: Page) => {
  await page.getByRole('button', { name: /Tambah klaim baru/ }).click()
  await expect(page.locator('.revision-box')).toBeVisible()
}

export type Draft = Partial<{
  patient: string
  diagnosis: string
  procedure: string
  amount: string
  length: string
  service: string
  documents: boolean
}>

/** Fill and submit the add-claim form. */
export const addClaim = async (page: Page, draft: Draft) => {
  await openAdd(page)
  if (draft.patient) await page.getByLabel('Pasien').fill(draft.patient)
  if (draft.diagnosis) await page.getByLabel('Diagnosis (ICD-10)').fill(draft.diagnosis)
  if (draft.procedure) await page.getByLabel('Kode tindakan').fill(draft.procedure)
  if (draft.amount) await page.getByLabel('Total tagihan').fill(draft.amount)
  if (draft.length) await page.getByLabel('Lama rawat').fill(draft.length)
  if (draft.documents) await page.locator('.check-row input').check()
  await page.getByRole('button', { name: 'Tambahkan klaim' }).click()
}

// ------------------------------------------------------------------ rules

export const openRules = async (page: Page) => {
  await page.getByRole('button', { name: 'Aturan pemeriksaan' }).click()
  const dialog = page.getByRole('dialog', { name: 'Aturan pemeriksaan' })
  await expect(dialog).toBeVisible()
  return dialog
}

// ------------------------------------------------------------------ style

/** Perceived brightness of an element's background, 0 (black) to 1 (white). */
export const luminance = (page: Page, selector: string) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const [r, g, b] = getComputedStyle(el)
      .backgroundColor.match(/[\d.]+/g)!
      .map(Number)
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  }, selector)
