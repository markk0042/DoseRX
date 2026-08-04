import { format } from 'date-fns'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ActivityLog, AppState, DrugBag } from '../types'
import { CPG_VERSION } from '../types'

export function downloadCdRegisterPdf(state: AppState) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const cdBags = state.bags.filter((b) => b.type === 'controlled' || b.items.some((i) => i.controlled))
  const now = format(new Date(), 'dd MMM yyyy HH:mm')

  doc.setFontSize(16)
  doc.text('DoseRX — Controlled Drugs Register', 14, 16)
  doc.setFontSize(10)
  doc.text(`HPRA / inspection pack · PHECC CPG ${CPG_VERSION} · Generated ${now}`, 14, 22)
  doc.text(
    state.sandboxMode ? 'SANDBOX MODE — not a live register' : 'Live operational register (demo local data)',
    14,
    27,
  )

  let y = 32
  cdBags.forEach((bag, idx) => {
    if (y > 170) {
      doc.addPage()
      y = 16
    }
    doc.setFontSize(12)
    doc.text(`${bag.code} — ${bag.name} (${bag.grade}${bag.eventName ? ` · Event: ${bag.eventName}` : ''})`, 14, y)
    y += 4

    autoTable(doc, {
      startY: y,
      head: [['Medication', 'Sch', 'On hand', 'Par', 'Batch', 'Expiry', 'Unit']],
      body: bag.items
        .filter((i) => i.controlled || bag.type === 'controlled')
        .map((i) => [
          i.name,
          i.schedule ?? '—',
          String(i.quantity),
          String(i.parLevel),
          i.lotNumber,
          i.expiryDate,
          i.unit,
        ]),
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    })
    // @ts-expect-error lastAutoTable injected by plugin
    y = (doc.lastAutoTable?.finalY ?? y) + 10

    if (idx === cdBags.length - 1) {
      // movement log on same or next page
    }
  })

  doc.addPage()
  doc.setFontSize(14)
  doc.text('CD movement log (administrations, waste, part-dose, shift)', 14, 16)

  const cdNames = new Set(
    state.bags.flatMap((b) => b.items.filter((i) => i.controlled).map((i) => i.name.split(' ')[0])),
  )
  const movements = state.activities.filter(
    (a) =>
      a.type === 'administration' ||
      a.type === 'waste' ||
      a.type === 'part_dose' ||
      a.type === 'shift_sign_out' ||
      a.type === 'shift_return' ||
      (a.medicationName && [...cdNames].some((n) => a.medicationName!.includes(n))),
  )

  autoTable(doc, {
    startY: 22,
    head: [['When', 'Action', 'Bag', 'Drug / qty', 'By', 'Witness', 'Notes']],
    body: movements.slice(0, 80).map((a: ActivityLog) => [
      format(new Date(a.timestamp), 'dd MMM HH:mm'),
      a.type.replace(/_/g, ' '),
      a.bagCode,
      a.medicationName
        ? `${a.medicationName}${a.quantity != null ? ` ×${a.quantity}` : ''}${
            a.partDose ? ` (D${a.partDose.drawn}/G${a.partDose.given}/W${a.partDose.wasted})` : ''
          }`
        : '—',
      a.practitionerName,
      a.witnessName ?? '—',
      (a.notes ?? '').slice(0, 60),
    ]),
    styles: { fontSize: 7 },
    margin: { left: 14, right: 14 },
  })

  doc.save(`DoseRX-CD-Register-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`)
}

export function eventPackSummary(bag: DrugBag) {
  if (!bag.eventEndsAt) return null
  const ends = new Date(bag.eventEndsAt)
  const active = ends.getTime() > Date.now()
  return { active, ends }
}
