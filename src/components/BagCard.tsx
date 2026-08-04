import { AlertTriangle, Lock, Package, Shield } from 'lucide-react'
import type { DrugBag } from '../types'
import { useApp } from '../context/AppContext'
import { formatRelative } from '../lib/format'
import { GradeBadge, StatusBadge } from './Badges'

export function BagCard({ bag, onOpen }: { bag: DrugBag; onOpen: () => void }) {
  const { isExpired, expiringSoon } = useApp()
  const expired = bag.items.filter(isExpired).length
  const soon = bag.items.filter((i) => !isExpired(i) && expiringSoon(i)).length
  const low = bag.items.filter((i) => i.quantity < i.parLevel || i.quantity === 0).length

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full rounded-xl border border-line bg-panel p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sea-mid/40 hover:shadow-md"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bag.type === 'controlled' ? 'bg-cd text-white' : 'bg-sea text-mint'}`}>
            {bag.type === 'controlled' ? <Lock size={18} /> : <Package size={18} />}
          </div>
          <div>
            <p className="font-display text-lg font-bold leading-tight text-ink">{bag.code}</p>
            <p className="text-sm text-ink-soft/80">{bag.name}</p>
          </div>
        </div>
        <StatusBadge status={bag.status} />
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        <GradeBadge grade={bag.grade} controlled={bag.type === 'controlled'} />
        {bag.assignedVehicle && (
          <span className="rounded bg-surface px-2 py-0.5 text-xs font-medium text-ink-soft">
            {bag.assignedVehicle}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-line/70 pt-3 text-center">
        <div>
          <p className="font-display text-xl font-bold text-sea">{bag.items.length}</p>
          <p className="text-[11px] uppercase tracking-wide text-ink-soft/70">Items</p>
        </div>
        <div>
          <p className="font-display text-xl font-bold text-ink-soft">{bag.sealNumber.slice(-4)}</p>
          <p className="text-[11px] uppercase tracking-wide text-ink-soft/70">Seal</p>
        </div>
        <div>
          <p className="font-display text-xl font-bold text-ink-soft">{formatRelative(bag.lastCheckedAt)}</p>
          <p className="text-[11px] uppercase tracking-wide text-ink-soft/70">Checked</p>
        </div>
      </div>

      {(expired > 0 || soon > 0 || low > 0 || bag.status === 'discrepancy') && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {expired > 0 && (
            <span className="inline-flex items-center gap-1 rounded bg-coral-soft px-2 py-0.5 text-[11px] font-semibold text-coral">
              <AlertTriangle size={12} /> {expired} expired
            </span>
          )}
          {soon > 0 && (
            <span className="inline-flex items-center gap-1 rounded bg-amber-soft px-2 py-0.5 text-[11px] font-semibold text-ink">
              <Shield size={12} /> {soon} expiring
            </span>
          )}
          {low > 0 && (
            <span className="inline-flex items-center gap-1 rounded bg-amber-soft px-2 py-0.5 text-[11px] font-semibold text-ink">
              {low} short
            </span>
          )}
        </div>
      )}
    </button>
  )
}
