import { format } from 'date-fns'
import { ClipboardCheck, ShieldCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { formatRelative } from '../lib/format'
import type { StaffMember, TagStatus } from '../types'
import { GradeBadge, StatusBadge } from './Badges'
import { QuantityAmpoules } from './QuantityAmpoules'
import { WitnessVerify } from './WitnessVerify'

export function InventoryCheck({ preferredBagId }: { preferredBagId?: string }) {
  const { state, currentUser, completeBagAudit, getBag, isManagement } = useApp()
  const [bagId, setBagId] = useState(preferredBagId ?? state.bags[0]?.id ?? '')
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [notes, setNotes] = useState('')
  const [newSeal, setNewSeal] = useState('')
  const [tagStatus, setTagStatus] = useState<TagStatus | ''>('green')
  const [result, setResult] = useState('')
  const [witness, setWitness] = useState<StaffMember | null>(null)

  const bag = getBag(bagId)

  useEffect(() => {
    if (preferredBagId) setBagId(preferredBagId)
  }, [preferredBagId])

  useEffect(() => {
    if (!bag) return
    const next: Record<string, number> = {}
    bag.items.forEach((i) => {
      next[i.id] = i.quantity
    })
    setCounts(next)
    setNewSeal('')
    setTagStatus(bag.tagStatus === 'untagged' ? 'untagged' : bag.tagStatus === 'red' ? 'red' : 'green')
    setWitness(null)
    setResult('')
    setNotes('')
  }, [bagId]) // eslint-disable-line react-hooks/exhaustive-deps

  const mismatches = useMemo(() => {
    if (!bag) return [] as { id: string; name: string; system: number; counted: number }[]
    return bag.items
      .filter((i) => (counts[i.id] ?? i.quantity) !== i.quantity)
      .map((i) => ({
        id: i.id,
        name: i.name,
        system: i.quantity,
        counted: counts[i.id] ?? i.quantity,
      }))
  }, [bag, counts])

  if (!isManagement || !currentUser) {
    return (
      <p className="text-sm text-ink-soft">
        Only management can run bag audits. Staff use QR scan for shift checks and administrations.
      </p>
    )
  }

  const finishAudit = (w: StaffMember) => {
    if (!bag) return
    const ok = completeBagAudit({
      bagId: bag.id,
      auditor: currentUser,
      witness: w,
      counts,
      notes: notes.trim() || undefined,
      newSeal: newSeal.trim() || undefined,
      tagStatus: tagStatus || undefined,
    })
    if (!ok) {
      setResult('Audit failed — check witness and permissions.')
      return
    }
    const when = format(new Date(), 'dd MMM yyyy HH:mm')
    setResult(
      mismatches.length > 0
        ? `Audit finished ${when} with ${mismatches.length} mismatch(es). Last checked updated · discrepancy flagged for investigation.`
        : `Audit complete ${when}. Counts match · bag marked sealed · last checked updated.`,
    )
    setWitness(w)
    setNotes('')
    setNewSeal('')
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-panel p-4">
        <div className="mb-1 flex items-center gap-2">
          <ClipboardCheck className="text-sea" size={22} />
          <h2 className="font-display text-2xl font-bold">Audit bags</h2>
        </div>
        <p className="mb-4 text-sm text-ink-soft/80">
          Management physical audit against system stock. Completing an audit updates{' '}
          <strong>last checked</strong> (date &amp; auditor). Mismatches open a discrepancy case without changing
          live quantities — use Stock Control to correct stock.
        </p>

        <label className="block text-sm">
          <span className="mb-1 block font-semibold">Select bag</span>
          <select
            value={bagId}
            onChange={(e) => setBagId(e.target.value)}
            className="w-full max-w-xl rounded-lg border border-line bg-surface px-3 py-2.5"
          >
            {state.bags.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} — {b.name}
                {b.lastCheckedAt
                  ? ` · last check ${formatRelative(b.lastCheckedAt)}`
                  : ' · never checked'}
              </option>
            ))}
          </select>
        </label>
      </div>

      {bag && (
        <div className="space-y-4 rounded-xl border border-line bg-panel p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-2xl font-bold">{bag.code}</p>
              <p className="text-sm text-ink-soft">{bag.name}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <GradeBadge
                  grade={bag.grade}
                  controlled={bag.type === 'controlled'}
                  event={bag.type === 'event' || !!bag.eventName}
                />
                <StatusBadge status={bag.status} />
              </div>
            </div>
            <div className="rounded-lg bg-surface px-3 py-2 text-right text-sm">
              <p className="text-xs uppercase text-ink-soft">Last checked</p>
              <p className="font-semibold">
                {bag.lastCheckedAt
                  ? format(new Date(bag.lastCheckedAt), 'dd MMM yyyy HH:mm')
                  : 'Never'}
              </p>
              {bag.lastCheckedBy && (
                <p className="text-xs text-ink-soft">{bag.lastCheckedBy}</p>
              )}
              <p className="mt-1 text-xs text-ink-soft">
                Seal <span className="font-mono font-bold text-ink">{bag.sealNumber}</span>
              </p>
            </div>
          </div>

          {mismatches.length > 0 && (
            <div className="rounded-lg border border-coral/30 bg-coral-soft/40 px-3 py-2 text-sm text-coral">
              <strong>{mismatches.length} mismatch{mismatches.length > 1 ? 'es' : ''}</strong>
              {' — '}
              {mismatches.map((m) => `${m.name} (${m.system}→${m.counted})`).join(', ')}
            </div>
          )}

          <div className="grid gap-2.5">
            {bag.items.map((item) => {
              const counted = counts[item.id] ?? item.quantity
              const bad = counted !== item.quantity
              return (
                <div
                  key={item.id}
                  className={`rounded-xl border px-3.5 py-3 ${
                    bad ? 'border-coral/40 bg-coral-soft/20' : 'border-line bg-surface'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {item.name}
                        {item.controlled && (
                          <span className="ml-1.5 text-[10px] font-bold uppercase text-cd">
                            CD Sch {item.schedule}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-ink-soft">{item.presentation}</p>
                      <div className="mt-2">
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-ink-soft">
                          System stock
                        </p>
                        <QuantityAmpoules
                          quantity={item.quantity}
                          parLevel={item.parLevel}
                          unit={item.unit}
                          controlled={item.controlled}
                          size="sm"
                        />
                      </div>
                    </div>
                    <label className="block text-sm">
                      <span className="mb-1 block text-[10px] font-bold uppercase text-ink-soft">
                        Physical count
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={counted}
                        onChange={(e) =>
                          setCounts((c) => ({
                            ...c,
                            [item.id]: Math.max(0, Number(e.target.value)),
                          }))
                        }
                        className={`w-24 rounded-lg border px-2 py-2 text-center text-lg font-bold outline-none ${
                          bad ? 'border-coral bg-panel' : 'border-line bg-panel'
                        }`}
                      />
                      <span className="mt-1 block text-center text-[11px] text-ink-soft">{item.unit}</span>
                    </label>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Tag / seal status after audit</legend>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['green', 'Green sealed'],
                    ['red', 'Red tagged'],
                    ['untagged', 'Untagged'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTagStatus(value)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                      tagStatus === value
                        ? value === 'green'
                          ? 'bg-ok text-white'
                          : value === 'red'
                            ? 'bg-coral text-white'
                            : 'bg-ink text-mint'
                        : 'border border-line bg-surface'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Apply new seal number (optional)</span>
              <input
                value={newSeal}
                onChange={(e) => setNewSeal(e.target.value)}
                placeholder={`Current: ${bag.sealNumber}`}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2"
              />
              <span className="mt-1 block text-xs text-ink-soft">
                Resealing also updates last checked when the audit is completed.
              </span>
            </label>
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Audit notes (optional)"
            rows={2}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          />

          {!witness ? (
            <WitnessVerify
              actor={currentUser}
              onVerified={finishAudit}
              submitLabel="Complete bag audit"
              busyLabel="Saving audit…"
              busyDetail="Updating last checked and audit trail."
            />
          ) : (
            <div className="flex items-start gap-2 rounded-lg bg-ok-soft px-3 py-2 text-sm text-ok">
              <ShieldCheck size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Audit signed with witness {witness.name}</p>
                {result && <p className="mt-0.5 text-ink-soft">{result}</p>}
                <button
                  type="button"
                  onClick={() => {
                    setWitness(null)
                    setResult('')
                  }}
                  className="mt-2 text-xs font-bold text-sea-mid underline"
                >
                  Run another audit on this bag
                </button>
              </div>
            </div>
          )}

          {result && !witness && <p className="text-sm font-medium text-ink-soft">{result}</p>}
        </div>
      )}
    </div>
  )
}
