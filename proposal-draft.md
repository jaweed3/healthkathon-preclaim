# Proposal Draft — PreClaim Guard (Healthkathon 2026)

Tim: [NAMA-TIM] — Ketua: Fatih Jawwad Al Mumtaz, Anggota: Lato [NAMA-LENGKAP]
Kategori: Efisiensi Risiko pada Fasilitas Kesehatan
Fokus modus: upcoding, cloning, unbundling
Tagline: Detect before submit. Explain before reject.

## 1. Ringkasan

PreClaim Guard adalah asisten pre-klaim local-first untuk koder dan tim casemix rumah sakit. Sistem memeriksa draf klaim sebelum dikirim ke BPJS, menandai bagian yang berisiko, menjelaskan alasannya dengan bahasa manusia, dan menyerahkan keputusan akhir ke koder. Tujuannya bukan menuduh fraud, melainkan mencegah klaim kotor lolos karena kesalahan manusiawi.

Posisi kami komplementer. Sistem verifikasi BPJS yang sudah berjalan bekerja represif setelah klaim masuk. Kami bekerja preventif sebelum klaim keluar dari RS. Keduanya tidak saling menggantikan.

## 2. Masalah yang ingin diselesaikan

Klaim yang pending dan harus revisi itu mahal di dua sisi. Di RS, cashflow ketahan dan staf casemix kerja dua kali. Di BPJS, verifikator mengulang pekerjaan yang sama untuk kesalahan yang sebenarnya bisa dicegah di hulu.

Datanya keras. KPK pada November 2025 mengumumkan fraud klaim JKN Rp34 miliar di tiga RS di Jawa Tengah dan Sumatera Utara lewat markup dan phantom billing, bagian dari audit 4.341 tagihan dengan 30.000 entri palsu, dan kumulatif kerugian mencapai Rp100 miliar per September 2025. Terpisah, BPJS menahan klaim Rp5 miliar di tiga RS Jember sejak Juni 2025 atas dugaan overclaim rawat inap di atas 150 persen tarif resmi. Di ujung RS, pending rate nasional naik dari 14 persen (Agustus 2024) ke 16,2 persen (September) dan 19,6 persen (Oktober), rata-rata anggota ARSSI menyentuh 30 persen pada kuartal IV 2024, dengan total nilai tertunda Rp5,92 triliun atau 1,97 juta kasus sepanjang 2024. Studi kasus RSUD Semarang triwulan I 2024 mencatat 242 pengembalian karena aspek medis, 25 karena koding, dan 15 administratif — koding memang bukan yang terbesar, tetapi satu-satunya yang sepenuhnya bisa dicegah mesin sebelum submit.

Akarnya ada di meja koder. Koder menerjemahkan bahasa dokter yang bebas menjadi kode ICD dan paket INA-CBG yang kaku, dikerjakan manual dalam volume tinggi. Typo satu digit, copy-paste rekam medis karena kejar waktu, atau pemecahan paket yang keliru bisa tercatat sebagai upcoding atau cloning padahal awalnya hanya human error. Studi RS X (JIPIKI, Februari 2026) menegaskan akurasi clinical coding menentukan stabilitas finansial RS di bawah sistem casemix dan kesalahan koding berujung klaim pending yang menghambat cashflow. Studi RS UNS menambahkan penyebab pending terbagi tiga yaitu administrasi, ketidaktepatan kode diagnosis, dan ketidaklengkapan resume medis. Operator jujur butuh alat bantu, bukan pengawasan tambahan.

## 3. Solusi yang diusulkan

PreClaim Guard memeriksa setiap draf klaim dalam tiga lapis. Pertama aturan deterministik untuk pola yang pasti seperti kode tidak konsisten dengan diagnosis. Kedua deteksi anomali ringan untuk pola biaya dan lama rawat yang menyimpang dari kebiasaan. Ketiga pemeriksaan kemiripan untuk menangkap cloning antar klaim.

Setiap peringatan wajib membawa tiga hal yaitu bagian mana yang berisiko, kenapa sistem menganggapnya berisiko, dan apa yang sebaiknya dicek ulang oleh koder. Koder bisa memilih revisi atau approve dengan catatan. Tidak ada penolakan otomatis. Tidak ada skor misterius tanpa penjelasan.

Pembeda dari pemenang 2025 penting dicatat. Juara Healthkathon 2025 semuanya bermain di sisi peserta dan preventive care — Teman Ibu pendamping kehamilan (Tim Aruna, juara 1), solusi jantung Lucky Seven (juara 2), BPJS Go Fit 360 (juara 3). Tidak satu pun menyentuh fraud klaim di sisi faskes. Tahun 2026 temanya dipaksa ke efisiensi risiko, sehingga arena faskes praktis kosong dari juara bertahan. PreClaim Guard mengisi ruang kosong itu, dan memilih sisi preventif di RS alih-alih represif di BPJS — posisi yang belum ditempati siapa pun.

## 4. Arsitektur dan privasi

Sistem berjalan lokal di lingkungan RS. Data rekam medis tidak keluar dari RS. Ini bukan sekadar pilihan teknis melainkan kewajiban hukum: UU Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi menempatkan RS sebagai pengendali sekaligus prosesor data pribadi dengan tanggung jawab penuh, dan Kemenkes sendiri mendorong privacy impact assessment untuk setiap pengolahan data kesehatan. Aturan kompetisi pun melarang penggunaan data JKN asli. Seluruh pengembangan dan demo memakai data dummy yang kami bangun sendiri dengan struktur ICD dan INA-CBG yang realistis tetapi fiktif. Backend ditulis Fatih untuk rule engine dan model anomali. Frontend ditulis Lato untuk alur kerja koder yang cepat dan bersih.

## 5. Skenario demo tiga menit

Demo dibuka dengan satu draf klaim dummy yang terlihat normal. Sistem memunculkan dua peringatan yaitu dugaan upcoding karena diagnosis tidak mendukung tindakan, dan dugaan cloning karena kemiripan tinggi dengan klaim sehari sebelumnya. Koder membuka penjelasan, memperbaiki kode, skor risiko turun, lalu klaim siap submit dalam kondisi bersih. Alur ini kecil tetapi utuh dan bisa diverifikasi juri dari input sampai keputusan.

## 6. Rencana pengembangan

Tahap proposal sampai registrasi tutup 14 September 2026 kami kunci generator dummy dan tiga aturan inti. Tahap coaching sampai hackathon event kami bangun antarmuka koder dan lapisan anomaly plus similarity. Tahap demo day kami rapikan satu alur utuh dan dokumentasi. Tidak ada klaim akurasi bombastis. Yang kami janjikan adalah sistem yang bisa dijalankan juri di depan mata.

## 7. Mengapa tim ini

Fatih memegang ML dan backend dengan rekam jejak kontribusi Rust dan edge ML sehingga lapisan local-first bukan tempelan. Lato memegang fullstack dan UI sehingga alur koder bisa dipakai manusia sungguhan bukan sekadar mockup. Tim dua orang membuat keputusan cepat dan fokus tidak pecah.

## Referensi

1. Indoraya News, 28 Nov 2025 — KPK ungkap fraud klaim Rp34 miliar di tiga RS (markup, phantom billing), audit 4.341 tagihan, 30.000 entri palsu, kumulatif Rp100 miliar per September 2025.
2. Realita.co / JPNN Jatim, Mei 2026 — Kejari Jember naik penyidikan dugaan fraud klaim, modus upcoding dan phantom billing, klaim seharusnya tidak ada menjadi ada.
3. TribrataNews Polri, 25 Jul 2024 — Kemenkes petakan delapan jenis fraud klaim: phantom billing, manipulasi diagnosis, self-referral, upcoding, dan lainnya.
4. MedMinutes, 30 Apr 2026 — pending klaim nasional 14 persen ke 19,6 persen (Agus–Okt 2024), ARSSI 30 persen Q4 2024, total tertunda Rp5,92 triliun (1,97 juta kasus).
5. J-REMI Polije — RSUD Semarang triwulan I 2024: 242 pengembalian aspek medis, 25 koding, 15 administratif.
6. JIPIKI Univ. Medan, Feb 2026 — akurasi clinical coding menentukan stabilitas finansial RS, error berujung pending dan cashflow terhambat.
7. RAMMIK Pubmedia — RS UNS: penyebab pending yaitu administrasi, ketidaktepatan kode diagnosis, ketidaklengkapan resume medis.
8. Detik / Tempo / Kompas / CNN Indonesia, Nov 2025 — pemenang Healthkathon 2025: Teman Ibu (Aruna), Lucky Seven, BPJS Go Fit 360; semua sisi peserta/preventive care.
9. UU Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi; Kemenkes Setjen, Des 2024 — privasi data kesehatan via privacy impact assessment.
