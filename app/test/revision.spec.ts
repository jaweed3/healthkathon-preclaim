import { expect, test } from '@playwright/test'
import {
  auditLog,
  detailScore,
  detailStatus,
  flagMessages,
  lastEvent,
  openApp,
  revise,
  selectClaim,
} from './support/app'
import { FINDING, IDS, NOTICE, SCORES } from './support/fixture'

test.beforeEach(async ({ page }) => {
  await openApp(page)
})

test.describe('memperbaiki temuan diagnosis-tindakan', () => {
  test.beforeEach(async ({ page }) => {
    await selectClaim(page, IDS.dxMismatch)
  })

  test('menurunkan skor dan melepas status perlu ditinjau', async ({ page }) => {
    await revise(page, { code: '47.09', reason: 'Resume medis mendukung apendektomi.' })

    await expect(detailScore(page)).toContainText('24')
    await expect(detailStatus(page)).toHaveText('Siap submit')
  })

  test('TIDAK menghapus temuan dari aturan lain', async ({ page }) => {
    // The defect this guards: revision replaced the whole flag list, deleting
    // the similarity finding on a claim that still had one.
    await selectClaim(page, IDS.duplicateA)
    expect((await flagMessages(page)).some((m) => /Kemiripan/.test(m))).toBe(true)

    await revise(page, { code: '99.05', reason: 'Kode ditinjau ulang.' })

    expect((await flagMessages(page)).some((m) => /Kemiripan/.test(m))).toBe(true)
  })

  test('menahan klaim tanpa mengatakan kode ditolak', async ({ page }) => {
    await revise(page, { code: '99.04', reason: 'Percobaan kode salah.' })

    await expect(page.getByText(NOTICE.needsReview)).toBeVisible()
    await expect(page.getByText('Kode ditolak')).toHaveCount(0)
    await expect(detailStatus(page)).toHaveText('Perlu ditinjau')
  })

  test('mencatat alasan, bukti, dan selisih skor', async ({ page }) => {
    await revise(page, { code: '47.09', reason: 'Resume medis mendukung apendektomi.' })

    expect(await lastEvent(page)).toMatchObject({
      kind: 'revision',
      from: '99.04 — Transfusi eritrosit',
      to: '47.09',
      reason: 'Resume medis mendukung apendektomi.',
      evidence: true,
      previousScore: SCORES.dxMismatch,
      newScore: 24,
    })
  })

  test('menampilkan riwayat keputusan di panel', async ({ page }) => {
    await revise(page, { code: '47.09', reason: 'Resume medis mendukung apendektomi.' })

    await expect(page.locator('.audit-trail')).toContainText(`${SCORES.dxMismatch} → 24`)
    await expect(page.locator('.audit-trail .audit-note')).toContainText('Alasan')
    await expect(page.locator('.audit-trail .audit-note')).toContainText('Resume medis mendukung apendektomi.')
    await expect(page.locator('.audit-trail')).toContainText('Evidence diperiksa')
  })

  test('menampilkan timeline dan menandai skor yang tidak berubah', async ({ page }) => {
    await revise(page, { code: '99.04', reason: 'Kode sudah sesuai dengan dokumen.' })

    const timeline = page.getByRole('list', { name: 'Linimasa audit' })
    await expect(timeline.getByRole('listitem')).toHaveCount(1)
    await expect(timeline).toContainText('Revisi kode')
    await expect(timeline).toContainText('70 → 70')
    await expect(timeline).toContainText('Tidak berubah')
    await expect(timeline).toContainText('Hasil pemeriksaan ulang')
  })

  test('menampilkan hasil pemeriksaan ulang: skor, kesiapan, temuan selesai dan tersisa', async ({ page }) => {
    await revise(page, { code: '47.09', reason: 'Resume medis mendukung apendektomi.' })

    const panel = page.getByRole('region', { name: 'Hasil pemeriksaan ulang' })
    await expect(panel).toContainText('Risiko 70 → 24')
    await expect(panel).toContainText('Kesiapan 50 → 90')
    await expect(panel).toContainText('Selesai (1)')
    await expect(panel).toContainText(FINDING.dxMismatch)
    await expect(panel).toContainText('Tersisa (1)')
    await expect(panel).toContainText(FINDING.missingEvidence)
  })

  test('mempertahankan snapshot pemeriksaan ulang setelah muat ulang', async ({ page }) => {
    await revise(page, { code: '47.09', reason: 'Resume medis mendukung apendektomi.' })
    await page.reload()

    const panel = page.getByRole('region', { name: 'Hasil pemeriksaan ulang' })
    await expect(panel).toContainText('Risiko 70 → 24')
    await expect(panel).toContainText('Kesiapan 50 → 90')
    await expect(panel).toContainText(FINDING.missingEvidence)
  })
})

test.describe('menolak revisi yang tidak dapat dibenarkan', () => {
  test('menjelaskan field wajib yang belum diisi', async ({ page }) => {
    await selectClaim(page, IDS.dxMismatch)
    await page.getByRole('button', { name: '↺ Revisi kode' }).click()
    await page.getByLabel('Kode tindakan koreksi').fill(' ')
    await page.getByRole('button', { name: 'Konfirmasi revisi' }).click()

    await expect(page.getByText('Kode tindakan koreksi wajib diisi.')).toBeVisible()
    await expect(page.getByText('Alasan perubahan wajib diisi.')).toBeVisible()
    await expect(page.getByText('Konfirmasi pemeriksaan evidence wajib dicentang.')).toBeVisible()
  })

  test('tanpa alasan dan bukti', async ({ page }) => {
    await selectClaim(page, IDS.dxMismatch)
    await revise(page, { code: '47.09', reason: '', evidence: false })

    await expect(page.getByText(NOTICE.missingJustification)).toBeVisible()
    expect(await auditLog(page)).toHaveLength(0)
  })

  test('dengan alasan yang hanya berisi spasi', async ({ page }) => {
    await selectClaim(page, IDS.dxMismatch)
    await revise(page, { code: '47.09', reason: '   ' })

    await expect(page.getByText(NOTICE.missingJustification)).toBeVisible()
    expect(await auditLog(page)).toHaveLength(0)
  })
})

test.describe('temuan yang bertahan setelah revisi', () => {
  test('temuan info tetap ada meski peringatan sudah beres', async ({ page }) => {
    await selectClaim(page, IDS.dxMismatch)
    await revise(page, { code: '47.09', reason: 'Kode dikoreksi.' })

    await expect(page.locator('.flags').getByText(FINDING.dxMismatch)).toHaveCount(0)
    await expect(page.locator('.flags').getByText(FINDING.missingEvidence)).toBeVisible()
  })

  test('temuan kemiripan tidak ikut terhapus di klaim lain', async ({ page }) => {
    await selectClaim(page, IDS.dxMismatch)
    await revise(page, { code: '47.09', reason: 'Kode dikoreksi.' })

    await selectClaim(page, IDS.duplicateB)
    expect((await flagMessages(page)).some((m) => /Kemiripan/.test(m))).toBe(true)
  })
})
