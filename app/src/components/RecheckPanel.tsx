import type { Flag } from '@preclaim/core'

type Props = {
  previousScore: number
  newScore: number
  previousReadiness?: number
  newReadiness?: number
  previousFindings: Flag[]
  newFindings: Flag[]
}

function findingKey(finding: Flag): string {
  return `${finding.ruleId}:${finding.message}`
}

export default function RecheckPanel({
  previousScore,
  newScore,
  previousReadiness,
  newReadiness,
  previousFindings,
  newFindings,
}: Props) {
  const activeKeys = new Set(newFindings.map(findingKey))
  const completed = previousFindings.filter((finding) => !activeKeys.has(findingKey(finding)))

  return (
    <section className="recheck-panel" aria-label="Hasil pemeriksaan ulang">
      <div className="recheck-heading">
        <b>Pemeriksaan ulang</b>
        <span>Perubahan dari revisi kode</span>
      </div>
      <div className="recheck-scores">
        <span>Risiko <b>{previousScore} → {newScore}</b></span>
        {previousReadiness !== undefined && newReadiness !== undefined && (
          <span>Kesiapan <b>{previousReadiness} → {newReadiness}</b></span>
        )}
      </div>
      <div className="recheck-findings">
        <div>
          <b>Selesai ({completed.length})</b>
          {completed.map((finding) => (
            <span className="finding-done" key={findingKey(finding)}>✓ {finding.message}</span>
          ))}
          {completed.length === 0 && <span>Tidak ada temuan yang selesai.</span>}
        </div>
        <div>
          <b>Tersisa ({newFindings.length})</b>
          {newFindings.map((finding) => (
            <span key={findingKey(finding)}>• {finding.message}</span>
          ))}
          {newFindings.length === 0 && <span>Tidak ada temuan aktif.</span>}
        </div>
      </div>
    </section>
  )
}
