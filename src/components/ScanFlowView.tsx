import { format } from 'date-fns'
import { ArrowLeft, Package, Pill, QrCode } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { getAdminOptions } from '../data/adminOptions'
import { useApp } from '../context/AppContext'
import { parseQrPayload } from '../lib/qr'
import type { StaffMember, TagStatus } from '../types'
import { QrScanner } from './QrScanner'
import { WitnessVerify } from './WitnessVerify'

type Phase =
  | 'scan'
  | 'med-detail'
  | 'med-admin'
  | 'bag-menu'
  | 'bag-signout'
  | 'bag-return'

export function ScanFlowView() {
  const {
    currentUser,
    getBag,
    getActiveShift,
    isExpired,
    expiringSoon,
    recordAdministration,
    signOutBagForShift,
    returnBagFromShift,
  } = useApp()

  const [phase, setPhase] = useState<Phase>('scan')
  const [bagId, setBagId] = useState<string | null>(null)
  const [itemId, setItemId] = useState<string | null>(null)
  const [scanError, setScanError] = useState('')
  const [msg, setMsg] = useState('')

  const [tagOut, setTagOut] = useState<TagStatus | ''>('')
  const [medsChecked, setMedsChecked] = useState<'yes' | 'no' | ''>('')
  const [notesOut, setNotesOut] = useState('')

  const [tagIntact, setTagIntact] = useState<'yes' | 'no' | ''>('')
  const [tagReturn, setTagReturn] = useState<TagStatus | ''>('')
  const [notesReturn, setNotesReturn] = useState('')

  const [qty, setQty] = useState(1)
  const [patientRef, setPatientRef] = useState('')
  const [dose, setDose] = useState('')
  const [route, setRoute] = useState('')
  const [indication, setIndication] = useState('')
  const [extraNotes, setExtraNotes] = useState('')
  const [adminWitness, setAdminWitness] = useState<StaffMember | null>(null)

  const bag = bagId ? getBag(bagId) : undefined
  const item = bag && itemId ? bag.items.find((i) => i.id === itemId) : undefined
  const activeShift = bagId ? getActiveShift(bagId) : undefined
  const options = useMemo(() => getAdminOptions(item?.medicationId ?? ''), [item?.medicationId])

  const resetToScan = () => {
    setPhase('scan')
    setBagId(null)
    setItemId(null)
    setScanError('')
    setMsg('')
    setTagOut('')
    setMedsChecked('')
    setNotesOut('')
    setTagIntact('')
    setTagReturn('')
    setNotesReturn('')
    setQty(1)
    setPatientRef('')
    setExtraNotes('')
    setAdminWitness(null)
  }

  const handleScan = useCallback(
    (text: string) => {
      const payload = parseQrPayload(text)
      if (!payload) {
        setScanError('Unrecognised QR. Expect DoseRX bag or medication label.')
        return
      }
      const foundBag = getBag(payload.bagId)
      if (!foundBag) {
        setScanError('Bag not found for this QR.')
        return
      }
      setScanError('')
      setBagId(payload.bagId)

      if (payload.kind === 'bag') {
        setItemId(null)
        setPhase('bag-menu')
        return
      }

      const foundItem = foundBag.items.find((i) => i.id === payload.itemId)
      if (!foundItem) {
        setScanError('Medication vial not found for this QR.')
        return
      }
      setItemId(payload.itemId)
      const opts = getAdminOptions(foundItem.medicationId)
      setDose(opts.doses[0] ?? '')
      setRoute(opts.routes[0] ?? '')
      setIndication(opts.indications[0] ?? '')
      setPhase('med-detail')
    },
    [getBag],
  )

  const completeSignOut = (witness: StaffMember) => {
    if (!currentUser || !bagId || !tagOut) {
      setMsg('Select tag status.')
      return
    }
    if (tagOut === 'untagged' && !medsChecked) {
      setMsg('Untagged bag — confirm whether medications were checked.')
      return
    }
    const id = signOutBagForShift({
      bagId,
      holder: currentUser,
      witness,
      tagStatus: tagOut,
      medsCheckedOnUntagged: tagOut === 'untagged' ? medsChecked === 'yes' : undefined,
      notes: notesOut || undefined,
    })
    if (!id) {
      setMsg('Could not sign out — bag may already be on shift, or check answers.')
      return
    }
    setMsg(`${bag?.code} signed out to ${currentUser.name} (witness ${witness.name}).`)
    setTimeout(resetToScan, 1600)
  }

  const completeReturn = (witness: StaffMember) => {
    if (!currentUser || !bagId || !tagIntact || !tagReturn) {
      setMsg('Answer tag questions before returning.')
      return
    }
    const ok = returnBagFromShift({
      bagId,
      returner: currentUser,
      witness,
      tagStillIntact: tagIntact === 'yes',
      tagStatus: tagReturn,
      notes: notesReturn || undefined,
    })
    if (!ok) {
      setMsg('Return failed — bag may not be on shift.')
      return
    }
    setMsg(`${bag?.code} returned by ${currentUser.name} (witness ${witness.name}).`)
    setTimeout(resetToScan, 1600)
  }

  const completeAdmin = () => {
    if (!currentUser || !bag || !item) {
      setMsg('Sign in required.')
      return
    }
    if (!patientRef.trim() || !dose || !route || !indication) {
      setMsg('Patient ref, dose, route and indication are required.')
      return
    }
    if (!adminWitness) {
      setMsg('Select witness and verify their PIN.')
      return
    }
    if (qty > item.quantity) {
      setMsg(`Only ${item.quantity} on hand.`)
      return
    }
    const notes = [`Dose: ${dose}`, `Route: ${route}`, `Indication: ${indication}`, extraNotes && `Notes: ${extraNotes}`]
      .filter(Boolean)
      .join(' · ')
    recordAdministration(bag.id, item.id, qty, currentUser, adminWitness, patientRef, notes)
    setMsg(`Administered ${qty} × ${item.name}. Stock ${item.quantity} → ${item.quantity - qty}.`)
    setTimeout(resetToScan, 1600)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="rounded-xl border border-line bg-panel p-4">
        <div className="mb-1 flex items-center gap-2">
          <QrCode className="text-sea" size={22} />
          <h2 className="font-display text-2xl font-bold">QR scan</h2>
        </div>
        <p className="text-sm text-ink-soft/80">
          Scan a <strong>bag QR</strong> for shift sign-out / return, or a <strong>medication QR</strong> to view batch /
          expiry and administer.
        </p>
      </div>

      {phase !== 'scan' && (
        <button
          type="button"
          onClick={resetToScan}
          className="inline-flex items-center gap-1 text-sm font-semibold text-sea-mid hover:underline"
        >
          <ArrowLeft size={14} /> New scan
        </button>
      )}

      {phase === 'scan' && (
        <div className="rounded-xl border border-line bg-panel p-4">
          <QrScanner onScan={handleScan} active={phase === 'scan'} />
          {scanError && <p className="mt-3 text-sm font-medium text-coral">{scanError}</p>}
          <DemoQuickPick onPick={handleScan} />
        </div>
      )}

      {phase === 'bag-menu' && bag && (
        <div className="space-y-3 rounded-xl border border-line bg-panel p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sea text-mint">
              <Package size={20} />
            </div>
            <div>
              <p className="font-display text-2xl font-bold">{bag.code}</p>
              <p className="text-sm text-ink-soft">{bag.name}</p>
              <p className="mt-1 text-xs text-ink-soft">
                Current tag: <TagPill status={bag.tagStatus} /> · Seal {bag.sealNumber}
              </p>
              {activeShift && (
                <p className="mt-1 text-xs font-semibold text-amber-soft bg-ink/80 inline-block rounded px-2 py-0.5 text-amber-soft" style={{ background: '#fde9b8', color: '#0a1f28' }}>
                  On shift with {activeShift.holderName} since {format(new Date(activeShift.signedOutAt), 'HH:mm')}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {!activeShift ? (
              <button
                type="button"
                onClick={() => setPhase('bag-signout')}
                className="rounded-lg bg-sea px-4 py-2.5 text-sm font-bold text-mint"
              >
                Sign out for shift
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setPhase('bag-return')}
                className="rounded-lg bg-cd px-4 py-2.5 text-sm font-bold text-white"
              >
                Return bag end of shift
              </button>
            )}
          </div>
        </div>
      )}

      {phase === 'bag-signout' && bag && (
        <div className="space-y-4 rounded-xl border border-line bg-panel p-5">
          <h3 className="font-display text-xl font-bold">Shift sign-out · {bag.code}</h3>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Is the bag green tagged, red tagged, or untagged?</legend>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['green', 'Green tagged'],
                  ['red', 'Red tagged'],
                  ['untagged', 'Untagged'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setTagOut(value)
                    if (value !== 'untagged') setMedsChecked('')
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                    tagOut === value
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

          {tagOut === 'untagged' && (
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">
                Did you check the medications in the bag? (required — no tag)
              </legend>
              <div className="flex gap-2">
                {(['yes', 'no'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setMedsChecked(v)}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize ${
                      medsChecked === v ? 'bg-sea text-mint' : 'border border-line'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <textarea
            value={notesOut}
            onChange={(e) => setNotesOut(e.target.value)}
            rows={2}
            placeholder="Optional notes"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          />

          {currentUser && (
            <WitnessVerify
              actor={currentUser}
              onVerified={completeSignOut}
              submitLabel="Assign bag to my shift"
            />
          )}
          {msg && <p className="text-sm font-medium text-ink-soft">{msg}</p>}
        </div>
      )}

      {phase === 'bag-return' && bag && activeShift && (
        <div className="space-y-4 rounded-xl border border-line bg-panel p-5">
          <h3 className="font-display text-xl font-bold">Shift return · {bag.code}</h3>
          <p className="text-sm text-ink-soft">
            Currently held by <strong>{activeShift.holderName}</strong> · signed out{' '}
            {format(new Date(activeShift.signedOutAt), 'dd MMM HH:mm')} · tag was{' '}
            <TagPill status={activeShift.tagOnSignOut} />
          </p>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Is the bag still tagged?</legend>
            <div className="flex gap-2">
              {(['yes', 'no'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setTagIntact(v)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize ${
                    tagIntact === v ? 'bg-sea text-mint' : 'border border-line'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Current tag status on return</legend>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['green', 'Green'],
                  ['red', 'Red'],
                  ['untagged', 'Untagged'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTagReturn(value)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                    tagReturn === value ? 'bg-sea text-mint' : 'border border-line bg-surface'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <textarea
            value={notesReturn}
            onChange={(e) => setNotesReturn(e.target.value)}
            rows={2}
            placeholder="Optional return notes"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          />

          {currentUser && (
            <WitnessVerify
              actor={currentUser}
              onVerified={completeReturn}
              submitLabel="Complete bag return"
            />
          )}
          {msg && <p className="text-sm font-medium text-ink-soft">{msg}</p>}
        </div>
      )}

      {phase === 'med-detail' && bag && item && (
        <div className="space-y-4 rounded-xl border border-line bg-panel p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sea text-mint">
              <Pill size={20} />
            </div>
            <div>
              <p className="font-display text-2xl font-bold">{item.name}</p>
              <p className="text-sm text-ink-soft">{item.presentation}</p>
              <p className="text-xs text-ink-soft/70">{bag.code}</p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-surface p-3">
              <dt className="text-xs uppercase text-ink-soft">On hand</dt>
              <dd className="font-display text-2xl font-bold">
                {item.quantity} <span className="text-sm font-medium">{item.unit}</span>
              </dd>
            </div>
            <div className="rounded-lg bg-surface p-3">
              <dt className="text-xs uppercase text-ink-soft">Batch / lot</dt>
              <dd className="font-mono text-lg font-bold">{item.lotNumber}</dd>
            </div>
            <div className="rounded-lg bg-surface p-3">
              <dt className="text-xs uppercase text-ink-soft">Expiry</dt>
              <dd
                className={`font-semibold ${
                  isExpired(item) ? 'text-coral' : expiringSoon(item) ? 'text-ink' : 'text-ok'
                }`}
              >
                {format(new Date(item.expiryDate), 'dd MMM yyyy')}
              </dd>
            </div>
            <div className="rounded-lg bg-surface p-3">
              <dt className="text-xs uppercase text-ink-soft">Type</dt>
              <dd className="font-semibold">
                {item.controlled ? `Controlled · Sch ${item.schedule}` : 'Standard'}
              </dd>
            </div>
          </dl>

          <button
            type="button"
            disabled={item.quantity < 1}
            onClick={() => {
              setDose(options.doses[0] ?? '')
              setRoute(options.routes[0] ?? '')
              setIndication(options.indications[0] ?? '')
              setPhase('med-admin')
            }}
            className="rounded-lg bg-sea px-5 py-2.5 text-sm font-bold text-mint disabled:opacity-40"
          >
            Administer
          </button>
        </div>
      )}

      {phase === 'med-admin' && bag && item && (
        <div className="space-y-3 rounded-xl border border-line bg-panel p-5">
          <h3 className="font-display text-xl font-bold">Administer · {item.name}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-semibold">Units from bag</span>
              <input
                type="number"
                min={1}
                max={item.quantity}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-semibold">Patient / PCR ref</span>
              <input
                value={patientRef}
                onChange={(e) => setPatientRef(e.target.value)}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2"
                placeholder="PCR-…"
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm">
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
            <label className="text-sm">
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
            <label className="text-sm">
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
          <textarea
            value={extraNotes}
            onChange={(e) => setExtraNotes(e.target.value)}
            rows={2}
            placeholder="Additional notes (optional)"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          />

          {!adminWitness ? (
            currentUser && (
              <WitnessVerify
                actor={currentUser}
                onVerified={(w) => setAdminWitness(w)}
                submitLabel="Verify witness PIN"
              />
            )
          ) : (
            <div className="rounded-lg bg-ok-soft px-3 py-2 text-sm text-ok">
              Administrator: {currentUser?.name} · Witness verified: {adminWitness.name}
            </div>
          )}

          <button
            type="button"
            onClick={completeAdmin}
            disabled={!adminWitness}
            className="rounded-lg bg-sea px-5 py-2.5 text-sm font-bold text-mint disabled:opacity-40"
          >
            Record administration
          </button>
          {msg && <p className="text-sm font-medium text-ink-soft">{msg}</p>}
        </div>
      )}
    </div>
  )
}

function TagPill({ status }: { status: TagStatus }) {
  const styles: Record<TagStatus, string> = {
    green: 'bg-ok-soft text-ok',
    red: 'bg-coral-soft text-coral',
    untagged: 'bg-surface text-ink-soft',
  }
  return (
    <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold uppercase ${styles[status]}`}>
      {status}
    </span>
  )
}

function DemoQuickPick({ onPick }: { onPick: (text: string) => void }) {
  const { state } = useApp()
  const bag = state.bags[0]
  const med = bag?.items[0]
  if (!bag) return null
  return (
    <div className="mt-4 border-t border-line pt-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">Demo quick pick (no camera)</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onPick(`DOSERX|BAG|${bag.id}`)}
          className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold"
        >
          Scan {bag.code} (bag)
        </button>
        {med && (
          <button
            type="button"
            onClick={() => onPick(`DOSERX|MED|${bag.id}|${med.id}`)}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold"
          >
            Scan {med.name.slice(0, 22)}…
          </button>
        )}
        {state.bags
          .filter((b) => b.activeShiftId)
          .slice(0, 2)
          .map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => onPick(`DOSERX|BAG|${b.id}`)}
              className="rounded-lg border border-amber/40 bg-amber-soft/50 px-3 py-1.5 text-xs font-semibold"
            >
              Return {b.code}
            </button>
          ))}
      </div>
    </div>
  )
}
