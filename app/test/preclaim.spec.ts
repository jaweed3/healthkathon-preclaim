import { test, expect } from '@playwright/test'

const openRevision = async (page) => {
  await page.getByRole('button', { name: '↺ Revisi kode' }).click()
  await expect(page.locator('.revision-box')).toBeVisible()
}

const fillRevision = async (page, { code, reason }) => {
  if (code) await page.locator('.revision-box input:not([type="checkbox"])').fill(code)
  await page.locator('.revision-box textarea').fill(reason)
  await page.locator('.revision-box input[type="checkbox"]').check()
  await page.getByRole('button', { name: 'Konfirmasi revisi' }).click()
}

const auditLog = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('preclaim-audit-log') ?? '[]'))

test.describe('PreClaim Guard — alur koder sebelum submit', () => {
  test('menemukan klaim berisiko dan menjelaskan temuan', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Ikhtisar klaim')).toBeVisible()
    await expect(page.getByRole('button', { name: /CLM-240918-021 Pasien A-104/ })).toBeVisible()
    await expect(page.getByText('Ketidaksesuaian diagnosis ↔ tindakan')).toBeVisible()
    await expect(page.getByText('Kemiripan tinggi dengan klaim CLM-240917-019')).toBeVisible()
    await expect(page.getByText('Asisten, bukan hakim.')).toBeVisible()
  })

  test('merevisi kode lalu menurunkan risiko sebelum submit', async ({ page }) => {
    await page.goto('/')
    await openRevision(page)
    await fillRevision(page, { reason: 'Resume medis mendukung apendektomi.' })
    await expect(
      page.getByText('Kode tindakan diperbarui. Risiko turun dan klaim siap dikirim.'),
    ).toBeVisible()
    await expect(page.locator('.detail .score-card').getByText('18/100')).toBeVisible()
    await expect(page.getByText('Tidak ada peringatan aktif')).toBeVisible()
  })

  test('koder dapat approve dengan catatan tanpa auto-reject', async ({ page }) => {
    await page.goto('/')
    await page.locator('textarea').fill('Sudah diverifikasi dengan resume medis dan dokumen pendukung.')
    await page.getByRole('button', { name: '✓ Approve dengan catatan' }).click()
    await expect(page.getByText('Klaim disetujui dengan catatan koder.')).toBeVisible()
    await expect(page.locator('.detail-top .status.done')).toHaveText('Disetujui')
    await expect(page.getByText('Asisten, bukan hakim.')).toBeVisible()
  })
})

test.describe('PreClaim Guard — revisi harus dapat diaudit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
  })

  test('menyimpan alasan dan bukti pennyaman ke jejak audit', async ({ page }) => {
    await openRevision(page)
    await fillRevision(page, { reason: 'Resume medis mendukung apendektomi.' })

    const log = await auditLog(page)
    expect(log).toHaveLength(1)
    expect(log[0].claimId).toBe('CLM-240918-021')
    expect(log[0].revisions.at(-1)).toMatchObject({
      from: '47.09 — Apendektomi lainnya',
      to: '47.09',
      reason: 'Resume medis mendukung apendektomi.',
      evidence: true,
      previousScore: 78,
      newScore: 18,
    })
  })

  test('jejak audit bertahan setelah muat ulang halaman', async ({ page }) => {
    await openRevision(page)
    await fillRevision(page, { reason: 'Resume medis mendukung apendektomi.' })
    await page.reload()
    expect(await auditLog(page)).toHaveLength(1)
  })

  test('menolak kode yang tidak sesuai diagnosis alih-alih menurunkan risiko', async ({ page }) => {
    await openRevision(page)
    // 99.04 (transfusi) is plausible for A09, not for K35.8 appendicitis.
    await fillRevision(page, { code: '99.04', reason: 'Kode salah/input tidak sengaja.' })

    await expect(page.getByText(/Kode diperbarui, tetapi kombinasi diagnosis.*tetap berisiko/)).toBeVisible()
    await expect(page.locator('.detail .score-card').getByText('82/100')).toBeVisible()
    // The claim must still be held for review — a wrong code must not green it.
    await expect(page.locator('.detail-top .status')).not.toHaveClass(/done/)
  })

  test('tidak mengonfirmasi revisi tanpa alasan dan bukti', async ({ page }) => {
    await openRevision(page)
    await page.locator('.revision-box input:not([type="checkbox"])').fill('47.11')
    await page.getByRole('button', { name: 'Konfirmasi revisi' }).click()
    await expect(
      page.getByText('Lengkapi kode koreksi, alasan, dan evidence sebelum mengonfirmasi revisi.'),
    ).toBeVisible()
    expect(await auditLog(page)).toHaveLength(0)
  })
})

test.describe('jejak audit	localStorage tidak dipercaya', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
  })

  test('application tetap berjalan saat log rusak', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('preclaim-audit-log', '{ ini bukan json'))
    await page.reload()
    await expect(page.getByText('Ikhtisar klaim')).toBeVisible()
    await expect(page.getByRole('button', { name: /CLM-240918-021 Pasien A-104/ })).toBeVisible()
  })

  test('entri yang tidak sesuai skema dibuang, bukan dipercaya', async ({ page }) => {
    // Valid JSON, wrong shape — the case a bare try/catch would happily pass through.
    await page.evaluate(() =>
      localStorage.setItem(
        'preclaim-audit-log',
        JSON.stringify([{ claimId: 'CLM-240918-021', evidence: 'yes', revisions: 'banyak' }]),
      ),
    )
    await page.reload()

    await openRevision(page)
    await fillRevision(page, { reason: 'Resume medis mendukung apendektomi.' })

    const log = await auditLog(page)
    expect(log).toHaveLength(1)
    expect(log[0].revisions.at(-1)).toMatchObject({ evidence: true, reason: expect.any(String) })
  })

  test('alasan kosong_spasi tidak dianggap sebagai justifikasi', async ({ page }) => {
    await openRevision(page)
    await page.locator('.revision-box input:not([type="checkbox"])').fill('47.11')
    await page.locator('.revision-box textarea').fill('   ')
    await page.locator('.revision-box input[type="checkbox"]').check()
    await page.getByRole('button', { name: 'Konfirmasi revisi' }).click()

    await expect(
      page.getByText('Lengkapi kode koreksi, alasan, dan evidence sebelum mengonfirmasi revisi.'),
    ).toBeVisible()
    expect(await auditLog(page)).toHaveLength(0)
  })
})

test.describe('jejak audit terlihat oleh koder', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
  })

  test('tidak ada riwayat sebelum ada revisi', async ({ page }) => {
    await expect(page.locator('.audit-trail')).toHaveCount(0)
  })

  test('menampilkan alasan, bukti, dan perubahan skor setelah revisi', async ({ page }) => {
    await openRevision(page)
    await fillRevision(page, { reason: 'Resume medis mendukung apendektomi.' })

    const trail = page.locator('.audit-trail')
    await expect(trail).toBeVisible()
    await expect(trail.getByText('1 tercatat')).toBeVisible()
    await expect(trail.getByText('78 → 18')).toBeVisible()
    await expect(trail.getByText('Resume medis mendukung apendektomi.')).toBeVisible()
    await expect(trail.getByText('evidence diperiksa')).toBeVisible()
  })

  test('riwayat tetap tampil setelah muat ulang halaman', async ({ page }) => {
    await openRevision(page)
    await fillRevision(page, { reason: 'Resume medis mendukung apendektomi.' })
    await page.reload()

    // This is the point of persisting it: the coder can still see their
    // justification on a fresh load, not just in React state.
    await expect(page.locator('.audit-trail')).toContainText('Resume medis mendukung apendektomi.')
  })

  test('entri rusak tidak dirender', async ({ page }) => {
    await page.evaluate(() =>
      localStorage.setItem('preclaim-audit-log', JSON.stringify([{ claimId: 'CLM-240918-021' }])),
    )
    await page.reload()
    await expect(page.locator('.audit-trail')).toHaveCount(0)
  })
})
