import type { CSSProperties } from 'react'
import { CLAIM_STATUS, REVIEW_THRESHOLD, scoreTone, type AuditEvent, type Claim } from '@preclaim/core'
import RevisionModal from './RevisionModal'
import AuditTimeline from './AuditTimeline'
import StatusBadge from './StatusBadge'

export type ClaimDetailProps = {
  claim: Claim
  onClose: () => void
  /** Persisted decision history for this claim, oldest first. */
  history: AuditEvent[]
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
  dark: boolean
}

/** Why a rule fired, in the coder's language rather than the engine's. */
const RULE_BLURB: Record<string, string> = {
  'dx-procedure':
    'Kode tindakan ini tidak ada dalam daftar kode yang lazim untuk diagnosis tersebut. Ini indikator untuk verifikasi klinis, bukan bukti atau vonis upcoding.',
  'length-of-stay': 'Lama rawat lebih panjang dari pola yang biasa untuk diagnosis ini di fasilitas.',
  'missing-evidence': 'Tindakan berisiko tinggi ini dikirim tanpa dokumen pendukung yang tercatat.',
  similarity:
    'Diagnosis, tindakan, dan lama rawat mirip dengan klaim lain. Kemiripan adalah sinyal untuk memeriksa kemungkinan copy-paste atau klaim tertukar, bukan bukti.',
  'local-anomaly':
    'Nilai ini menyimpang dari klaim sintetis sejenis yang tersedia. Indikator statistik ini bukan bukti kesalahan atau fraud, dan hanya muncul bila jumlah pembanding mencukupi.',
}

const DEMO_CASE: Record<string, string> = {
  'dx-procedure': 'Skenario demo: dugaan upcoding',
  similarity: 'Skenario demo: indikasi copy-paste',
}

export default function ClaimDetail(props: ClaimDetailProps) {
  const { claim } = props
  const warnings = claim.flags.filter((f) => f.severity === 'warn')

  return (
    <section className="panel detail" role="dialog" aria-modal="true" aria-label={`Detail klaim ${claim.id}`}>
      <div className="detail-top">
        <div>
          <span className="claim-id">{claim.id}</span>
          <h2>{claim.patient}</h2>
          <span className="muted">
            {claim.service} · {claim.date}
          </span>
        </div>
        <StatusBadge status={claim.status} />
        <button
          className="detail-close"
          onClick={props.onClose}
          aria-label="Tutup detail klaim"
          title="Tutup detail klaim"
        >
          ×
        </button>
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
            <b>{claim.score < 30 ? 'Aman' : claim.score < REVIEW_THRESHOLD ? 'Perhatian' : 'Tinggi'}</b>
            <small>tingkat risiko</small>
          </div>
        </div>
        <div className="readiness-card">
          <span>KESIAPAN</span>
          <b>
            {claim.readiness}
            <small>/100</small>
          </b>
        </div>
      </div>

      <div className="section-title">
        <h3>Temuan pemeriksaan</h3>
        <span>
          {warnings.length} peringatan · {claim.flags.length} total
        </span>
      </div>

      {claim.flags.length === 0 ? (
        <div className="empty">
          <b>✓ Tidak ada temuan aktif</b>
          <span>Klaim ini melewati pemeriksaan dasar.</span>
        </div>
      ) : (
        <div className="flags">
          {claim.flags.map((f) => (
            <div className={`flag ${f.severity}`} key={`${f.ruleId}-${f.message}`}>
              <div className="flag-icon">{f.severity === 'warn' ? '!' : 'i'}</div>
              <div>
                {DEMO_CASE[f.ruleId] && <span className="demo-case">{DEMO_CASE[f.ruleId]}</span>}
                <b>{f.message}</b>
                <p>{RULE_BLURB[f.ruleId] ?? 'Ditemukan oleh pemeriksaan otomatis.'}</p>
                <small>
                  Alasan: {f.reason} · Sumber: {f.source} · Evidence: {f.evidence.join('; ')}
                  {typeof f.deviationScore === 'number'
                    ? ` · Penyimpangan: ${f.deviationScore.toFixed(1)} simpangan baku`
                    : ''}
                </small>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="facts" aria-label="Ringkasan informasi klaim">
        <div className="fact-card fact-diagnosis">
          <span>Diagnosis utama</span>
          <b>{claim.diagnosis}</b>
        </div>
        <div className="fact-card fact-procedure">
          <span>Tindakan</span>
          <b>{claim.procedure}</b>
        </div>
        <div className="fact-card fact-length">
          <span>Lama rawat</span>
          <b>{claim.length}</b>
        </div>
        <div className="fact-card fact-amount">
          <span>Total tagihan</span>
          <b>{claim.amount}</b>
        </div>
      </div>

      {props.history.length > 0 && (
        <div className="audit-trail">
          <div className="section-title">
            <h3>Riwayat keputusan</h3>
            <span>{props.history.length} tercatat</span>
          </div>
          <AuditTimeline events={props.history} />
        </div>
      )}

      {props.notice && props.notice !== 'Tulis alasan persetujuan sebelum melanjutkan.' && (
        <div className="notice">✓ {props.notice}</div>
      )}

      {claim.status === CLAIM_STATUS.review && (
        <>
          <div className="coder-note-field">
            <label className="note-label" htmlFor="coder-note">
              Catatan koder <span className="required-mark">• wajib saat menyetujui</span>
            </label>
            <textarea
              id="coder-note"
              value={props.note}
              onChange={(e) => props.onNote(e.target.value)}
              placeholder="Tulis dasar keputusan, mis. hasil verifikasi resume medis."
              aria-invalid={
                props.notice === 'Tulis alasan persetujuan sebelum melanjutkan.' && !props.note.trim()
              }
              aria-describedby={
                props.notice === 'Tulis alasan persetujuan sebelum melanjutkan.'
                  ? 'coder-note-error'
                  : 'coder-note-help'
              }
            />
            {props.notice === 'Tulis alasan persetujuan sebelum melanjutkan.' ? (
              <span className="field-error" id="coder-note-error" role="alert">
                Catatan koder wajib diisi sebelum menyetujui.
              </span>
            ) : (
              <span className="field-help" id="coder-note-help">
                Dicatat di riwayat bila klaim disetujui dengan temuan aktif.
              </span>
            )}
          </div>

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
              dark={props.dark}
            />
          )}

          <div className="actions">
            <button className="secondary" onClick={props.onStartRevision}>
              ↺ Revisi kode
            </button>
            <button className="primary" onClick={props.onApprove}>
              ✓ Setujui dengan catatan
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
