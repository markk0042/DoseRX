import { format } from 'date-fns'
import { CalendarPlus, ChevronDown, ChevronRight, Lock, Package, Pencil } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { daysUntil } from '../lib/format'
import type { ClinicalGrade, DrugBag } from '../types'
import { GradeBadge, StatusBadge } from './Badges'
import { StockItemCard } from './QuantityAmpoules'

export function EventPackView() {
  const { currentUser, isManagement, createEventPack, state, isExpired, expiringSoon } = useApp()
  const [name, setName] = useState('Festival Response Pack')
  const [grade, setGrade] = useState<ClinicalGrade>('Paramedic')
  const [controlled, setControlled] = useState(true)
  const [eventName, setEventName] = useState('Electric Picnic')
  const [startsAt, setStartsAt] = useState(new Date().toISOString().slice(0, 16))
  const [endsAt, setEndsAt] = useState(
    new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString().slice(0, 16),
  )
  const [vehicle, setVehicle] = useState('Event Control')
  const [msg, setMsg] = useState('')
  const [openBagId, setOpenBagId] = useState<string | null>(null)

  if (!isManagement || !currentUser) {
    return <p className="text-sm text-ink-soft">Only admins can create time-boxed event packs.</p>
  }

  const eventBags = state.bags.filter((b) => b.eventName)
  const activeBags = eventBags.filter((b) => !isPackExpired(b))
  const inactiveBags = eventBags.filter((b) => isPackExpired(b))

  const submit = () => {
    if (!eventName.trim() || !endsAt) {
      setMsg('Event name and end time required.')
      return
    }
    const id = createEventPack({
      manager: currentUser,
      name,
      grade,
      controlled,
      eventName,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      vehicle,
    })
    setMsg(`Event pack created (${id.slice(0, 8)}…). Privilege ends ${new Date(endsAt).toLocaleString()}.`)
    setOpenBagId(id)
  }

  const toggleBag = (id: string) => {
    setOpenBagId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-line bg-panel p-4">
        <div className="mb-1 flex items-center gap-2">
          <CalendarPlus className="text-sea" size={20} />
          <h2 className="font-display text-2xl font-bold">Multi-agency / event packs</h2>
        </div>
        <p className="text-sm text-ink-soft">
          Temporary bags for festivals and multi-agency deployments with a privilege end time. Sign-out is blocked after
          expiry. Click any pack (active or expired) to view medications and batch numbers.
        </p>
      </div>

      <div className="mx-auto w-full max-w-xl space-y-3 rounded-xl border border-line bg-panel p-4">
        <label className="block text-sm">
          <span className="mb-1 block font-semibold">Pack name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-line bg-surface px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold">Event name</span>
          <input value={eventName} onChange={(e) => setEventName(e.target.value)} className="w-full rounded-lg border border-line bg-surface px-3 py-2" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">Clinical grade stock</span>
            <select value={grade} onChange={(e) => setGrade(e.target.value as ClinicalGrade)} className="w-full rounded-lg border border-line bg-surface px-3 py-2">
              <option value="EMT">EMT</option>
              <option value="Paramedic">Paramedic</option>
              <option value="AP">Advanced Paramedic</option>
            </select>
          </label>
          <label className="flex items-end gap-2 text-sm pb-2">
            <input type="checkbox" checked={controlled} onChange={(e) => setControlled(e.target.checked)} />
            <span className="font-semibold">
              Also include controlled drugs (adds CDs on top of {grade === 'AP' ? 'AP' : grade} formulary)
            </span>
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">Privilege starts</span>
            <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="w-full rounded-lg border border-line bg-surface px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">Privilege ends</span>
            <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="w-full rounded-lg border border-line bg-surface px-3 py-2" />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold">Vehicle / post</span>
          <input value={vehicle} onChange={(e) => setVehicle(e.target.value)} className="w-full rounded-lg border border-line bg-surface px-3 py-2" />
        </label>
        <button type="button" onClick={submit} className="rounded-lg bg-sea px-4 py-2.5 text-sm font-bold text-mint">
          Create event pack
        </button>
        {msg && <p className="text-sm text-ink-soft">{msg}</p>}
      </div>

      <div className="rounded-xl border border-line bg-panel p-4">
        <h3 className="mb-1 font-display text-xl font-bold">Active / scheduled event packs</h3>
        <p className="mb-3 text-xs text-ink-soft">
          Click a pack to expand medications, batch / lot numbers, qty and expiry — works for active and expired packs.
        </p>

        {eventBags.length === 0 ? (
          <p className="text-sm text-ink-soft">None yet.</p>
        ) : (
          <div className="space-y-4">
            {activeBags.length > 0 && (
              <PackSection
                title={`Active (${activeBags.length})`}
                bags={activeBags}
                openBagId={openBagId}
                onToggle={toggleBag}
                isExpired={isExpired}
                expiringSoon={expiringSoon}
              />
            )}
            {inactiveBags.length > 0 && (
              <PackSection
                title={`Inactive / expired (${inactiveBags.length})`}
                bags={inactiveBags}
                openBagId={openBagId}
                onToggle={toggleBag}
                isExpired={isExpired}
                expiringSoon={expiringSoon}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function isPackExpired(bag: DrugBag) {
  return bag.eventEndsAt ? new Date(bag.eventEndsAt).getTime() < Date.now() : false
}

function PackSection({
  title,
  bags,
  openBagId,
  onToggle,
  isExpired,
  expiringSoon,
}: {
  title: string
  bags: DrugBag[]
  openBagId: string | null
  onToggle: (id: string) => void
  isExpired: (item: DrugBag['items'][number]) => boolean
  expiringSoon: (item: DrugBag['items'][number]) => boolean
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-soft">{title}</p>
      <ul className="space-y-2">
        {bags.map((b) => {
          const expired = isPackExpired(b)
          const open = openBagId === b.id
          return (
            <li key={b.id} className="overflow-hidden rounded-lg border border-line bg-surface">
              <button
                type="button"
                onClick={() => onToggle(b.id)}
                className="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition hover:bg-mint/40"
                aria-expanded={open}
              >
                <div className="flex min-w-0 items-start gap-2">
                  <span className="mt-0.5 text-sea">
                    {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </span>
                  <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${b.type === 'controlled' ? 'bg-cd text-white' : 'bg-sea text-mint'}`}>
                    {b.type === 'controlled' ? <Lock size={14} /> : <Package size={14} />}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold">
                      {b.code} · {b.eventName}
                    </p>
                    <p className="text-xs text-ink-soft">
                      {b.name} · {b.items.length} meds · seal {b.sealNumber}
                      {b.eventEndsAt ? ` · ends ${new Date(b.eventEndsAt).toLocaleString()}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <GradeBadge grade={b.grade} controlled={b.type === 'controlled'} event={b.type === 'event' || !!b.eventName} />
                  <StatusBadge status={b.status} />
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${
                      expired ? 'bg-coral-soft text-coral' : 'bg-ok-soft text-ok'
                    }`}
                  >
                    {expired ? 'Expired' : 'Active'}
                  </span>
                </div>
              </button>

              {open && (
                <div className="border-t border-line bg-panel">
                  <div className="flex flex-wrap items-center gap-2 border-b border-line/70 px-3 py-2">
                    <EventPackRename bag={b} />
                  </div>
                  <div className="flex flex-wrap gap-3 border-b border-line/70 px-3 py-2 text-xs text-ink-soft">
                    <span>
                      Privilege:{' '}
                      <strong className="text-ink">
                        {b.eventStartsAt ? format(new Date(b.eventStartsAt), 'dd MMM yyyy HH:mm') : '—'}
                      </strong>
                      {' → '}
                      <strong className="text-ink">
                        {b.eventEndsAt ? format(new Date(b.eventEndsAt), 'dd MMM yyyy HH:mm') : '—'}
                      </strong>
                    </span>
                    {b.assignedVehicle && (
                      <span>
                        Post: <strong className="text-ink">{b.assignedVehicle}</strong>
                      </span>
                    )}
                    <span>
                      Tag: <strong className="text-ink capitalize">{b.tagStatus}</strong>
                    </span>
                  </div>

                  {b.items.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-ink-soft">No medications in this pack.</p>
                  ) : (
                    <div className="grid gap-2 p-3 sm:grid-cols-2">
                      {b.items.map((item) => {
                        const itemExpired = isExpired(item)
                        const soon = !itemExpired && expiringSoon(item)
                        const days = daysUntil(item.expiryDate)
                        const status = (
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                              itemExpired
                                ? 'bg-coral-soft text-coral'
                                : soon
                                  ? 'bg-amber-soft text-ink'
                                  : item.quantity <= 0
                                    ? 'bg-coral-soft text-coral'
                                    : item.quantity < item.parLevel
                                      ? 'bg-amber-soft text-ink'
                                      : 'bg-ok-soft text-ok'
                            }`}
                          >
                            {itemExpired
                              ? 'Expired'
                              : item.quantity <= 0
                                ? 'Empty'
                                : soon
                                  ? 'Expiring'
                                  : item.quantity < item.parLevel
                                    ? 'Low'
                                    : 'OK'}
                          </span>
                        )
                        return (
                          <StockItemCard
                            key={item.id}
                            name={item.name}
                            presentation={item.presentation}
                            quantity={item.quantity}
                            parLevel={item.parLevel}
                            unit={item.unit}
                            lotNumber={item.lotNumber}
                            expiryLabel={`${format(new Date(item.expiryDate), 'dd MMM yyyy')}${
                              itemExpired ? '' : days === 0 ? ' · today' : ` · ${days}d`
                            }`}
                            controlled={item.controlled}
                            schedule={item.schedule}
                            status={status}
                          />
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function EventPackRename({ bag }: { bag: DrugBag }) {
  const { currentUser, renameBag } = useApp()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(bag.name)
  const [note, setNote] = useState('')

  useEffect(() => {
    setDraft(bag.name)
  }, [bag.id, bag.name])

  if (!currentUser) return null

  const save = () => {
    const trimmed = draft.trim()
    if (!trimmed) {
      setNote('Name cannot be empty.')
      return
    }
    if (renameBag(bag.id, trimmed, currentUser)) {
      setEditing(false)
      setNote('Name updated.')
    } else {
      setNote('Rename failed.')
    }
  }

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ink-soft">Pack name:</span>
        <strong>{bag.name}</strong>
        <button
          type="button"
          onClick={() => {
            setDraft(bag.name)
            setEditing(true)
            setNote('')
          }}
          className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-0.5 text-[11px] font-bold text-sea-mid"
        >
          <Pencil size={11} /> Rename
        </button>
        {note && <span className="text-xs text-ink-soft">{note}</span>}
      </div>
    )
  }

  return (
    <div className="flex w-full flex-wrap items-center gap-2 text-sm">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save()
          if (e.key === 'Escape') {
            setDraft(bag.name)
            setEditing(false)
          }
        }}
        maxLength={80}
        className="min-w-[200px] flex-1 rounded-lg border border-line bg-surface px-2 py-1 text-sm font-semibold"
        autoFocus
      />
      <button type="button" onClick={save} className="rounded-lg bg-sea px-3 py-1 text-xs font-bold text-mint">
        Save
      </button>
      <button
        type="button"
        onClick={() => {
          setDraft(bag.name)
          setEditing(false)
        }}
        className="rounded-lg border border-line px-3 py-1 text-xs font-semibold"
      >
        Cancel
      </button>
      {note && <span className="text-xs text-coral">{note}</span>}
    </div>
  )
}
