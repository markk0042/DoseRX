import { format } from 'date-fns'
import { ArrowLeft, ClipboardList, Package, Pill, QrCode } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { filterOptionsForGrade } from '../data/cpg'
import { useApp } from '../context/AppContext'
import { captureLocation } from '../lib/geo'
import { parseQrPayload } from '../lib/qr'
import type { PhotoEvidence, StaffMember, TagStatus } from '../types'
import { PhotoCapture } from './PhotoCapture'
import { BusyOverlay } from './BusyOverlay'
import { QrScanner } from './QrScanner'
import { WitnessVerify } from './WitnessVerify'

type Phase =
  | 'scan'
  | 'med-detail'
  | 'med-admin'
  | 'bag-menu'
  | 'bag-contents'
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
  const [photoOut, setPhotoOut] = useState<PhotoEvidence | null>(null)
  const [photoReturn, setPhotoReturn] = useState<PhotoEvidence | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const bag = bagId ? getBag(bagId) : undefined
  const item = bag && itemId ? bag.items.find((i) => i.id === itemId) : undefined
  const activeShift = bagId ? getActiveShift(bagId) : undefined
  const options = useMemo(
    () => filterOptionsForGrade(item?.medicationId ?? '', currentUser?.grade ?? 'AP'),
    [item?.medicationId, currentUser?.grade],
  )

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
    setPhotoOut(null)
    setPhotoReturn(null)
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
      const opts = filterOptionsForGrade(foundItem.medicationId, currentUser?.grade ?? 'AP')
      setDose(opts.doses[0] ?? '')
      setRoute(opts.routes[0] ?? '')
      setIndication(opts.indications[0] ?? '')
      setPhase('med-detail')
    },
    [getBag, currentUser?.grade],
  )

  const completeSignOut = async (witness: StaffMember) => {
    if (!currentUser || !bagId || !tagOut) {
      setMsg('Select tag status.')
      return
    }
    if (tagOut === 'untagged' && !medsChecked) {
      setMsg('Untagged bag — confirm whether medications were checked.')
      return
    }
    if (!photoOut) {
      setMsg('Photo evidence of tag/seal is required before sign-out.')
      return
    }
    const location = await captureLocation()
    const id = signOutBagForShift({
      bagId,
      holder: currentUser,
      witness,
      tagStatus: tagOut,
      medsCheckedOnUntagged: tagOut === 'untagged' ? medsChecked === 'yes' : undefined,
      notes: notesOut || undefined,
      photo: photoOut,
      location,
    })
    if (!id) {
      setMsg('Could not sign out — bag may already be on shift, event privilege expired, or check answers.')
      return
    }
    setMsg(`${bag?.code} signed out to ${currentUser.name} (witness ${witness.name}).`)
    setTimeout(resetToScan, 1600)
  }

  const completeReturn = async (witness: StaffMember) => {
    if (!currentUser || !bagId || !tagIntact || !tagReturn) {
      setMsg('Answer tag questions before returning.')
      return
    }
    if (!photoReturn) {
      setMsg('Photo evidence required on return.')
      return
    }
    const location = await captureLocation()
    const ok = returnBagFromShift({
      bagId,
      returner: currentUser,
      witness,
      tagStillIntact: tagIntact === 'yes',
      tagStatus: tagReturn,
      notes: notesReturn || undefined,
      photo: photoReturn,
      location,
    })
    if (!ok) {
      setMsg('Return failed — bag may not be on shift.')
      return
    }
    setMsg(`${bag?.code} returned by ${currentUser.name} (witness ${witness.name}).`)
    setTimeout(resetToScan, 1600)
  }

  const completeAdmin = async () => {
    if (submitting) return
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
    const cpg = filterOptionsForGrade(item.medicationId, currentUser.grade)
    const notes = [
      `CPG ${cpg.cpgVersion}`,
      `Dose: ${dose}`,
      `Route: ${route}`,
      `Indication: ${indication}`,
      cpg.outOfScopeMed ? 'OUT OF SCOPE' : null,
      extraNotes && `Notes: ${extraNotes}`,
    ]
      .filter(Boolean)
      .join(' · ')
    setSubmitting(true)
    try {
      const location = await captureLocation()
      recordAdministration({
        bagId: bag.id,
        itemId: item.id,
        qty,
        practitioner: currentUser,
        witness: adminWitness,
        patientRef,
        notes,
        outOfScope: cpg.outOfScopeMed,
        location,
      })
      setMsg(`Administered ${qty} × ${item.name}. Stock ${item.quantity} → ${item.quantity - qty}.`)
      setTimeout(resetToScan, 1600)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {submitting && (
        <BusyOverlay label="Recording…" detail="Saving administration and GPS — please wait." />
      )}
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
            <button
              type="button"
              onClick={() => setPhase('bag-contents')}
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-bold text-ink hover:border-sea-mid"
            >
              <ClipboardList size={16} /> Check contents
            </button>
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

      {phase === 'bag-contents' && bag && (
        <div className="space-y-4 rounded-xl border border-line bg-panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-xl font-bold">Bag contents · {bag.code}</h3>
              <p className="text-sm text-ink-soft">
                {bag.name} · {bag.items.length} medications · review before signing out
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPhase('bag-menu')}
              className="inline-flex items-center gap-1 text-sm font-semibold text-sea-mid hover:underline"
            >
              <ArrowLeft size={14} /> Back
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-sea/5 text-xs uppercase tracking-wide text-ink-soft">
                <tr>
                  <th className="px-3 py-2 font-semibold">Medication</th>
                  <th className="px-3 py-2 font-semibold">On hand</th>
                  <th className="px-3 py-2 font-semibold">Batch</th>
                  <th className="px-3 py-2 font-semibold">Expiry</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {bag.items.map((item) => {
                  const expired = isExpired(item)
                  const soon = !expired && expiringSoon(item)
                  return (
                    <tr key={item.id} className="border-t border-line/70">
                      <td className="px-3 py-2.5">
                        <p className="font-semibold">
                          {item.name}
                          {item.controlled && (
                            <span className="ml-1.5 rounded bg-cd-soft px-1.5 py-0.5 text-[10px] font-bold text-cd">
                              Sch {item.schedule}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-ink-soft">{item.presentation}</p>
                      </td>
                      <td className="px-3 py-2.5 font-semibold">
                        {item.quantity}{' '}
                        <span className="font-normal text-ink-soft">{item.unit}</span>
                        <span className="block text-xs font-normal text-ink-soft/70">
                          par {item.parLevel}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs">{item.lotNumber}</td>
                      <td className="px-3 py-2.5">{format(new Date(item.expiryDate), 'MMM yyyy')}</td>
                      <td className="px-3 py-2.5">
                        {expired ? (
                          <span className="text-xs font-semibold text-coral">Expired</span>
                        ) : soon ? (
                          <span className="text-xs font-semibold text-ink">Expiring soon</span>
                        ) : item.quantity === 0 ? (
                          <span className="text-xs font-semibold text-coral">Empty</span>
                        ) : item.quantity < item.parLevel ? (
                          <span className="text-xs font-semibold text-ink">Below par</span>
                        ) : (
                          <span className="text-xs font-semibold text-ok">OK</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPhase('bag-menu')}
              className="rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-semibold"
            >
              Back to bag options
            </button>
            {!activeShift && (
              <button
                type="button"
                onClick={() => setPhase('bag-signout')}
                className="rounded-lg bg-sea px-4 py-2.5 text-sm font-bold text-mint"
              >
                Continue to sign out
              </button>
            )}
          </div>
        </div>
      )}

      {phase === 'bag-signout' && bag && (
        <div className="space-y-4 rounded-xl border border-line bg-panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-xl font-bold">Shift sign-out · {bag.code}</h3>
            <button
              type="button"
              onClick={() => setPhase('bag-contents')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-bold"
            >
              <ClipboardList size={14} /> Check contents
            </button>
          </div>
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

          <PhotoCapture
            label="Seal / tag photo (required)"
            value={photoOut}
            onChange={setPhotoOut}
          />
          <p className="text-xs text-ink-soft">Snap green/red/untagged seal and seal number if present.</p>

          <textarea
            value={notesOut}
            onChange={(e) => setNotesOut(e.target.value)}
            rows={2}
            placeholder="Optional notes / seal number"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          />

          {currentUser && (
            <WitnessVerify
              actor={currentUser}
              onVerified={completeSignOut}
              submitLabel="Assign bag to my shift"
              busyLabel="Signing bag out…"
              busyDetail="Photo saved — capturing GPS and locking assignment."
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
            <legend className="mb-2 text-sm font-semibold">Is the bag still tagged / sealed?</legend>
            <div className="flex gap-2">
              {(['yes', 'no'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    setTagIntact(v)
                    if (v === 'no') setTagReturn('untagged')
                  }}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize ${
                    tagIntact === v ? 'bg-sea text-mint' : 'border border-line'
                  }`}
                >
                  {v === 'yes' ? 'Yes — sealed' : 'No — unsealed'}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Current tag status on return</legend>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['green', 'Green (sealed)'],
                  ['red', 'Red (opened / used)'],
                  ['untagged', 'Untagged / unsealed'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTagReturn(value)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                    tagReturn === value
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
            <p className="mt-2 text-xs text-ink-soft">
              Green + still tagged → sealed. Red → open. Untagged / not sealed → check due for admin.
            </p>
          </fieldset>

          <PhotoCapture
            label="Return seal / tag photo (required)"
            value={photoReturn}
            onChange={setPhotoReturn}
          />
          <p className="text-xs text-ink-soft">Capture tag colour and seal number on return.</p>

          <textarea
            value={notesReturn}
            onChange={(e) => setNotesReturn(e.target.value)}
            rows={2}
            placeholder="Optional return notes / seal number"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          />

          {currentUser && (
            <WitnessVerify
              actor={currentUser}
              onVerified={completeReturn}
              submitLabel="Complete bag return"
              busyLabel="Returning bag…"
              busyDetail="Photo saved — capturing GPS and closing shift."
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
            onClick={() => void completeAdmin()}
            disabled={!adminWitness || submitting}
            className="rounded-lg bg-sea px-5 py-2.5 text-sm font-bold text-mint disabled:opacity-40"
          >
            {submitting ? 'Recording…' : 'Record administration'}
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
  const emtBags = state.bags.filter((b) => b.grade === 'EMT' && b.type === 'standard')
  const onShift = state.bags.filter((b) => b.activeShiftId)
  const sampleMedBag = emtBags[0] ?? state.bags.find((b) => b.items.length > 0)
  const med = sampleMedBag?.items[0]

  if (emtBags.length === 0 && state.bags.length === 0) return null

  return (
    <div className="mt-4 border-t border-line pt-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
        Demo quick pick (no camera)
      </p>

      <p className="mb-1.5 text-[11px] font-semibold text-ink-soft/80">EMT drug bags</p>
      <div className="mb-3 flex flex-wrap gap-2">
        {emtBags.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => onPick(`DOSERX|BAG|${b.id}`)}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold hover:border-sea-mid"
          >
            {b.code}
            <span className="ml-1 font-medium text-ink-soft/70">· {b.name}</span>
          </button>
        ))}
        {emtBags.length === 0 && (
          <p className="text-xs text-ink-soft">No EMT bags in demo data.</p>
        )}
      </div>

      {(med || onShift.length > 0) && (
        <>
          <p className="mb-1.5 text-[11px] font-semibold text-ink-soft/80">Other demo scans</p>
          <div className="flex flex-wrap gap-2">
            {sampleMedBag && med && (
              <button
                type="button"
                onClick={() => onPick(`DOSERX|MED|${sampleMedBag.id}|${med.id}`)}
                className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold"
              >
                Med · {med.name.slice(0, 22)}
                {med.name.length > 22 ? '…' : ''}
              </button>
            )}
            {onShift.map((b) => (
              <button
                key={`return-${b.id}`}
                type="button"
                onClick={() => onPick(`DOSERX|BAG|${b.id}`)}
                className="rounded-lg border border-amber/40 bg-amber-soft/50 px-3 py-1.5 text-xs font-semibold"
              >
                Return {b.code}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
