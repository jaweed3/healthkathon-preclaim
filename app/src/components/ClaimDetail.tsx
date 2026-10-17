import type { CSSProperties } from 'react'
import { CLAIM_STATUS, REVIEW_THRESHOLD, scoreTone, type AuditEvent, type Claim } from '@preclaim/core'
import RevisionModal from './RevisionModal'
import StatusBadge from './StatusBadge'

type Props = {
  claim: Claim
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
}

const stamp = (at: string) => new Date(at).toLocaleString('id-ID')

/** Why a rule fired, in the coder's language rather than the engine's. */
const RULE_BLURB: Record<string, string> = {
  'dx-procedure': 'Kode tindakan ini tidak ada dalam daftar kode yang lazim untuk diagnosis tersebut.',
  'length-of-stay': 'Lama rawat lebih panjang dari pola yang biasa untuk diagnosis ini di fasilitas.',
  'missing-evidence': 'Tindakan berisiko tinggi ini dikirim tanpa dokumen pendukung yang tercatat.',
  similarity:
    'Diagnosis, tindakan, dan lama rawat mirip dengan klaim lain. Periksa kemungkinan klaim tertukar.',
}

export default function ClaimDetail(props: Props) {
  const { claim } = props
  const warnings = claim.flags.filter((f) => f.severity === 'warn')

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
            <b>{claim.score < 30 ? 'Aman' : claim.score < REVIEW_THRESHOLD ? 'Perhatian' : 'Tinggi'}</b>
            <small>confidence</small>
          </div>
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
                <b>{f.message}</b>
                <p>{RULE_BLURB[f.ruleId] ?? 'Ditemukan oleh pemeriksaan otomatis.'}</p>
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

      {props.history.length > 0 && (
        <div className="audit-trail">
          <div className="section-title">
            <h3>Riwayat keputusan</h3>
            <span>{props.history.length} tercatat</span>
          </div>
          {props.history.map((event, i) => (
            <div className="audit-entry" key={`${event.kind}-${event.at}-${i}`}>
              {event.kind === 'revision' ? (
                <>
                  <div className="audit-meta">
                    <b>
                      {event.previousScore} → {event.newScore}
                    </b>
                    <span>{stamp(event.at)}</span>
                  </div>
                  <div className="audit-change">
                    {event.from} <i>→</i> {event.to}
                  </div>
                  <p>{event.reason}</p>
                  <span className={event.evidence ? 'audit-evidence yes' : 'audit-evidence no'}>
                    {event.evidence ? '✓ evidence diperiksa' : '⚠ tanpa evidence'}
                  </span>
                </>
              ) : (
                <>
                  <div className="audit-meta">
                    <b className="approval">Disetujui dengan catatan</b>
                    <span>{stamp(event.at)}</span>
                  </div>
                  <p>{event.note}</p>
                  <span className="audit-evidence no">
                    ⚠ tetap dikirim dengan {event.findingsAtApproval.length} temuan aktif (skor {event.score})
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {props.notice && <div className="notice">✓ {props.notice}</div>}

      {claim.status === CLAIM_STATUS.review && (
        <>
          <label className="note-label" htmlFor="coder-note">
            Catatan koder
            <span>wajib diisi bila menyetujui klaim dengan temuan aktif</span>
          </label>
          <textarea
            id="coder-note"
            value={props.note}
            onChange={(e) => props.onNote(e.target.value)}
            placeholder="Tulis dasar keputusanmu, mis. verifikasi resume medis, atau koreksi kode."
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
