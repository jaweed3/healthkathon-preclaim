import { CheckCircle2, ClipboardCheck, PencilLine } from 'lucide-react'
import type { AuditEvent } from '@preclaim/core'
import AuditNote from './AuditNote'
import RecheckPanel from './RecheckPanel'

type Props = { events: AuditEvent[] }

const stamp = (at: string) => new Date(at).toLocaleString('id-ID')

/** Compact, chronological visualisation of the coder's persisted audit events. */
export default function AuditTimeline({ events }: Props) {
  return (
    <ol className="audit-timeline" aria-label="Linimasa audit">
      {events.map((event, index) => {
        const revision = event.kind === 'revision'
        const score = revision ? event.newScore : event.score
        const previousScore = revision ? event.previousScore : undefined
        const unchanged = previousScore !== undefined && previousScore === score

        return (
          <li className="timeline-event" key={`${event.kind}-${event.at}-${index}`}>
            <span className={`timeline-marker ${revision ? 'revision' : 'approval'}`} aria-hidden="true">
              {revision ? <PencilLine size={15} /> : <CheckCircle2 size={15} />}
            </span>
            <article className="timeline-card">
              <header className="timeline-heading">
                <div>
                  <b>{revision ? 'Revisi kode' : 'Persetujuan dengan catatan'}</b>
                  <time dateTime={event.at}>{stamp(event.at)}</time>
                </div>
                <span className={`timeline-score ${unchanged ? 'unchanged' : ''}`}>
                  {revision ? <>{event.previousScore} → {event.newScore}</> : `Risiko ${score}`}
                  {unchanged && <small>Tidak berubah</small>}
                </span>
              </header>

              {revision ? (
                <>
                  <p className="timeline-code-change"><code>{event.from}</code><span aria-hidden="true">→</span><code>{event.to}</code></p>
                  {event.previousFindings && event.newFindings && (
                    <div className="timeline-recheck">
                      <span className="timeline-submarker" aria-hidden="true"><ClipboardCheck size={14} /></span>
                      <RecheckPanel
                        previousScore={event.previousScore}
                        newScore={event.newScore}
                        previousReadiness={event.previousReadiness}
                        newReadiness={event.newReadiness}
                        previousFindings={event.previousFindings}
                        newFindings={event.newFindings}
                      />
                    </div>
                  )}
                  <AuditNote label="Alasan">{event.reason}</AuditNote>
                  <span className={`audit-evidence ${event.evidence ? 'yes' : 'no'}`}>
                    {event.evidence ? 'Evidence diperiksa' : 'Evidence belum dikonfirmasi'}
                  </span>
                </>
              ) : (
                <>
                  <AuditNote label="Catatan">{event.note}</AuditNote>
                  <span className="audit-evidence no">
                    Disetujui dengan {event.findingsAtApproval.length} temuan aktif · skor {event.score}
                  </span>
                </>
              )}
            </article>
          </li>
        )
      })}
    </ol>
  )
}
