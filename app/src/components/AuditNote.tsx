type Props = {
  label: string
  children: string
}

/** A clearly attributed, consistently spaced note in the claim audit trail. */
export default function AuditNote({ label, children }: Props) {
  return (
    <div className="audit-note">
      <b>{label}</b>
      <p>{children}</p>
    </div>
  )
}
