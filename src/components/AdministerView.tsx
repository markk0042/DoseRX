import { useEffect, useMemo, useState } from 'react'
import { getAdminOptions, WASTE_REASONS } from '../data/adminOptions'
import { useApp } from '../context/AppContext'
import type { StaffMember } from '../types'
import { WitnessVerify } from './WitnessVerify'

export function AdministerView({ preferredBagId }: { preferredBagId?: string }) {
  const { state, currentUser, recordAdministration, recordWaste, getBag } = useApp()
  const usableBags = state.bags.filter((b) => {
    if (!currentUser) return true
    if (b.type === 'controlled') {
      if (currentUser.grade === 'EMT') return false
      if (b.grade === 'AP' && currentUser.grade !== 'AP') return false
    }
    return true
  })

  const [bagId, setBagId] = useState(preferredBagId ?? usableBags[0]?.id ?? '')
  const [itemId, setItemId] = useState('')
  const [qty, setQty] = useState(1)
  const [patientRef, setPatientRef] = useState('')
  const [dose, setDose] = useState('')
  const [route, setRoute] = useState('')
  const [indication, setIndication] = useState('')
  const [wasteReason, setWasteReason] = useState('')
  const [extraNotes, setExtraNotes] = useState('')
  const [mode, setMode] = useState<'admin' | 'waste'>('admin')
  const [witness, setWitness] = useState<StaffMember | null>(null)
  const [msg, setMsg] = useState('')

  const bag = getBag(bagId)
  const items = bag?.items.filter((i) => i.quantity > 0) ?? []
  const selected = items.find((i) => i.id === itemId) ?? items[0]
  const needsWitness = mode === 'waste' || !!selected?.controlled

  const options = useMemo(
    () => getAdminOptions(selected?.medicationId ?? ''),
    [selected?.medicationId],
  )

  useEffect(() => {
    setItemId(items[0]?.id ?? '')
    setWitness(null)
  }, [bagId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setDose(options.doses[0] ?? '')
    setRoute(options.routes[0] ?? '')
    setIndication(options.indications[0] ?? '')
    setWitness(null)
  }, [selected?.medicationId, options, mode])

  const buildAdminNotes = () =>
    [`Dose: ${dose}`, `Route: ${route}`, `Indication: ${indication}`, extraNotes && `Notes: ${extraNotes}`]
      .filter(Boolean)
      .join(' · ')

  const submit = () => {
    if (!currentUser || !bag || !selected) {
      setMsg('Sign in and select bag + medication.')
      return
    }
    if (needsWitness && !witness) {
      setMsg('Select witness and verify their PIN first.')
      return
    }
    if (qty > selected.quantity) {
      setMsg(`Only ${selected.quantity} ${selected.unit} on hand.`)
      return
    }

    if (mode === 'waste') {
      if (!wasteReason) {
        setMsg('Select a waste reason.')
        return
      }
      const note = [wasteReason, extraNotes].filter(Boolean).join(' · ')
      recordWaste(bag.id, selected.id, qty, currentUser, witness!, note)
      setMsg(
        `Wasted ${qty} ${selected.unit} of ${selected.name}. Bag stock: ${selected.quantity} → ${selected.quantity - qty}.`,
      )
    } else {
      if (!patientRef.trim()) {
        setMsg('Patient / PCR reference required.')
        return
      }
      if (!dose || !route || !indication) {
        setMsg('Select dose, route and indication.')
        return
      }
      recordAdministration(
        bag.id,
        selected.id,
        qty,
        currentUser,
        witness,
        patientRef,
        buildAdminNotes(),
      )
      setMsg(
        `Administered ${qty} ${selected.unit} of ${selected.name}. Bag stock: ${selected.quantity} → ${selected.quantity - qty}.`,
      )
    }
    setExtraNotes('')
    setPatientRef('')
    setQty(1)
    setWasteReason('')
    setWitness(null)
  }

  if (!currentUser) {
    return <p className="text-sm text-ink-soft">Sign in to administer medications.</p>
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="rounded-xl border border-line bg-panel p-5">
        <h2 className="font-display text-2xl font-bold">Administer / waste</h2>
        <p className="mb-4 text-sm text-ink-soft/80">
          Logged in as <strong>{currentUser.name}</strong>. Deducts from management stock. Waste and controlled drugs
          need a witness (name + their PIN).
        </p>

        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setMode('admin')}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${mode === 'admin' ? 'bg-sea text-mint' : 'border border-line'}`}
          >
            Administer
          </button>
          <button
            type="button"
            onClick={() => setMode('waste')}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${mode === 'waste' ? 'bg-coral text-white' : 'border border-line'}`}
          >
            Waste
          </button>
        </div>

        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">Drug bag</span>
            <select
              value={bagId}
              onChange={(e) => setBagId(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2"
            >
              {usableBags.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} {b.type === 'controlled' ? '(CD)' : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-semibold">Medication</span>
            <select
              value={selected?.id ?? ''}
              onChange={(e) => setItemId(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2"
            >
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} — {i.quantity} {i.unit} left
                  {i.controlled ? ` · Sch ${i.schedule}` : ''}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Quantity (units from bag)</span>
              <input
                type="number"
                min={1}
                max={selected?.quantity ?? 1}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2"
              />
            </label>
            {mode === 'admin' && (
              <label className="block text-sm">
                <span className="mb-1 block font-semibold">Patient / PCR ref</span>
                <input
                  value={patientRef}
                  onChange={(e) => setPatientRef(e.target.value)}
                  placeholder="e.g. PCR-10482"
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2"
                />
              </label>
            )}
          </div>

          {mode === 'admin' && (
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm">
                <span className="mb-1 block font-semibold">Dose</span>
                <select
                  value={dose}
                  onChange={(e) => setDose(e.target.value)}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2"
                >
                  {options.doses.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold">Route</span>
                <select
                  value={route}
                  onChange={(e) => setRoute(e.target.value)}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2"
                >
                  {options.routes.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold">Indication</span>
                <select
                  value={indication}
                  onChange={(e) => setIndication(e.target.value)}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2"
                >
                  {options.indications.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {mode === 'waste' && (
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Waste reason</span>
              <select
                value={wasteReason}
                onChange={(e) => setWasteReason(e.target.value)}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2"
              >
                <option value="">Select reason…</option>
                {WASTE_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
          )}

          {needsWitness && (
            <WitnessVerify
              actor={currentUser}
              onVerified={(w) => setWitness(w)}
              submitLabel="Verify witness PIN"
            />
          )}

          <label className="block text-sm">
            <span className="mb-1 block font-semibold">Additional notes (optional)</span>
            <textarea
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2"
              placeholder="Optional free-text detail…"
            />
          </label>

          <button
            type="button"
            onClick={submit}
            className={`rounded-lg px-5 py-2.5 text-sm font-bold text-white ${
              mode === 'waste' ? 'bg-coral hover:bg-coral/90' : 'bg-sea hover:bg-sea-mid'
            }`}
          >
            {mode === 'waste' ? 'Record waste' : 'Record administration'}
          </button>
          {msg && <p className="text-sm font-medium text-ink-soft">{msg}</p>}
        </div>
      </div>
    </div>
  )
}
