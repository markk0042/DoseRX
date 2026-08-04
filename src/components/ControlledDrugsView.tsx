import { format } from 'date-fns'
import { Lock, ShieldAlert } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getAdminOptions } from '../data/adminOptions'
import { useApp } from '../context/AppContext'
import { GradeBadge, StatusBadge } from './Badges'

export function ControlledDrugsView({ onOpenBag }: { onOpenBag: (id: string) => void }) {
  const { state, currentUser, recordAdministration, restockItem } = useApp()
  const cdBags = state.bags.filter((b) => b.type === 'controlled')
  const cdActivity = state.activities.filter(
    (a) =>
      cdBags.some((b) => b.id === a.bagId) ||
      a.type === 'waste' ||
      (a.medicationName &&
        ['Morphine', 'Fentanyl', 'Ketamine', 'Midazolam', 'Diazepam', 'Lorazepam'].some((n) =>
          a.medicationName!.includes(n.split(' ')[0]),
        )),
  )

  const [bagId, setBagId] = useState(cdBags[0]?.id ?? '')
  const [itemId, setItemId] = useState('')
  const [qty, setQty] = useState(1)
  const [patientRef, setPatientRef] = useState('')
  const [witnessId, setWitnessId] = useState('')
  const [dose, setDose] = useState('')
  const [route, setRoute] = useState('')
  const [indication, setIndication] = useState('')
  const [extraNotes, setExtraNotes] = useState('')
  const [msg, setMsg] = useState('')
  const [restockQty, setRestockQty] = useState(1)
  const [lot, setLot] = useState('')
  const [expiry, setExpiry] = useState('')

  const bag = cdBags.find((b) => b.id === bagId)
  const item = bag?.items.find((i) => i.id === itemId) ?? bag?.items[0]
  const options = useMemo(() => getAdminOptions(item?.medicationId ?? ''), [item?.medicationId])

  useEffect(() => {
    setDose(options.doses[0] ?? '')
    setRoute(options.routes[0] ?? '')
    setIndication(options.indications[0] ?? '')
  }, [item?.medicationId, options])

  const canUse =
    currentUser &&
    currentUser.grade !== 'EMT' &&
    !(bag?.grade === 'AP' && currentUser.grade !== 'AP')

  const signOut = () => {
    if (!currentUser || !bag || !item) return
    if (!canUse) {
      setMsg('Only Paramedics may use P CD pouch; only APs may use AP CD pouch.')
      return
    }
    const witness = state.staff.find((s) => s.id === witnessId)
    if (!witness || witness.id === currentUser.id) {
      setMsg('Witness required for CD administration.')
      return
    }
    if (!patientRef.trim()) {
      setMsg('Patient / PCR reference required.')
      return
    }
    if (!dose || !route || !indication) {
      setMsg('Select dose, route and indication.')
      return
    }
    const notes = [
      `Dose: ${dose}`,
      `Route: ${route}`,
      `Indication: ${indication}`,
      extraNotes && `Notes: ${extraNotes}`,
    ]
      .filter(Boolean)
      .join(' · ')
    recordAdministration(bag.id, item.id, qty, currentUser, witness, patientRef, notes)
    setMsg(`CD signed out: ${qty} × ${item.name}`)
    setPatientRef('')
    setExtraNotes('')
  }

  const restock = () => {
    if (!currentUser || !bag || !item) return
    if (currentUser.role !== 'management') {
      setMsg('Only management can restock controlled drugs.')
      return
    }
    if (!lot || !expiry) {
      setMsg('Lot and expiry required for restock.')
      return
    }
    restockItem(bag.id, item.id, restockQty, lot, expiry, currentUser)
    setMsg(`Restocked ${restockQty} × ${item.name} (stock ${item.quantity} → ${item.quantity + restockQty})`)
    setLot('')
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-cd/25 bg-gradient-to-br from-cd-soft/50 to-panel p-5">
        <div className="mb-2 flex items-center gap-2 text-cd">
          <Lock size={20} />
          <h2 className="font-display text-3xl font-extrabold">Controlled Drugs Register</h2>
        </div>
        <p className="max-w-3xl text-sm text-ink-soft">
          CD pouches for <strong>Paramedic</strong> (Midazolam — Schedule 3) and{' '}
          <strong>Advanced Paramedic</strong> (Morphine & Fentanyl Schedule 2, Ketamine Schedule 2,
          Midazolam Schedule 3, Diazepam & Lorazepam Schedule 4). Dual signature required for all CD movements.
        </p>
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-panel/80 px-3 py-2 text-xs text-ink-soft">
          <ShieldAlert size={14} className="mt-0.5 shrink-0 text-cd" />
          Misuse of Drugs Regulations 2017 / HPRA licence conditions apply. CDs must remain in certified safe custody when not signed out to a privileged practitioner.
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {cdBags.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => {
              setBagId(b.id)
              onOpenBag(b.id)
            }}
            className="rounded-xl border border-line bg-panel p-4 text-left transition hover:border-cd/40"
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="font-display text-2xl font-bold">{b.code}</p>
              <StatusBadge status={b.status} />
            </div>
            <GradeBadge grade={b.grade} controlled />
            <p className="mt-2 text-sm text-ink-soft">{b.name}</p>
            <ul className="mt-3 space-y-1">
              {b.items.map((i) => (
                <li key={i.id} className="flex justify-between text-sm">
                  <span>
                    {i.name}{' '}
                    <span className="text-[10px] font-bold text-cd">Sch {i.schedule}</span>
                  </span>
                  <span className="font-semibold">
                    {i.quantity} {i.unit}
                  </span>
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-panel p-4">
          <h3 className="mb-3 font-display text-xl font-bold">CD administration (sign-out)</h3>
          <div className="space-y-3 text-sm">
            <select
              value={bagId}
              onChange={(e) => {
                setBagId(e.target.value)
                setItemId('')
              }}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2"
            >
              {cdBags.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code}
                </option>
              ))}
            </select>
            <select
              value={item?.id ?? ''}
              onChange={(e) => setItemId(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2"
            >
              {bag?.items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.quantity} left)
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                className="rounded-lg border border-line bg-surface px-3 py-2"
                placeholder="Qty"
              />
              <input
                value={patientRef}
                onChange={(e) => setPatientRef(e.target.value)}
                className="rounded-lg border border-line bg-surface px-3 py-2"
                placeholder="PCR ref"
              />
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">Dose</span>
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
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">Route</span>
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
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">Indication</span>
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
            <select
              value={witnessId}
              onChange={(e) => setWitnessId(e.target.value)}
              className="w-full rounded-lg border border-cd/30 bg-cd-soft/20 px-3 py-2"
            >
              <option value="">Witness…</option>
              {state.staff
                .filter((s) => s.id !== currentUser?.id)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
            <textarea
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2"
              placeholder="Additional notes (optional)"
            />
            <button
              type="button"
              onClick={signOut}
              className="rounded-lg bg-cd px-4 py-2 font-bold text-white hover:bg-cd/90"
            >
              Sign out CD
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-panel p-4">
          <h3 className="mb-3 font-display text-xl font-bold">Restock from pharmacy</h3>
          <p className="mb-3 text-xs text-ink-soft">Management only — adds to live on-hand stock.</p>
          <div className="space-y-3 text-sm">
            <p className="text-xs text-ink-soft">
              Current: {item?.name ?? '—'} · Lot {item?.lotNumber}
            </p>
            <input
              type="number"
              min={1}
              value={restockQty}
              onChange={(e) => setRestockQty(Math.max(1, Number(e.target.value)))}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2"
              placeholder="Quantity added"
            />
            <input
              value={lot}
              onChange={(e) => setLot(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2"
              placeholder="New lot number"
            />
            <input
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2"
            />
            <button
              type="button"
              onClick={restock}
              className="rounded-lg bg-sea px-4 py-2 font-bold text-mint hover:bg-sea-mid"
            >
              Record restock
            </button>
            {msg && <p className="font-medium text-ink-soft">{msg}</p>}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-panel">
        <div className="border-b border-line bg-surface px-4 py-3">
          <h3 className="font-display text-xl font-bold">CD movement log</h3>
        </div>
        {cdActivity.length === 0 ? (
          <p className="p-4 text-sm text-ink-soft/70">No controlled drug movements recorded yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-sea/5 text-xs uppercase text-ink-soft">
              <tr>
                <th className="px-4 py-2">When</th>
                <th className="px-4 py-2">Action</th>
                <th className="px-4 py-2">Drug</th>
                <th className="px-4 py-2">Bag</th>
                <th className="px-4 py-2">By / Witness</th>
              </tr>
            </thead>
            <tbody>
              {cdActivity.slice(0, 30).map((a) => (
                <tr key={a.id} className="border-t border-line/70">
                  <td className="px-4 py-2 whitespace-nowrap text-xs">
                    {format(new Date(a.timestamp), 'dd MMM HH:mm')}
                  </td>
                  <td className="px-4 py-2 capitalize">{a.type.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-2">
                    {a.medicationName ?? '—'}
                    {a.quantity != null ? ` ×${a.quantity}` : ''}
                  </td>
                  <td className="px-4 py-2">{a.bagCode}</td>
                  <td className="px-4 py-2 text-xs">
                    {a.practitionerName}
                    {a.witnessName ? ` / ${a.witnessName}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
