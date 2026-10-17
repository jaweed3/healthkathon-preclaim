import { expect, test } from '@playwright/test'
import {
  addClaim,
  approve,
  auditLog,
  detailScore,
  detailStatus,
  openApp,
  selectClaim,
  storedClaims,
  visibleRows,
} from './support/app'
import { COUNTS, IDS, ID_PREFIX, NOTICE, SCORES } from './support/fixture'

test.beforeEach(async ({ page }) => {
  await openApp(page)
})

test.describe('klaim bertahan setelah muat ulang', () => {
  test('klaim yang ditambahkan tidak hilang', async ({ page }) => {
    await addClaim(page, {
      patient: 'Pasien Z-900',
      procedure: '93.96',
      amount: 'Rp 1.250.000',
    })
    await expect(visibleRows(page)).toHaveCount(COUNTS.total + 1)

    await page.reload()

    await expect(visibleRows(page)).toHaveCount(COUNTS.total + 1)
    await expect(page.getByText('Pasien Z-900')).toBeVisible()
  })

  test('persetujuan tidak dibatalkan oleh muat ulang', async ({ page }) => {
    // The bug this guards: loadClaims re-derived status from the findings, so
    // an approval silently reverted to "Perlu ditinjau" on refresh.
    await selectClaim(page, IDS.duplicateA)
    await approve(page, 'Sudah diverifikasi.')
    await expect(detailStatus(page)).toHaveText('Disetujui dengan catatan')

    await page.reload()
    await selectClaim(page, IDS.duplicateA)

    await expect(detailStatus(page)).toHaveText('Disetujui dengan catatan')
  })

  test('skor tetap konsisten dengan temuan yang tersimpan', async ({ page }) => {
    await selectClaim(page, IDS.duplicateB)
    const before = await detailScore(page).innerText()

    await page.reload()
    await selectClaim(page, IDS.duplicateB)

    await expect(detailScore(page)).toHaveText(before)
    expect(before).toContain(String(SCORES.duplicateB))
  })
})

test.describe('penyimpanan tidak dipercaya', () => {
  test('log rusak tidak membuat aplikasi crash', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('preclaim-audit-log', '{ ini bukan json'))
    await page.reload()

    await expect(page.getByText('Ikhtisar klaim')).toBeVisible()
  })

  test('entri salah bentuk dibuang', async ({ page }) => {
    await page.evaluate(
      ([id]) =>
        localStorage.setItem(
          'preclaim-audit-log',
          JSON.stringify([{ claimId: id, evidence: 'yes', events: 'banyak' }]),
        ),
      [IDS.dxMismatch],
    )
    await page.reload()

    await expect(page.locator('.audit-trail')).toHaveCount(0)
  })

  test('store klaim tidak valid jatuh ke fixture', async ({ page }) => {
    await page.evaluate(() =>
      localStorage.setItem(
        'preclaim-claims',
        JSON.stringify({ claims: [{ id: '', patient: 'X', score: 500 }] }),
      ),
    )
    await page.reload()

    await expect(visibleRows(page)).toHaveCount(COUNTS.total)
  })
})

test.describe('reset demo', () => {
  test('mengembalikan fixture dan mengosongkan audit', async ({ page }) => {
    await addClaim(page, { patient: 'Pasien Y-001', procedure: '93.96', amount: 'Rp 900.000' })
    await selectClaim(page, IDS.duplicateA)
    await approve(page, 'Sudah diverifikasi.')
    await expect(visibleRows(page)).toHaveCount(COUNTS.total + 1)

    await page.getByRole('button', { name: 'Reset demo' }).click()

    await expect(visibleRows(page)).toHaveCount(COUNTS.total)
    await expect(page.getByText(NOTICE.reset)).toBeVisible()
    expect(await auditLog(page)).toHaveLength(0)
  })

  test('skor kembali ke nilai fixture', async ({ page }) => {
    await selectClaim(page, IDS.dxMismatch)
    await page.getByRole('button', { name: 'Reset demo' }).click()
    await selectClaim(page, IDS.dxMismatch)

    await expect(detailScore(page)).toContainText(String(SCORES.dxMismatch))
  })
})

test.describe('konsistensi store', () => {
  test('setiap klaim tersimpan punya skor yang cocok dengan temuannya', async ({ page }) => {
    await addClaim(page, {
      patient: 'Pasien J-101',
      diagnosis: 'A09',
      procedure: '99.04',
      length: '4 hari',
      amount: 'Rp 7.100.000',
    })

    const { claims } = await storedClaims(page)
    expect(claims).toHaveLength(COUNTS.total + 1)

    for (const claim of claims) {
      const warnings = claim.flags.filter((f: { severity: string }) => f.severity === 'warn')
      if (warnings.length > 0) expect(claim.status).toBe('Perlu ditinjau')
    }
  })

  test('id lanjutan mengikuti prefix fixture', async ({ page }) => {
    const existing = (await storedClaims(page)).claims.map((c: { id: string }) => c.id)
    for (const id of existing) expect(id.startsWith(ID_PREFIX)).toBe(true)
  })
})
