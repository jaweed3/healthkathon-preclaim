# PreClaim Guard — Prototype

Prototype web lokal untuk demo Healthkathon: asisten pre-klaim bagi koder casemix rumah sakit. Seluruh klaim di dalam aplikasi adalah **data sintetis/dummy**.

## Menjalankan

```bash
cd app
npm install
npm run dev
```

Buka URL yang diberikan Vite (biasanya `http://localhost:5173`). Untuk build produksi:

```bash
npm run build
npm run preview
```

## Alur demo

1. Pilih klaim `CLM-240918-021` pada daftar.
2. Buka temuan pemeriksaan untuk melihat bukti yang dapat dijelaskan.
3. Klik **Revisi kode** untuk mensimulasikan koreksi kode tindakan; skor turun dari 78 ke 12 dan status menjadi siap submit.
4. Alternatifnya, masukkan catatan lalu klik **Approve dengan catatan**.

Aplikasi ini adalah prototype frontend tanpa backend. Aturan dan data masih ditanam sebagai data dummy di `src/main.tsx`. PreClaim Guard memberi sinyal untuk membantu koder, bukan adjudikasi fraud otomatis; keputusan akhir tetap di tangan manusia.
