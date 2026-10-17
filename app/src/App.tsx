import { useEffect, useMemo, useState } from 'react'
import {
  CLAIM_STATUS,
  REVIEW_THRESHOLD,
  allowedCodes,
  codeOf,
  evaluateAll,
  initialFlags,
  knownDiagnoses,
  readinessFor,
  recomputeRule,
  replaceFlagsForRule,
  scoreFor,
  seed,
  statusFor,
  type AuditEvent,
  type Claim,
} from '@preclaim/core'
import AddClaimModal from './components/AddClaimModal'
import ClaimDetail from './components/ClaimDetail'
import ClaimList from './components/ClaimList'
import Header from './components/Header'
import RulesPanel from './components/RulesPanel'
import Sidebar, { type View } from './components/Sidebar'
import StatsBar from './components/StatsBar'
import { appendEvent, clearAudit, readAudit } from './lib/audit-log'
import { clearClaims, loadClaims, saveClaims } from './lib/claim-store'
import { readString, writeString } from './lib/storage'
import { downloadClaimExport, parseClaimImport } from './lib/claim-transfer'

const THEME_KEY = 'preclaim-theme'
const FIXTURE_DATE = '18 Sep 2026'

/**
 * `18 Sep 2026` → `CLM-240918` (YYMMDD, matching the fixture convention).
 *
 * Falls back to the fixture prefix when the date cannot be parsed, so a
 * malformed date still yields a usable id rather than `CLM-NaN-NaN`.
 */
function idPrefix(claimDate: string): string {
  const months: Record<string, string> = {
    Jan: '01',
    Feb: '02',
    Mar: '03',
    Apr: '04',
    Mei: '05',
    Jun: '06',
    Jul: '07',
    Agu: '08',
    Sep: '09',
    Okt: '10',
    Nov: '11',
    Des: '12',
  }
  const match = claimDate.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/)
  if (!match) return 'CLM-240918'

  const [, day, monthName, year] = match
  const month = months[monthName]
  if (!month) return 'CLM-240918'

  return `CLM-${year.slice(2)}${month}${day.padStart(2, '0')}`
}

function nextClaimId(claims: Claim[], claimDate: string): string {
  const prefix = idPrefix(claimDate)
  const highest = claims.reduce((max, c) => {
    if (!c.id.startsWith(prefix)) return max
    const n = Number(c.id.slice(prefix.length + 1))
    return Number.isFinite(n) ? Math.max(max, n) : max
  }, 0)
  return `${prefix}-${String(highest + 1).padStart(3, '0')}`
}

export default function App() {
  const [claims, setClaims] = useState<Claim[]>(() => loadClaims(seed))
  const [view, setView] = useState<View>('all')
  const [notice, setNotice] = useState('')
  const [note, setNote] = useState('')
  const [dark, setDark] = useState(() => readString(THEME_KEY) === 'dark')

  const [revisionOpen, setRevisionOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [reason, setReason] = useState('')
  const [evidence, setEvidence] = useState(false)

  // Re-read after each decision so the rendered trail matches what was stored.
  const [history, setHistory] = useState<AuditEvent[]>([])

  const [selectedId, setSelectedId] = useState<string>(() => seed[0].id)

  const shown = useMemo(() => {
    if (view === 'review') return claims.filter((c) => c.status === CLAIM_STATUS.review)
    if (view === 'risky') return claims.filter((c) => c.score >= REVIEW_THRESHOLD)
    return claims
  }, [claims, view])

  // Keep the selection inside the visible set, so changing the filter never
  // leaves the detail pane showing a claim the list no longer contains.
  const selected = useMemo(() => {
    const inView = shown.find((c) => c.id === selectedId)
    if (inView) return inView
    return shown[0] ?? claims.find((c) => c.id === selectedId) ?? claims[0]
  }, [shown, claims, selectedId])

  // Re-read the stored history whenever the selection changes.
  useEffect(() => {
    if (!selected) return
    setHistory(readAudit().find((e) => e.claimId === selected.id)?.events ?? [])
  }, [selected?.id, claims])

  // Persist on every change. Debouncing is unnecessary at this size.
  useEffect(() => {
    if (claims.length > 0) saveClaims(claims)
  }, [claims])

  const select = (c: Claim) => {
    setSelectedId(c.id)
    setNotice('')
  }

  const toggleTheme = () =>
    setDark((v) => {
      const next = !v
      writeString(THEME_KEY, next ? 'dark' : 'light')
      return next
    })

  const record = (updated: Claim, event: AuditEvent) => {
    appendEvent(updated, event)
    setHistory(readAudit().find((e) => e.claimId === updated.id)?.events ?? [])
  }

  /**
   * Revise the procedure code.
   *
   * Only the diagnosis↔tindakan rule is re-run. Its inputs are the only ones
   * that changed, so every other rule's findings — notably claim-to-claim
   * similarity — are left exactly as they were. Score and status follow from
   * the resulting flags, never from an assumption about the outcome.
   */
  const correct = (input: { code: string; reason: string; evidence: boolean }) => {
    if (!selected) return
    const code = input.code.trim()

    const withCode: Claim = { ...selected, procedure: code }
    const dxFlags = initialFlags(withCode, claims).filter((f) => f.ruleId === 'dx-procedure')
    const flags = replaceFlagsForRule(selected.flags, 'dx-procedure', dxFlags)
    const score = scoreFor(flags)

    const updated: Claim = {
      ...withCode,
      flags,
      score,
      readiness: readinessFor(flags),
      status: statusFor(score, flags),
    }

    record(updated, {
      kind: 'revision',
      at: new Date().toISOString(),
      from: selected.procedure,
      to: code,
      reason: input.reason.trim(),
      evidence: input.evidence,
      previousScore: selected.score,
      newScore: score,
      previousReadiness: selected.readiness,
      newReadiness: readinessFor(flags),
      previousFindings: selected.flags,
      newFindings: flags,
    })

    setClaims((cs) => cs.map((c) => (c.id === updated.id ? updated : c)))
    setRevisionOpen(false)

    const stillFlagged = flags.some((f) => f.ruleId !== 'dx-procedure')
    setNotice(
      score >= REVIEW_THRESHOLD
        ? 'Kode diperbarui. Kombinasi diagnosis–tindakan masih perlu ditinjau.'
        : stillFlagged
          ? 'Kode diperbarui. Temuan lain pada klaim ini masih aktif.'
          : 'Kode tindakan diperbarui. Tidak ada temuan aktif.',
    )
  }

  /**
   * Approve with a written justification.
   *
   * The note is mandatory: approving a claim that still carries findings is
   * precisely the decision an audit exists to explain later, so it cannot be
   * made silently. The findings being overridden are recorded alongside it.
   */
  const approve = () => {
    if (!selected) return
    if (!note.trim()) {
      setNotice('Tulis alasan persetujuan sebelum melanjutkan.')
      return
    }

    const updated: Claim = {
      ...selected,
      status: CLAIM_STATUS.approvedWithNote,
    }

    record(updated, {
      kind: 'approval',
      at: new Date().toISOString(),
      note: note.trim(),
      score: selected.score,
      findingsAtApproval: selected.flags,
    })

    setClaims((cs) => cs.map((c) => (c.id === updated.id ? updated : c)))
    setNote('')
    setNotice('Klaim disetujui dengan catatan. Keputusan tercatat di riwayat.')
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

  /**
   * Add a draft claim and check it immediately.
   *
   * Scored by the same rules as everything else, so a claim cannot enter as
   * clean just because it was typed in rather than revised.
   */
  const createClaim = (draft: Omit<Claim, 'id' | 'status' | 'score' | 'readiness' | 'flags' | 'history'>) => {
    // Score the draft as a provisional claim so the rules can run against it.
    const provisional = { ...draft, id: '', score: 0, readiness: 0, status: CLAIM_STATUS.review, flags: [] } as Claim
    const flags = initialFlags(provisional, claims)
    const score = scoreFor(flags)
    const claim: Claim = {
      ...draft,
      id: nextClaimId(claims, draft.date),
      flags,
      score,
      readiness: readinessFor(flags),
      status: statusFor(score, flags),
    }

    // Similarity is a whole-set rule, so adding a claim can change existing
    // claims' findings too.
    setClaims((cs) => evaluateAll([claim, ...cs]))
    setSelectedId(claim.id)
    setAddOpen(false)
    setView('all')
    setNotice(
      score >= REVIEW_THRESHOLD
        ? `Klaim ${claim.id} ditambahkan dan ditahan untuk ditinjau.`
        : `Klaim ${claim.id} ditambahkan. Tidak ada temuan aktif.`,
    )
  }

  /** Restore the fixture and discard everything stored. */
  const resetDemo = () => {
    clearClaims()
    clearAudit()
    const fresh = evaluateAll(seed)
    setClaims(fresh)
    setSelectedId(fresh[0].id)
    setView('all')
    setNote('')
    setNotice('Data demo dipulihkan ke kondisi awal.')
  }

  const importClaims = async (file: File) => {
    try {
      const imported = parseClaimImport(JSON.parse(await file.text()))
      const next = evaluateAll(imported)
      setClaims(next)
      setSelectedId(next[0]?.id ?? '')
      setView('all')
      setNotice(`${next.length} klaim berhasil diimpor.`)
    } catch {
      setNotice('Impor gagal: file harus berisi JSON klaim PreClaim yang valid.')
    }
  }

  const reviewCount = claims.filter((c) => c.status === CLAIM_STATUS.review).length
  const atRisk = claims.filter((c) => c.score >= REVIEW_THRESHOLD).length

  return (
    <div className={`shell ${dark ? 'theme-dark' : ''}`}>
      {mobileNavOpen && <button className="mobile-nav-backdrop" aria-label="Tutup navigasi" onClick={() => setMobileNavOpen(false)} />}
      <Sidebar
        view={view}
        onView={setView}
        onShowRules={() => setRulesOpen(true)}
        reviewCount={reviewCount}
        riskCount={atRisk}
        className={mobileNavOpen ? 'mobile-nav-open' : ''}
        onNavigate={() => setMobileNavOpen(false)}
      />

      <main>
        <Header
          view={view}
          dark={dark}
          onToggleTheme={toggleTheme}
          onReset={resetDemo}
          onImport={importClaims}
          onExport={() => downloadClaimExport(claims)}
          menuOpen={mobileNavOpen}
          onToggleMenu={() => setMobileNavOpen((open) => !open)}
        />
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
            atRisk={atRisk}
          />

          {selected && (
            <ClaimDetail
              claim={selected}
              history={history}
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
              dark={dark}
            />
          )}
        </div>
      </main>

      {rulesOpen && <RulesPanel dark={dark} onClose={() => setRulesOpen(false)} />}
      {addOpen && (
        <AddClaimModal
          knownDiagnoses={knownDiagnoses()}
          allowedFor={(d) => allowedCodes(codeOf(d))}
          onCreate={createClaim}
          onClose={() => setAddOpen(false)}
          dark={dark}
        />
      )}
    </div>
  )
}

export { idPrefix, nextClaimId }
