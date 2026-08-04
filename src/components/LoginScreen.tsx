import { Lock, Shield, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'

type Mode = 'staff' | 'admin'

export function LoginScreen({ onLoggedIn }: { onLoggedIn: (role: Mode) => void }) {
  const { state, setCurrentUser, verifyPin, resetDemo } = useApp()
  const [mode, setMode] = useState<Mode>('staff')
  const [userId, setUserId] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  const options = useMemo(
    () =>
      state.staff.filter((s) =>
        mode === 'admin' ? s.role === 'management' : s.role === 'staff',
      ),
    [state.staff, mode],
  )

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!userId) {
      setError('Select your name from the list.')
      return
    }
    if (!pin.trim()) {
      setError('Enter your PIN.')
      return
    }

    const user = state.staff.find((s) => s.id === userId)
    if (!user) {
      setError('Selected user not found. Try resetting demo data.')
      return
    }

    if (mode === 'admin' && user.role !== 'management') {
      setError('This account is not an admin. Switch to Staff login.')
      return
    }
    if (mode === 'staff' && user.role !== 'staff') {
      setError('Use Admin login for this account.')
      return
    }

    if (!verifyPin(userId, pin.trim())) {
      setError(`Incorrect PIN for ${user.name}. Demo PIN is ${user.pin}.`)
      return
    }

    setCurrentUser(userId)
    onLoggedIn(mode)
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img
            src="/doserx-logo.png"
            alt="DoseRX"
            className="mx-auto mb-4 h-16 w-16 rounded-2xl object-cover shadow-md ring-1 ring-line"
          />
          <h1 className="font-display text-4xl font-extrabold text-ink">DoseRX</h1>
          <p className="mt-1 text-sm text-ink-soft">Medication & controlled drug control</p>
        </div>

        <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm">
          <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-surface p-1">
            <button
              type="button"
              onClick={() => {
                setMode('staff')
                setUserId('')
                setPin('')
                setError('')
              }}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold transition ${
                mode === 'staff' ? 'bg-sea text-mint shadow-sm' : 'text-ink-soft hover:text-ink'
              }`}
            >
              <UserRound size={16} /> Staff
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('admin')
                setUserId('')
                setPin('')
                setError('')
              }}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold transition ${
                mode === 'admin' ? 'bg-sea text-mint shadow-sm' : 'text-ink-soft hover:text-ink'
              }`}
            >
              <Shield size={16} /> Admin
            </button>
          </div>

          <p className="mb-4 text-sm text-ink-soft">
            {mode === 'staff'
              ? 'Staff can sign bags in/out, administer medications, and record waste.'
              : 'Admins have full oversight — stock control, labels, audit logs, and reports.'}
          </p>

          {options.length === 0 ? (
            <div className="space-y-3 rounded-lg border border-coral/30 bg-coral-soft/40 p-4 text-sm">
              <p className="font-semibold text-coral">No {mode} accounts found in saved data.</p>
              <button
                type="button"
                onClick={() => {
                  resetDemo()
                  setError('')
                  setUserId('')
                  setPin('')
                }}
                className="rounded-lg bg-sea px-4 py-2 text-sm font-bold text-mint"
              >
                Reset demo data
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <label className="block text-sm">
                <span className="mb-1 block font-semibold">
                  {mode === 'staff' ? 'Staff name' : 'Admin name'}
                </span>
                <select
                  value={userId}
                  onChange={(e) => {
                    setUserId(e.target.value)
                    setError('')
                  }}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2.5"
                >
                  <option value="">Select name…</option>
                  {options.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {mode === 'staff'
                        ? ` (${s.grade === 'AP' ? 'AP' : s.grade})`
                        : ' · Admin'}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <span className="mb-1 flex items-center gap-1.5 font-semibold">
                  <Lock size={14} /> Your PIN
                </span>
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value.replace(/\D/g, ''))
                    setError('')
                  }}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 tracking-[0.35em]"
                  placeholder="••••"
                />
              </label>

              {error && <p className="text-sm font-medium text-coral">{error}</p>}

              <button
                type="submit"
                className="w-full rounded-lg bg-sea py-3 text-sm font-bold text-mint hover:bg-sea-mid"
              >
                {mode === 'staff' ? 'Sign in as staff' : 'Sign in as admin'}
              </button>
            </form>
          )}

          <div className="mt-4 space-y-1 text-center text-[11px] text-ink-soft/70">
            <p>Demo staff PINs: Aoife 1111 · Conor 2222 · Siobhán 3333 · James 4444 · Niamh 5555 · Mark 6666</p>
            <p>Demo admin PINs: Claire 9999 · Tom 8888</p>
            <button
              type="button"
              onClick={() => {
                resetDemo()
                setUserId('')
                setPin('')
                setError('')
              }}
              className="mt-2 text-sea-mid underline"
            >
              Reset demo data
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
