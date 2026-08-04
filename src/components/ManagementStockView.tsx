import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'

export function ManagementStockView({ preferredBagId }: { preferredBagId?: string }) {
  const { state, currentUser, isManagement, setManagementStock, getBag } = useApp()
  const [bagId, setBagId] = useState(preferredBagId ?? state.bags[0]?.id ?? '')
  const [stocks, setStocks] = useState<
    Record<string, { quantity: number; parLevel: number; lotNumber: string; expiryDate: string }>
  >({})
  const [witnessId, setWitnessId] = useState('')
  const [notes, setNotes] = useState('')
  const [result, setResult] = useState('')

  const bag = getBag(bagId)

  useEffect(() => {
    if (!bag) return
    const next: typeof stocks = {}
    bag.items.forEach((i) => {
      next[i.id] = {
        quantity: i.quantity,
        parLevel: i.parLevel,
        lotNumber: i.lotNumber,
        expiryDate: i.expiryDate,
      }
    })
    setStocks(next)
    setResult('')
  }, [bagId]) // eslint-disable-line react-hooks/exhaustive-deps

  const update = (itemId: string, patch: Partial<(typeof stocks)[string]>) => {
    setStocks((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], ...patch },
    }))
  }

  const fillToPar = () => {
    if (!bag) return
    setStocks((prev) => {
      const next = { ...prev }
      bag.items.forEach((i) => {
        next[i.id] = {
          ...next[i.id],
          quantity: next[i.id]?.parLevel ?? i.parLevel,
        }
      })
      return next
    })
  }

  const submit = () => {
    if (!currentUser || !isManagement) {
      setResult('Only management can set bag stock levels.')
      return
    }
    const witness = state.staff.find((s) => s.id === witnessId)
    if (!witness || witness.id === currentUser.id) {
      setResult('A different witness is required.')
      return
    }
    if (!bag) return
    setManagementStock(bag.id, stocks, currentUser, witness, notes || undefined)
    setResult(`Stock levels saved for ${bag.code}. Staff administrations will deduct from these counts.`)
    setNotes('')
  }

  if (!isManagement) {
    return (
      <div className="rounded-xl border border-amber/40 bg-amber-soft/50 p-5">
        <h2 className="font-display text-2xl font-bold">Management stock control</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Sign in as a <strong>management</strong> user to set or update medication quantities in each bag.
          Clinical staff can only administer (which deducts) or verify counts — they cannot change stock levels.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-panel p-4">
        <h2 className="font-display text-2xl font-bold">Management stock entry</h2>
        <p className="mb-3 text-sm text-ink-soft/80">
          Set the authoritative on-hand quantity for each medication. When staff administer (e.g. 1 × Midazolam),
          that amount is deducted from this figure. Par level is the full-bag target for restocking.
        </p>
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
            <option value="">Witness…</option>
            {state.staff
              .filter((s) => s.id !== currentUser?.id)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.role === 'management' ? 'Mgmt' : s.grade})
                </option>
              ))}
          </select>
          <button
            type="button"
            onClick={fillToPar}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold hover:border-sea-mid"
          >
            Fill all to par
          </button>
        </div>
      </div>

      {bag && (
        <div className="overflow-hidden rounded-xl border border-line bg-panel">
          <div className="border-b border-line bg-surface px-4 py-3">
            <p className="font-display text-xl font-bold">{bag.code}</p>
            <p className="text-xs text-ink-soft">
              Last stocked:{' '}
              {bag.lastStockedAt
                ? `${new Date(bag.lastStockedAt).toLocaleString()} · ${bag.lastStockedBy}`
                : 'Not yet set by management'}
            </p>
          </div>
          <div className="divide-y divide-line/70">
            {bag.items.map((item) => {
              const row = stocks[item.id]
              if (!row) return null
              return (
                <div key={item.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                  <div>
                    <p className="text-sm font-semibold">
                      {item.name}
                      {item.controlled && (
                        <span className="ml-1 text-[10px] text-cd">CD Sch{item.schedule}</span>
                      )}
                    </p>
                    <p className="text-xs text-ink-soft/70">
                      {item.presentation} · currently {item.quantity} {item.unit} on hand
                    </p>
                  </div>
                  <label className="text-xs">
                    <span className="mb-0.5 block font-semibold uppercase tracking-wide text-ink-soft">
                      On hand
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={row.quantity}
                      onChange={(e) => update(item.id, { quantity: Math.max(0, Number(e.target.value)) })}
                      className="w-24 rounded-lg border border-sea/30 bg-mint/40 px-2 py-1.5 text-center text-sm font-bold"
                    />
                  </label>
                  <label className="text-xs">
                    <span className="mb-0.5 block font-semibold uppercase tracking-wide text-ink-soft">
                      Par level
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={row.parLevel}
                      onChange={(e) => update(item.id, { parLevel: Math.max(0, Number(e.target.value)) })}
                      className="w-24 rounded-lg border border-line bg-surface px-2 py-1.5 text-center text-sm font-semibold"
                    />
                  </label>
                </div>
              )
            })}
          </div>
          <div className="space-y-3 border-t border-line bg-surface p-4">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes — e.g. weekly restock from pharmacy, seal replaced…"
              className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm"
              rows={2}
            />
            <button
              type="button"
              onClick={submit}
              className="rounded-lg bg-sea px-5 py-2.5 text-sm font-bold text-mint hover:bg-sea-mid"
            >
              Save management stock levels
            </button>
            {result && <p className="text-sm font-medium text-ink-soft">{result}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
