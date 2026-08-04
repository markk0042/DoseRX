import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'

export function InventoryCheck({ preferredBagId }: { preferredBagId?: string }) {
  const { state, currentUser, completeStaffCheck, getBag, isManagement } = useApp()
  const [bagId, setBagId] = useState(preferredBagId ?? state.bags[0]?.id ?? '')
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [witnessId, setWitnessId] = useState('')
  const [notes, setNotes] = useState('')
  const [result, setResult] = useState('')

  const bag = getBag(bagId)

  useEffect(() => {
    if (!bag) return
    const next: Record<string, number> = {}
    bag.items.forEach((i) => {
      next[i.id] = i.quantity
    })
    setCounts(next)
    setResult('')
  }, [bagId]) // eslint-disable-line react-hooks/exhaustive-deps

  const mismatches = useMemo(() => {
    if (!bag) return 0
    return bag.items.filter((i) => (counts[i.id] ?? i.quantity) !== i.quantity).length
  }, [bag, counts])

  const submit = () => {
    if (!currentUser) {
      setResult('Sign in as practitioner first.')
      return
    }
    const witness = state.staff.find((s) => s.id === witnessId)
    if (!witness || witness.id === currentUser.id) {
      setResult('A different witness is required for dual verification.')
      return
    }
    if (!bag) return
    completeStaffCheck(bag.id, counts, currentUser, witness, notes || undefined)
    setResult(
      mismatches > 0
        ? `Check recorded with ${mismatches} discrepancy(ies). Live stock was NOT changed — management must investigate / correct.`
        : 'Staff check complete — physical count matches management stock.',
    )
    setNotes('')
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-panel p-4">
        <h2 className="font-display text-2xl font-bold">Staff bag check (verify only)</h2>
        <p className="mb-2 text-sm text-ink-soft/80">
          Compare physical count to the <strong>management stock</strong> on the system. This check does not change
          quantities — administrations deduct stock; only management can set or restock amounts.
        </p>
        {isManagement && (
          <p className="mb-4 rounded-lg bg-amber-soft/60 px-3 py-2 text-xs font-medium text-ink">
            You are signed in as management. Use <strong>Stock Control</strong> to change bag quantities. This screen is
            for verification only.
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <select
            value={bagId}
            onChange={(e) => setBagId(e.target.value)}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          >
            {state.bags.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} — {b.name}
              </option>
            ))}
          </select>
          <select
            value={witnessId}
            onChange={(e) => setWitnessId(e.target.value)}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          >
            <option value="">Select witness…</option>
            {state.staff
              .filter((s) => s.id !== currentUser?.id)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.role === 'management' ? 'Mgmt' : s.grade})
                </option>
              ))}
          </select>
        </div>
      </div>

      {bag && (
        <div className="overflow-hidden rounded-xl border border-line bg-panel">
          <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-3">
            <div>
              <p className="font-display text-xl font-bold">{bag.code}</p>
              <p className="text-xs text-ink-soft">
                System stock set by management · Seal {bag.sealNumber}
              </p>
            </div>
            {mismatches > 0 && (
              <span className="rounded bg-coral-soft px-2 py-1 text-xs font-bold text-coral">
                {mismatches} mismatch{mismatches > 1 ? 'es' : ''}
              </span>
            )}
          </div>
          <div className="divide-y divide-line/70">
            {bag.items.map((item) => {
              const counted = counts[item.id] ?? item.quantity
              const bad = counted !== item.quantity
              return (
                <div
                  key={item.id}
                  className={`flex flex-wrap items-center gap-3 px-4 py-3 ${bad ? 'bg-coral-soft/30' : ''}`}
                >
                  <div className="min-w-[200px] flex-1">
                    <p className="text-sm font-semibold">
                      {item.name}
                      {item.controlled && <span className="ml-1 text-[10px] text-cd">CD Sch{item.schedule}</span>}
                    </p>
                    <p className="text-xs text-ink-soft/70">{item.presentation}</p>
                  </div>
                  <p className="text-xs text-ink-soft">
                    System <span className="font-bold text-sea">{item.quantity}</span> · Par {item.parLevel}
                  </p>
                  <div className="text-xs">
                    <span className="mb-0.5 block font-semibold uppercase text-ink-soft">Physical count</span>
                    <input
                      type="number"
                      min={0}
                      value={counted}
                      onChange={(e) =>
                        setCounts((c) => ({ ...c, [item.id]: Math.max(0, Number(e.target.value)) }))
                      }
                      className={`w-20 rounded-lg border px-2 py-1.5 text-center text-sm font-semibold outline-none ${
                        bad ? 'border-coral bg-panel' : 'border-line bg-surface'
                      }`}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="space-y-3 border-t border-line bg-surface p-4">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional) — e.g. seal intact…"
              className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-sea-mid"
              rows={2}
            />
            <button
              type="button"
              onClick={submit}
              className="rounded-lg bg-sea px-5 py-2.5 text-sm font-bold text-mint hover:bg-sea-mid"
            >
              Complete verification check
            </button>
            {result && <p className="text-sm font-medium text-ink-soft">{result}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
