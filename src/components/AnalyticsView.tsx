import { format } from 'date-fns'
import { BarChart3, Download, ShieldCheck } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useApp } from '../context/AppContext'
import {
  PERIOD_OPTIONS,
  buildAnalyticsReport,
  type AnalyticsPeriod,
  type NamedCount,
} from '../lib/analytics'
import { downloadAnalyticsPdf } from '../lib/analyticsPdf'

export function AnalyticsView() {
  const { state, isManagement } = useApp()
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d')

  const report = useMemo(() => buildAnalyticsReport(state, period), [state, period])

  if (!isManagement) {
    return <p className="text-sm text-ink-soft">Analytics are available to administrators only.</p>
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-line bg-panel p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <BarChart3 className="text-sea" size={22} />
              <h2 className="font-display text-2xl font-bold">Analytics &amp; compliance</h2>
            </div>
            <p className="max-w-2xl text-sm text-ink-soft">
              Statistical view of audits, reviews, shift sign-out/return by clinical grade, administrations, and
              compliance signals. Download a PDF pack for the selected period.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void downloadAnalyticsPdf(report, state.sandboxMode)}
            className="inline-flex items-center gap-2 rounded-lg bg-sea px-4 py-2.5 text-sm font-bold text-mint"
          >
            <Download size={16} /> Download full report PDF
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                period === p.id ? 'bg-sea text-mint' : 'border border-line bg-surface text-ink-soft hover:border-sea-mid'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-soft">
          Showing {format(new Date(report.start), 'dd MMM yyyy')} – {format(new Date(report.end), 'dd MMM yyyy')}
          {state.sandboxMode ? ' · sandbox data' : ''}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <ScoreCard score={report.compliance.score} />
        <StatCard label="Bag audits" value={report.totals.audits} sub={`${report.totals.sealUpdates} seal updates`} />
        <StatCard
          label="Shift movements"
          value={report.totals.shiftSignOuts}
          sub={`${report.totals.shiftReturns} returns`}
        />
        <StatCard
          label="Administered"
          value={report.totals.administrations}
          sub={`${report.totals.partDoses} part-dose`}
        />
        <StatCard
          label="Wasted"
          value={report.totals.wastes}
          sub={`${report.totals.outOfScope} out-of-scope`}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat
          label="Witness coverage"
          value={`${report.compliance.witnessCoverage}%`}
          tone={
            report.compliance.witnessCoverage >= 90
              ? 'good'
              : report.compliance.witnessCoverage >= 75
                ? 'warn'
                : 'bad'
          }
        />
        <MiniStat
          label="Discrepancy rate"
          value={`${report.compliance.discrepancyRate}%`}
          tone={
            report.compliance.discrepancyRate <= 10
              ? 'good'
              : report.compliance.discrepancyRate <= 25
                ? 'warn'
                : 'bad'
          }
        />
        <MiniStat
          label="Out-of-scope rate"
          value={`${report.compliance.outOfScopeRate}%`}
          tone={
            report.compliance.outOfScopeRate <= 5
              ? 'good'
              : report.compliance.outOfScopeRate <= 15
                ? 'warn'
                : 'bad'
          }
        />
        <MiniStat label="Stock updates" value={String(report.totals.stockUpdates)} tone="good" />
      </div>

      <ChartCard
        title="Activity over time"
        subtitle="Side-by-side bars · Y-axis 0–100 · every day labelled (7d–month) · months (3–12m)"
      >
        <TrendChart rows={report.dailyTrend} period={report.period} />
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Activity mix" subtitle="All events in the selected period">
          <HorizontalBars rows={report.byActivityType.slice(0, 8)} color="sea" />
        </ChartCard>
        <ChartCard
          title="Shift sign-out by grade"
          subtitle="Who signed bags out during the period (EMT / Paramedic / AP)"
        >
          <HorizontalBars rows={report.byGradeShift} color="ok" />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Administered by grade"
          subtitle="Administrations and part-dose given, by practitioner grade"
        >
          <HorizontalBars rows={report.byGradeAdministered} color="sea" />
        </ChartCard>
        <ChartCard title="Wasted by grade" subtitle="Waste events by practitioner grade">
          <HorizontalBars rows={report.byGradeWaste} color="cd" />
        </ChartCard>
      </div>

      <div className="rounded-xl border border-line bg-panel p-4">
        <h3 className="font-display text-xl font-bold">Recent shift sign-out / return</h3>
        <p className="mb-3 text-xs text-ink-soft">Grade of the holder at bag sign-out</p>
        {report.recentShifts.length === 0 ? (
          <EmptyHint text="No bag shifts in this period." />
        ) : (
          <ul className="divide-y divide-line/70">
            {report.recentShifts.map((s, i) => (
              <li key={`${s.bagCode}-${s.signedOutAt}-${i}`} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <div>
                  <p className="font-semibold">
                    {s.bagCode}{' '}
                    <span className="text-xs font-bold text-sea-mid">
                      {s.grade === 'AP' ? 'AP' : s.grade}
                    </span>
                  </p>
                  <p className="text-xs text-ink-soft">{s.holder}</p>
                </div>
                <div className="text-right text-xs text-ink-soft">
                  <p>Out {format(new Date(s.signedOutAt), 'dd MMM HH:mm')}</p>
                  <p>
                    {s.active
                      ? 'On shift'
                      : s.returnedAt
                        ? `In ${format(new Date(s.returnedAt), 'dd MMM HH:mm')}`
                        : 'Returned'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Administered medications" subtitle="Units given to patients">
          {report.topMedsAdministered.length === 0 ? (
            <EmptyHint text="No administrations in this period." />
          ) : (
            <HorizontalBars rows={report.topMedsAdministered} color="sea" />
          )}
        </ChartCard>
        <ChartCard title="Wasted medications" subtitle="Units wasted (not given)">
          {report.topMedsWasted.length === 0 ? (
            <EmptyHint text="No waste events in this period." />
          ) : (
            <HorizontalBars rows={report.topMedsWasted} color="amber" />
          )}
        </ChartCard>
      </div>
    </div>
  )
}

function ScoreCard({ score }: { score: number }) {
  const tone = score >= 80 ? 'text-ok' : score >= 55 ? 'text-ink' : 'text-coral'
  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
        <ShieldCheck size={14} /> Compliance score
      </div>
      <p className={`font-display text-4xl font-extrabold ${tone}`}>{score}</p>
      <p className="text-xs text-ink-soft">/ 100 · audits, witness, discrepancy &amp; OOS</p>
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="font-display text-3xl font-extrabold text-sea">{value}</p>
      <p className="text-xs text-ink-soft">{sub}</p>
    </div>
  )
}

function MiniStat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: string
  tone?: 'good' | 'warn' | 'bad' | 'neutral'
}) {
  const color =
    tone === 'good' ? 'text-ok' : tone === 'warn' ? 'text-ink' : tone === 'bad' ? 'text-coral' : 'text-sea'
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-3">
      <p className="text-[11px] font-semibold uppercase text-ink-soft">{label}</p>
      <p className={`font-display text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

function ChartCard({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string
  subtitle: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-xl border border-line bg-panel p-4 ${className}`}>
      <h3 className="font-display text-xl font-bold">{title}</h3>
      <p className="mb-4 text-xs text-ink-soft">{subtitle}</p>
      {children}
    </div>
  )
}

function EmptyHint({ text }: { text: string }) {
  return <p className="rounded-lg bg-surface px-3 py-6 text-center text-sm text-ink-soft">{text}</p>
}

function HorizontalBars({
  rows,
  color,
}: {
  rows: NamedCount[]
  color: 'sea' | 'ok' | 'cd' | 'amber'
}) {
  const max = Math.max(...rows.map((r) => r.count), 1)
  const bar: Record<typeof color, string> = {
    sea: 'bg-sea',
    ok: 'bg-ok',
    cd: 'bg-cd',
    amber: 'bg-amber',
  }
  if (rows.every((r) => r.count === 0)) {
    return <EmptyHint text="No data in this period yet — run shifts, audits, or administrations." />
  }
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="font-semibold">{r.label}</span>
            <span className="font-display text-lg font-bold text-ink">{r.count}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-line/50">
            <div
              className={`h-full rounded-full ${bar[color]} transition-all`}
              style={{ width: `${Math.max(4, (r.count / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

function TrendChart({
  rows,
  period,
}: {
  rows: {
    date?: string
    label: string
    audits: number
    administered: number
    wasted: number
    shifts: number
    discrepancies: number
    other: number
  }[]
  period: AnalyticsPeriod
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [hostW, setHostW] = useState(640)
  const [tip, setTip] = useState<{
    idx: number
    x: number
    y: number
  } | null>(null)

  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    const measure = () => setHostW(Math.max(320, el.clientWidth))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const series = [
    { key: 'audits' as const, fill: '#1f8a5b', label: 'Audits / seals' },
    { key: 'administered' as const, fill: '#0b3a4a', label: 'Administered' },
    { key: 'wasted' as const, fill: '#148c96', label: 'Wasted' },
    { key: 'shifts' as const, fill: '#f0a818', label: 'Shift in / out' },
    { key: 'discrepancies' as const, fill: '#d94f3d', label: 'Discrepancy' },
  ]

  const totals = rows.map(
    (r) => r.audits + r.administered + r.wasted + r.shifts + r.discrepancies + r.other,
  )

  // Fixed scale 0–100
  const yMax = 100
  const ticks = [0, 20, 40, 60, 80, 100]
  const isMonthly = period === '90d' || period === '6m' || period === '12m'
  const isCompactDaily = period === '30d'
  const isWeekdayDaily = period === '7d' || period === '14d'

  const plotH = 220
  const plotPadL = 36
  const plotPadR = 12
  const plotPadT = isMonthly ? 28 : 12
  const plotPadB = isWeekdayDaily ? 40 : isCompactDaily ? 36 : 40
  const plotW = Math.max(220, hostW - plotPadL - plotPadR)
  const groupW = plotW / Math.max(rows.length, 1)
  // Months: wider gaps · daily: tight clusters so dates sit continuous
  const innerGap = isMonthly
    ? Math.min(18, Math.max(8, groupW * 0.22))
    : Math.min(3, groupW * 0.06)
  const clusterW = Math.max(10, groupW - innerGap)
  const barGap = isMonthly ? 2 : 1
  const barW = Math.max(2, (clusterW - barGap * (series.length - 1)) / series.length)
  const svgW = hostW
  const svgH = plotPadT + plotH + plotPadB

  if (rows.every((_, i) => totals[i] === 0)) {
    return <EmptyHint text="No timed activity in this period yet." />
  }

  const yScale = (v: number) => plotPadT + plotH - (Math.min(v, yMax) / yMax) * plotH
  const firstDataIdx = totals.findIndex((t) => t > 0)
  const lastDataIdx = totals.reduce((acc, t, i) => (t > 0 ? i : acc), 0)

  const tipRow = tip ? rows[tip.idx] : null
  const tipHeading = tipRow
    ? tipRow.date
      ? format(
          new Date(tipRow.date + 'T12:00:00'),
          isMonthly ? 'MMMM yyyy' : 'EEE d MMM yyyy',
        )
      : tipRow.label
    : ''

  return (
    <div ref={hostRef} className="relative w-full">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-3 text-[11px] font-semibold text-ink-soft">
          {series.map((s) => (
            <LegendDot key={s.key} label={s.label} color={s.fill} />
          ))}
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft/70">
          Side-by-side · scale 0–100 · {rows.length} {isMonthly ? 'months' : 'days'} · hover for values
        </p>
      </div>

      <svg
        width={svgW}
        height={svgH}
        className="block w-full"
        role="img"
        aria-label="Activity trend chart"
        onMouseLeave={() => setTip(null)}
      >
        <rect
          x={plotPadL}
          y={plotPadT}
          width={plotW}
          height={plotH}
          className="fill-surface/80"
          rx={4}
        />

        {/* Alternating column bands on all ranges so each day/month is distinct */}
        {rows.map((r, i) => {
          const groupX = plotPadL + i * groupW
          const bandFill = i % 2 === 0 ? 'rgba(11, 58, 74, 0.07)' : 'rgba(20, 140, 150, 0.08)'
          return (
            <g key={`band-${r.date ?? r.label}-${i}`}>
              <rect x={groupX} y={plotPadT} width={groupW} height={plotH} fill={bandFill} />
              {i > 0 && (
                <line
                  x1={groupX}
                  x2={groupX}
                  y1={plotPadT}
                  y2={plotPadT + plotH}
                  stroke="#0b3a4a"
                  strokeWidth={1}
                  strokeOpacity={isMonthly ? 0.22 : 0.12}
                  strokeDasharray={isMonthly ? '3 4' : '2 3'}
                />
              )}
            </g>
          )
        })}

        {ticks.map((tick) => {
          const y = yScale(tick)
          return (
            <g key={tick}>
              <line
                x1={plotPadL}
                x2={plotPadL + plotW}
                y1={y}
                y2={y}
                stroke="#c5d5d2"
                strokeWidth={tick === 0 ? 1.25 : 0.7}
                strokeDasharray={tick === 0 ? undefined : '3 3'}
              />
              <text
                x={plotPadL - 6}
                y={y + 3}
                textAnchor="end"
                fill="#1a3a47"
                style={{ fontSize: 9, fontWeight: 600 }}
              >
                {tick}
              </text>
            </g>
          )
        })}

        <text
          x={12}
          y={plotPadT + plotH / 2}
          textAnchor="middle"
          fill="#146477"
          transform={`rotate(-90 12 ${plotPadT + plotH / 2})`}
          style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em' }}
        >
          EVENTS
        </text>

        {rows.map((r, i) => {
          const groupX = plotPadL + i * groupW
          const clusterX = groupX + (groupW - clusterW) / 2
          const cx = groupX + groupW / 2
          const labelParts = splitAxisLabel(r.label)
          const prevMonth = i > 0 && rows[i - 1]?.date ? rows[i - 1].date!.slice(0, 7) : null
          const thisMonth = r.date?.slice(0, 7) ?? null
          const monthChanged = Boolean(thisMonth && thisMonth !== prevMonth)
          const monthTag =
            isCompactDaily && monthChanged && r.date
              ? format(new Date(r.date + 'T12:00:00'), 'MMM')
              : null
          const hovered = tip?.idx === i

          return (
            <g key={`${r.date ?? r.label}-${i}`}>
              {isMonthly && (
                <>
                  <rect
                    x={cx - Math.min(28, groupW * 0.42)}
                    y={plotPadT - 20}
                    width={Math.min(56, groupW * 0.84)}
                    height={16}
                    rx={3}
                    fill={i % 2 === 0 ? '#0b3a4a' : '#146477'}
                  />
                  <text
                    x={cx}
                    y={plotPadT - 8.5}
                    textAnchor="middle"
                    fill="#e8f4f2"
                    style={{ fontSize: rows.length > 10 ? 8 : 9, fontWeight: 700 }}
                  >
                    {r.label}
                  </text>
                </>
              )}

              {/* Hover highlight for the whole day/month column */}
              {hovered && (
                <rect
                  x={groupX}
                  y={plotPadT}
                  width={groupW}
                  height={plotH}
                  fill="rgba(11, 58, 74, 0.1)"
                  rx={2}
                />
              )}

              {!isMonthly && (
                <line
                  x1={cx}
                  x2={cx}
                  y1={plotPadT + plotH}
                  y2={plotPadT + plotH + 4}
                  stroke="#0b3a4a"
                  strokeWidth={1}
                  strokeOpacity={0.45}
                />
              )}

              {series.map((s, si) => {
                const v = r[s.key]
                const x = clusterX + si * (barW + barGap)
                const top = yScale(v)
                const bh = Math.max(v > 0 ? 3 : 0, plotPadT + plotH - top)
                return (
                  <g key={s.key}>
                    {v > 0 && (
                      <rect
                        x={x}
                        y={top}
                        width={barW}
                        height={bh}
                        fill={s.fill}
                        rx={1}
                        opacity={hovered ? 1 : 0.92}
                        stroke={hovered ? '#0a1f28' : 'none'}
                        strokeWidth={hovered ? 0.75 : 0}
                      />
                    )}
                  </g>
                )
              })}

              {/* Full-height hit area — thin bars are hard to target alone */}
              <rect
                x={groupX}
                y={plotPadT}
                width={groupW}
                height={plotH}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() =>
                  setTip({
                    idx: i,
                    x: cx,
                    y: plotPadT + 8,
                  })
                }
                onMouseMove={() =>
                  setTip((prev) =>
                    prev?.idx === i ? prev : { idx: i, x: cx, y: plotPadT + 8 },
                  )
                }
              />

              {isMonthly ? (
                <text
                  x={cx}
                  y={plotPadT + plotH + 16}
                  textAnchor="middle"
                  fill="#0a1f28"
                  style={{ fontSize: 10, fontWeight: 700 }}
                >
                  {r.label}
                </text>
              ) : isWeekdayDaily ? (
                <>
                  <text
                    x={cx}
                    y={plotPadT + plotH + 14}
                    textAnchor="middle"
                    fill="#0a1f28"
                    style={{ fontSize: period === '14d' ? 8 : 9, fontWeight: 700 }}
                  >
                    {labelParts[0]}
                  </text>
                  <text
                    x={cx}
                    y={plotPadT + plotH + 26}
                    textAnchor="middle"
                    fill="#146477"
                    style={{ fontSize: 8, fontWeight: 600 }}
                  >
                    {labelParts[1] ?? ''}
                  </text>
                </>
              ) : (
                <>
                  {monthTag && (
                    <text
                      x={cx}
                      y={plotPadT + plotH + 12}
                      textAnchor="middle"
                      fill="#0b3a4a"
                      style={{ fontSize: 7, fontWeight: 700 }}
                    >
                      {monthTag}
                    </text>
                  )}
                  <text
                    x={cx}
                    y={plotPadT + plotH + (monthTag ? 24 : 16)}
                    textAnchor="middle"
                    fill="#0a1f28"
                    style={{ fontSize: 8, fontWeight: 700 }}
                  >
                    {r.label}
                  </text>
                </>
              )}
            </g>
          )
        })}

        <line
          x1={plotPadL}
          x2={plotPadL}
          y1={plotPadT}
          y2={plotPadT + plotH}
          stroke="#0b3a4a"
          strokeWidth={1.25}
        />
        <line
          x1={plotPadL}
          x2={plotPadL + plotW}
          y1={plotPadT + plotH}
          y2={plotPadT + plotH}
          stroke="#0b3a4a"
          strokeWidth={1.25}
        />
      </svg>

      {tip && tipRow && (
        <div
          className="pointer-events-none absolute z-20 min-w-[160px] rounded-lg border border-line bg-panel px-3 py-2 shadow-lg"
          style={{
            left: Math.min(Math.max(8, tip.x - 80), Math.max(8, hostW - 180)),
            top: Math.max(4, tip.y),
          }}
        >
          <p className="mb-1.5 text-xs font-bold text-ink">{tipHeading}</p>
          <ul className="space-y-1">
            {series.map((s) => (
              <li key={s.key} className="flex items-center justify-between gap-4 text-[11px]">
                <span className="inline-flex items-center gap-1.5 font-semibold text-ink-soft">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.fill }} />
                  {s.label}
                </span>
                <span className="font-display text-sm font-bold text-ink">{tipRow[s.key]}</span>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 border-t border-line/70 pt-1 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
            Total {totals[tip.idx]} events
          </p>
        </div>
      )}

      {firstDataIdx >= 0 && (
        <p className="mt-2 text-[11px] text-ink-soft">
          Activity from <span className="font-semibold text-ink">{rows[firstDataIdx]?.label}</span>
          {lastDataIdx !== firstDataIdx ? (
            <>
              {' '}
              to <span className="font-semibold text-ink">{rows[lastDataIdx]?.label}</span>
            </>
          ) : null}
          .{' '}
          {isMonthly
            ? 'Alternating columns mark each month — hover for values.'
            : 'Alternating columns mark each day — hover for values.'}
        </p>
      )}
    </div>
  )
}

/** "Tue 4" → ["Tue", "4"] · "MMM yy" → ["MMM", "yy"] */
function splitAxisLabel(label: string): [string, string?] {
  const m = label.match(/^([A-Za-z]+)\s+(\d{1,2})$/)
  if (m) return [m[1], m[2]]
  const m2 = label.match(/^(\d{1,2})\s+([A-Za-z]+)$/)
  if (m2) return [m2[2], m2[1]]
  const m3 = label.match(/^([A-Za-z]+)\s+(\d{2})$/)
  if (m3) return [m3[1], m3[2]]
  return [label]
}

function LegendDot({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}
