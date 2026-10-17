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
}: Props) {
  return (
    <div className="revision-box">
      <div className="revision-head">
        <div>
          <b>Revisi kode secara auditable</b>
          <span>Kode saat ini: {claim.procedure}</span>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Tutup revisi">
          <X size={16} />
        </button>
      </div>

      <label>
        Kode tindakan koreksi
        <input value={code} onChange={(e) => onCode(e.target.value)} placeholder="Contoh: 47.01 — ..." />
      </label>

      <label>
        Alasan perubahan
        <textarea
          value={reason}
          onChange={(e) => onReason(e.target.value)}
          placeholder="Jelaskan dasar perubahan kode..."
        />
      </label>

      <label className="check-row">
        <input type="checkbox" checked={evidence} onChange={(e) => onEvidence(e.target.checked)} /> Saya sudah
        memeriksa resume medis/evidence pendukung.
      </label>

      <div className="actions">
        <button className="ghost" onClick={onClose}>
          Batal
        </button>
        <button className="primary" onClick={onConfirm}>
          Konfirmasi revisi
        </button>
      </div>
    </div>
  )
}
