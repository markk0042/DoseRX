import { useState } from 'react'
import { useApp } from '../context/AppContext'
import type { StaffMember } from '../types'

/** Dual PIN entry — logger + witness identified by PIN */
export function DualPinForm({
  loggerLabel = 'Logger / holder PIN',
  witnessLabel = 'Witness PIN',
  excludeIds = [],
  onVerified,
  submitLabel = 'Confirm with dual PIN',
}: {
  loggerLabel?: string
  witnessLabel?: string
  excludeIds?: string[]
  onVerified: (logger: StaffMember, witness: StaffMember) => void
  submitLabel?: string
}) {
  const { findStaffByPin } = useApp()
  const [loggerPin, setLoggerPin] = useState('')
  const [witnessPin, setWitnessPin] = useState('')
  const [error, setError] = useState('')

  const submit = () => {
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
    onVerified(logger, witness)
  }

  return (
    <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-semibold">{loggerLabel}</span>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={loggerPin}
            onChange={(e) => setLoggerPin(e.target.value.replace(/\D/g, ''))}
            className="w-full rounded-lg border border-line bg-panel px-3 py-2 tracking-[0.3em]"
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
            onChange={(e) => setWitnessPin(e.target.value.replace(/\D/g, ''))}
            className="w-full rounded-lg border border-line bg-panel px-3 py-2 tracking-[0.3em]"
            placeholder="••••"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={submit}
        className="rounded-lg bg-sea px-4 py-2.5 text-sm font-bold text-mint hover:bg-sea-mid"
      >
        {submitLabel}
      </button>
      {error && <p className="text-sm font-medium text-coral">{error}</p>}
      <p className="text-[11px] text-ink-soft/70">Demo PINs: management 9999/8888 · staff 1111–6666</p>
    </div>
  )
}
