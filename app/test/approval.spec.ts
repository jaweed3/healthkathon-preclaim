import { expect, test } from '@playwright/test'
import {
  approve,
  auditLog,
  detailStatus,
  lastEvent,
  openApp,
  revise,
  selectClaim,
  writeNote,
} from './support/app'
import { IDS, NOTICE, SCORES } from './support/fixture'

test.beforeEach(async ({ page }) => {
  await openApp(page)
})

test.describe('menyetujui klaim', () => {
  test.beforeEach(async ({ page }) => {
    await selectClaim(page, IDS.duplicateA)
  })

  test('tidak bisa tanpa catatan', async ({ page }) => {
    await approve(page)

    await expect(page.getByText(NOTICE.approvalNeedsNote)).toBeVisible()
    await expect(detailStatus(page)).toHaveText('Perlu ditinjau')
    expect(await auditLog(page)).toHaveLength(0)
  })

  test('MENCATAT alasan beserta temuan yang ditimpa', async ({ page }) => {
    // The defect this guards: approve() discarded the coder's note and wrote
    // nothing to the audit log while claiming the opposite in its notice.
    await approve(page, 'Duplikasi administratif, sudah dicek ke rekam medis.')

    const event = await lastEvent(page)
    expect(event.kind).toBe('approval')
    expect(event.note).toBe('Duplikasi administratif, sudah dicek ke rekam medis.')
    expect(event.score).toBe(SCORES.duplicateA)
    expect(event.findingsAtApproval.length).toBeGreaterThan(0)
  })

  test('memberi status tersendiri, bukan "Siap submit"', async ({ page }) => {
    await approve(page, 'Sudah diverifikasi.')

    await expect(detailStatus(page)).toHaveText('Disetujui dengan catatan')
  })

  test('menampilkan persetujuan di riwayat keputusan', async ({ page }) => {
    await approve(page, 'Duplikasi administratif.')

    const trail = page.locator('.audit-trail')
    await expect(trail).toContainText('Disetujui dengan catatan')
    await expect(trail).toContainText('Duplikasi administratif.')
    await expect(trail).toContainText('tetap dikirim dengan')
  })

  test('menghilang dari daftar perlu ditinjau setelah disetujui', async ({ page }) => {
    await approve(page, 'Sudah diverifikasi.')
    await page
      .getByRole('button', { name: /Perlu ditinjau/ })
      .first()
      .click()

    await expect(page.getByRole('button', { name: new RegExp(IDS.duplicateA) })).toHaveCount(0)
  })
})

test.describe('riwayat gabungan', () => {
  test('revisi dan persetujuan hidup berdampingan di satu klaim', async ({ page }) => {
    // 018 still holds a length-of-stay warning after the code is corrected, so
    // it stays in review and the approve action remains available.
    await selectClaim(page, IDS.longStay)
    await revise(page, { code: '93.91', reason: 'Kode dikoreksi ke ventilasi guided.' })

    await expect(detailStatus(page)).toHaveText('Perlu ditinjau')

    await approve(page, 'Evidence resume medis sudah dilampirkan.')

    const log = await auditLog(page)
    expect(log[0].events).toHaveLength(2)
    expect(log[0].events.map((e: { kind: string }) => e.kind)).toEqual(['revision', 'approval'])
    await expect(page.locator('.audit-trail .audit-entry')).toHaveCount(2)
  })

  test('formir keputusan menghilang setelah klaim disetujui', async ({ page }) => {
    await selectClaim(page, IDS.duplicateA)
    await writeNote(page, 'Sudah diverifikasi.')
    await approve(page)

    // The claim has left review, so the coder is no longer asked to justify.
    await expect(page.locator('#coder-note')).toHaveCount(0)
  })
})
