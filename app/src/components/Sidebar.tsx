import { BarChart3, ClipboardCheck, Flag, FolderOpen } from 'lucide-react'

export type View = 'all' | 'review'

type Props = {
  view: View
  onView: (v: View) => void
  reviewCount: number
  totalCount: number
}

export default function Sidebar({ view, onView, reviewCount, totalCount }: Props) {
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
        <button
          className={view === 'all' && totalCount > 0 ? 'active' : ''}
          onClick={() => onView('all')}
          aria-current={view === 'all' ? 'page' : undefined}
        >
          <i>
            <BarChart3 size={16} />
          </i>
          Ikhtisar
        </button>
        <button
          className={view === 'review' ? 'active' : ''}
          onClick={() => onView('review')}
          aria-current={view === 'review' ? 'page' : undefined}
        >
          <i>
            <Flag size={16} />
          </i>
          Perlu ditinjau <em>{reviewCount}</em>
        </button>
        <button className={view === 'all' ? '' : ''} onClick={() => onView('all')}>
          <i>
            <FolderOpen size={16} />
          </i>
          Semua klaim
        </button>
        <button disabled title="Belum tersedia di prototype beta">
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
