import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import type { StaffMember } from '../types'

/**
 * Witness selected from dropdown; they must enter their own PIN to verify.
 * Logged-in user is the actor (holder / administrator / returner).
 */
export function WitnessVerify({
  actor,
  onVerified,
  submitLabel = 'Confirm with witness PIN',
  excludeIds = [],
}: {
  actor: StaffMember
  onVerified: (witness: StaffMember) => void
  submitLabel?: string
  excludeIds?: string[]
}) {
  const { state, verifyPin } = useApp()
  const [witnessId, setWitnessId] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [verifiedName, setVerifiedName] = useState<string | null>(null)

  const witnesses = useMemo(
    () =>
      state.staff.filter(
        (s) => s.id !== actor.id && !excludeIds.includes(s.id),
      ),
    [state.staff, actor.id, excludeIds],
  )

  const submit = () => {
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
    onVerified(witness)
  }

  return (
    <div className="space-y-3 rounded-xl border border-cd/25 bg-cd-soft/20 p-4">
      <p className="text-sm font-semibold text-cd">Witness verification</p>
      <p className="text-xs text-ink-soft">
        Acting as <strong>{actor.name}</strong>. Select witness, then they enter their PIN.
      </p>
      <label className="block text-sm">
        <span className="mb-1 block font-semibold">Witness name</span>
        <select
          value={witnessId}
          onChange={(e) => {
            setWitnessId(e.target.value)
            setPin('')
            setVerifiedName(null)
            setError('')
          }}
          className="w-full rounded-lg border border-line bg-panel px-3 py-2"
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
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          className="w-full rounded-lg border border-line bg-panel px-3 py-2 tracking-[0.3em]"
          placeholder="••••"
        />
      </label>
      <button
        type="button"
        onClick={submit}
        className="rounded-lg bg-cd px-4 py-2.5 text-sm font-bold text-white hover:bg-cd/90"
      >
        {submitLabel}
      </button>
      {verifiedName && (
        <p className="text-sm font-medium text-ok">Witness verified: {verifiedName}</p>
      )}
      {error && <p className="text-sm font-medium text-coral">{error}</p>}
    </div>
  )
}
