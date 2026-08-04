import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import type { StaffMember } from '../types'
import { BusyOverlay } from './BusyOverlay'

/**
 * Witness selected from dropdown; they must enter their own PIN to verify.
 * Logged-in user is the actor (holder / administrator / returner).
 */
export function WitnessVerify({
  actor,
  onVerified,
  submitLabel = 'Confirm with witness PIN',
  excludeIds = [],
  busyLabel = 'Submitting…',
  busyDetail = 'Capturing location and saving — please wait.',
}: {
  actor: StaffMember
  onVerified: (witness: StaffMember) => void | Promise<void>
  submitLabel?: string
  excludeIds?: string[]
  busyLabel?: string
  busyDetail?: string
}) {
  const { state, verifyPin } = useApp()
  const [witnessId, setWitnessId] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [verifiedName, setVerifiedName] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const witnesses = useMemo(
    () =>
      state.staff.filter(
        (s) => s.id !== actor.id && !excludeIds.includes(s.id),
      ),
    [state.staff, actor.id, excludeIds],
  )

  const submit = async () => {
    if (busy) return
    if (!witnessId) {
      setError('Select a witness from the list.')
      return
    }
    if (witnessId === actor.id) {
      setError('Witness must be a different person.')
      return
    }
    if (!verifyPin(witnessId, pin.trim())) {
      setError('Witness PIN incorrect.')
      setVerifiedName(null)
      return
    }
    const witness = state.staff.find((s) => s.id === witnessId)
    if (!witness) return
    setError('')
    setVerifiedName(witness.name)
    setBusy(true)
    try {
      await Promise.resolve(onVerified(witness))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-cd/25 bg-cd-soft/20 p-4">
      {busy && <BusyOverlay label={busyLabel} detail={busyDetail} />}
      <p className="text-sm font-semibold text-cd">Witness verification</p>
      <p className="text-xs text-ink-soft">
        Acting as <strong>{actor.name}</strong>. Select witness, then they enter their PIN.
      </p>
      <label className="block text-sm">
        <span className="mb-1 block font-semibold">Witness name</span>
        <select
          value={witnessId}
          disabled={busy}
          onChange={(e) => {
            setWitnessId(e.target.value)
            setPin('')
            setVerifiedName(null)
            setError('')
          }}
          className="w-full rounded-lg border border-line bg-panel px-3 py-2 disabled:opacity-50"
        >
          <option value="">Select witness…</option>
          {witnesses.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.role === 'management' ? 'Admin' : s.grade === 'AP' ? 'AP' : s.grade})
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-semibold">Witness PIN</span>
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          disabled={busy}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          className="w-full rounded-lg border border-line bg-panel px-3 py-2 tracking-[0.3em] disabled:opacity-50"
          placeholder="••••"
        />
      </label>
      <button
        type="button"
        onClick={() => void submit()}
        disabled={busy}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-cd px-4 py-2.5 text-sm font-bold text-white hover:bg-cd/90 disabled:opacity-60"
      >
        {busy ? 'Working…' : submitLabel}
      </button>
      {verifiedName && !busy && (
        <p className="text-sm font-medium text-ok">Witness verified: {verifiedName}</p>
      )}
      {error && <p className="text-sm font-medium text-coral">{error}</p>}
    </div>
  )
}
