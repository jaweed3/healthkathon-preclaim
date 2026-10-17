import { Moon, ShieldCheck, Sun, Upload } from 'lucide-react'
import type { View } from './Sidebar'

type Props = {
  view: View
  dark: boolean
  onToggleTheme: () => void
}

const TITLES: Record<View, string> = {
  all: 'Ikhtisar klaim',
  review: 'Klaim perlu ditinjau',
  risky: 'Klaim berisiko tinggi',
}

export default function Header({ view, dark, onToggleTheme }: Props) {
  return (
    <header>
      <div>
        <p className="eyebrow">RABU, 18 SEPTEMBER 2026</p>
        <h1>{TITLES[view]}</h1>
        <p className="sub">Periksa sebelum dikirim. Pahami sebelum memutuskan.</p>
      </div>
      <div className="header-actions">
        <span className="privacy">
          <ShieldCheck size={14} /> Data tersimpan lokal
        </span>
        <button
          className="icon-button"
          onClick={onToggleTheme}
          aria-label={dark ? 'Gunakan mode terang' : 'Gunakan mode gelap'}
          title={dark ? 'Mode terang' : 'Mode gelap'}
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button className="ghost" disabled title="Belum tersedia di prototype beta">
          <Upload size={14} /> Sinkronisasi
        </button>
      </div>
    </header>
  )
}
