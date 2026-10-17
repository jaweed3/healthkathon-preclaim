import { useState } from 'react'
import { X } from 'lucide-react'
import type { Claim } from '@preclaim/core'

type Props = {
  claim: Claim
  code: string
  onCode: (v: string) => void
  reason: string
  onReason: (v: string) => void
  evidence: boolean
  onEvidence: (v: boolean) => void
  onConfirm: () => void
  onClose: () => void
  dark: boolean
}

export default function RevisionModal({
  claim,
  code,
  onCode,
  reason,
  onReason,
  evidence,
  onEvidence,
  onConfirm,
  onClose,
  dark,
}: Props) {
  const [attempted, setAttempted] = useState(false)
  const missingCode = !code.trim()
  const missingReason = !reason.trim()
  const missingEvidence = !evidence
  const confirm = () => {
    setAttempted(true)
    onConfirm()
  }

  return (
    <div className={`modal-backdrop ${dark ? 'theme-dark' : ''}`} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="revision-box modal-card" role="dialog" aria-modal="true" aria-labelledby="revision-title">
        <div className="revision-head">
          <div>
            <b id="revision-title">Revisi kode secara auditable</b>
            <span>Kode saat ini: {claim.procedure}</span>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Tutup revisi">
            <X size={16} />
          </button>
        </div>

        <label>
          Kode tindakan koreksi <span className="required-mark">· wajib</span>
          <input aria-invalid={attempted && missingCode} value={code} onChange={(e) => onCode(e.target.value)} placeholder="Contoh: 47.01 — ..." />
          {attempted && missingCode && <small className="field-error" role="alert">Kode tindakan koreksi wajib diisi.</small>}
        </label>

        <label>
          Alasan perubahan <span className="required-mark">· wajib</span>
          <textarea
            aria-invalid={attempted && missingReason}
            value={reason}
            onChange={(e) => onReason(e.target.value)}
            placeholder="Jelaskan dasar perubahan kode..."
          />
          {attempted && missingReason && <small className="field-error" role="alert">Alasan perubahan wajib diisi.</small>}
        </label>

        <label className="check-row">
          <input type="checkbox" aria-invalid={attempted && missingEvidence} checked={evidence} onChange={(e) => onEvidence(e.target.checked)} />
          Saya sudah memeriksa resume medis/evidence pendukung.
        </label>
        {attempted && missingEvidence && <small className="field-error" role="alert">Konfirmasi pemeriksaan evidence wajib dicentang.</small>}

        <div className="actions">
          <button className="ghost" onClick={onClose}>
            Batal
          </button>
          <button className="primary" onClick={confirm}>
            Konfirmasi revisi
          </button>
        </div>
      </section>
    </div>
  )
}
