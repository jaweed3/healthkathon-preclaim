import { useEffect } from 'react'
import ClaimDetail from './ClaimDetail'
import type { ClaimDetailProps } from './ClaimDetail'

type Props = Omit<ClaimDetailProps, 'onClose'> & {
  onClose: () => void
}

export default function ClaimDetailDrawer({ onClose, ...detailProps }: Props) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.querySelector('.modal-backdrop')) {
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      className="detail-drawer-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <ClaimDetail {...detailProps} onClose={onClose} />
    </div>
  )
}
