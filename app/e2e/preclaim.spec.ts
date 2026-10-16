import { test, expect } from '@playwright/test';

test.describe('PreClaim Guard — alur koder sebelum submit', () => {
  test('menemukan klaim berisiko dan menjelaskan temuan', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Ikhtisar klaim')).toBeVisible();
    await expect(page.getByRole('button', { name: /CLM-240918-021 Pasien A-104/ })).toBeVisible();
    await expect(page.getByText('Ketidaksesuaian diagnosis ↔ tindakan')).toBeVisible();
    await expect(page.getByText('Kemiripan tinggi dengan klaim CLM-240917-019')).toBeVisible();
    await expect(page.getByText('Asisten, bukan hakim.')).toBeVisible();
  });

  test('merevisi kode lalu menurunkan risiko sebelum submit', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '↺ Revisi kode' }).click();
    await expect(page.getByText('Kode tindakan diperbarui. Risiko turun dan klaim siap dikirim.')).toBeVisible();
    await expect(page.getByText('12/100')).toBeVisible();
    await expect(page.getByText('Tidak ada peringatan aktif')).toBeVisible();
  });

  test('koder dapat approve dengan catatan tanpa auto-reject', async ({ page }) => {
    await page.goto('/');
    await page.locator('textarea').fill('Sudah diverifikasi dengan resume medis dan dokumen pendukung.');
    await page.getByRole('button', { name: '✓ Approve dengan catatan' }).click();
    await expect(page.getByText('Klaim disetujui dengan catatan koder.')).toBeVisible();
    await expect(page.locator('.detail-top .status.done')).toHaveText('Disetujui');
    await expect(page.getByText('Asisten, bukan hakim.')).toBeVisible();
  });
});
