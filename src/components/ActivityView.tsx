import { format } from 'date-fns'
import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import type { ActivityType } from '../types'

const typeLabels: Record<ActivityType, string> = {
  inventory_check: 'Staff check',
  bag_audit: 'Bag audit',
  management_stock: 'Management stock',
  seal_check: 'Seal / reseal',
  administration: 'Administration',
  waste: 'Waste',
  restock: 'Restock',
  transfer: 'Transfer',
  cd_sign_out: 'CD sign-out',
  cd_sign_in: 'CD sign-in',
  discrepancy: 'Discrepancy',
  discrepancy_resolved: 'Discrepancy resolved',
  shift_sign_out: 'Shift sign-out',
  shift_return: 'Shift return',
  sync: 'Sync',
  event_pack_created: 'Event pack',
  part_dose: 'Part-dose',
  bag_renamed: 'Bag renamed',
}

export function ActivityView() {
  const { state } = useApp()
  const [filter, setFilter] = useState<'all' | ActivityType>('all')

  const rows = useMemo(() => {
    return state.activities.filter((a) => {
      if (a.type === 'event_pack_created') return false
      return filter === 'all' ? true : a.type === filter
    })
  }, [state.activities, filter])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} label="All" />
        {(
          [
            'shift_sign_out',
            'shift_return',
            'bag_audit',
            'management_stock',
            'inventory_check',
            'administration',
            'part_dose',
            'waste',
            'discrepancy',
            'restock',
            'seal_check',
          ] as ActivityType[]
        ).map((t) => (
          <FilterChip key={t} active={filter === t} onClick={() => setFilter(t)} label={typeLabels[t]} />
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-panel">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-ink-soft/70">
            Activity log is empty. Complete a bag check, administration, or CD movement to build the audit trail.
          </p>
        ) : (
          <ul className="divide-y divide-line/70">
            {rows.map((a) => (
              <li key={a.id} className="flex flex-wrap items-start gap-4 px-4 py-3">
                <div className="w-28 shrink-0 text-xs text-ink-soft">
                  {format(new Date(a.timestamp), 'dd MMM yyyy')}
                  <br />
                  {format(new Date(a.timestamp), 'HH:mm:ss')}
                </div>
                <div className="min-w-[140px]">
                  <span
                    className={`inline-flex rounded px-2 py-0.5 text-xs font-bold uppercase ${
                      a.discrepancy || a.type === 'waste'
                        ? 'bg-coral-soft text-coral'
                        : a.type === 'administration'
                          ? 'bg-sea/10 text-sea'
                          : 'bg-surface text-ink-soft'
                    }`}
                  >
                    {typeLabels[a.type]}
                  </span>
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-semibold">
                    {a.bagCode}
                    {a.medicationName ? ` · ${a.medicationName}` : ''}
                    {a.quantity != null ? ` × ${a.quantity}` : ''}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {a.practitionerName}
                    {a.witnessName ? ` · Witness: ${a.witnessName}` : ''}
                    {a.patientRef ? ` · ${a.patientRef}` : ''}
                  </p>
                  {a.notes && <p className="mt-0.5 text-xs text-ink-soft/80">{a.notes}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
        active ? 'bg-sea text-mint' : 'border border-line bg-panel text-ink-soft'
      }`}
    >
      {label}
    </button>
  )
}
