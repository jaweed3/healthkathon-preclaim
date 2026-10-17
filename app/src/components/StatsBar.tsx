import { averageScore } from '../scoring'
import type { Claim } from '../types'

type Props = { claims: Claim[] }

export default function StatsBar({ claims }: Props) {
  const review = claims.filter((c) => c.status === 'Perlu ditinjau').length
  const ready = claims.filter((c) => c.status === 'Siap submit' || c.status === 'Disetujui').length

  return (
    <section className="stats">
      <div>
        <span>Total klaim hari ini</span>
        <strong>{claims.length}</strong>
        <small>↑ 12% dari kemarin</small>
      </div>
      <div>
        <span>Perlu ditinjau</span>
        <strong className="orange">{review}</strong>
        <small className="orange-text">Prioritas koder</small>
      </div>
      <div>
        <span>Rata-rata risiko</span>
        <strong>
          {averageScore(claims)}
          <span className="unit">/100</span>
        </strong>
        <small>✓ Dalam batas aman</small>
      </div>
      <div>
        <span>Siap dikirim</span>
        <strong className="green">{ready}</strong>
        <small>Tanpa peringatan aktif</small>
      </div>
    </section>
  )
}
