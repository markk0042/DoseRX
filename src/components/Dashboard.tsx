import { AlertTriangle, CheckCircle2, Lock, Package, Timer } from 'lucide-react'
import { useApp } from '../context/AppContext'
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
  const allItems = bags.flatMap((b) => b.items)
  const expired = allItems.filter(isExpired).length
  const soon = allItems.filter((i) => !isExpired(i) && expiringSoon(i)).length
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
        <Stat icon={Package} label="Total bags" value={String(bags.length)} sub="10 drug bags in fleet" />
        <Stat icon={Lock} label="Controlled drug pouches" value={String(cdBags.length)} sub="Paramedic + AP CDs" accent="cd" />
        <Stat icon={Timer} label="Expiring ≤90 days" value={String(soon)} sub={`${expired} already expired`} accent="amber" />
        <Stat icon={AlertTriangle} label="Attention needed" value={String(due.length)} sub="Checks & discrepancies" accent="coral" />
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
            <h2 className="mb-1 font-display text-xl font-bold text-cd">Controlled drugs</h2>
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
                <p className="mb-2 text-xs text-ink-soft/70">{gradeBags.length} bags · {gradeBags[0]?.items.length ?? 0} meds each</p>
                <ul className="space-y-1">
                  {gradeBags.map((b) => (
                    <li key={b.id}>
                      <button type="button" onClick={() => onOpenBag(b.id)} className="text-sm font-medium text-sea-mid hover:underline">
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
  accent?: 'cd' | 'amber' | 'coral'
}) {
  const ring =
    accent === 'cd'
      ? 'border-cd/25 bg-cd-soft/30'
      : accent === 'amber'
        ? 'border-amber/30 bg-amber-soft/40'
        : accent === 'coral'
          ? 'border-coral/25 bg-coral-soft/40'
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
