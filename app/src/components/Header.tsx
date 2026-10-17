import { Download, Menu, Moon, RotateCcw, ShieldCheck, Sun, Upload, X } from 'lucide-react'
import type { View } from './Sidebar'

type Props = {
  view: View
  dark: boolean
  onToggleTheme: () => void
  onReset: () => void
  onImport: (file: File) => void
  onExport: () => void
  menuOpen: boolean
  onToggleMenu: () => void
}

const TITLES: Record<View, string> = {
  all: 'Ikhtisar klaim',
  review: 'Klaim perlu ditinjau',
  risky: 'Klaim berisiko tinggi',
}

export default function Header({ view, dark, onToggleTheme, onReset, onImport, onExport, menuOpen, onToggleMenu }: Props) {
  return (
    <header>
      <button
        className="mobile-menu-toggle icon-button"
        aria-label={menuOpen ? 'Tutup navigasi' : 'Buka navigasi'}
        aria-expanded={menuOpen}
        aria-controls="mobile-navigation"
        onClick={onToggleMenu}
      >
        {menuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
      <div>
        <p className="eyebrow">RABU, 18 SEPTEMBER 2026</p>
        <h1>{TITLES[view]}</h1>
        <p className="sub">Periksa sebelum dikirim. Pahami sebelum memutuskan.</p>
      </div>
      <div className="header-actions">
        <label className="ghost import-button" title="Impor klaim JSON">
          <Upload size={14} /> Impor
          <input
            type="file"
            accept="application/json,.json"
            aria-label="Impor klaim JSON"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0]
              if (file) onImport(file)
              event.currentTarget.value = ''
            }}
          />
        </label>
        <button className="ghost" onClick={onExport} title="Ekspor klaim sebagai JSON">
          <Download size={14} /> Ekspor
        </button>
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
        <button className="ghost" onClick={onReset} title="Kembalikan ke data demo awal">
          <RotateCcw size={14} /> Reset demo
        </button>
      </div>
    </header>
  )
}
