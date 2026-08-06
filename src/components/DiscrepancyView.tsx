import { format } from 'date-fns'
import { AlertTriangle, CheckCircle2, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { bagsInStaffScope } from '../lib/bagAccess'
import { BusyOverlay } from './BusyOverlay'
import { WitnessVerify } from './WitnessVerify'
import type { StaffMember } from '../types'

export function DiscrepancyView() {
  const {
    state,
    currentUser,
    isManagement,
    reportDiscrepancy,
    updateDiscrepancy,
    openDiscrepancies,
  } = useApp()

  const reportBags = useMemo(() => {
    if (!currentUser) return state.bags
    return bagsInStaffScope(state.bags, currentUser)
  }, [state.bags, currentUser])

  const [bagId, setBagId] = useState(reportBags[0]?.id ?? '')
  const [summary, setSummary] = useState('')
  const [details, setDetails] = useState('')
  const [itemNotes, setItemNotes] = useState('')
  const [witness, setWitness] = useState<StaffMember | null>(null)
  const [msg, setMsg] = useState('')
  const [resolveNotes, setResolveNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!reportBags.some((b) => b.id === bagId)) {
      setBagId(reportBags[0]?.id ?? '')
    }
  }, [reportBags, bagId])

  const mine = useMemo(
    () =>
      state.discrepancies.filter(
        (d) => !currentUser || isManagement || d.reportedById === currentUser.id,
      ),
    [state.discrepancies, currentUser, isManagement],
  )

  const submit = async () => {
    if (busy || !currentUser) return
    if (!summary.trim()) {
      setMsg('Add a short summary of the mismatch.')
      return
    }
    if (!witness) {
      setMsg('Witness must verify with PIN.')
      return
    }
    setBusy(true)
    try {
      await new Promise((r) => setTimeout(r, 350))
      reportDiscrepancy({
        bagId,
        reporter: currentUser,
        witness,
        summary: summary.trim(),
        details: details.trim() || undefined,
        itemNotes: itemNotes.trim() || undefined,
      })
      setMsg('Discrepancy logged for admin investigation.')
      setSummary('')
      setDetails('')
      setItemNotes('')
      setWitness(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      {busy && (
        <BusyOverlay label="Logging discrepancy…" detail="Writing case to the audit trail." />
      )}
      <div className="rounded-xl border border-line bg-panel p-4">
        <div className="mb-1 flex items-center gap-2">
          <AlertTriangle className="text-coral" size={20} />
          <h2 className="font-display text-2xl font-bold">Discrepancy workflow</h2>
        </div>
        <p className="text-sm text-ink-soft">
          Staff flag a mismatch → admin investigates → resolution is audited. Not just a red status badge.
        </p>
      </div>

      {currentUser && (
        <div className="rounded-xl border border-line bg-panel p-4 space-y-3">
          <h3 className="font-display text-xl font-bold">Report mismatch</h3>
          <select
            value={bagId}
            onChange={(e) => setBagId(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          >
            {reportBags.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} — {b.name}
              </option>
            ))}
          </select>
          <input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Summary e.g. Midazolam count 3 vs system 4"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          />
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={2}
            placeholder="What you found / seal status / when noticed"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          />
          <textarea
            value={itemNotes}
            onChange={(e) => setItemNotes(e.target.value)}
            rows={2}
            placeholder="Item-level notes (optional)"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          />
          {!witness ? (
            <WitnessVerify actor={currentUser} onVerified={setWitness} submitLabel="Witness verifies report" />
          ) : (
            <p className="text-sm text-ok">Witness verified: {witness.name}</p>
          )}
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy}
            className="rounded-lg bg-coral px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {busy ? 'Submitting…' : 'Submit discrepancy'}
          </button>
          {msg && <p className="text-sm text-ink-soft">{msg}</p>}
        </div>
      )}

      <div className="rounded-xl border border-line bg-panel overflow-hidden">
        <div className="border-b border-line bg-surface px-4 py-3 flex items-center gap-2">
          <Search size={16} />
          <h3 className="font-display text-xl font-bold">
            Cases {isManagement ? `(${openDiscrepancies.length} open)` : ''}
          </h3>
        </div>
        {mine.length === 0 ? (
          <p className="p-4 text-sm text-ink-soft">No discrepancy cases yet.</p>
        ) : (
          <ul className="divide-y divide-line/70">
            {mine.map((d) => (
              <li key={d.id} className="p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">
                    {d.bagCode} · {d.summary}
                  </p>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${
                      d.status === 'resolved'
                        ? 'bg-ok-soft text-ok'
                        : d.status === 'investigating'
                          ? 'bg-amber-soft text-ink'
                          : 'bg-coral-soft text-coral'
                    }`}
                  >
                    {d.status}
                  </span>
                </div>
                <p className="text-xs text-ink-soft">
                  Reported {format(new Date(d.reportedAt), 'dd MMM HH:mm')} by {d.reportedByName}
                  {d.witnessName ? ` · Witness ${d.witnessName}` : ''}
                </p>
                {d.details && <p className="text-sm text-ink-soft">{d.details}</p>}
                {d.resolution && (
                  <p className="text-sm text-ok flex items-center gap-1">
                    <CheckCircle2 size={14} /> {d.resolution}
                  </p>
                )}
                {isManagement && currentUser && d.status !== 'resolved' && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {d.status === 'open' && (
                      <button
                        type="button"
                        onClick={() => updateDiscrepancy({ id: d.id, status: 'investigating', actor: currentUser })}
                        className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-bold"
                      >
                        Start investigation
                      </button>
                    )}
                    <input
                      value={resolveNotes[d.id] ?? ''}
                      onChange={(e) => setResolveNotes((n) => ({ ...n, [d.id]: e.target.value }))}
                      placeholder="Resolution notes"
                      className="min-w-[200px] flex-1 rounded-lg border border-line bg-surface px-2 py-1.5 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateDiscrepancy({
                          id: d.id,
                          status: 'resolved',
                          actor: currentUser,
                          resolution: resolveNotes[d.id] || 'Resolved after investigation',
                        })
                      }
                      className="rounded-lg bg-ok px-3 py-1.5 text-xs font-bold text-white"
                    >
                      Resolve
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
