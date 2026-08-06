import { v4 as uuid } from 'uuid'
import type { ActivityLog, ClinicalGrade, DrugBag, StaffMember, StockItem } from '../types'
import { controlledMedsForGrade, medsForGrade } from './formulary'
import { stockItemId } from '../lib/qr'

function lot(seed: string) {
  // Deterministic-ish lot from bag+med so labels match across devices in demo
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  return `${letters[h % letters.length]}${letters[(h >> 5) % letters.length]}${1000 + (h % 9000)}`
}

function expiry(monthsAhead: number) {
  const d = new Date()
  d.setMonth(d.getMonth() + monthsAhead)
  return d.toISOString().slice(0, 10)
}

function buildItems(bagId: string, grade: ClinicalGrade, controlledOnly: boolean): StockItem[] {
  const defs = controlledOnly
    ? controlledMedsForGrade(grade as 'Paramedic' | 'AP')
    : medsForGrade(grade, false)

  return defs.map((m, i) => ({
    id: stockItemId(bagId, m.id),
    medicationId: m.id,
    name: m.name,
    presentation: m.presentation,
    quantity: m.defaultQty,
    parLevel: m.defaultQty,
    lotNumber: lot(`${bagId}:${m.id}`),
    expiryDate: expiry(6 + (i % 18)),
    controlled: m.controlled,
    schedule: m.schedule,
    unit: m.stockUnit,
    strength: m.strength,
    doseUnit: m.doseUnit,
    stockUnit: m.stockUnit,
    packSize: m.packSize,
  }))
}

function seal(bagId: string) {
  let h = 0
  for (let i = 0; i < bagId.length; i++) h = (h * 33 + bagId.charCodeAt(i)) >>> 0
  return `SL-${100000 + (h % 900000)}`
}

export const STAFF: StaffMember[] = [
  {
    id: 'mgmt-1',
    name: 'Claire Byrne',
    grade: 'AP',
    role: 'management',
    pin: '9999',
    pheccNumber: 'MGMT-001',
  },
  {
    id: 'mgmt-2',
    name: 'Tom Fitzgerald',
    grade: 'Paramedic',
    role: 'management',
    pin: '8888',
    pheccNumber: 'MGMT-002',
  },
  { id: 'staff-1', name: 'Aoife Brennan', grade: 'EMT', role: 'staff', pin: '1111', pheccNumber: 'EMT-48291' },
  { id: 'staff-2', name: 'Conor Murphy', grade: 'EMT', role: 'staff', pin: '2222', pheccNumber: 'EMT-51902' },
  { id: 'staff-3', name: 'Siobhán O\'Neill', grade: 'Paramedic', role: 'staff', pin: '3333', pheccNumber: 'P-33814' },
  { id: 'staff-4', name: 'James Kelly', grade: 'Paramedic', role: 'staff', pin: '4444', pheccNumber: 'P-29107' },
  { id: 'staff-5', name: 'Niamh Walsh', grade: 'AP', role: 'staff', pin: '5555', pheccNumber: 'AP-17462' },
  { id: 'staff-6', name: 'Mark Doyle', grade: 'AP', role: 'staff', pin: '6666', pheccNumber: 'AP-15208' },
]

/** 10 DoseRX drug bags — standard + controlled drug pouches */
export function createInitialBags(): DrugBag[] {
  return [
    {
      id: 'bag-emt-01',
      code: 'DRX-EMT-01',
      name: 'EMT Drug Bag 1',
      grade: 'EMT',
      type: 'standard',
      sealNumber: seal('bag-emt-01'),
      status: 'sealed',
      tagStatus: 'green',
      activeShiftId: null,
      assignedVehicle: 'A01',
      items: buildItems('bag-emt-01', 'EMT', false),
    },
    {
      id: 'bag-emt-02',
      code: 'DRX-EMT-02',
      name: 'EMT Drug Bag 2',
      grade: 'EMT',
      type: 'standard',
      sealNumber: seal('bag-emt-02'),
      status: 'sealed',
      tagStatus: 'green',
      activeShiftId: null,
      assignedVehicle: 'A02',
      items: buildItems('bag-emt-02', 'EMT', false),
    },
    {
      id: 'bag-p-01',
      code: 'DRX-P-01',
      name: 'Paramedic Drug Bag 1',
      grade: 'Paramedic',
      type: 'standard',
      sealNumber: seal('bag-p-01'),
      status: 'sealed',
      tagStatus: 'green',
      activeShiftId: null,
      assignedVehicle: 'A01',
      items: buildItems('bag-p-01', 'Paramedic', false),
    },
    {
      id: 'bag-p-02',
      code: 'DRX-P-02',
      name: 'Paramedic Drug Bag 2',
      grade: 'Paramedic',
      type: 'standard',
      sealNumber: seal('bag-p-02'),
      status: 'check_due',
      tagStatus: 'green',
      activeShiftId: null,
      assignedVehicle: 'A02',
      lastCheckedAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
      lastCheckedBy: 'Siobhán O\'Neill',
      items: buildItems('bag-p-02', 'Paramedic', false),
    },
    {
      id: 'bag-p-03',
      code: 'DRX-P-03',
      name: 'Paramedic Drug Bag 3',
      grade: 'Paramedic',
      type: 'standard',
      sealNumber: seal('bag-p-03'),
      status: 'sealed',
      tagStatus: 'green',
      activeShiftId: null,
      assignedVehicle: 'A03',
      items: buildItems('bag-p-03', 'Paramedic', false),
    },
    {
      id: 'bag-ap-01',
      code: 'DRX-AP-01',
      name: 'Advanced Paramedic Drug Bag 1',
      grade: 'AP',
      type: 'standard',
      sealNumber: seal('bag-ap-01'),
      status: 'sealed',
      tagStatus: 'green',
      activeShiftId: null,
      assignedVehicle: 'A01',
      items: buildItems('bag-ap-01', 'AP', false),
    },
    {
      id: 'bag-ap-02',
      code: 'DRX-AP-02',
      name: 'Advanced Paramedic Drug Bag 2',
      grade: 'AP',
      type: 'standard',
      sealNumber: seal('bag-ap-02'),
      status: 'sealed',
      tagStatus: 'green',
      activeShiftId: null,
      assignedVehicle: 'A02',
      items: buildItems('bag-ap-02', 'AP', false),
    },
    {
      id: 'bag-ap-03',
      code: 'DRX-AP-03',
      name: 'Advanced Paramedic Drug Bag 3',
      grade: 'AP',
      type: 'standard',
      sealNumber: seal('bag-ap-03'),
      status: 'open',
      tagStatus: 'green',
      activeShiftId: null,
      assignedVehicle: 'A03',
      lastCheckedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      lastCheckedBy: 'Niamh Walsh',
      items: buildItems('bag-ap-03', 'AP', false),
    },
    {
      id: 'bag-cd-p-01',
      code: 'DRX-CD-P-01',
      name: 'Paramedic Controlled Drugs',
      grade: 'Paramedic',
      type: 'controlled',
      sealNumber: seal('bag-cd-p-01'),
      status: 'sealed',
      tagStatus: 'green',
      activeShiftId: null,
      assignedVehicle: 'CD Safe / A01',
      items: buildItems('bag-cd-p-01', 'Paramedic', true),
    },
    {
      id: 'bag-cd-ap-01',
      code: 'DRX-CD-AP-01',
      name: 'AP Controlled Drugs',
      grade: 'AP',
      type: 'controlled',
      sealNumber: seal('bag-cd-ap-01'),
      status: 'sealed',
      tagStatus: 'green',
      activeShiftId: null,
      assignedVehicle: 'CD Safe / A01',
      items: buildItems('bag-cd-ap-01', 'AP', true),
    },
  ]
}

/** Realistic 6–12 month activity history so Analytics charts are demo-ready */
export function createSeedActivityHistory(bags: DrugBag[], staff: StaffMember[]): ActivityLog[] {
  const clinical = staff.filter((s) => s.role === 'staff')
  const managers = staff.filter((s) => s.role === 'management')
  const emts = clinical.filter((s) => s.grade === 'EMT')
  const params = clinical.filter((s) => s.grade === 'Paramedic')
  const aps = clinical.filter((s) => s.grade === 'AP')
  const stdBags = bags.filter((b) => b.type === 'standard')
  const cdBags = bags.filter((b) => b.type === 'controlled')
  const now = Date.now()
  const out: ActivityLog[] = []

  const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]
  const daysAgo = (d: number, hour = 8) => {
    const t = new Date(now - d * 24 * 60 * 60 * 1000)
    t.setHours(hour, Math.floor(Math.random() * 50), 0, 0)
    return t.toISOString()
  }

  const push = (partial: Omit<ActivityLog, 'id' | 'synced'>) => {
    out.push({ ...partial, id: uuid(), synced: true })
  }

  // ~52 weeks so Past 12 months charts are populated
  for (let week = 0; week < 52; week++) {
    const base = week * 7 + 1
    const dayJitter = Math.floor(Math.random() * 5)

    // 2–4 shift sign-outs / returns per week across grades
    const shiftCount = 2 + Math.floor(Math.random() * 3)
    for (let s = 0; s < shiftCount; s++) {
      const holder = pick(clinical)
      const bag =
        holder.grade === 'EMT'
          ? pick(stdBags.filter((b) => b.grade === 'EMT'))
          : holder.grade === 'Paramedic'
            ? pick([...stdBags.filter((b) => b.grade === 'Paramedic'), ...cdBags.filter((b) => b.grade === 'Paramedic')])
            : pick([...stdBags.filter((b) => b.grade === 'AP'), ...cdBags.filter((b) => b.grade === 'AP')])
      if (!bag) continue
      const witness = pick(clinical.filter((c) => c.id !== holder.id))
      const outDay = base + dayJitter + s
      push({
        type: 'shift_sign_out',
        bagId: bag.id,
        bagCode: bag.code,
        timestamp: daysAgo(outDay, 7 + s),
        practitionerId: holder.id,
        practitionerName: holder.name,
        witnessId: witness.id,
        witnessName: witness.name,
        notes: `Tag: green · ${holder.grade} shift`,
      })
      push({
        type: 'shift_return',
        bagId: bag.id,
        bagCode: bag.code,
        timestamp: daysAgo(Math.max(0, outDay - 1), 18 + s),
        practitionerId: holder.id,
        practitionerName: holder.name,
        witnessId: witness.id,
        witnessName: witness.name,
        notes: 'Tag intact: Yes · Tag: green',
      })
    }

    // Administrations by grade
    const adminRounds = 3 + Math.floor(Math.random() * 4)
    for (let a = 0; a < adminRounds; a++) {
      const practitioner = pick([...(Math.random() > 0.35 ? params : []), ...(Math.random() > 0.4 ? aps : []), ...emts])
      const bag = pick(stdBags.filter((b) => b.grade === practitioner.grade) || stdBags)
      const item = bag?.items[Math.floor(Math.random() * Math.min(4, bag.items.length))]
      if (!bag || !item) continue
      const witness = pick(clinical.filter((c) => c.id !== practitioner.id))
      push({
        type: Math.random() > 0.85 ? 'waste' : 'administration',
        bagId: bag.id,
        bagCode: bag.code,
        timestamp: daysAgo(base + (a % 6), 10 + a),
        practitionerId: practitioner.id,
        practitionerName: practitioner.name,
        witnessId: witness.id,
        witnessName: witness.name,
        medicationName: item.name,
        quantity: 1,
        patientRef: `CAD-${1000 + week * 10 + a}`,
        notes: `CPG 2026 · Dose sample · ${practitioner.grade}`,
        outOfScope: practitioner.grade === 'EMT' && Math.random() > 0.92,
      })
    }

    // Weekly CD part-dose for AP
    if (aps.length && cdBags.some((b) => b.grade === 'AP') && week % 2 === 0) {
      const ap = pick(aps)
      const bag = pick(cdBags.filter((b) => b.grade === 'AP'))
      const item = bag?.items.find((i) => i.name.includes('Morphine') || i.name.includes('Fentanyl')) ?? bag?.items[0]
      const witness = pick(clinical.filter((c) => c.id !== ap.id))
      if (bag && item) {
        push({
          type: 'part_dose',
          bagId: bag.id,
          bagCode: bag.code,
          timestamp: daysAgo(base + 2, 14),
          practitionerId: ap.id,
          practitionerName: ap.name,
          witnessId: witness.id,
          witnessName: witness.name,
          medicationName: item.name,
          quantity: 1,
          patientRef: `CAD-CD-${week}`,
          notes: 'Part-dose · drawn 1 · given 0.5 · wasted 0.5',
          partDose: { drawn: 1, given: 0.5, wasted: 0.5, unit: item.unit },
        })
      }
    }

    // Management audit every ~2 weeks
    if (week % 2 === 0 && managers.length) {
      const auditor = pick(managers)
      const bag = pick(bags)
      const witness = pick(staff.filter((s) => s.id !== auditor.id))
      push({
        type: 'bag_audit',
        bagId: bag.id,
        bagCode: bag.code,
        timestamp: daysAgo(base + 3, 11),
        practitionerId: auditor.id,
        practitionerName: auditor.name,
        witnessId: witness.id,
        witnessName: witness.name,
        notes: Math.random() > 0.9 ? 'Mismatch · investigation opened' : 'Audit OK — counts match system',
        discrepancy: Math.random() > 0.9,
      })
      push({
        type: 'seal_check',
        bagId: bag.id,
        bagCode: bag.code,
        timestamp: daysAgo(base + 3, 11),
        practitionerId: auditor.id,
        practitionerName: auditor.name,
        witnessId: witness.id,
        witnessName: witness.name,
        notes: `New seal: SL-${200000 + week} · last checked updated`,
      })
    }

    // Occasional stock update / discrepancy
    if (week % 4 === 0 && managers.length) {
      const mgr = pick(managers)
      const bag = pick(bags)
      const witness = pick(staff.filter((s) => s.id !== mgr.id))
      push({
        type: 'management_stock',
        bagId: bag.id,
        bagCode: bag.code,
        timestamp: daysAgo(base + 4, 9),
        practitionerId: mgr.id,
        practitionerName: mgr.name,
        witnessId: witness.id,
        witnessName: witness.name,
        notes: 'Par / lot refresh after delivery',
      })
    }

    if (week % 5 === 0) {
      const reporter = pick(clinical)
      const bag = pick(bags)
      push({
        type: 'discrepancy',
        bagId: bag.id,
        bagCode: bag.code,
        timestamp: daysAgo(base + 5, 16),
        practitionerId: reporter.id,
        practitionerName: reporter.name,
        notes: 'Count variance flagged on return',
        discrepancy: true,
      })
      if (managers.length && Math.random() > 0.3) {
        const mgr = pick(managers)
        push({
          type: 'discrepancy_resolved',
          bagId: bag.id,
          bagCode: bag.code,
          timestamp: daysAgo(Math.max(0, base + 5 - 2), 10),
          practitionerId: mgr.id,
          practitionerName: mgr.name,
          notes: 'Resolved after recount / restock',
        })
      }
    }
  }

  return out.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}
