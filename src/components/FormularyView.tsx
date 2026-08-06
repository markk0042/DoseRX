import { useMemo, useState } from 'react'
import { PHECC_FORMULARY } from '../data/formulary'
import type { ClinicalGrade } from '../types'

export function FormularyView() {
  const [grade, setGrade] = useState<ClinicalGrade | 'all' | 'CD'>('all')
  const [q, setQ] = useState('')

  const rows = useMemo(() => {
    return PHECC_FORMULARY.filter((m) => {
      if (grade === 'CD') return m.controlled
      if (grade !== 'all' && !m.grades.includes(grade)) return false
      if (
        q &&
        !`${m.name} ${m.strength} ${m.presentation}`.toLowerCase().includes(q.toLowerCase())
      ) {
        return false
      }
      return true
    })
  }, [grade, q])

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-panel p-4">
        <h2 className="font-display text-2xl font-bold">PHECC Medication Formulary 2026</h2>
        <p className="mb-3 text-sm text-ink-soft/80">
          Source: phecc.ie medication list (updated April 2026). Each drug has a medication profile
          (strength, dose unit, stock unit, pack size) used for stock and dosing.
        </p>
        <div className="flex flex-wrap gap-2">
          {(['all', 'EMT', 'Paramedic', 'AP', 'CD'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGrade(g)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                grade === g ? 'bg-sea text-mint' : 'border border-line bg-surface'
              }`}
            >
              {g === 'all' ? `All (${PHECC_FORMULARY.length})` : g === 'CD' ? 'Controlled only' : g}
            </button>
          ))}
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search medication…"
            className="ml-auto rounded-lg border border-line bg-surface px-3 py-1.5 text-sm outline-none focus:border-sea-mid"
          />
        </div>
      </div>

      <div className="overflow-x-auto overflow-hidden rounded-xl border border-line bg-panel">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-sea/5 text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-2">Medication</th>
              <th className="px-4 py-2">Strength</th>
              <th className="px-4 py-2">Dose unit</th>
              <th className="px-4 py-2">Stock unit</th>
              <th className="px-4 py-2">Pack size</th>
              <th className="px-4 py-2">Grades</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">CD</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} className="border-t border-line/70">
                <td className="px-4 py-2.5">
                  <p className="font-semibold">{m.name}</p>
                  <p className="text-xs text-ink-soft">{m.presentation}</p>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs font-semibold">{m.strength}</td>
                <td className="px-4 py-2.5">
                  <span className="rounded bg-surface px-1.5 py-0.5 text-[11px] font-bold uppercase">
                    {m.doseUnit}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span className="rounded bg-surface px-1.5 py-0.5 text-[11px] font-bold uppercase">
                    {m.stockUnit}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-ink-soft">
                  <span className="font-semibold text-ink">{m.packSize}</span> {m.doseUnit}
                  <span className="text-ink-soft/60"> / {m.stockUnit}</span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {m.grades.map((g: ClinicalGrade) => (
                      <span key={g} className="rounded bg-surface px-1.5 py-0.5 text-[11px] font-bold">
                        {g === 'Paramedic' ? 'P' : g}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-xs text-ink-soft">{m.category}</td>
                <td className="px-4 py-2.5">
                  {m.controlled ? (
                    <span className="rounded bg-cd-soft px-1.5 py-0.5 text-[11px] font-bold text-cd">
                      Sch {m.schedule}
                    </span>
                  ) : (
                    <span className="text-ink-soft/40">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
