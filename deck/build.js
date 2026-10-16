const pptxgen = require("pptxgenjs");

const NAVY = "0F2A44";
const TEAL = "0E7C6B";
const LIGHT = "F2F5F7";
const WHITE = "FFFFFF";
const MUTED = "5B6B7A";
const ACCENT = "F2A541";

let pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "PreClaim Guard";
pres.title = "PreClaim Guard — Healthkathon 2026";

function footer(slide, num) {
  slide.addText(`PreClaim Guard  •  Healthkathon 2026  •  ${num}`, {
    x: 0.5, y: 5.25, w: 9, h: 0.25, fontSize: 9, color: MUTED, align: "right",
  });
}

// ---- Slide 1: Cover ----
let s1 = pres.addSlide();
s1.background = { color: NAVY };
s1.addText("PRECLAIM GUARD", { x: 0.7, y: 1.1, w: 8.6, h: 0.9, fontSize: 44, bold: true, color: WHITE, fontFace: "Georgia" });
s1.addText("Evidence-Grounded, Policy-Aware, Local-First Pre-Claim Compliance Assistant untuk Koder JKN", { x: 0.7, y: 2.1, w: 8.6, h: 0.8, fontSize: 18, color: "C9D6E0", fontFace: "Calibri" });
s1.addShape(pres.shapes.RECTANGLE, { x: 0.7, y: 3.0, w: 1.2, h: 0.08, fill: { color: ACCENT }, line: { type: "none" } });
s1.addText("Detect before submit. Explain before reject.", { x: 0.7, y: 3.25, w: 8.6, h: 0.5, fontSize: 20, italic: true, color: ACCENT, fontFace: "Georgia" });
s1.addText("Efisiensi Risiko pada Fasilitas Kesehatan  •  Upcoding  •  Unbundling  •  Cloning / Repeat Billing", { x: 0.7, y: 3.9, w: 8.6, h: 0.4, fontSize: 13, color: "C9D6E0" });
s1.addText("Tim ProfHabibieBanggaSamaKita  •  Fatih Jawwad Al Mumtaz (ketua)  •  Farrel Ghozy Affifuddin (anggota)", { x: 0.7, y: 4.6, w: 8.6, h: 0.4, fontSize: 12, color: "8FA2B5" });

// ---- Slide 2: Positioning ----
let s2 = pres.addSlide();
s2.background = { color: WHITE };
s2.addText("Positioning: quality gate sebelum klaim keluar dari RS", { x: 0.5, y: 0.25, w: 9, h: 0.6, fontSize: 30, bold: true, color: NAVY, fontFace: "Georgia" });
s2.addText("Satu kategori: Efisiensi Risiko pada Fasilitas Kesehatan. Sub-kategori fokus: Upcoding, Unbundling/Fragmentation, Cloning/Repeat Billing. Verifikasi BPJS yang ada bekerja represif setelah klaim masuk — kami preventif sebelum klaim keluar. Tidak menggantikan koder, tidak memvonis fraud, tidak menolak otomatis.", { x: 0.5, y: 1.0, w: 9, h: 0.9, fontSize: 14, color: "333333" });
// 3 boxes
const boxes = [
  { t: "Sebelum submit", d: "Rule + evidence check di meja koder, temuan beralasan + versi aturan" },
  { t: "Human-in-the-loop", d: "Keputusan akhir di koder: perbaiki atau setujui dengan catatan" },
  { t: "Local-first", d: "Data pasien tidak keluar RS, prototype murni data synthetic" },
];
boxes.forEach((b, i) => {
  const x = 0.5 + i * 3.1;
  s2.addShape(pres.shapes.RECTANGLE, { x, y: 2.1, w: 2.9, h: 2.5, fill: { color: LIGHT }, line: { color: TEAL, width: 1.5 } });
  s2.addText(b.t, { x: x + 0.2, y: 2.3, w: 2.5, h: 0.5, fontSize: 16, bold: true, color: NAVY });
  s2.addText(b.d, { x: x + 0.2, y: 2.9, w: 2.5, h: 1.4, fontSize: 13, color: "333333" });
});
footer(s2, "2");

// ---- Slide 3: Masalah — skala nasional ----
let s3 = pres.addSlide();
s3.background = { color: WHITE };
s3.addText("Masalah: uang tertahan triliunan, fraud-nya nyata", { x: 0.5, y: 0.25, w: 9, h: 0.6, fontSize: 30, bold: true, color: NAVY, fontFace: "Georgia" });
const stats = [
  { n: "Rp5,92 T", d: "Nilai klaim ditunda BPJS akhir 2024 atas 3,69 jt kasus (Bisnis.com, Mei 2025)" },
  { n: "Rp34 M", d: "Dugaan fraud 3 RS via phantom billing, KPK bawa ke penindakan (Jul 2024)" },
  { n: "3 RS", d: "Kejari Jember naikkan dugaan upcoding + phantom billing ke penyidikan (Mei 2026)" },
];
stats.forEach((s, i) => {
  const x = 0.5 + i * 3.1;
  s3.addShape(pres.shapes.RECTANGLE, { x, y: 1.2, w: 2.9, h: 2.2, fill: { color: NAVY }, line: { type: "none" } });
  s3.addText(s.n, { x: x + 0.2, y: 1.4, w: 2.5, h: 0.7, fontSize: 34, bold: true, color: ACCENT, fontFace: "Georgia" });
  s3.addText(s.d, { x: x + 0.2, y: 2.2, w: 2.5, h: 1.0, fontSize: 12, color: WHITE });
});
s3.addText("Skala JKN: 284 jt peserta aktif per Jul 2026 — program jaminan kesehatan tunggal terbesar di dunia. Setiap perbaikan kualitas klaim berdampak sistemik.", { x: 0.5, y: 3.7, w: 9, h: 0.7, fontSize: 13, italic: true, color: MUTED });
s3.addText("Sumber: Bisnis.com 26 Mei 2025; KPK via CNBC/Tribrata Jul 2024; Kompas/RMOL Jatim Mei 2026; BPJS via bpjs-pusat.org Jul 2026.", { x: 0.5, y: 4.5, w: 9, h: 0.4, fontSize: 10, color: MUTED });
footer(s3, "3");

// ---- Slide 4: Masalah — bukti RS yang bisa dicegah ----
let s4 = pres.addSlide();
s4.background = { color: WHITE };
s4.addText("Bukti RS: pending harian yang bisa dicegah di hulu", { x: 0.5, y: 0.25, w: 9, h: 0.6, fontSize: 30, bold: true, color: NAVY, fontFace: "Georgia" });
s4.addText("RSUD Pasar Minggu 2024 (studi terpublikasi, ResearchGate Jun 2025): rata-rata pending 5,45% dari berkas, 17,13% dari nilai klaim. Rawat inap: 1,02% berkas tapi 15,48% nilai — coding dominan dari sisi nilai. Pola ini spesifik per fasilitas, tidak digeneralisasi nasional. Karena tiap RS berbeda, aturan kami berversi dan terkalibrasi lokal.", { x: 0.5, y: 1.0, w: 9, h: 1.2, fontSize: 14, color: "333333" });
const fixes = [
  { t: "Evidence check", d: "Dokumen pendukung kurang → flag sebelum submit" },
  { t: "Coding consistency", d: "Diagnosis vs tindakan vs obat tidak cocok → review" },
  { t: "Episode review", d: "Layanan berdekatan yang seharusnya satu paket" },
];
fixes.forEach((b, i) => {
  const x = 0.5 + i * 3.1;
  s4.addShape(pres.shapes.RECTANGLE, { x, y: 2.5, w: 2.9, h: 1.9, fill: { color: LIGHT }, line: { color: TEAL, width: 1.5 } });
  s4.addText(b.t, { x: x + 0.2, y: 2.7, w: 2.5, h: 0.5, fontSize: 16, bold: true, color: NAVY });
  s4.addText(b.d, { x: x + 0.2, y: 3.2, w: 2.5, h: 1.0, fontSize: 13, color: "333333" });
});
s4.addText("Sumber: Analisis Klaim Pending BPJS RSUD Pasar Minggu 2024 (ResearchGate, Jun 2025).", { x: 0.5, y: 4.6, w: 9, h: 0.3, fontSize: 10, color: MUTED });
footer(s4, "4");

pres.writeFile({ fileName: "preclaim-guard-deck.pptx" }).then(() => console.log("WROTE deck, slides:", pres._slides.length));
