import { useState } from 'react'
import { allowedCodes, codeOf, isPlausible, knownDiagnoses } from '@preclaim/core'
import type { Claim } from '@preclaim/core'
import { X } from 'lucide-react'

type Props = {
  onCreate: (draft: Omit<Claim, 'id' | 'status' | 'score' | 'flags' | 'revisions'>) => void
  onClose: () => void
}

const BLANK = {
  patient: '',
  service: 'Rawat inap',
  date: '18 Sep 2026',
  amount: '',
  diagnosis: knownDiagnoses()[0],
  procedure: '',
  length: '0 hari',
}

/**
 * Capture a claim draft before it is checked.
 *
 * The diagnosis picker is constrained to codes the rule set actually knows,
 * because the prototype can only score a pair it has a rule for — an unknown
 * diagnosis would silently fall through to "implausible" and read as a finding
 * rather than as missing data.
 */
export default function AddClaimModal({ onCreate, onClose }: Props) {
  const [draft, setDraft] = useState(BLANK)

  const set = <K extends keyof typeof BLANK>(key: K, value: (typeof BLANK)[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const allowed = allowedCodes(codeOf(draft.diagnosis))
  const plausible = draft.procedure.trim() !== '' && isPlausible(draft.diagnosis, codeOf(draft.procedure))

  const valid =
    draft.patient.trim() !== '' &&
    draft.amount.trim() !== '' &&
    draft.diagnosis.trim() !== '' &&
    draft.procedure.trim() !== ''

  const submit = () => {
    if (!valid) return
    onCreate({ ...draft, patient: draft.patient.trim(), amount: draft.amount.trim() })
  }

  return (
    <div className="revision-box">
      <div className="revision-head">
        <div>
          <b>Tambah klaim baru</b>
          <span>Isi draf klaim, lalu pemeriksaan berjalan otomatis.</span>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Tutup tambah klaim">
          <X size={16} />
        </button>
      </div>

      <label>
        Pasien
        <input
          value={draft.patient}
          onChange={(e) => set('patient', e.target.value)}
          placeholder="Pasien E-517"
        />
      </label>

      <label>
        Diagnosis
        <select value={draft.diagnosis} onChange={(e) => set('diagnosis', e.target.value)}>
          {knownDiagnoses().map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>

      <label>
        Kode tindakan
        <input
          value={draft.procedure}
          onChange={(e) => set('procedure', e.target.value)}
          placeholder="Contoh: 47.09"
          list="allowed-procedure-codes"
        />
        <datalist id="allowed-procedure-codes">
          {allowed.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <small className="hint">
          {allowed.length > 0
            ? `Kode yang lazim untuk ${draft.diagnosis}: ${allowed.join(', ')}`
            : 'Belum ada aturan untuk diagnosis ini.'}
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
        Total tagihan
        <input value={draft.amount} onChange={(e) => set('amount', e.target.value)} placeholder="Rp 0" />
      </label>

      {draft.procedure.trim() !== '' && (
        <div className={plausible ? 'draft-check ok' : 'draft-check warn'}>
          {plausible
            ? '✓ Kode tindakan sesuai dengan diagnosis.'
            : `⚠ Kode ${codeOf(draft.procedure)} tidak ada di daftar yang lazim untuk ${draft.diagnosis}. Klaim akan ditahan untuk ditinjau.`}
        </div>
      )}

      <div className="actions">
        <button className="ghost" onClick={onClose}>
          Batal
        </button>
        <button className="primary" onClick={submit} disabled={!valid}>
          Tambahkan klaim
        </button>
      </div>
    </div>
  )
}
