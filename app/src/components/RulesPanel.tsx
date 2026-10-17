import { INSPECTION_RULES } from '@preclaim/core'
import { X } from 'lucide-react'

/**
 * Show the rules that produce the findings.
 *
 * The point is falsifiability: a coder should be able to read the exact rule,
 * see whether the prototype actually evaluates it, and disagree with it. Rules
 * the prototype does not compute are labelled rather than quietly presented as
 * if they were live.
 */
export default function RulesPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="rules-overlay" role="dialog" aria-modal="true" aria-label="Aturan pemeriksaan">
      <div className="rules-panel">
        <div className="revision-head">
          <div>
            <b>Aturan pemeriksaan</b>
            <span>Aturan yang dipakai PreClaim Guard untuk menandai temuan.</span>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Tutup aturan pemeriksaan">
            <X size={16} />
          </button>
        </div>

        {INSPECTION_RULES.map((rule) => (
          <section className="rule" key={rule.id}>
            <div className="rule-head">
              <b>{rule.title}</b>
              <span className={`rule-badge ${rule.enforcement}`}>
                {rule.enforcement === 'computed' ? 'dihitung' : 'dideklarasi'}
              </span>
            </div>
            <p>{rule.description}</p>

            {rule.pairs && (
              <table className="rule-pairs">
                <thead>
                  <tr>
                    <th>Diagnosis</th>
                    <th>Kode tindakan yang diterima</th>
                  </tr>
                </thead>
                <tbody>
                  {rule.pairs.map((p) => (
                    <tr key={p.diagnosis}>
                      <td>
                        <code>{p.diagnosis}</code>
                      </td>
                      <td>{p.codes.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        ))}

        <p className="rules-note">
          Aturan bertanda <b>dideklarasi</b> menyertakan data sintetis sebagai contoh temuan. Belum ada
          perhitungan di dalam prototype ini — sistem produksi akan menghitungnya dari data klaim asli.
          Kejujuran ini disengaja: klaim yang ditolak tanpa alasan yang bisa dijelaskan bukan pemeriksaan yang
          bisa dipercaya.
        </p>
      </div>
    </div>
  )
}
