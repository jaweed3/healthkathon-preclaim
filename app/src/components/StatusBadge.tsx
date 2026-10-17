import { CLAIM_STATUS, type ClaimStatus } from '@preclaim/core'

const statusClass = (status: ClaimStatus) =>
  status === CLAIM_STATUS.review ? 'warn' : status === CLAIM_STATUS.approved ? 'done' : 'ready'

export default function StatusBadge({ status }: { status: ClaimStatus }) {
  return <label className={`status ${statusClass(status)}`}>{status}</label>
}

export { statusClass }
