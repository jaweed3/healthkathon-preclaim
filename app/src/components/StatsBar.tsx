import { CLAIM_STATUS, averageScore, type Claim } from '@preclaim/core'

type Props = { claims: Claim[] }

export default function StatsBar({ claims }: Props) {
  const review = claims.filter((c) => c.status === CLAIM_STATUS.review).length
  const ready = claims.filter(
    (c) => c.status === CLAIM_STATUS.ready || c.status === CLAIM_STATUS.approved,
  ).length

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
