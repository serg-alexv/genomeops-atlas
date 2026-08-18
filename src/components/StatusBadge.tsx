import type { EvidenceStatus } from '../types'

export const statusLabels: Record<EvidenceStatus, string> = {
  confirmed: 'confirmed',
  predicted: 'predicted',
  unknown: 'unknown',
  needs_validation: 'needs validation',
}

export function StatusBadge({ status, compact = false }: { status: EvidenceStatus; compact?: boolean }) {
  return (
    <span className={`status-badge status-${status}${compact ? ' is-compact' : ''}`}>
      <span className="status-dot" aria-hidden="true" />
      {statusLabels[status]}
    </span>
  )
}
