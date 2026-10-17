import type { ClaimStatus } from '../types'

const statusClass = (status: ClaimStatus) =>
  status === 'Perlu ditinjau' ? 'warn' : status === 'Disetujui' ? 'done' : 'ready'

export default function StatusBadge({ status }: { status: ClaimStatus }) {
  return <label className={`status ${statusClass(status)}`}>{status}</label>
}

export { statusClass }
