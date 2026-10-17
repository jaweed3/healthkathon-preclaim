import { expect, test } from '@playwright/test'
import { addClaim, detailScore, detailStatus, openApp, openAdd, selectClaim } from './support/app'
import { COUNTS, IDS, ID_PREFIX } from './support/fixture'

test.beforeEach(async ({ page }) => {
  await openApp(page)
})

test.describe('validasi formulir', () => {
  test('menandai field wajib yang kosong saat mencoba menambahkan klaim', async ({ page }) => {
    await openAdd(page)
    await page.getByRole('button', { name: 'Tambahkan klaim' }).click()

    await expect(page.getByText('Nama pasien wajib diisi.')).toBeVisible()
    await expect(page.getByText('Kode tindakan wajib diisi.')).toBeVisible()
    await expect(page.getByText('Total tagihan wajib diisi.')).toBeVisible()
    await expect(page.getByLabel('Pasien')).toHaveAttribute('aria-invalid', 'true')

    await page.getByLabel('Pasien').fill('Pasien H-003')
    await page.getByLabel('Kode tindakan').fill('93.96')
    await page.getByLabel('Total tagihan').fill('Rp 1.000.000')

    await expect(page.getByRole('button', { name: 'Tambahkan klaim' })).toBeEnabled()
  })

  test('form dapat dibatalkan', async ({ page }) => {
    await openAdd(page)
    await page.getByRole('button', { name: 'Batal' }).click()

    await expect(page.locator('.revision-box')).toHaveCount(0)
  })
})

test.describe('navigasi mobile', () => {
  test('hamburger membuka navigasi dan memilih halaman', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: 'Buka navigasi' }).click()

    const navigation = page.locator('aside.mobile-nav-open')
    await expect(navigation.getByRole('button', { name: /Risiko tinggi/ })).toBeVisible()
    await navigation.getByRole('button', { name: /Risiko tinggi/ }).click()

    await expect(page.getByRole('heading', { name: 'Klaim berisiko tinggi' })).toBeVisible()
    await expect(page.locator('aside.mobile-nav-open')).toHaveCount(0)
  })
})

test.describe('penilaian klaim baru', () => {
  test('kode yang sesuai lolos pemeriksaan', async ({ page }) => {
    await addClaim(page, {
      patient: 'Pasien E-517',
      diagnosis: 'I10',
      procedure: '93.96',
      amount: 'Rp 4.500.000',
      documents: true,
    })

    // Scoped to the findings area: the success notice repeats the same phrase.
    await expect(page.locator('.detail .empty')).toBeVisible()
  })

  test('kode dari diagnosis lain ditahan', async ({ page }) => {
    await addClaim(page, {
      patient: 'Pasien F-001',
      diagnosis: 'K35.8',
      procedure: '99.04',
      amount: 'Rp 3.200.000',
    })

    await expect(page.getByText('Kode tindakan tidak sesuai dengan diagnosis')).toBeVisible()
    await expect(detailStatus(page)).toHaveText('Perlu ditinjau')
  })

  test('tindakan invasif tanpa dokumen ditandai', async ({ page }) => {
    await addClaim(page, {
      patient: 'Pasien F-002',
      diagnosis: 'K35.8',
      procedure: '47.09',
      amount: 'Rp 9.000.000',
    })

    await expect(page.getByText('Tindakan invasif tanpa dokumen pendukung tercatat')).toBeVisible()
  })

  test('dokumen yang dicatat menghilangkan temuan evidence', async ({ page }) => {
    await addClaim(page, {
      patient: 'Pasien F-003',
      diagnosis: 'K35.8',
      procedure: '47.09',
      amount: 'Rp 9.000.000',
      documents: true,
    })

    await expect(page.getByText('Tindakan invasif tanpa dokumen pendukung tercatat')).toHaveCount(0)
  })
})

test.describe('diagnosis yang tidak dikenal aturan', () => {
  // Real claims carry ICD-10 codes this prototype has never seen. Refusing
  // them would be a lie about coverage, so they are accepted and flagged.
  test('diterima, bukan ditolak', async ({ page }) => {
    await openAdd(page)
    await page.getByLabel('Pasien').fill('Pasien G-901')
    await page.getByLabel('Diagnosis (ICD-10)').fill('R10.4')
    await page.getByLabel('Kode tindakan').fill('47.09')
    await page.getByLabel('Total tagihan').fill('Rp 2.000.000')

    await expect(page.getByText('Kode ini belum dikenal aturan')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Tambahkan klaim' })).toBeEnabled()
  })

  test('menyatakan verifikasi tidak dapat dilakukan', async ({ page }) => {
    await openAdd(page)
    await page.getByLabel('Diagnosis (ICD-10)').fill('R10.4')
    await page.getByLabel('Kode tindakan').fill('47.09')

    await expect(
      page.getByText('belum dikenal aturan, sehingga 47.09 tidak dapat diverifikasi'),
    ).toBeVisible()
  })

  test('tetap bisa dikirim dan skornya dihitung', async ({ page }) => {
    await addClaim(page, {
      patient: 'Pasien G-900',
      diagnosis: 'R10.4',
      procedure: '47.09',
      amount: 'Rp 2.000.000',
    })

    await expect(page.locator('.facts b').first()).toContainText('R10.4')
    await expect(detailScore(page)).not.toHaveText('')
  })
})

test.describe('penomoran klaim', () => {
  test('id lanjutan mengikuti prefix tanggal', async ({ page }) => {
    await addClaim(page, {
      patient: 'Pasien I-777',
      procedure: '93.96',
      amount: 'Rp 1.100.000',
    })

    await expect(page.locator('.claim-id')).toHaveText(`${ID_PREFIX}-022`)
  })

  test('menambah satu klaim ke daftar', async ({ page }) => {
    await addClaim(page, { patient: 'Pasien I-778', procedure: '93.96', amount: 'Rp 1.200.000' })

    await expect(page.locator('.table .tr.row')).toHaveCount(COUNTS.total + 1)
  })

  test('klaim baru langsung dipilih', async ({ page }) => {
    await addClaim(page, {
      patient: 'Pasien I-779',
      diagnosis: 'I10',
      procedure: '93.96',
      amount: 'Rp 1.300.000',
    })

    await expect(page.locator('.facts b').first()).toContainText('I10')
  })

  test('menjalankan ulang aturan pada klaim yang sudah ada', async ({ page }) => {
    await selectClaim(page, IDS.duplicateA)
    const scoreBefore = await detailScore(page).innerText()

    // A third near-duplicate changes the similarity finding on existing claims.
    await addClaim(page, {
      patient: 'Pasien I-780',
      diagnosis: 'A09',
      procedure: '99.04',
      length: '4 hari',
      amount: 'Rp 7.150.000',
      documents: true,
    })

    await selectClaim(page, IDS.duplicateA)
    expect(await detailScore(page).innerText()).toBe(scoreBefore)
  })
})
