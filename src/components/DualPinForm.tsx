import { useState } from 'react'
import { useApp } from '../context/AppContext'
import type { StaffMember } from '../types'
import { BusyOverlay } from './BusyOverlay'

/** Dual PIN entry — logger + witness identified by PIN */
export function DualPinForm({
  loggerLabel = 'Logger / holder PIN',
  witnessLabel = 'Witness PIN',
  excludeIds = [],
  onVerified,
  submitLabel = 'Confirm with dual PIN',
  busyLabel = 'Submitting…',
  busyDetail = 'Saving — please wait.',
}: {
  loggerLabel?: string
  witnessLabel?: string
  excludeIds?: string[]
  onVerified: (logger: StaffMember, witness: StaffMember) => void | Promise<void>
  submitLabel?: string
  busyLabel?: string
  busyDetail?: string
}) {
  const { findStaffByPin } = useApp()
  const [loggerPin, setLoggerPin] = useState('')
  const [witnessPin, setWitnessPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (busy) return
    const logger = findStaffByPin(loggerPin.trim())
    const witness = findStaffByPin(witnessPin.trim())
    if (!logger) {
      setError('Logger PIN not recognised.')
      return
    }
    if (!witness) {
      setError('Witness PIN not recognised.')
      return
    }
    if (logger.id === witness.id) {
      setError('Logger and witness must be different people.')
      return
    }
    if (excludeIds.includes(logger.id) || excludeIds.includes(witness.id)) {
      setError('Selected staff not allowed for this action.')
      return
    }
    setError('')
    setBusy(true)
    try {
      await Promise.resolve(onVerified(logger, witness))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
      {busy && <BusyOverlay label={busyLabel} detail={busyDetail} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-semibold">{loggerLabel}</span>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={loggerPin}
            disabled={busy}
            onChange={(e) => setLoggerPin(e.target.value.replace(/\D/g, ''))}
            className="w-full rounded-lg border border-line bg-panel px-3 py-2 tracking-[0.3em] disabled:opacity-50"
            placeholder="••••"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold">{witnessLabel}</span>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={witnessPin}
            disabled={busy}
            onChange={(e) => setWitnessPin(e.target.value.replace(/\D/g, ''))}
            className="w-full rounded-lg border border-line bg-panel px-3 py-2 tracking-[0.3em] disabled:opacity-50"
            placeholder="••••"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={() => void submit()}
        disabled={busy}
        className="rounded-lg bg-sea px-4 py-2.5 text-sm font-bold text-mint hover:bg-sea-mid disabled:opacity-60"
      >
        {busy ? 'Working…' : submitLabel}
      </button>
      {error && <p className="text-sm font-medium text-coral">{error}</p>}
    </div>
  )
}
