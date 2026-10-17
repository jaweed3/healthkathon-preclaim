import { useMemo, useState } from 'react'
import {
  CLAIM_STATUS,
  codeOf,
  flagsFor,
  REVIEW_THRESHOLD,
  scoreClaim,
  seed,
  statusFor,
  type AuditEntry,
  type Claim,
} from '@preclaim/core'
import AddClaimModal from './components/AddClaimModal'
import RulesPanel from './components/RulesPanel'
import { appendAudit, readAudit } from './lib/audit-log'
import { readString, writeString } from './lib/storage'
import ClaimDetail from './components/ClaimDetail'
import ClaimList from './components/ClaimList'
import Header from './components/Header'
import Sidebar, { type View } from './components/Sidebar'
import StatsBar from './components/StatsBar'

const THEME_KEY = 'preclaim-theme'

/** Sequential ids in the same shape as the fixtures: CLM-240918-0NN. */
function nextClaimId(claims: Claim[]): string {
  const highest = claims.reduce((max, c) => {
    const n = Number(c.id.split('-')[2])
    return Number.isFinite(n) ? Math.max(max, n) : max
  }, 0)
  return `CLM-240918-${String(highest + 1).padStart(3, '0')}`
}

export default function App() {
  const [claims, setClaims] = useState<Claim[]>(seed)
  const [selected, setSelected] = useState<Claim>(seed[0])
  const [view, setView] = useState<View>('all')
  const [notice, setNotice] = useState('')
  const [note, setNote] = useState('')
  const [dark, setDark] = useState(() => readString(THEME_KEY) === 'dark')

  const [revisionOpen, setRevisionOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [newCode, setNewCode] = useState('47.09')
  const [reason, setReason] = useState('')
  const [evidence, setEvidence] = useState(false)

  // Re-read after each revision so the trail rendered below matches what was persisted.
  const [audit, setAudit] = useState<AuditEntry[]>(() => readAudit())

  const shown = useMemo(() => {
    if (view === 'review') return claims.filter((c) => c.status === CLAIM_STATUS.review)
    if (view === 'risky') return claims.filter((c) => c.score >= REVIEW_THRESHOLD)
    return claims
  }, [claims, view])

  const select = (c: Claim) => {
    setSelected(c)
    setNotice('')
  }

  const toggleTheme = () =>
    setDark((v) => {
      const next = !v
      writeString(THEME_KEY, next ? 'dark' : 'light')
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
    setAudit(readAudit())
    setClaims((cs) => cs.map((c) => (c.id === updated.id ? updated : c)))
    setSelected(updated)
    setRevisionOpen(false)
    setNotice(
      newScore >= 60
        ? 'Kode diperbarui, tetapi kombinasi diagnosis—tindakan tetap berisiko. Kode ditolak.'
        : 'Kode tindakan diperbarui. Risiko turun dan klaim siap dikirim.',
    )
  }

  /**
   * Add a draft claim and check it immediately.
   *
   * The score and flags come from the same rule set the revision flow uses, so
   * a claim cannot enter the list as "clean" just because it was typed in
   * rather than revised.
   */
  const createClaim = (draft: Omit<Claim, 'id' | 'status' | 'score' | 'flags' | 'revisions'>) => {
    const base: Claim = { ...draft, id: '', score: 0, flags: [], status: CLAIM_STATUS.review }
    const score = scoreClaim(base, codeOf(draft.procedure))
    const claim: Claim = {
      ...base,
      id: nextClaimId(claims),
      score,
      status: statusFor(score),
      flags: flagsFor(base, codeOf(draft.procedure)),
    }

    setClaims((cs) => [claim, ...cs])
    setSelected(claim)
    setAddOpen(false)
    setView('all')
    setNotice(
      score >= REVIEW_THRESHOLD
        ? `Klaim ${claim.id} ditambahkan dan ditahan untuk ditinjau.`
        : `Klaim ${claim.id} ditambahkan. Tidak ada temuan aktif.`,
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
        onShowRules={() => setRulesOpen(true)}
        reviewCount={claims.filter((c) => c.status === CLAIM_STATUS.review).length}
      />

      <main>
        <Header view={view} dark={dark} onToggleTheme={toggleTheme} />
        <StatsBar claims={claims} />

        <div className="content">
          <ClaimList
            shown={shown}
            selected={selected}
            onSelect={select}
            view={view}
            onView={setView}
            onAdd={() => setAddOpen(true)}
            total={claims.length}
            atRisk={claims.filter((c) => c.score >= 60).length}
          />

          <ClaimDetail
            claim={selected}
            revisions={audit.find((e) => e.claimId === selected.id)?.revisions ?? []}
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

      {rulesOpen && <RulesPanel onClose={() => setRulesOpen(false)} />}
      {addOpen && <AddClaimModal onCreate={createClaim} onClose={() => setAddOpen(false)} />}
    </div>
  )
}
