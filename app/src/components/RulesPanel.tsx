import { INSPECTION_RULES, knownDiagnoses, allowedCodes } from '@preclaim/core'
import { X } from 'lucide-react'

/**
 * Show the rules that produce the findings.
 *
 * The point is falsifiability: a coder should be able to read the exact rule,
 * see which findings it produced, and disagree with it. Every rule listed here
 * is executable against claim data — nothing is presented as live when it is
 * not.
 */
export default function RulesPanel({ onClose, dark }: { onClose: () => void; dark: boolean }) {
  return (
    <div className={`rules-overlay ${dark ? 'theme-dark' : ''}`} role="dialog" aria-modal="true" aria-label="Aturan pemeriksaan">
      <div className="rules-panel">
        <div className="revision-head">
          <div>
            <b>Aturan pemeriksaan</b>
            <span>{INSPECTION_RULES.length} aturan, semuanya dihitung terhadap data klaim.</span>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Tutup aturan pemeriksaan">
            <X size={16} />
          </button>
        </div>

        {INSPECTION_RULES.map((rule) => (
          <section className="rule" key={rule.id}>
            <div className="rule-head">
              <b>{rule.title}</b>
              <code className="rule-id">{rule.id}</code>
              <span className="rule-version">v{rule.version}</span>
              <span className={`rule-basis basis-${rule.basis}`}>Basis: {rule.basis}</span>
            </div>
            <p>{rule.description}</p>
            <p className="rule-source">Sumber: {rule.source}</p>

            {rule.id === 'dx-procedure' && (
              <table className="rule-pairs">
                <thead>
                  <tr>
                    <th>Diagnosis</th>
                    <th>Kode tindakan yang diterima</th>
                  </tr>
                </thead>
                <tbody>
                  {knownDiagnoses().map((dx) => (
                    <tr key={dx}>
                      <td>
                        <code>{dx}</code>
                      </td>
                      <td>{allowedCodes(dx).join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        ))}

        <p className="rules-note">
          Setiap temuan menautkan ke <code>ruleId</code>-nya. Mengoreksi kode tindakan hanya menjalankan ulang
          aturan diagnosis↔tindakan; temuan lain — misalnya kemiripan klaim — tetap berlaku dan tidak ikut
          terhapus.
        </p>
      </div>
    </div>
  )
}
