import { useState } from 'react'
import { codeOf } from '@preclaim/core'
import type { Claim } from '@preclaim/core'
import { X } from 'lucide-react'

type Props = {
  knownDiagnoses: string[]
  /** Procedure codes the rule set accepts for a given diagnosis code. */
  allowedFor: (diagnosis: string) => string[]
  onCreate: (draft: Omit<Claim, 'id' | 'status' | 'score' | 'readiness' | 'flags' | 'history'>) => void
  onClose: () => void
  dark: boolean
}

const BLANK = {
  patient: '',
  service: 'Rawat inap',
  date: '18 Sep 2026',
  amount: '',
  diagnosis: 'K35.8',
  procedure: '',
  length: '0 hari',
}

/**
 * Capture a claim draft before it is checked.
 *
 * Diagnosis is free text with suggestions rather than a locked dropdown: real
 * claims carry ICD-10 codes this prototype has never seen, and silently
 * refusing them would be a lie about the tool's coverage. An unrecognised
 * diagnosis is surfaced as such instead — see the notice below.
 */
export default function AddClaimModal({ knownDiagnoses, allowedFor, onCreate, onClose, dark }: Props) {
  const [draft, setDraft] = useState(BLANK)
  const [hasDocuments, setHasDocuments] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const set = <K extends keyof typeof BLANK>(key: K, value: (typeof BLANK)[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const dxCode = codeOf(draft.diagnosis)
  const allowed = allowedFor(dxCode)
  const knownDx = knownDiagnoses.includes(dxCode)
  const procCode = codeOf(draft.procedure)
  const procKnown = allowed.includes(procCode)

  const valid =
    draft.patient.trim() !== '' &&
    draft.amount.trim() !== '' &&
    draft.diagnosis.trim() !== '' &&
    draft.procedure.trim() !== ''

  const submit = () => {
    setSubmitted(true)
    if (!valid) return
    onCreate({
      ...draft,
      patient: draft.patient.trim(),
      amount: draft.amount.trim(),
      documents: hasDocuments ? ['Dokumen pendukung (dicatat manual)'] : undefined,
    })
  }

  return (
    <div className={`modal-backdrop ${dark ? 'theme-dark' : ''}`} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="revision-box modal-card" role="dialog" aria-modal="true" aria-labelledby="add-claim-title">
        <div className="revision-head">
          <div>
            <b id="add-claim-title">Tambah klaim baru</b>
            <span>Isi draf klaim, lalu pemeriksaan berjalan otomatis.</span>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Tutup tambah klaim">
            <X size={16} />
          </button>
        </div>

      <label>
        Pasien <RequiredMark />
        <input
          aria-invalid={submitted && !draft.patient.trim()}
          aria-describedby={submitted && !draft.patient.trim() ? 'patient-error' : undefined}
          value={draft.patient}
          onChange={(e) => set('patient', e.target.value)}
          placeholder="Pasien E-517"
        />
        {submitted && !draft.patient.trim() && <FieldError id="patient-error">Nama pasien wajib diisi.</FieldError>}
      </label>

      <label>
        Diagnosis (ICD-10) <RequiredMark />
        <input
          aria-invalid={submitted && !draft.diagnosis.trim()}
          aria-describedby={submitted && !draft.diagnosis.trim() ? 'diagnosis-error' : undefined}
          value={draft.diagnosis}
          onChange={(e) => set('diagnosis', e.target.value)}
          placeholder="K35.8"
          list="known-diagnoses"
        />
        {submitted && !draft.diagnosis.trim() && <FieldError id="diagnosis-error">Diagnosis wajib diisi.</FieldError>}
        <datalist id="known-diagnoses">
          {knownDiagnoses.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
        {!knownDx && draft.diagnosis.trim() !== '' && (
          <small className="hint warn">
            Kode ini belum dikenal aturan — temuan kesesuaian tidak dapat dihitung.
          </small>
        )}
      </label>

      <label>
        Kode tindakan <RequiredMark />
        <input
          aria-invalid={submitted && !draft.procedure.trim()}
          aria-describedby={submitted && !draft.procedure.trim() ? 'procedure-error' : undefined}
          value={draft.procedure}
          onChange={(e) => set('procedure', e.target.value)}
          placeholder="Contoh: 47.09"
          list="allowed-procedure-codes"
        />
        {submitted && !draft.procedure.trim() && <FieldError id="procedure-error">Kode tindakan wajib diisi.</FieldError>}
        <datalist id="allowed-procedure-codes">
          {allowed.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <small className="hint">
          {knownDx
            ? `Kode yang lazim untuk ${dxCode}: ${allowed.join(', ')}`
            : 'Daftar kode tidak tersedia untuk diagnosis ini.'}
        </small>
      </label>

      <div className="field-pair">
        <label>
          Layanan
          <input value={draft.service} onChange={(e) => set('service', e.target.value)} />
        </label>
        <label>
          Lama rawat
          <input value={draft.length} onChange={(e) => set('length', e.target.value)} />
        </label>
      </div>

      <label>
        Total tagihan <RequiredMark />
        <input
          aria-invalid={submitted && !draft.amount.trim()}
          aria-describedby={submitted && !draft.amount.trim() ? 'amount-error' : undefined}
          value={draft.amount}
          onChange={(e) => set('amount', e.target.value)}
          placeholder="Rp 0"
        />
        {submitted && !draft.amount.trim() && <FieldError id="amount-error">Total tagihan wajib diisi.</FieldError>}
      </label>

      <label className="check-row">
        <input type="checkbox" checked={hasDocuments} onChange={(e) => setHasDocuments(e.target.checked)} />{' '}
        Sudah ada dokumen pendukung (resume medis, hasil lab, foto).
      </label>

      {draft.procedure.trim() !== '' && (
        <div className={procKnown ? 'draft-check ok' : 'draft-check warn'}>
          {procKnown
            ? '✓ Kode tindakan ada dalam daftar yang lazim untuk diagnosis ini.'
            : knownDx
              ? `⚠ Kode ${procCode} tidak lazim untuk ${dxCode}. Klaim akan ditahan untuk ditinjau.`
              : `⚠ Diagnosis belum dikenal aturan, sehingga ${procCode} tidak dapat diverifikasi.`}
        </div>
      )}

        <div className="actions">
        <button className="ghost" onClick={onClose}>
          Batal
        </button>
        <button className="primary" onClick={submit}>
          Tambahkan klaim
        </button>
        </div>
      </section>
    </div>
  )
}

function RequiredMark() {
  return <span className="required-mark">· wajib</span>
}

function FieldError({ id, children }: { id: string; children: string }) {
  return <small className="field-error" id={id} role="alert">{children}</small>
}
