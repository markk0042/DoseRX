import { useEffect, useMemo, useState } from 'react'
import { WASTE_REASONS } from '../data/adminOptions'
import { CPG_VERSION, filterOptionsForGrade, isRouteLikelyOutOfScope } from '../data/cpg'
import { useApp } from '../context/AppContext'
import { captureLocation } from '../lib/geo'
import type { StaffMember } from '../types'
import { BusyOverlay } from './BusyOverlay'
import { WitnessVerify } from './WitnessVerify'

export function AdministerView({ preferredBagId }: { preferredBagId?: string }) {
  const { state, currentUser, recordAdministration, recordWaste, getBag } = useApp()
  const usableBags = state.bags.filter((b) => {
    if (!currentUser) return true
    if (b.eventEndsAt && new Date(b.eventEndsAt).getTime() < Date.now()) return false
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
  const [drawn, setDrawn] = useState(1)
  const [given, setGiven] = useState(1)
  const [wastedPart, setWastedPart] = useState(0)
  const [ackOutOfScope, setAckOutOfScope] = useState(false)
  const [busy, setBusy] = useState(false)

  const bag = getBag(bagId)
  const items = bag?.items.filter((i) => i.quantity > 0) ?? []
  const selected = items.find((i) => i.id === itemId) ?? items[0]
  const needsWitness = mode === 'waste' || !!selected?.controlled
  const usePartDose = mode === 'admin' && !!selected?.controlled

  const options = useMemo(() => {
    if (!currentUser || !selected) {
      return { doses: [], routes: [], indications: [], outOfScopeMed: false, cpgVersion: CPG_VERSION }
    }
    return filterOptionsForGrade(selected.medicationId, currentUser.grade)
  }, [selected?.medicationId, currentUser])

  const routeOutOfScope = currentUser ? isRouteLikelyOutOfScope(route, currentUser.grade) : false
  const outOfScope = options.outOfScopeMed || routeOutOfScope

  useEffect(() => {
    setItemId(items[0]?.id ?? '')
    setWitness(null)
  }, [bagId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setDose(options.doses[0] ?? '')
    setRoute(options.routes[0] ?? '')
    setIndication(options.indications[0] ?? '')
    setWitness(null)
    setAckOutOfScope(false)
    setDrawn(1)
    setGiven(1)
    setWastedPart(0)
  }, [selected?.medicationId, options, mode])

  useEffect(() => {
    if (usePartDose) {
      setWastedPart(Math.max(0, Number((drawn - given).toFixed(2))))
    }
  }, [drawn, given, usePartDose])

  const buildAdminNotes = () =>
    [
      `CPG ${CPG_VERSION}`,
      `Dose: ${dose}`,
      `Route: ${route}`,
      `Indication: ${indication}`,
      outOfScope ? 'OUT OF SCOPE flagged' : null,
      extraNotes && `Notes: ${extraNotes}`,
    ]
      .filter(Boolean)
      .join(' · ')

  const submit = async () => {
    if (busy) return
    if (!currentUser || !bag || !selected) {
      setMsg('Sign in and select bag + medication.')
      return
    }
    if (needsWitness && !witness) {
      setMsg('Select witness and verify their PIN first.')
      return
    }
    if (outOfScope && !ackOutOfScope) {
      setMsg('Out-of-scope for your PHECC grade — acknowledge to continue, or change selection.')
      return
    }

    if (mode === 'waste') {
      if (!wasteReason) {
        setMsg('Select a waste reason.')
        return
      }
      if (qty > selected.quantity) {
        setMsg(`Only ${selected.quantity} ${selected.unit} on hand.`)
        return
      }
    } else {
      if (!patientRef.trim() || !dose || !route || !indication) {
        setMsg('CAD / incident number, dose, route and indication are required.')
        return
      }
      if (usePartDose) {
        if (drawn <= 0 || given < 0 || wastedPart < 0) {
          setMsg('Part-dose figures invalid.')
          return
        }
        if (Math.abs(drawn - (given + wastedPart)) > 0.011) {
          setMsg('Drawn must equal given + wasted.')
          return
        }
        if (drawn > selected.quantity) {
          setMsg(`Only ${selected.quantity} on hand to draw from.`)
          return
        }
        if (!witness) {
          setMsg('Witness required for CD part-dose.')
          return
        }
      } else if (qty > selected.quantity) {
        setMsg(`Only ${selected.quantity} on hand.`)
        return
      }
    }

    setBusy(true)
    try {
      const location = await captureLocation()

      if (mode === 'waste') {
        recordWaste(bag.id, selected.id, qty, currentUser, witness!, [wasteReason, extraNotes].filter(Boolean).join(' · '))
        setMsg(`Wasted ${qty} ${selected.unit} of ${selected.name}.`)
      } else if (usePartDose) {
        recordAdministration({
          bagId: bag.id,
          itemId: selected.id,
          qty: given,
          practitioner: currentUser,
          witness,
          patientRef,
          notes: buildAdminNotes(),
          outOfScope,
          partDose: { drawn, given, wasted: wastedPart, unit: selected.unit },
          location,
        })
        setMsg(
          `Part-dose ${selected.name}: drawn ${drawn}, given ${given}, wasted ${wastedPart} ${selected.unit}.`,
        )
      } else {
        recordAdministration({
          bagId: bag.id,
          itemId: selected.id,
          qty,
          practitioner: currentUser,
          witness,
          patientRef,
          notes: buildAdminNotes(),
          outOfScope,
          location,
        })
        setMsg(`Administered ${qty} ${selected.unit} of ${selected.name}.`)
      }
      setExtraNotes('')
      setPatientRef('')
      setQty(1)
      setWasteReason('')
      setWitness(null)
      setAckOutOfScope(false)
    } finally {
      setBusy(false)
    }
  }

  if (!currentUser) {
    return <p className="text-sm text-ink-soft">Sign in to administer medications.</p>
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {busy && (
        <BusyOverlay
          label={mode === 'waste' ? 'Recording waste…' : 'Recording…'}
          detail="Capturing GPS and saving to the register."
        />
      )}
      <div className="rounded-xl border border-line bg-panel p-5">
        <h2 className="font-display text-2xl font-bold">Administer / waste</h2>
        <p className="mb-1 text-sm text-ink-soft/80">
          {currentUser.name} · {currentUser.grade === 'AP' ? 'AP' : currentUser.grade} · PHECC CPG {CPG_VERSION}
        </p>
        <p className="mb-4 text-xs text-ink-soft">
          Dose / route / indication filtered to your clinical grade. Controlled drugs use drawn / given / wasted.
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
            <select value={bagId} onChange={(e) => setBagId(e.target.value)} className="w-full rounded-lg border border-line bg-surface px-3 py-2">
              {usableBags.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} {b.type === 'controlled' ? '(CD)' : ''} {b.eventName ? `· ${b.eventName}` : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-semibold">Medication</span>
            <select value={selected?.id ?? ''} onChange={(e) => setItemId(e.target.value)} className="w-full rounded-lg border border-line bg-surface px-3 py-2">
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} — {i.quantity} {i.unit}
                  {i.controlled ? ` · Sch ${i.schedule}` : ''}
                </option>
              ))}
            </select>
          </label>

          {options.outOfScopeMed && (
            <div className="rounded-lg border border-coral/40 bg-coral-soft/50 px-3 py-2 text-sm text-coral">
              This medication is outside the PHECC formulary for {currentUser.grade} grade.
            </div>
          )}

          {mode === 'admin' && !usePartDose && (
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Quantity</span>
              <input type="number" min={1} max={selected?.quantity ?? 1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} className="w-full rounded-lg border border-line bg-surface px-3 py-2" />
            </label>
          )}

          {usePartDose && (
            <div className="grid gap-3 rounded-xl border border-cd/30 bg-cd-soft/20 p-3 sm:grid-cols-3">
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-cd">Drawn</span>
                <input type="number" min={0} step={0.1} value={drawn} onChange={(e) => setDrawn(Math.max(0, Number(e.target.value)))} className="w-full rounded-lg border border-line bg-panel px-2 py-1.5" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-cd">Given</span>
                <input type="number" min={0} step={0.1} value={given} onChange={(e) => setGiven(Math.max(0, Number(e.target.value)))} className="w-full rounded-lg border border-line bg-panel px-2 py-1.5" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-cd">Wasted</span>
                <input type="number" min={0} step={0.1} value={wastedPart} onChange={(e) => setWastedPart(Math.max(0, Number(e.target.value)))} className="w-full rounded-lg border border-line bg-panel px-2 py-1.5" />
              </label>
              <p className="sm:col-span-3 text-xs text-ink-soft">Drawn must equal given + wasted (ampoule accounting).</p>
            </div>
          )}

          {mode === 'admin' && (
            <>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold">CAD / incident number (no patient name)</span>
                <input
                  value={patientRef}
                  onChange={(e) => setPatientRef(e.target.value)}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2"
                  placeholder="e.g. 4821 or CAD-4821"
                  autoComplete="off"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-sm">
                  <span className="mb-1 block font-semibold">Dose (CPG)</span>
                  <select value={dose} onChange={(e) => setDose(e.target.value)} className="w-full rounded-lg border border-line bg-surface px-3 py-2">
                    {options.doses.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-semibold">Route (CPG)</span>
                  <select value={route} onChange={(e) => setRoute(e.target.value)} className="w-full rounded-lg border border-line bg-surface px-3 py-2">
                    {options.routes.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-semibold">Indication</span>
                  <select value={indication} onChange={(e) => setIndication(e.target.value)} className="w-full rounded-lg border border-line bg-surface px-3 py-2">
                    {options.indications.map((ind) => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </label>
              </div>
            </>
          )}

          {mode === 'waste' && (
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Waste reason</span>
              <select value={wasteReason} onChange={(e) => setWasteReason(e.target.value)} className="w-full rounded-lg border border-line bg-surface px-3 py-2">
                <option value="">Select reason…</option>
                {WASTE_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
          )}

          {outOfScope && (
            <label className="flex items-start gap-2 rounded-lg border border-coral/40 bg-coral-soft/40 px-3 py-2 text-sm">
              <input type="checkbox" checked={ackOutOfScope} onChange={(e) => setAckOutOfScope(e.target.checked)} className="mt-1" />
              <span>
                I acknowledge this selection may be <strong>out of scope</strong> for my PHECC grade / CPG {CPG_VERSION} and will be audited.
              </span>
            </label>
          )}

          {needsWitness && (
            <WitnessVerify actor={currentUser} onVerified={(w) => setWitness(w)} submitLabel="Verify witness PIN" />
          )}

          <textarea value={extraNotes} onChange={(e) => setExtraNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm" placeholder="Additional notes (optional)" />

          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy}
            className={`rounded-lg px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60 ${mode === 'waste' ? 'bg-coral' : 'bg-sea'}`}
          >
            {busy
              ? 'Working…'
              : mode === 'waste'
                ? 'Record waste'
                : usePartDose
                  ? 'Record part-dose'
                  : 'Record administration'}
          </button>
          {msg && <p className="text-sm font-medium text-ink-soft">{msg}</p>}
        </div>
      </div>
    </div>
  )
}
