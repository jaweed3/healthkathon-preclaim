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

test.describe('filter klaim', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('filter Berisiko hanya menampilkan klaim berisiko', async ({ page }) => {
    await page.getByRole('button', { name: /Berisiko/ }).click()

    await expect(page.getByText('Klaim berisiko tinggi')).toBeVisible()
    // Only CLM-240918-021 scores 60+ in the fixtures.
    await expect(page.getByRole('button', { name: /CLM-240918-021/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /CLM-240918-020/ })).toHaveCount(0)
  })

  test('bisa kembali ke filter Semua setelah memilih Berisiko', async ({ page }) => {
    await page.getByRole('button', { name: /Berisiko/ }).click()
    await expect(page.getByRole('button', { name: /CLM-240918-020/ })).toHaveCount(0)

    await page.getByRole('button', { name: /^Semua/ }).click()

    await expect(page.getByText('Ikhtisar klaim')).toBeVisible()
    await expect(page.getByRole('button', { name: /CLM-240918-020/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /CLM-240918-021/ })).toBeVisible()
  })

  test('hanya satu chip filter yang aktif pada satu waktu', async ({ page }) => {
    const semua = page.getByRole('button', { name: /^Semua/ })
    const berisiko = page.getByRole('button', { name: /Berisiko/ })

    await expect(semua).toHaveClass(/filter-active/)
    await expect(berisiko).not.toHaveClass(/filter-active/)

    await berisiko.click()
    await expect(berisiko).toHaveClass(/filter-active/)
    await expect(semua).not.toHaveClass(/filter-active/)
  })

  test('badge Berisiko cocok dengan isi filter', async ({ page }) => {
    const badge = await page.getByRole('button', { name: /Berisiko/ }).innerText()
    const count = Number(badge.match(/\d+/)![0])

    await page.getByRole('button', { name: /Berisiko/ }).click()

    // The number on the chip must equal the number of rows it reveals.
    await expect(page.locator('.table .tr.row')).toHaveCount(count)
  })

  test('nav Perlu ditinjau memfilter berdasarkan status', async ({ page }) => {
    await page
      .getByRole('button', { name: /Perlu ditinjau/ })
      .first()
      .click()

    await expect(page.getByText('Klaim perlu ditinjau')).toBeVisible()
    await expect(page.locator('.table .tr.row')).toHaveCount(1)
  })
})

test.describe('tambah klaim', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  const openAdd = async (page) => {
    await page.getByRole('button', { name: /Tambah klaim baru/ }).click()
    await expect(page.locator('.revision-box')).toBeVisible()
  }

  test('menambahkan klaim dan menghitung skornya dari aturan', async ({ page }) => {
    await openAdd(page)
    await page.getByLabel('Pasien').fill('Pasien E-517')
    await page.getByLabel('Kode tindakan').fill('47.09')
    await page.getByLabel('Total tagihan').fill('Rp 4.500.000')
    await page.getByRole('button', { name: 'Tambahkan klaim' }).click()

    // 47.09 is plausible for K35.8, so the claim clears inspection.
    await expect(page.getByText('Tidak ada temuan aktif')).toBeVisible()
    await expect(page.locator('.detail .score-card')).toContainText('18/100')
    await expect(page.locator('.stats').first()).toContainText('5')
  })

  test('kode tidak sesuai diagnosis ditahan untuk ditinjau', async ({ page }) => {
    await openAdd(page)
    await page.getByLabel('Pasien').fill('Pasien F-001')
    // 99.04 belongs to A09, not to the K35.8 appendicitis draft.
    await page.getByLabel('Kode tindakan').fill('99.04')
    await page.getByLabel('Total tagihan').fill('Rp 3.200.000')
    await page.getByRole('button', { name: 'Tambahkan klaim' }).click()

    await expect(page.getByText('ditambahkan dan ditahan untuk ditinjau')).toBeVisible()
    await expect(page.locator('.detail .score-card')).toContainText('82/100')
    await expect(page.getByText('Kode tindakan tidak sesuai dengan diagnosis')).toBeVisible()
  })

  test('peringatan tampil sebelum konfirmasi saat kode meragukan', async ({ page }) => {
    await openAdd(page)
    await page.getByLabel('Pasien').fill('Pasien G-002')
    await page.getByLabel('Kode tindakan').fill('99.04')
    await expect(page.locator('.draft-check.warn')).toContainText('tidak ada di daftar')
  })

  test('tombol tambah nonaktif sampai field wajib terisi', async ({ page }) => {
    await openAdd(page)
    await expect(page.getByRole('button', { name: 'Tambahkan klaim' })).toBeDisabled()

    await page.getByLabel('Pasien').fill('Pasien H-003')
    await page.getByLabel('Kode tindakan').fill('47.09')
    await page.getByLabel('Total tagihan').fill('Rp 1.000.000')
    await expect(page.getByRole('button', { name: 'Tambahkan klaim' })).toBeEnabled()
  })
})

test.describe('aturan pemeriksaan', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('membuka daftar aturan dari sidebar', async ({ page }) => {
    await page.getByRole('button', { name: 'Aturan pemeriksaan' }).click()
    await expect(page.getByRole('dialog', { name: 'Aturan pemeriksaan' })).toBeVisible()
    await expect(page.getByText('Kesesuaian diagnosis ↔ tindakan')).toBeVisible()
  })

  test('menampilkan tabel kode yang diterima per diagnosis', async ({ page }) => {
    await page.getByRole('button', { name: 'Aturan pemeriksaan' }).click()
    const table = page.locator('.rule-pairs')
    await expect(table).toContainText('K35.8')
    await expect(table).toContainText('47.09, 47.11, 47.12')
  })

  test('menandai aturan yang dihitung dan yang hanya dideklarasi', async ({ page }) => {
    await page.getByRole('button', { name: 'Aturan pemeriksaan' }).click()

    await expect(page.locator('.rule-badge.computed')).toHaveCount(1)
    await expect(page.locator('.rule-badge.declared').first()).toBeVisible()
    await expect(page.getByRole('dialog')).toContainText('dihitung')
  })

  test('bisa ditutup', async ({ page }) => {
    await page.getByRole('button', { name: 'Aturan pemeriksaan' }).click()
    await page.getByRole('button', { name: 'Tutup aturan pemeriksaan' }).click()
    await expect(page.getByRole('dialog', { name: 'Aturan pemeriksaan' })).toHaveCount(0)
  })
})

/**
 * Dark mode had no automated coverage, so a dozen tinted surfaces kept their
 * light pastel backgrounds and rendered as bright patches on the dark page.
 * These assert the actual computed background luminance, which fails for any
 * element that keeps a light fill in dark mode.
 */
const luminance = (page: import('@playwright/test').Page, selector: string) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const [r, g, b] = getComputedStyle(el)
      .backgroundColor.match(/[\d.]+/g)!
      .map(Number)
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  }, selector)

/** Elements that carry a tinted fill and must be re-tinted for dark mode. */
const TINTED = [
  '.score-card',
  '.status.warn',
  '.risk.high',
  '.filters .filter-active',
  'nav button.active',
  'nav em',
]

test.describe('dark mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Gunakan mode gelap/ }).click()
    await expect(page.locator('.shell')).toHaveClass(/theme-dark/)
  })

  for (const sel of TINTED) {
    test(`${sel} darkened`, async ({ page }) => {
      const dark = await luminance(page, sel)
      expect(dark).not.toBeNull()
      expect(dark!).toBeLessThan(0.5)
    })
  }

  test('permukaan bertema tetap gelap setelah muat ulang', async ({ page }) => {
    await page.reload()
    await expect(page.locator('.shell')).toHaveClass(/theme-dark/)
    expect(await luminance(page, '.score-card')).toBeLessThan(0.5)
  })

  test('tema terang tidak terpengaruh', async ({ page }) => {
    await page.getByRole('button', { name: /Gunakan mode terang/ }).click()
    await expect(page.locator('.shell')).not.toHaveClass(/theme-dark/)
    // Back to the light pastel palette.
    expect(await luminance(page, '.score-card')).toBeGreaterThan(0.8)
  })
})
