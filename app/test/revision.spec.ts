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
    await expect(page.locator('.audit-trail')).toContainText('evidence diperiksa')
  })
})

test.describe('menolak revisi yang tidak dapat dibenarkan', () => {
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

    await expect(page.getByText(FINDING.dxMismatch)).toHaveCount(0)
    await expect(page.getByText(FINDING.missingEvidence)).toBeVisible()
  })

  test('temuan kemiripan tidak ikut terhapus di klaim lain', async ({ page }) => {
    await selectClaim(page, IDS.dxMismatch)
    await revise(page, { code: '47.09', reason: 'Kode dikoreksi.' })

    await selectClaim(page, IDS.duplicateB)
    expect((await flagMessages(page)).some((m) => /Kemiripan/.test(m))).toBe(true)
  })
})
