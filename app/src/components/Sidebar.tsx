import { BarChart3, ClipboardCheck, Flag } from 'lucide-react'

/**
 * Which slice of claims is on screen.
 *
 * `review` and `risky` are genuinely different filters and were previously
 * conflated: the "Berisiko" chip counted `score >= 60` but applied a status
 * filter, so its badge and its result disagreed.
 *
 * - `all`    — every claim
 * - `review` — awaiting a coder decision, by status
 * - `risky`  — high risk score, regardless of status
 */
export type View = 'all' | 'review' | 'risky'

type Props = {
  view: View
  onView: (v: View) => void
  onShowRules: () => void
  reviewCount: number
}

export default function Sidebar({ view, onView, onShowRules, reviewCount }: Props) {
  return (
    <aside>
      <div className="brand">
        <div className="brand-mark">✓</div>
        <div>
          <b>PreClaim</b>
          <span>GUARD</span>
        </div>
      </div>

      <div className="workspace">
        <small>WORKSPACE</small>
        <strong>RS Sehat Sentosa</strong>
        <span>Unit Casemix · Lokal</span>
      </div>

      <nav>
        <NavItem
          active={view === 'all'}
          onClick={() => onView('all')}
          icon={<BarChart3 size={16} />}
          label="Ikhtisar"
        />
        <NavItem
          active={view === 'review'}
          onClick={() => onView('review')}
          icon={<Flag size={16} />}
          label="Perlu ditinjau"
          count={reviewCount}
        />
        <button onClick={onShowRules} title="Lihat aturan pemeriksaan yang aktif">
          <i>
            <ClipboardCheck size={16} />
          </i>
          Aturan pemeriksaan
        </button>
      </nav>

      <div className="side-foot">
        <span className="live-dot" /> Pemeriksaan lokal aktif
        <div className="avatar">FA</div>
        <small>Fatih · Koder</small>
      </div>
    </aside>
  )
}

function NavItem({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  count?: number
}) {
  return (
    <button className={active ? 'active' : ''} onClick={onClick} aria-current={active ? 'page' : undefined}>
      <i>{icon}</i>
      {label}
      {count !== undefined && <em>{count}</em>}
    </button>
  )
}
