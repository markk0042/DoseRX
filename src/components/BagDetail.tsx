import { format } from 'date-fns'
import { ArrowLeft, Lock, Package, Pencil } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { daysUntil } from '../lib/format'
import { GradeBadge, StatusBadge } from './Badges'
import { StockItemCard } from './QuantityAmpoules'

export function BagDetail({ bagId, onBack }: { bagId: string; onBack: () => void }) {
  const {
    getBag,
    isExpired,
    expiringSoon,
    currentUser,
    resignSeal,
    renameBag,
    isManagement,
    state,
  } = useApp()
  const bag = getBag(bagId)
  const [seal, setSeal] = useState('')
  const [witnessId, setWitnessId] = useState('')
  const [msg, setMsg] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')

  useEffect(() => {
    if (bag) {
      setNameDraft(bag.name)
      setEditingName(false)
    }
  }, [bag?.id, bag?.name])

  if (!bag) {
    return (
      <div>
        <button type="button" onClick={onBack} className="mb-3 text-sm text-sea-mid">
          ← Back
        </button>
        <p>Bag not found.</p>
      </div>
    )
  }

  const applySeal = () => {
    if (!currentUser || !witnessId || !seal) {
      setMsg('Sign in, enter new seal, and select a witness.')
      return
    }
    const witness = state.staff.find((s) => s.id === witnessId)
    if (!witness || witness.id === currentUser.id) {
      setMsg('Witness must be a different practitioner.')
      return
    }
    resignSeal(bag.id, seal, currentUser, witness)
    setSeal('')
    setMsg(`New seal recorded · last checked updated to ${format(new Date(), 'dd MMM yyyy HH:mm')}.`)
  }

  const saveName = () => {
    if (!currentUser || !isManagement) return
    const trimmed = nameDraft.trim()
    if (!trimmed) {
      setMsg('Bag name cannot be empty.')
      return
    }
    if (renameBag(bag.id, trimmed, currentUser)) {
      setEditingName(false)
      setMsg(`Bag renamed to “${trimmed}”.`)
    } else {
      setMsg('Could not rename bag.')
    }
  }

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm font-semibold text-sea-mid hover:underline"
      >
        <ArrowLeft size={14} /> Back to bags
      </button>

      <div className="rounded-xl border border-line bg-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                bag.type === 'controlled' ? 'bg-cd text-white' : 'bg-sea text-mint'
              }`}
            >
              {bag.type === 'controlled' ? <Lock size={22} /> : <Package size={22} />}
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-3xl font-extrabold">{bag.code}</h2>

              {editingName && isManagement ? (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveName()
                      if (e.key === 'Escape') {
                        setNameDraft(bag.name)
                        setEditingName(false)
                      }
                    }}
                    autoFocus
                    maxLength={80}
                    className="min-w-[220px] flex-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-semibold outline-none focus:border-sea-mid"
                  />
                  <button
                    type="button"
                    onClick={saveName}
                    className="rounded-lg bg-sea px-3 py-1.5 text-xs font-bold text-mint"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNameDraft(bag.name)
                      setEditingName(false)
                    }}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  <p className="text-ink-soft">{bag.name}</p>
                  {isManagement && (
                    <button
                      type="button"
                      onClick={() => {
                        setNameDraft(bag.name)
                        setEditingName(true)
                        setMsg('')
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-0.5 text-[11px] font-bold text-sea-mid hover:border-sea-mid"
                    >
                      <Pencil size={11} /> Rename
                    </button>
                  )}
                </div>
              )}

              <div className="mt-2 flex flex-wrap gap-2">
                <GradeBadge
                  grade={bag.grade}
                  controlled={bag.type === 'controlled'}
                  event={bag.type === 'event' || !!bag.eventName}
                />
                <StatusBadge status={bag.status} />
                {bag.assignedVehicle && (
                  <span className="rounded bg-surface px-2 py-0.5 text-xs font-medium">
                    {bag.assignedVehicle}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="text-ink-soft/70">Current seal</p>
            <p className="font-display text-2xl font-bold">{bag.sealNumber}</p>
            <p className="text-xs text-ink-soft/60">
              Last check:{' '}
              {bag.lastCheckedAt ? format(new Date(bag.lastCheckedAt), 'dd MMM yyyy HH:mm') : 'Never'}
              {bag.lastCheckedBy ? ` · ${bag.lastCheckedBy}` : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-panel p-4 sm:p-5">
        <h3 className="mb-1 font-display text-xl font-bold">
          Inventory · {bag.items.length} medications
          {bag.type === 'controlled' && ' (Controlled Drugs Register)'}
        </h3>
        <p className="mb-4 text-xs text-ink-soft">
          Filled ampoules show units on hand; empty slots show remaining capacity to par.
        </p>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {bag.items.map((item) => {
            const expired = isExpired(item)
            const soon = !expired && expiringSoon(item)
            const status = expired ? (
              <span className="rounded bg-coral-soft px-2 py-0.5 text-[10px] font-bold uppercase text-coral">
                Expired
              </span>
            ) : soon ? (
              <span className="rounded bg-amber-soft px-2 py-0.5 text-[10px] font-bold uppercase text-ink">
                {daysUntil(item.expiryDate)}d left
              </span>
            ) : item.quantity === 0 ? (
              <span className="rounded bg-coral-soft px-2 py-0.5 text-[10px] font-bold uppercase text-coral">
                Empty
              </span>
            ) : (
              <span className="rounded bg-ok-soft px-2 py-0.5 text-[10px] font-bold uppercase text-ok">
                OK
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
                expiryLabel={format(new Date(item.expiryDate), 'MMM yyyy')}
                controlled={item.controlled}
                schedule={item.schedule}
                status={status}
              />
            )
          })}
        </div>
      </div>

      <div className="rounded-xl border border-line bg-panel p-4">
        <h3 className="mb-1 font-display text-xl font-bold">Apply / replace seal</h3>
        <p className="mb-3 text-xs text-ink-soft">
          Resealing marks the bag sealed and updates <strong>last checked</strong> to now (with your name).
          For a full count audit, use <strong>Audit Bags</strong> in the menu.
        </p>
        <div className="flex flex-wrap gap-3">
          <input
            value={seal}
            onChange={(e) => setSeal(e.target.value)}
            placeholder="New seal number"
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-sea-mid"
          />
          <select
            value={witnessId}
            onChange={(e) => setWitnessId(e.target.value)}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-sea-mid"
          >
            <option value="">Witness…</option>
            {state.staff
              .filter((s) => s.id !== currentUser?.id)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.grade})
                </option>
              ))}
          </select>
          <button
            type="button"
            onClick={applySeal}
            className="rounded-lg bg-sea px-4 py-2 text-sm font-semibold text-mint hover:bg-sea-mid"
          >
            Record seal
          </button>
        </div>
        {msg && <p className="mt-2 text-sm text-ink-soft">{msg}</p>}
      </div>
    </div>
  )
}
