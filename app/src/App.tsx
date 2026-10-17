import { useMemo, useState } from 'react'
import { CLAIM_STATUS, codeOf, flagsFor, scoreClaim, seed, statusFor, type Claim } from '@preclaim/core'
import { appendAudit } from './audit'
import ClaimDetail from './components/ClaimDetail'
import ClaimList from './components/ClaimList'
import Header from './components/Header'
import Sidebar, { type View } from './components/Sidebar'
import StatsBar from './components/StatsBar'

const THEME_KEY = 'preclaim-theme'

export default function App() {
  const [claims, setClaims] = useState<Claim[]>(seed)
  const [selected, setSelected] = useState<Claim>(seed[0])
  const [view, setView] = useState<View>('all')
  const [notice, setNotice] = useState('')
  const [note, setNote] = useState('')
  const [dark, setDark] = useState(() => localStorage.getItem(THEME_KEY) === 'dark')

  const [revisionOpen, setRevisionOpen] = useState(false)
  const [newCode, setNewCode] = useState('47.09')
  const [reason, setReason] = useState('')
  const [evidence, setEvidence] = useState(false)

  const shown = useMemo(
    () => (view === 'review' ? claims.filter((c) => c.status === CLAIM_STATUS.review) : claims),
    [claims, view],
  )

  const select = (c: Claim) => {
    setSelected(c)
    setNotice('')
  }

  const toggleTheme = () =>
    setDark((v) => {
      const next = !v
      localStorage.setItem(THEME_KEY, next ? 'dark' : 'light')
      return next
    })

  /**
   * Apply a procedure-code revision and record why.
   *
   * The score is derived from the diagnosis/procedure rule set rather than
   * assumed, so an implausible code leaves the claim in review instead of
   * silently clearing it. The justification is persisted to the audit log.
   */
  const correct = (input: { code: string; reason: string; evidence: boolean }) => {
    const code = input.code.trim()
    const newScore = scoreClaim(selected, code)

    const updated: Claim = {
      ...selected,
      procedure: code,
      score: newScore,
      status: statusFor(newScore),
      flags: flagsFor(selected, code),
      revisions: [
        ...(selected.revisions ?? []),
        {
          at: new Date().toISOString(),
          from: selected.procedure,
          to: code,
          reason: input.reason.trim(),
          evidence: input.evidence,
          previousScore: selected.score,
          newScore,
        },
      ],
    }

    appendAudit(updated)
    setClaims((cs) => cs.map((c) => (c.id === updated.id ? updated : c)))
    setSelected(updated)
    setRevisionOpen(false)
    setNotice(
      newScore >= 60
        ? 'Kode diperbarui, tetapi kombinasi diagnosis—tindakan tetap berisiko. Kode ditolak.'
        : 'Kode tindakan diperbarui. Risiko turun dan klaim siap dikirim.',
    )
  }

  const approve = () => {
    const updated: Claim = { ...selected, status: CLAIM_STATUS.approved }
    setClaims((cs) => cs.map((c) => (c.id === updated.id ? updated : c)))
    setSelected(updated)
    setNotice('Klaim disetujui dengan catatan koder.')
  }

  const startRevision = () => {
    setNewCode(codeOf(selected.procedure))
    setReason('')
    setEvidence(false)
    setRevisionOpen(true)
    setNotice('')
  }

  const confirmRevision = () => {
    if (!newCode.trim() || !reason.trim() || !evidence) {
      setNotice('Lengkapi kode koreksi, alasan, dan evidence sebelum mengonfirmasi revisi.')
      return
    }
    correct({ code: newCode, reason, evidence })
  }

  return (
    <div className={`shell ${dark ? 'theme-dark' : ''}`}>
      <Sidebar
        view={view}
        onView={setView}
        reviewCount={claims.filter((c) => c.status === CLAIM_STATUS.review).length}
        totalCount={claims.length}
      />

      <main>
        <Header view={view} dark={dark} onToggleTheme={toggleTheme} />
        <StatsBar claims={claims} />

        <div className="content">
          <ClaimList
            shown={shown}
            selected={selected}
            onSelect={select}
            onShowReview={() => setView('review')}
            total={claims.length}
            atRisk={claims.filter((c) => c.score >= 60).length}
          />

          <ClaimDetail
            claim={selected}
            notice={notice}
            note={note}
            onNote={setNote}
            revisionOpen={revisionOpen}
            code={newCode}
            onCode={setNewCode}
            reason={reason}
            onReason={setReason}
            evidence={evidence}
            onEvidence={setEvidence}
            onStartRevision={startRevision}
            onConfirmRevision={confirmRevision}
            onCloseRevision={() => setRevisionOpen(false)}
            onApprove={approve}
          />
        </div>
      </main>
    </div>
  )
}
