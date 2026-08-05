import { format } from 'date-fns'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { CPG_VERSION } from '../types'
import type { AnalyticsReport, NamedCount } from './analytics'

const SEA: [number, number, number] = [11, 58, 74]
const SEA_MID: [number, number, number] = [20, 100, 119]
const MINT: [number, number, number] = [232, 244, 242]
const AMBER: [number, number, number] = [240, 168, 24]
const INK: [number, number, number] = [10, 31, 40]
const CORAL: [number, number, number] = [217, 79, 61]
const OK: [number, number, number] = [31, 138, 91]
const CD: [number, number, number] = [107, 45, 91]
const WHITE: [number, number, number] = [255, 255, 255]
const LINE: [number, number, number] = [197, 213, 210]
const SURFACE: [number, number, number] = [244, 247, 246]
/** Distinct colour for administered vs waste */
const ADMIN_BLUE: [number, number, number] = [11, 58, 74]
const WASTE_TEAL: [number, number, number] = [20, 140, 150]

type DocX = jsPDF & { lastAutoTable?: { finalY: number } }

/** jsPDF Helvetica cannot render many Unicode glyphs — keep report text ASCII-safe */
function t(s: string) {
  return s
    .replace(/[–—]/g, '-')
    .replace(/→/g, 'to')
    .replace(/[·•]/g, '|')
    .replace(/[≥]/g, '>=')
    .replace(/[≤]/g, '<=')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
}

async function loadLogo(): Promise<string | null> {
  try {
    const res = await fetch('/doserx-logo.png')
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function footer(doc: jsPDF, page: number, total: number, periodLabel: string) {
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()
  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.35)
  doc.line(14, h - 14, w - 14, h - 14)
  doc.setFontSize(7.5)
  doc.setTextColor(...SEA_MID)
  doc.setFont('helvetica', 'normal')
  doc.text(t(`DoseRX Analytical Report | ${periodLabel} | Confidential`), 14, h - 8)
  doc.text(`Page ${page} of ${total}`, w - 14, h - 8, { align: 'right' })
}

function sectionTitle(doc: jsPDF, title: string, y: number, x = 14) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...SEA)
  doc.text(t(title), x, y)
  doc.setDrawColor(...AMBER)
  doc.setLineWidth(1.4)
  doc.line(x, y + 2.5, x + 34, y + 2.5)
  return y + 8
}

function kpiCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  sub: string,
  accent: [number, number, number],
) {
  doc.setFillColor(...WHITE)
  doc.setDrawColor(...LINE)
  doc.roundedRect(x, y, w, h, 2.5, 2.5, 'FD')
  doc.setFillColor(...accent)
  doc.roundedRect(x, y, 2.2, h, 1, 1, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...SEA_MID)
  doc.text(t(label).toUpperCase(), x + 6, y + 6)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...INK)
  doc.text(value, x + 6, y + 15)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...SEA_MID)
  doc.text(t(sub), x + 6, y + 21)
}

function drawHBars(
  doc: jsPDF,
  rows: NamedCount[],
  x: number,
  y: number,
  width: number,
  color: [number, number, number],
) {
  const max = Math.max(...rows.map((r) => r.count), 1)
  let cy = y
  rows.forEach((r) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...INK)
    const label = t(r.label)
    const clipped = label.length > 28 ? `${label.slice(0, 26)}...` : label
    doc.text(clipped, x, cy)
    doc.setFont('helvetica', 'normal')
    doc.text(String(r.count), x + width, cy, { align: 'right' })
    cy += 3
    doc.setFillColor(...SURFACE)
    doc.roundedRect(x, cy, width, 3.5, 1, 1, 'F')
    const bw = Math.max(r.count > 0 ? 2 : 0, (r.count / max) * width)
    if (bw > 0) {
      doc.setFillColor(...color)
      doc.roundedRect(x, cy, bw, 3.5, 1, 1, 'F')
    }
    cy += 8
  })
  return cy
}

function drawStackedTrend(
  doc: jsPDF,
  report: AnalyticsReport,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const rows = report.dailyTrend
  if (!rows.length) return y + height

  const totals = rows.map(
    (r) => r.audits + r.administered + r.wasted + r.shifts + r.discrepancies + r.other,
  )
  const rawMax = Math.max(...totals, 1)
  const yMax = rawMax <= 4 ? 4 : rawMax <= 10 ? Math.ceil(rawMax / 2) * 2 : Math.ceil(rawMax / 5) * 5
  const padL = 10
  const padB = 22
  const padT = 4
  const plotW = width - padL
  const plotH = height - padB - padT
  const groupW = plotW / rows.length

  doc.setFillColor(...SURFACE)
  doc.roundedRect(x, y, width, height, 2, 2, 'F')

  const ticks = 4
  for (let i = 0; i <= ticks; i++) {
    const val = Math.round((yMax / ticks) * i)
    const gy = y + padT + plotH - (val / yMax) * plotH
    doc.setDrawColor(...LINE)
    doc.setLineWidth(0.2)
    doc.line(x + padL, gy, x + width - 2, gy)
    doc.setFontSize(6.5)
    doc.setTextColor(...SEA_MID)
    doc.text(String(val), x + padL - 1.5, gy + 1.5, { align: 'right' })
  }

  const series = [
    { key: 'audits' as const, color: OK },
    { key: 'administered' as const, color: ADMIN_BLUE },
    { key: 'wasted' as const, color: WASTE_TEAL },
    { key: 'shifts' as const, color: AMBER },
    { key: 'discrepancies' as const, color: CORAL },
    { key: 'other' as const, color: SEA_MID },
  ]

  // Cap label count so dates never collide
  const maxLabels = Math.min(8, rows.length)
  const labelEvery = Math.max(1, Math.ceil(rows.length / maxLabels))

  rows.forEach((r, i) => {
    const gx = x + padL + i * groupW + 0.6
    const barW = Math.max(1.8, groupW - 1.2)
    let stacked = 0
    series.forEach((s) => {
      const v = r[s.key]
      if (!v) return
      const bh = Math.max(0.8, (v / yMax) * plotH)
      const bottom = y + padT + plotH - (stacked / yMax) * plotH
      doc.setFillColor(...s.color)
      doc.rect(gx, bottom - bh, barW, bh, 'F')
      stacked += v
    })
  })

  // X labels: spaced, short form, baseline below plot
  doc.setFontSize(6)
  doc.setTextColor(...INK)
  rows.forEach((r, i) => {
    if (!(i % labelEvery === 0 || i === rows.length - 1 || i === 0)) return
    const gx = x + padL + i * groupW + groupW / 2
    // Prefer day number for daily, keep month labels short
    let label = r.label
    if (/^\d{1,2}\s+[A-Za-z]+$/.test(r.label)) {
      const [d, m] = r.label.split(/\s+/)
      label = i === 0 || i === rows.length - 1 || i % (labelEvery * 2) === 0 ? `${d} ${m.slice(0, 3)}` : d
    } else if (/^[A-Za-z]+\s+\d{1,2}$/.test(r.label)) {
      const [a, b] = r.label.split(/\s+/)
      label = `${a.slice(0, 3)} ${b}`
    }
    doc.text(label, gx, y + height - 8, { align: 'center' })
  })

  const legendY = y + height + 4
  const legend = [
    { c: OK, t: 'Audits/seals' },
    { c: ADMIN_BLUE, t: 'Administered' },
    { c: WASTE_TEAL, t: 'Wasted' },
    { c: AMBER, t: 'Shifts' },
    { c: CORAL, t: 'Discrepancy' },
    { c: SEA_MID, t: 'Other' },
  ]
  let lx = x
  legend.forEach((l) => {
    doc.setFillColor(...l.c)
    doc.roundedRect(lx, legendY - 2.2, 3, 3, 0.5, 0.5, 'F')
    doc.setFontSize(6.5)
    doc.setTextColor(...INK)
    doc.text(l.t, lx + 4.5, legendY)
    lx += doc.getTextWidth(l.t) + 7
  })

  return legendY + 6
}

function scoreBand(score: number): { label: string; color: [number, number, number] } {
  if (score >= 85) return { label: 'Strong', color: OK }
  if (score >= 70) return { label: 'Satisfactory', color: AMBER }
  if (score >= 50) return { label: 'Needs attention', color: CORAL }
  return { label: 'Critical', color: CORAL }
}

/**
 * Full multi-page DoseRX analytical / compliance PDF report.
 */
export async function downloadAnalyticsPdf(report: AnalyticsReport, sandboxMode: boolean) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as DocX
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()
  const logo = await loadLogo()
  const now = format(new Date(report.generatedAt), 'dd MMM yyyy HH:mm')
  const from = format(new Date(report.start), 'dd MMM yyyy')
  const to = format(new Date(report.end), 'dd MMM yyyy')
  const band = scoreBand(report.compliance.score)
  const totalPages = 5
  const colGap = 6
  const colW = (w - 28 - colGap) / 2

  // ═══════════════ PAGE 1 - Cover / executive ═══════════════
  doc.setFillColor(...SEA)
  doc.rect(0, 0, w, 52, 'F')
  if (logo) doc.addImage(logo, 'PNG', 14, 10, 18, 18)
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text('DoseRX', logo ? 36 : 14, 18)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MINT)
  doc.text('Analytical & Compliance Report', logo ? 36 : 14, 26)
  doc.setFontSize(8.5)
  doc.text(t(`PHECC CPG ${CPG_VERSION} | Generated ${now}`), logo ? 36 : 14, 33)
  if (sandboxMode) {
    doc.setTextColor(...AMBER)
    doc.setFont('helvetica', 'bold')
    doc.text('SANDBOX / TRAINING DATA - not a live compliance pack', 14, 44)
  }

  doc.setFillColor(...MINT)
  doc.roundedRect(14, 60, w - 28, 28, 3, 3, 'F')
  doc.setTextColor(...SEA)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Reporting period', 20, 72)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...INK)
  doc.text(t(report.periodLabel), 20, 80)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  // ASCII-only range — Helvetica cannot draw Unicode arrows
  doc.text(`${from}  -  ${to}`, w - 20, 80, { align: 'right' })

  doc.setFillColor(...WHITE)
  doc.setDrawColor(...LINE)
  doc.roundedRect(14, 96, 62, 48, 3, 3, 'FD')
  doc.setFillColor(...band.color)
  doc.circle(45, 118, 16, 'F')
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(String(report.compliance.score), 45, 120, { align: 'center' })
  doc.setFontSize(7)
  doc.text('/ 100', 45, 126, { align: 'center' })
  doc.setTextColor(...SEA)
  doc.setFontSize(9)
  doc.text('Compliance score', 45, 138, { align: 'center' })
  doc.setFillColor(...band.color)
  doc.roundedRect(28, 141, 34, 6, 1.5, 1.5, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text(band.label.toUpperCase(), 45, 145, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...SEA)
  doc.text('Executive summary', 86, 104)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...INK)
  const summary = doc.splitTextToSize(
    t(
      `Across ${report.periodLabel.toLowerCase()}, DoseRX recorded ${report.totals.activities} auditable events including ${report.totals.shiftSignOuts} bag sign-outs, ${report.totals.administrations} administered doses, ${report.totals.wastes} waste events, ${report.totals.audits} bag audits and ${report.totals.sealUpdates} seal updates. Witness coverage sits at ${report.compliance.witnessCoverage}%. Discrepancy rate ${report.compliance.discrepancyRate}% | out-of-scope ${report.compliance.outOfScopeRate}%. Overall compliance is rated ${band.label.toLowerCase()} (${report.compliance.score}/100).`,
    ),
    w - 100,
  )
  doc.text(summary, 86, 112)

  const cardW = (w - 28 - 9) / 4
  kpiCard(doc, 14, 154, cardW, 26, 'Bag audits', String(report.totals.audits), `${report.totals.sealUpdates} seal updates`, SEA)
  kpiCard(doc, 14 + cardW + 3, 154, cardW, 26, 'Shift movements', String(report.totals.shiftSignOuts), `${report.totals.shiftReturns} returns`, OK)
  kpiCard(doc, 14 + (cardW + 3) * 2, 154, cardW, 26, 'Administered', String(report.totals.administrations), `${report.totals.partDoses} part-dose`, ADMIN_BLUE)
  kpiCard(doc, 14 + (cardW + 3) * 3, 154, cardW, 26, 'Wasted', String(report.totals.wastes), `${report.totals.outOfScope} out-of-scope`, WASTE_TEAL)

  let y = sectionTitle(doc, 'Compliance components', 192)
  const comps: { label: string; value: number; ideal: string }[] = [
    { label: 'Witness coverage', value: report.compliance.witnessCoverage, ideal: 'Target >= 90%' },
    { label: 'Audit presence (indexed)', value: Math.min(100, report.compliance.audits * 12), ideal: 'Regular bag audits' },
    { label: 'Low discrepancy (inverted)', value: Math.max(0, 100 - report.compliance.discrepancyRate * 2), ideal: 'Target rate <= 10%' },
    { label: 'Low out-of-scope (inverted)', value: Math.max(0, 100 - report.compliance.outOfScopeRate * 3), ideal: 'Target rate <= 5%' },
  ]
  comps.forEach((c) => {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...INK)
    doc.text(t(c.label), 14, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...SEA_MID)
    doc.text(t(`${Math.round(c.value)}% | ${c.ideal}`), w - 14, y, { align: 'right' })
    y += 3
    doc.setFillColor(...SURFACE)
    doc.roundedRect(14, y, w - 28, 5, 1, 1, 'F')
    const fill = c.value >= 85 ? OK : c.value >= 70 ? AMBER : CORAL
    doc.setFillColor(...fill)
    doc.roundedRect(14, y, Math.max(2, ((w - 28) * c.value) / 100), 5, 1, 1, 'F')
    y += 10
  })

  footer(doc, 1, totalPages, report.periodLabel)

  // ═══════════════ PAGE 2 - Operations volume + trend ═══════════════
  doc.addPage()
  doc.setFillColor(...SEA)
  doc.rect(0, 0, w, 22, 'F')
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('1 | Operational volume', 14, 14)

  y = sectionTitle(doc, 'Activity over time', 32)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...SEA_MID)
  doc.text('Stacked events by day / week / month | Y-axis = event count', 14, y - 2)
  y = drawStackedTrend(doc, report, 14, y + 2, w - 28, 82)

  y = sectionTitle(doc, 'Full metric ledger', y + 4)
  autoTable(doc, {
    startY: y,
    head: [['Domain', 'Metric', 'Value', 'Notes']],
    body: [
      ['Shifts', 'Sign-outs', String(report.totals.shiftSignOuts), 'Bag assigned to holder'],
      ['Shifts', 'Returns', String(report.totals.shiftReturns), 'Bag returned from shift'],
      ['Clinical', 'Administered / part-dose', String(report.totals.administrations), 'Given to patient'],
      ['Clinical', 'Wasted', String(report.totals.wastes), 'Witnessed waste (not given)'],
      ['Clinical', 'Out-of-scope flags', String(report.totals.outOfScope), 'Beyond grade / CPG'],
      ['Governance', 'Bag audits', String(report.totals.audits), 'Management / staff checks'],
      ['Governance', 'Seal / reseals', String(report.totals.sealUpdates), 'Updates last checked'],
      ['Governance', 'Stock updates', String(report.totals.stockUpdates), 'Management stock control'],
      ['Governance', 'Discrepancies opened', String(report.totals.discrepancies), 'Mismatch cases'],
      ['Governance', 'Discrepancies resolved', String(report.totals.discrepanciesResolved), 'Closed with audit note'],
      ['Events', 'Event packs created', String(report.totals.eventPacks), 'Time-boxed festival packs'],
      ['System', 'Total activities', String(report.totals.activities), 'All auditable events'],
    ],
    styles: { fontSize: 8, cellPadding: 2.2, textColor: INK },
    headStyles: { fillColor: SEA, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: MINT },
    columnStyles: {
      0: { cellWidth: 28, fontStyle: 'bold', textColor: SEA },
      2: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  })
  footer(doc, 2, totalPages, report.periodLabel)

  // ═══════════════ PAGE 3 - Mix + grade ═══════════════
  doc.addPage()
  doc.setFillColor(...SEA)
  doc.rect(0, 0, w, 22, 'F')
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('2 | Activity mix & clinical grade', 14, 14)

  y = sectionTitle(doc, 'Activity mix', 32)
  const mix = report.byActivityType.slice(0, 8)
  if (mix.length) {
    y = drawHBars(doc, mix, 14, y, w - 28, SEA)
  } else {
    doc.setFontSize(9)
    doc.setTextColor(...SEA_MID)
    doc.text('No activity recorded in this period.', 14, y)
    y += 10
  }

  y = Math.max(y + 6, 118)
  const leftX = 14
  const rightX = 14 + colW + colGap

  // Two-column grade charts — titles only once, each in its column
  sectionTitle(doc, 'Shift sign-outs by grade', y, leftX)
  sectionTitle(doc, 'Administered by grade', y, rightX)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...SEA_MID)
  doc.text('Who signed bags onto shift', leftX, y + 10)
  doc.text('Administrations & part-dose given', rightX, y + 10)

  const barsY = y + 16
  drawHBars(doc, report.byGradeShift, leftX, barsY, colW, OK)
  drawHBars(doc, report.byGradeAdministered, rightX, barsY, colW, ADMIN_BLUE)

  y = barsY + Math.max(report.byGradeShift.length, report.byGradeAdministered.length, 3) * 11 + 8

  sectionTitle(doc, 'Wasted by grade', y, leftX)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...SEA_MID)
  doc.text('Waste events by practitioner grade', leftX, y + 10)
  y = drawHBars(doc, report.byGradeWaste, leftX, y + 16, colW, WASTE_TEAL)

  y = Math.max(y + 4, 210)
  if (y > 230) y = 210
  y = sectionTitle(doc, 'Grade breakdown table', y)
  autoTable(doc, {
    startY: y,
    head: [['Grade', 'Shift outs', 'Administered', 'Wasted', 'Admin share']],
    body: ['EMT', 'Paramedic', 'AP', 'Admin', 'Unknown'].map((g) => {
      const shift = report.byGradeShift.find((r) => r.key === g)?.count ?? 0
      const adm = report.byGradeAdministered.find((r) => r.key === g)?.count ?? 0
      const wst = report.byGradeWaste.find((r) => r.key === g)?.count ?? 0
      const clinicalTotal =
        report.byGradeAdministered.reduce((n, r) => n + r.count, 0) +
          report.byGradeWaste.reduce((n, r) => n + r.count, 0) || 1
      const share = adm + wst ? `${Math.round(((adm + wst) / clinicalTotal) * 100)}%` : '-'
      const label = g === 'AP' ? 'Adv. Paramedic' : g
      return [label, String(shift), String(adm), String(wst), share]
    }),
    styles: { fontSize: 8, textColor: INK },
    headStyles: { fillColor: SEA, textColor: WHITE, fontSize: 8 },
    alternateRowStyles: { fillColor: MINT },
    margin: { left: 14, right: 14 },
  })
  footer(doc, 3, totalPages, report.periodLabel)

  // ═══════════════ PAGE 4 - Medications + shifts ═══════════════
  doc.addPage()
  doc.setFillColor(...SEA)
  doc.rect(0, 0, w, 22, 'F')
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('3 | Medications & bag shifts', 14, 14)

  y = 32
  sectionTitle(doc, 'Administered medications', y, leftX)
  sectionTitle(doc, 'Wasted medications', y, rightX)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...SEA_MID)
  doc.text('Units given to patients', leftX, y + 10)
  doc.text('Units wasted (not given)', rightX, y + 10)

  const medBarsY = y + 16
  if (report.topMedsAdministered.length) {
    drawHBars(doc, report.topMedsAdministered, leftX, medBarsY, colW, ADMIN_BLUE)
  } else {
    doc.setFontSize(8)
    doc.setTextColor(...SEA_MID)
    doc.text('No administrations in period.', leftX, medBarsY + 4)
  }
  if (report.topMedsWasted.length) {
    drawHBars(doc, report.topMedsWasted, rightX, medBarsY, colW, WASTE_TEAL)
  } else {
    doc.setFontSize(8)
    doc.setTextColor(...SEA_MID)
    doc.text('No waste events in period.', rightX, medBarsY + 4)
  }

  y =
    medBarsY +
    Math.max(report.topMedsAdministered.length, report.topMedsWasted.length, 1) * 11 +
    10

  autoTable(doc, {
    startY: Math.min(y, 120),
    head: [['Medication', 'Administered', 'Wasted', 'Total units']],
    body: (() => {
      const names = new Set([
        ...report.topMedsAdministered.map((m) => m.label),
        ...report.topMedsWasted.map((m) => m.label),
      ])
      return [...names].map((name) => {
        const a = report.topMedsAdministered.find((m) => m.label === name)?.count ?? 0
        const wst = report.topMedsWasted.find((m) => m.label === name)?.count ?? 0
        return [name, String(a), String(wst), String(a + wst)]
      })
    })(),
    styles: { fontSize: 8, textColor: INK },
    headStyles: { fillColor: CD, textColor: WHITE, fontSize: 8 },
    alternateRowStyles: { fillColor: [243, 224, 238] },
    columnStyles: {
      1: { halign: 'right', textColor: ADMIN_BLUE, fontStyle: 'bold' },
      2: { halign: 'right', textColor: WASTE_TEAL, fontStyle: 'bold' },
      3: { halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  })

  y = ((doc as DocX).lastAutoTable?.finalY ?? 150) + 10
  y = sectionTitle(doc, 'Bag shift register (period sample)', Math.min(Math.max(y, 150), 175))
  autoTable(doc, {
    startY: y,
    head: [['Bag', 'Holder', 'Grade', 'Signed out', 'Returned', 'Status']],
    body: report.recentShifts.map((s) => [
      s.bagCode,
      s.holder,
      s.grade === 'AP' ? 'AP' : s.grade,
      format(new Date(s.signedOutAt), 'dd MMM yyyy HH:mm'),
      s.returnedAt ? format(new Date(s.returnedAt), 'dd MMM yyyy HH:mm') : '-',
      s.active ? 'On shift' : 'Returned',
    ]),
    styles: { fontSize: 7.5, textColor: INK, cellPadding: 1.8 },
    headStyles: { fillColor: SEA, textColor: WHITE, fontSize: 7.5 },
    alternateRowStyles: { fillColor: MINT },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        const v = String(data.cell.raw)
        if (v === 'On shift') {
          data.cell.styles.textColor = SEA
          data.cell.styles.fontStyle = 'bold'
        }
      }
    },
  })
  footer(doc, 4, totalPages, report.periodLabel)

  // ═══════════════ PAGE 5 - Findings & close ═══════════════
  doc.addPage()
  doc.setFillColor(...SEA)
  doc.rect(0, 0, w, 22, 'F')
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('4 | Findings, risks & recommendations', 14, 14)

  y = sectionTitle(doc, 'Automated findings', 32)
  const findings: string[] = []
  if (report.compliance.witnessCoverage < 90) {
    findings.push(
      `Witness coverage is ${report.compliance.witnessCoverage}% (below 90% target). Review dual-PIN completion on administrations, waste and bag movements.`,
    )
  } else {
    findings.push(`Witness coverage is strong at ${report.compliance.witnessCoverage}%.`)
  }
  if (report.totals.audits === 0) {
    findings.push('No bag audits were completed in this period - schedule management Audit Bags checks.')
  } else {
    findings.push(
      `${report.totals.audits} bag audit(s) and ${report.totals.sealUpdates} seal update(s) support the last-checked trail.`,
    )
  }
  if (report.compliance.discrepancyRate > 10) {
    findings.push(
      `Discrepancy rate ${report.compliance.discrepancyRate}% exceeds the 10% guidance threshold - escalate open discrepancy cases.`,
    )
  } else {
    findings.push(`Discrepancy rate remains controlled at ${report.compliance.discrepancyRate}%.`)
  }
  findings.push(
    `Clinical split: ${report.totals.administrations} administered vs ${report.totals.wastes} wasted in this period.`,
  )
  if (report.compliance.outOfScopeRate > 5) {
    findings.push(
      `Out-of-scope use flagged on ${report.compliance.outOfScopeRate}% of administrations - review grade gating and CPG training.`,
    )
  } else {
    findings.push(`Out-of-scope administration rate is within tolerance (${report.compliance.outOfScopeRate}%).`)
  }
  if (report.totals.shiftSignOuts > report.totals.shiftReturns) {
    findings.push(
      `${report.totals.shiftSignOuts - report.totals.shiftReturns} more sign-out(s) than return(s) in-period - confirm bags still on shift via Live Map.`,
    )
  }

  findings.forEach((f, i) => {
    doc.setFillColor(...MINT)
    doc.roundedRect(14, y - 4, w - 28, 14, 2, 2, 'F')
    doc.setFillColor(...AMBER)
    doc.circle(20, y + 2, 2.2, 'F')
    doc.setTextColor(...WHITE)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.text(String(i + 1), 20, y + 3.2, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...INK)
    doc.text(doc.splitTextToSize(t(f), w - 42), 26, y + 1)
    y += 17
  })

  y = sectionTitle(doc, 'Recommended actions', y + 4)
  const actions = [
    'Complete outstanding bag returns and verify on-shift holdings on the Live Map.',
    'Run management Audit Bags on any bag with last-checked older than local SOP.',
    'Export the Controlled Drugs register PDF alongside this report for HPRA / inspection packs.',
    'Use Training / sandbox mode for staff upskilling without touching live CD stock.',
  ]
  actions.forEach((a, i) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...SEA)
    doc.text(`${i + 1}.`, 14, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...INK)
    doc.text(doc.splitTextToSize(t(a), w - 28), 22, y)
    y += 10
  })

  doc.setFillColor(...SEA)
  doc.roundedRect(14, h - 48, w - 28, 26, 3, 3, 'F')
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('DoseRX', 20, h - 36)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MINT)
  doc.text('Medication & controlled drug control | Irish EMS / PHECC-aligned', 20, h - 30)
  doc.text(`Score ${report.compliance.score}/100 (${band.label}) | ${from} - ${to}`, w - 20, h - 30, {
    align: 'right',
  })

  footer(doc, 5, totalPages, report.periodLabel)

  doc.save(`DoseRX-Analytical-Report-${report.period}-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`)
}
