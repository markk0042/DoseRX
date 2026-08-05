import { AlertTriangle, CheckCircle2, Lock, Package, Syringe, Timer, Users } from 'lucide-react'
import { useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { buildOversightAlerts } from '../lib/oversightAlerts'
import { BagCard } from './BagCard'
import type { View } from './Shell'

export function Dashboard({
  onOpenBag,
  setView,
}: {
  onOpenBag: (id: string) => void
  setView: (v: View) => void
}) {
  const { state, isExpired, expiringSoon } = useApp()
  const bags = state.bags
  const cdBags = bags.filter((b) => b.type === 'controlled')
  const standard = bags.filter((b) => b.type === 'standard')
  const alerts = useMemo(
    () => buildOversightAlerts(state, { isExpired, expiringSoon }),
    [state, isExpired, expiringSoon],
  )
  const onShiftBags = bags.filter((b) => b.status === 'on_shift')
  const due = bags.filter((b) => b.status === 'check_due' || b.status === 'discrepancy')

  const byGrade = {
    EMT: bags.filter((b) => b.grade === 'EMT' && b.type === 'standard').length,
    Paramedic: bags.filter((b) => b.grade === 'Paramedic' && b.type === 'standard').length,
    AP: bags.filter((b) => b.grade === 'AP' && b.type === 'standard').length,
    CD: cdBags.length,
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={Users}
          label="On shift"
          value={String(alerts.onShift)}
          sub="Bags currently signed out"
          accent="sea"
        />
        <Stat
          icon={Package}
          label="Total bags"
          value={String(bags.length)}
          sub={`${standard.length} standard · ${cdBags.length} CD`}
        />
        <Stat
          icon={Timer}
          label="Expiring ≤90 days"
          value={String(alerts.expiringSoonMedications)}
          sub={`${alerts.expiredMedications} already expired`}
          accent="amber"
        />
        <Stat
          icon={AlertTriangle}
          label="Active alerts"
          value={String(alerts.total)}
          sub="Reviews, discrepancies, expiry, waste"
          accent="coral"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-line bg-panel p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-display text-2xl font-bold">Bags on shift</h2>
            <button
              type="button"
              onClick={() => setView('map')}
              className="text-sm font-semibold text-sea-mid hover:underline"
            >
              Live map
            </button>
          </div>
          {onShiftBags.length === 0 ? (
            <p className="rounded-lg bg-surface px-3 py-4 text-sm text-ink-soft">No bags signed out right now.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {onShiftBags.map((b) => {
                const shift = state.shifts.find((s) => s.bagId === b.id && s.active)
                return (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => onOpenBag(b.id)}
                      className="flex w-full items-center justify-between rounded-lg border border-line bg-surface px-3 py-2.5 text-left text-sm hover:border-sea-mid"
                    >
                      <div>
                        <p className="font-semibold">{b.code}</p>
                        <p className="text-xs text-ink-soft">{shift?.holderName ?? 'On shift'}</p>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wide text-sea">Out</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-coral/20 bg-coral-soft/30 p-4">
          <h2 className="mb-1 font-display text-xl font-bold text-coral">Alerts</h2>
          <p className="mb-3 text-xs text-ink-soft">Exceptions only — not bags on shift</p>
          {alerts.total === 0 ? (
            <div className="flex items-center gap-2 rounded-lg bg-ok-soft px-3 py-3 text-sm text-ok">
              <CheckCircle2 size={16} /> No active alerts
            </div>
          ) : (
            <ul className="space-y-2 text-sm">
              {alerts.openDiscrepancies > 0 && (
                <AlertRow
                  label="Open discrepancies"
                  count={alerts.openDiscrepancies}
                  onClick={() => setView('discrepancies')}
                />
              )}
              {alerts.bagReviewsDue > 0 && (
                <AlertRow label="Bag reviews due" count={alerts.bagReviewsDue} onClick={() => setView('check')} />
              )}
              {alerts.bagsWithDiscrepancyStatus > 0 && (
                <AlertRow
                  label="Bags flagged discrepancy"
                  count={alerts.bagsWithDiscrepancyStatus}
                  onClick={() => setView('bags')}
                />
              )}
              {alerts.expiredMedications > 0 && (
                <AlertRow
                  label="Expired medications"
                  count={alerts.expiredMedications}
                  onClick={() => setView('stock')}
                />
              )}
              {alerts.expiringSoonMedications > 0 && (
                <AlertRow
                  label="Expiring ≤90 days"
                  count={alerts.expiringSoonMedications}
                  onClick={() => setView('stock')}
                />
              )}
              {alerts.recentWastes > 0 && (
                <AlertRow
                  label="Waste / part-dose (24h)"
                  count={alerts.recentWastes}
                  onClick={() => setView('activity')}
                  icon
                />
              )}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-line bg-panel p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold">Bag fleet</h2>
            <button type="button" onClick={() => setView('bags')} className="text-sm font-semibold text-sea-mid hover:underline">
              View all
            </button>
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            {Object.entries(byGrade).map(([k, v]) => (
              <span key={k} className="rounded-lg bg-surface px-3 py-1.5 text-sm">
                <span className="font-display text-lg font-bold text-sea">{v}</span>{' '}
                <span className="text-ink-soft/70">{k}</span>
              </span>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {bags.slice(0, 4).map((bag) => (
              <BagCard key={bag.id} bag={bag} onOpen={() => onOpenBag(bag.id)} />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-panel p-4">
            <h2 className="mb-3 font-display text-2xl font-bold">Needs attention</h2>
            {due.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg bg-ok-soft px-3 py-3 text-sm text-ok">
                <CheckCircle2 size={16} /> All bags within check window
              </div>
            ) : (
              <ul className="space-y-2">
                {due.map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => onOpenBag(b.id)}
                      className="flex w-full items-center justify-between rounded-lg border border-line bg-surface px-3 py-2 text-left text-sm hover:border-sea-mid"
                    >
                      <span className="font-semibold">{b.code}</span>
                      <span className="text-xs text-coral">{b.status.replace('_', ' ')}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-cd/20 bg-cd-soft/40 p-4">
            <div className="mb-1 flex items-center gap-2">
              <Lock size={16} className="text-cd" />
              <h2 className="font-display text-xl font-bold text-cd">Controlled drugs</h2>
            </div>
            <p className="mb-3 text-xs text-ink-soft/80">
              Midazolam (P & AP) · Morphine, Fentanyl, Ketamine, Diazepam, Lorazepam (AP)
            </p>
            <div className="space-y-2">
              {cdBags.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onOpenBag(b.id)}
                  className="flex w-full items-center justify-between rounded-lg bg-panel px-3 py-2.5 text-sm shadow-sm"
                >
                  <span className="font-semibold">{b.code}</span>
                  <span className="text-xs text-ink-soft">{b.items.reduce((s, i) => s + i.quantity, 0)} units</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setView('cds')}
              className="mt-3 text-sm font-semibold text-cd hover:underline"
            >
              Open CD register →
            </button>
          </div>

          <div className="rounded-xl border border-line bg-panel p-4">
            <h2 className="mb-2 font-display text-xl font-bold">Recent activity</h2>
            {state.activities.length === 0 ? (
              <p className="text-sm text-ink-soft/70">No activity yet — run a bag check to start the audit trail.</p>
            ) : (
              <ul className="space-y-2">
                {state.activities.slice(0, 5).map((a) => (
                  <li key={a.id} className="border-b border-line/60 pb-2 text-sm last:border-0">
                    <p className="font-semibold">{a.type.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-ink-soft/70">
                      {a.bagCode} · {a.practitionerName}
                      {a.medicationName ? ` · ${a.medicationName}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-panel p-4">
        <h2 className="mb-1 font-display text-2xl font-bold">Standard bags by grade</h2>
        <p className="mb-4 text-sm text-ink-soft/70">Stocked to PHECC 2026 formulary for each clinical level</p>
        <div className="grid gap-3 md:grid-cols-3">
          {(['EMT', 'Paramedic', 'AP'] as const).map((grade) => {
            const gradeBags = standard.filter((b) => b.grade === grade)
            return (
              <div key={grade} className="rounded-lg border border-line bg-surface p-3">
                <p className="font-display text-lg font-bold">
                  {grade === 'AP' ? 'Advanced Paramedic' : grade}
                </p>
                <p className="mb-2 text-xs text-ink-soft/70">
                  {gradeBags.length} bags · {gradeBags[0]?.items.length ?? 0} meds each
                </p>
                <ul className="space-y-1">
                  {gradeBags.map((b) => (
                    <li key={b.id}>
                      <button
                        type="button"
                        onClick={() => onOpenBag(b.id)}
                        className="text-sm font-medium text-sea-mid hover:underline"
                      >
                        {b.code}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function AlertRow({
  label,
  count,
  onClick,
  icon,
}: {
  label: string
  count: number
  onClick: () => void
  icon?: boolean
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center justify-between rounded-lg border border-coral/20 bg-panel px-3 py-2 text-left hover:border-coral/40"
      >
        <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
          {icon ? <Syringe size={14} className="text-coral" /> : <AlertTriangle size={14} className="text-coral" />}
          {label}
        </span>
        <span className="font-display text-lg font-bold text-coral">{count}</span>
      </button>
    </li>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: typeof Package
  label: string
  value: string
  sub: string
  accent?: 'cd' | 'amber' | 'coral' | 'sea'
}) {
  const ring =
    accent === 'cd'
      ? 'border-cd/25 bg-cd-soft/30'
      : accent === 'amber'
        ? 'border-amber/30 bg-amber-soft/40'
        : accent === 'coral'
          ? 'border-coral/25 bg-coral-soft/40'
          : accent === 'sea'
            ? 'border-sea/20 bg-mint/50'
            : 'border-line bg-panel'
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${ring}`}>
      <div className="mb-2 flex items-center gap-2 text-ink-soft">
        <Icon size={16} />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="font-display text-4xl font-extrabold text-ink">{value}</p>
      <p className="text-xs text-ink-soft/70">{sub}</p>
    </div>
  )
}
