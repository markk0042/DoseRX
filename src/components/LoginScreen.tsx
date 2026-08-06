import { KeyRound, Lock, RotateCcw, Shield, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import type { StaffMember } from '../types'
import { BusyOverlay } from './BusyOverlay'

type Mode = 'staff' | 'admin'

export function LoginScreen({ onLoggedIn }: { onLoggedIn: (role: Mode) => void }) {
  const { state, setCurrentUser, verifyPin, resetDemo } = useApp()
  const [mode, setMode] = useState<Mode>('staff')
  const [userId, setUserId] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const options = useMemo(
    () =>
      state.staff.filter((s) =>
        mode === 'admin' ? s.role === 'management' : s.role === 'staff',
      ),
    [state.staff, mode],
  )

  const applyDemoUser = (user: StaffMember) => {
    setUserId(user.id)
    setPin(user.pin)
    setError('')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
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

    setBusy(true)
    await new Promise((r) => setTimeout(r, 450))
    setCurrentUser(userId)
    onLoggedIn(mode)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#d8ebe6_0%,_transparent_55%),radial-gradient(ellipse_at_bottom_right,_#c5d9e8_0%,_transparent_45%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-16 h-64 w-64 rounded-full bg-sea/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 bottom-10 h-56 w-56 rounded-full bg-amber/15 blur-3xl"
      />

      {busy && (
        <BusyOverlay
          label="Signing in…"
          detail={mode === 'admin' ? 'Opening admin oversight' : 'Opening staff shift actions'}
        />
      )}

      <div className="relative w-full max-w-md">
        <div className="mb-7 text-center">
          <img
            src="/doserx-logo.png"
            alt="DoseRX"
            className="mx-auto mb-4 h-[4.5rem] w-[4.5rem] rounded-2xl object-cover shadow-lg ring-1 ring-line/80"
          />
          <h1 className="font-display text-5xl font-extrabold tracking-tight text-ink">DoseRX</h1>
          <p className="mt-1.5 text-sm text-ink-soft">Medication & controlled drug control</p>
        </div>

        <div className="rounded-2xl border border-line/80 bg-panel/95 p-6 shadow-[0_20px_50px_-28px_rgba(11,58,74,0.45)] backdrop-blur-sm">
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-surface p-1">
            <button
              type="button"
              onClick={() => {
                setMode('staff')
                setUserId('')
                setPin('')
                setError('')
              }}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold transition ${
                mode === 'staff' ? 'bg-sea text-mint shadow-sm' : 'text-ink-soft hover:bg-panel hover:text-ink'
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
                mode === 'admin' ? 'bg-sea text-mint shadow-sm' : 'text-ink-soft hover:bg-panel hover:text-ink'
              }`}
            >
              <Shield size={16} /> Admin
            </button>
          </div>

          <p className="mb-5 text-sm leading-relaxed text-ink-soft">
            {mode === 'staff'
              ? 'Sign bags in/out, administer medications, and record waste with a witness PIN.'
              : 'Full oversight — stock, QR labels, audits, map, and analytical reports.'}
          </p>

          {options.length === 0 ? (
            <div className="space-y-3 rounded-xl border border-coral/30 bg-coral-soft/40 p-4 text-sm">
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
                <span className="mb-1.5 block font-semibold text-ink">
                  {mode === 'staff' ? 'Staff name' : 'Admin name'}
                </span>
                <select
                  value={userId}
                  onChange={(e) => {
                    setUserId(e.target.value)
                    setError('')
                  }}
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 outline-none transition focus:border-sea-mid focus:ring-2 focus:ring-sea/15"
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
                <span className="mb-1.5 flex items-center gap-1.5 font-semibold text-ink">
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
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 tracking-[0.4em] outline-none transition focus:border-sea-mid focus:ring-2 focus:ring-sea/15"
                  placeholder="••••"
                />
              </label>

              {error && (
                <p className="rounded-lg bg-coral-soft/50 px-3 py-2 text-sm font-medium text-coral">{error}</p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-sea py-3 text-sm font-bold text-mint transition hover:bg-sea-mid disabled:opacity-60"
              >
                {busy ? 'Signing in…' : mode === 'staff' ? 'Sign in as staff' : 'Sign in as admin'}
              </button>
            </form>
          )}

          {options.length > 0 && (
            <div className="mt-6 rounded-xl border border-dashed border-sea/25 bg-mint/50 p-3.5">
              <div className="mb-2.5 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-sea/10 text-sea">
                  <KeyRound size={13} />
                </span>
                <div>
                  <p className="text-xs font-bold text-ink">Demo access</p>
                  <p className="text-[10px] text-ink-soft">Tap a person to fill name + PIN</p>
                </div>
              </div>
              <ul className={`grid gap-2 ${mode === 'admin' ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
                {options.map((s) => {
                  const selected = userId === s.id
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => applyDemoUser(s)}
                        className={`flex w-full flex-col items-start rounded-lg border px-2.5 py-2 text-left transition ${
                          selected
                            ? 'border-sea bg-panel shadow-sm ring-1 ring-sea/20'
                            : 'border-line/70 bg-panel/80 hover:border-sea/40 hover:bg-panel'
                        }`}
                      >
                        <span className="w-full truncate text-xs font-semibold text-ink">
                          {s.name.split(' ')[0]}
                        </span>
                        <span className="mt-0.5 flex w-full items-center justify-between gap-1">
                          <span className="text-[10px] text-ink-soft">
                            {mode === 'staff' ? (s.grade === 'AP' ? 'AP' : s.grade) : 'Admin'}
                          </span>
                          <span className="font-mono text-[11px] font-bold tracking-widest text-sea">
                            {s.pin}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              resetDemo()
              setUserId('')
              setPin('')
              setError('')
            }}
            className="mt-4 inline-flex w-full items-center justify-center gap-1.5 text-[11px] font-medium text-ink-soft transition hover:text-sea-mid"
          >
            <RotateCcw size={11} /> Reset demo data
          </button>
        </div>
      </div>
    </div>
  )
}
