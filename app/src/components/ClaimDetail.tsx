import type { CSSProperties } from 'react'
import { scoreTone } from '../scoring'
import type { Claim } from '../types'
import RevisionModal from './RevisionModal'
import StatusBadge from './StatusBadge'

type Props = {
  claim: Claim
  notice: string
  note: string
  onNote: (v: string) => void
  revisionOpen: boolean
  code: string
  onCode: (v: string) => void
  reason: string
  onReason: (v: string) => void
  evidence: boolean
  onEvidence: (v: boolean) => void
  onStartRevision: () => void
  onConfirmRevision: () => void
  onCloseRevision: () => void
  onApprove: () => void
}

const FLAG_EXPLANATIONS = [
  'Kode 47.09 biasanya membutuhkan dukungan diagnosis tindakan bedah. Periksa kembali resume medis dan kode yang dipilih.',
  'Kemiripan 86% pada diagnosis, tindakan, dan lama rawat. Pastikan klaim tidak tertukar atau terduplikasi.',
]

export default function ClaimDetail(props: Props) {
  const { claim } = props

  return (
    <section className="panel detail">
      <div className="detail-top">
        <div>
          <span className="claim-id">{claim.id}</span>
          <h2>{claim.patient}</h2>
          <span className="muted">
            {claim.service} · {claim.date}
          </span>
        </div>
        <StatusBadge status={claim.status} />
      </div>

      <div className={`score-card ${scoreTone(claim.score)}`}>
        <div>
          <span>SKOR RISIKO KLAIM</span>
          <strong>
            {claim.score}
            <small>/100</small>
          </strong>
        </div>
        <div className="score-ring">
          <div style={{ '--score': `${claim.score * 3.6}deg` } as CSSProperties}>
            <b>{claim.score < 30 ? 'Aman' : claim.score < 60 ? 'Perhatian' : 'Tinggi'}</b>
            <small>confidence</small>
          </div>
        </div>
      </div>

      <div className="section-title">
        <h3>Temuan pemeriksaan</h3>
        <span>{claim.flags.length} aktif</span>
      </div>

      {claim.flags.length === 0 ? (
        <div className="empty">
          <b>✓ Tidak ada peringatan aktif</b>
          <span>Klaim ini melewati pemeriksaan dasar.</span>
        </div>
      ) : (
        <div className="flags">
          {claim.flags.map((f, i) => (
            <div className="flag" key={f}>
              <div className="flag-icon">{i === 0 ? '!' : '≈'}</div>
              <div>
                <b>{f}</b>
                <p>{FLAG_EXPLANATIONS[i] ?? FLAG_EXPLANATIONS[1]}</p>
                <a>Kenapa ini ditandai? ↗</a>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="facts">
        <div>
          <span>Diagnosis utama</span>
          <b>{claim.diagnosis}</b>
        </div>
        <div>
          <span>Tindakan</span>
          <b>{claim.procedure}</b>
        </div>
        <div>
          <span>Lama rawat</span>
          <b>{claim.length}</b>
        </div>
        <div>
          <span>Total tagihan</span>
          <b>{claim.amount}</b>
        </div>
      </div>

      {props.notice && <div className="notice">✓ {props.notice}</div>}

      {claim.status === 'Perlu ditinjau' && (
        <>
          <textarea
            value={props.note}
            onChange={(e) => props.onNote(e.target.value)}
            placeholder="Tambahkan catatan koder (opsional)…"
          />

          {props.revisionOpen && (
            <RevisionModal
              claim={claim}
              code={props.code}
              onCode={props.onCode}
              reason={props.reason}
              onReason={props.onReason}
              evidence={props.evidence}
              onEvidence={props.onEvidence}
              onConfirm={props.onConfirmRevision}
              onClose={props.onCloseRevision}
            />
          )}

          <div className="actions">
            <button className="secondary" onClick={props.onStartRevision}>
              ↺ Revisi kode
            </button>
            <button className="primary" onClick={props.onApprove}>
              ✓ Approve dengan catatan
            </button>
          </div>
        </>
      )}

      <div className="disclaimer">
        <span>ⓘ</span>
        <p>
          <b>Asisten, bukan hakim.</b> PreClaim Guard hanya memberi sinyal berbasis data dummy dan aturan yang
          dapat dijelaskan. Keputusan akhir selalu di tangan koder. Ini bukan alat adjudikasi fraud otomatis.
        </p>
      </div>
    </section>
  )
}
