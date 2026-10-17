import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Check, X } from 'lucide-react'

type Props = {
  onClose: () => void
}

const STEPS = [
  {
    title: 'Selamat datang di PreClaim Guard',
    body: 'Asisten pre-klaim untuk membantu koder meninjau draf sebelum dikirim. Sistem memberi sinyal dan alasan; keputusan akhir tetap di tangan koder.',
    tip: 'Demo ini memakai data sintetis, bukan data pasien nyata.',
  },
  {
    title: 'Mulai dari antrean klaim',
    body: 'Pilih Ikhtisar untuk semua klaim, Perlu ditinjau untuk klaim yang menunggu keputusan, atau Risiko tinggi untuk memprioritaskan skor risiko tertinggi.',
    tip: 'Pilih salah satu baris klaim untuk membuka rincian dan temuan.',
  },
  {
    title: 'Baca alasan dan evidence',
    body: 'Setiap temuan menampilkan aturan, sumber, evidence yang tersedia, dan alasan sistem memberi sinyal. Temuan adalah petunjuk review, bukan vonis fraud atau pengganti verifikasi klinis.',
    tip: 'Aturan berbasis tabel demo ditandai sintetis dan belum divalidasi koder rumah sakit.',
  },
  {
    title: 'Tinjau, revisi, atau setujui dengan catatan',
    body: 'Bila perlu, revisi kode dengan alasan dan evidence, lalu periksa perubahan temuan. Jika memilih menyetujui klaim dengan temuan, tulis catatan agar keputusan tercatat di riwayat.',
    tip: 'Periksa ulang hasil akhir. Tidak ada penolakan otomatis.',
  },
  {
    title: 'Data tetap di browser demo',
    body: 'Aplikasi demo menyimpan klaim di penyimpanan browser pada perangkat ini. Jangan masukkan data pasien nyata. Gunakan data sintetis atau yang memang diizinkan untuk pengujian.',
    tip: 'Gunakan tombol Pulihkan demo untuk mengembalikan data awal.',
  },
]

export default function OnboardingModal({ onClose }: Props) {
  const [stepIndex, setStepIndex] = useState(0)
  const step = STEPS[stepIndex]
  const isLast = stepIndex === STEPS.length - 1

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight' && !isLast) setStepIndex((index) => index + 1)
      if (event.key === 'ArrowLeft' && stepIndex > 0) setStepIndex((index) => index - 1)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isLast, onClose, stepIndex])

  return (
    <div
      className="onboarding-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="onboarding-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-body"
      >
        <header className="onboarding-head">
          <span className="onboarding-icon">
            <BookOpen size={20} />
          </span>
          <span>PANDUAN PENGGUNA</span>
          <button className="onboarding-close" onClick={onClose} aria-label="Tutup panduan">
            <X size={18} />
          </button>
        </header>

        <div className="onboarding-content" key={stepIndex}>
          <div className="onboarding-count">
            LANGKAH {stepIndex + 1} DARI {STEPS.length}
          </div>
          <h2 id="onboarding-title">{step.title}</h2>
          <p id="onboarding-body">{step.body}</p>
          <div className="onboarding-tip">
            <Check size={16} />
            <span>{step.tip}</span>
          </div>
        </div>

        <footer className="onboarding-footer">
          <div className="onboarding-dots" aria-label={`Langkah ${stepIndex + 1} dari ${STEPS.length}`}>
            {STEPS.map((item, index) => (
              <button
                key={item.title}
                className={index === stepIndex ? 'active' : ''}
                aria-label={`Buka langkah ${index + 1}`}
                aria-current={index === stepIndex ? 'step' : undefined}
                onClick={() => setStepIndex(index)}
              />
            ))}
          </div>
          <div className="onboarding-actions">
            {stepIndex > 0 && (
              <button className="onboarding-back" onClick={() => setStepIndex((index) => index - 1)}>
                <ArrowLeft size={16} /> Kembali
              </button>
            )}
            {isLast ? (
              <button className="onboarding-next" onClick={onClose}>
                Mulai gunakan <Check size={16} />
              </button>
            ) : (
              <button className="onboarding-next" onClick={() => setStepIndex((index) => index + 1)}>
                Lanjut <ArrowRight size={16} />
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  )
}
