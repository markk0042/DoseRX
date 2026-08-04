import type { BagStatus } from '../types'

const styles: Record<BagStatus, string> = {
  sealed: 'bg-ok-soft text-ok',
  open: 'bg-amber-soft text-ink-soft',
  check_due: 'bg-amber-soft text-ink',
  discrepancy: 'bg-coral-soft text-coral',
  expired_items: 'bg-coral-soft text-coral',
  on_shift: 'bg-sea/15 text-sea',
}

const labels: Record<BagStatus, string> = {
  sealed: 'Sealed',
  open: 'Open',
  check_due: 'Check due',
  discrepancy: 'Discrepancy',
  expired_items: 'Expired stock',
  on_shift: 'On shift',
}

export function StatusBadge({ status }: { status: BagStatus }) {
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

export function GradeBadge({
  grade,
  controlled,
  event,
}: {
  grade: string
  controlled?: boolean
  event?: boolean
}) {
  if (event) {
    return (
      <span className="inline-flex items-center rounded bg-amber-soft px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-ink">
        Event · {grade === 'AP' ? 'AP' : grade}
      </span>
    )
  }
  if (controlled) {
    return (
      <span className="inline-flex items-center rounded bg-cd-soft px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-cd">
        CD · {grade === 'AP' ? 'AP' : 'P'}
      </span>
    )
  }
  const map: Record<string, string> = {
    EMT: 'bg-mint-deep/60 text-sea',
    Paramedic: 'bg-sea/10 text-sea-mid',
    AP: 'bg-sea text-mint',
  }
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${map[grade] ?? 'bg-line text-ink'}`}>
      {grade === 'AP' ? 'Adv. Paramedic' : grade}
    </span>
  )
}
