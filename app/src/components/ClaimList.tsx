import { Search } from 'lucide-react'
import { scoreTone } from '../scoring'
import type { Claim } from '../types'
import StatusBadge from './StatusBadge'

type Props = {
  shown: Claim[]
  selected: Claim
  onSelect: (c: Claim) => void
  onShowReview: () => void
  total: number
  atRisk: number
}

export default function ClaimList({ shown, selected, onSelect, onShowReview, total, atRisk }: Props) {
  return (
    <section className="panel list-panel">
      <div className="panel-head">
        <div>
          <h2>Daftar klaim</h2>
          <span className="muted">Data dummy untuk simulasi</span>
        </div>
        <div className="filters">
          <button className="filter-active">
            Semua <b>{total}</b>
          </button>
          <button onClick={onShowReview}>
            Berisiko <b>{atRisk}</b>
          </button>
          <button aria-label="Cari klaim" disabled title="Pencarian belum tersedia di prototype beta">
            <Search size={14} />
          </button>
        </div>
      </div>

      <div className="table">
        <div className="tr th">
          <span>KLAIM / PASIEN</span>
          <span>LAYANAN</span>
          <span>NILAI</span>
          <span>RISIKO</span>
          <span>STATUS</span>
        </div>
        {shown.map((c) => (
          <button
            key={c.id}
            className={`tr row ${selected.id === c.id ? 'selected' : ''}`}
            onClick={() => onSelect(c)}
          >
            <span>
              <b>{c.id}</b>
              <small>
                {c.patient} · {c.date}
              </small>
            </span>
            <span>{c.service}</span>
            <span>{c.amount}</span>
            <span>
              <i className={`risk ${scoreTone(c.score)}`}>{c.score}</i>
            </span>
            <span>
              <StatusBadge status={c.status} />
            </span>
          </button>
        ))}
      </div>

      <div className="legend">
        <span>
          <i className="dot high" /> Risiko tinggi <b>60+</b>
        </span>
        <span>
          <i className="dot medium" /> Perlu perhatian <b>30–59</b>
        </span>
        <span>
          <i className="dot low" /> Rendah <b>0–29</b>
        </span>
      </div>
    </section>
  )
}
