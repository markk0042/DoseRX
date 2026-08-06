import {
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfDay,
  format,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns'
import type { ActivityLog, AppState, ClinicalGrade, StaffMember } from '../types'

export type AnalyticsPeriod =
  | '7d'
  | '14d'
  | '30d'
  | '90d'
  | '6m'
  | '12m'

export const PERIOD_OPTIONS: { id: AnalyticsPeriod; label: string }[] = [
  { id: '7d', label: 'Past 7 days' },
  { id: '14d', label: 'Past 2 weeks' },
  { id: '30d', label: 'Past month' },
  { id: '90d', label: 'Past 3 months' },
  { id: '6m', label: 'Past 6 months' },
  { id: '12m', label: 'Past 12 months' },
]

export function periodRange(period: AnalyticsPeriod, now = new Date()) {
  const end = endOfDay(now)
  let start: Date
  switch (period) {
    case '7d':
      start = startOfDay(subDays(now, 6))
      break
    case '14d':
      start = startOfDay(subDays(now, 13))
      break
    case '30d':
      start = startOfDay(subDays(now, 29))
      break
    case '90d':
      start = startOfDay(subDays(now, 89))
      break
    case '6m':
      start = startOfDay(subMonths(now, 6))
      break
    case '12m':
      start = startOfDay(subMonths(now, 12))
      break
  }
  return { start, end, label: PERIOD_OPTIONS.find((p) => p.id === period)?.label ?? period }
}

function inRange(iso: string, start: Date, end: Date) {
  const t = new Date(iso).getTime()
  return t >= start.getTime() && t <= end.getTime()
}

function gradeOf(staff: StaffMember[], id: string): ClinicalGrade | 'Admin' | 'Unknown' {
  const s = staff.find((x) => x.id === id)
  if (!s) return 'Unknown'
  if (s.role === 'management') return 'Admin'
  return s.grade
}

export type NamedCount = { key: string; label: string; count: number }

export interface AnalyticsReport {
  period: AnalyticsPeriod
  periodLabel: string
  start: string
  end: string
  generatedAt: string
  totals: {
    activities: number
    shiftSignOuts: number
    shiftReturns: number
    administrations: number
    wastes: number
    audits: number
    sealUpdates: number
    stockUpdates: number
    discrepancies: number
    discrepanciesResolved: number
    outOfScope: number
    partDoses: number
    eventPacks: number
  }
  compliance: {
    audits: number
    sealUpdates: number
    discrepancyRate: number
    outOfScopeRate: number
    witnessCoverage: number
    score: number
  }
  byGradeShift: NamedCount[]
  byGradeAdministered: NamedCount[]
  byGradeWaste: NamedCount[]
  /** @deprecated combined admin+waste — prefer byGradeAdministered / byGradeWaste */
  byGradeAdmin: NamedCount[]
  byActivityType: NamedCount[]
  dailyTrend: {
    date: string
    label: string
    audits: number
    administered: number
    wasted: number
    shifts: number
    discrepancies: number
    other: number
  }[]
  topMedsAdministered: NamedCount[]
  topMedsWasted: NamedCount[]
  /** Combined units (admin + waste) for legacy views */
  topMeds: NamedCount[]
  recentShifts: {
    bagCode: string
    holder: string
    grade: string
    signedOutAt: string
    returnedAt?: string
    active: boolean
  }[]
}

const TYPE_LABELS: Record<string, string> = {
  inventory_check: 'Staff checks',
  bag_audit: 'Bag audits',
  management_stock: 'Stock updates',
  seal_check: 'Seal / reseals',
  administration: 'Administrations',
  waste: 'Waste',
  restock: 'Restocks',
  discrepancy: 'Discrepancies flagged',
  discrepancy_resolved: 'Discrepancies resolved',
  shift_sign_out: 'Shift sign-outs',
  shift_return: 'Shift returns',
  part_dose: 'Part-dose CD',
  event_pack_created: 'Event packs',
  bag_renamed: 'Bag renames',
  sync: 'Syncs',
  transfer: 'Transfers',
  cd_sign_out: 'CD sign-outs',
  cd_sign_in: 'CD sign-ins',
}

export function buildAnalyticsReport(state: AppState, period: AnalyticsPeriod): AnalyticsReport {
  const { start, end, label } = periodRange(period)
  const activities = state.activities.filter((a) => inRange(a.timestamp, start, end))
  const shifts = state.shifts.filter((s) => inRange(s.signedOutAt, start, end))
  const discrepancies = state.discrepancies.filter((d) => inRange(d.reportedAt, start, end))

  const countType = (types: string[]) => activities.filter((a) => types.includes(a.type)).length

  const shiftSignOuts = countType(['shift_sign_out'])
  const shiftReturns = countType(['shift_return'])
  const administrations = countType(['administration', 'part_dose'])
  const wastes = countType(['waste'])
  const audits = countType(['bag_audit', 'inventory_check'])
  const sealUpdates = countType(['seal_check'])
  const stockUpdates = countType(['management_stock', 'restock'])
  const discrepancyActs = countType(['discrepancy'])
  const discrepanciesResolved = countType(['discrepancy_resolved'])
  const outOfScope = activities.filter((a) => a.outOfScope || a.notes?.includes('OUT OF SCOPE')).length
  const partDoses = countType(['part_dose'])
  const eventPacks = countType(['event_pack_created'])

  const withWitness = activities.filter(
    (a) =>
      ['administration', 'waste', 'bag_audit', 'inventory_check', 'shift_sign_out', 'shift_return', 'part_dose'].includes(
        a.type,
      ),
  )
  const witnessOk = withWitness.filter((a) => a.witnessId).length
  const witnessCoverage = withWitness.length ? Math.round((witnessOk / withWitness.length) * 100) : 100

  const clinicalActs = administrations + wastes
  const discrepancyRate = clinicalActs
    ? Math.round((discrepancyActs / Math.max(clinicalActs, 1)) * 100)
    : Math.round((discrepancies.length / Math.max(audits + shiftSignOuts, 1)) * 100)
  const outOfScopeRate = administrations
    ? Math.round((outOfScope / administrations) * 100)
    : 0

  // Compliance score: audits presence, low discrepancy/OOS, witness coverage
  const auditPresence = Math.min(100, audits * 12)
  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        auditPresence * 0.25 +
          witnessCoverage * 0.35 +
          (100 - Math.min(discrepancyRate * 2, 100)) * 0.2 +
          (100 - Math.min(outOfScopeRate * 3, 100)) * 0.2,
      ),
    ),
  )

  const gradeKeys: Array<ClinicalGrade | 'Admin' | 'Unknown'> = ['EMT', 'Paramedic', 'AP', 'Admin', 'Unknown']

  const byGradeShift = gradeKeys.map((g) => ({
    key: g,
    label: g === 'AP' ? 'Adv. Paramedic' : g,
    count: shifts.filter((s) => gradeOf(state.staff, s.holderId) === g).length,
  })).filter((x) => x.count > 0 || ['EMT', 'Paramedic', 'AP'].includes(x.key))

  const adminOnlyTypes = ['administration', 'part_dose']
  const wasteTypes = ['waste']
  const byGradeAdministered = gradeKeys.map((g) => ({
    key: g,
    label: g === 'AP' ? 'Adv. Paramedic' : g,
    count: activities.filter(
      (a) => adminOnlyTypes.includes(a.type) && gradeOf(state.staff, a.practitionerId) === g,
    ).length,
  })).filter((x) => x.count > 0 || ['EMT', 'Paramedic', 'AP'].includes(x.key))

  const byGradeWaste = gradeKeys.map((g) => ({
    key: g,
    label: g === 'AP' ? 'Adv. Paramedic' : g,
    count: activities.filter(
      (a) => wasteTypes.includes(a.type) && gradeOf(state.staff, a.practitionerId) === g,
    ).length,
  })).filter((x) => x.count > 0 || ['EMT', 'Paramedic', 'AP'].includes(x.key))

  const byGradeAdmin = gradeKeys.map((g) => {
    const a = byGradeAdministered.find((r) => r.key === g)?.count ?? 0
    const w = byGradeWaste.find((r) => r.key === g)?.count ?? 0
    return { key: g, label: g === 'AP' ? 'Adv. Paramedic' : g, count: a + w }
  }).filter((x) => x.count > 0 || ['EMT', 'Paramedic', 'AP'].includes(x.key))

  const typeMap = new Map<string, number>()
  activities.forEach((a) => {
    typeMap.set(a.type, (typeMap.get(a.type) ?? 0) + 1)
  })
  const byActivityType = [...typeMap.entries()]
    .map(([key, count]) => ({ key, label: TYPE_LABELS[key] ?? key, count }))
    .sort((a, b) => b.count - a.count)

  // 7d / 14d / 30d → one bar group per day (full daily data)
  // 90d / 6m / 12m → one bar group per month (full month totals)
  const useMonths = period === '90d' || period === '6m' || period === '12m'
  const buckets = useMonths
    ? eachMonthOfInterval({ start: startOfMonth(start), end })
    : eachDayOfInterval({ start, end })

  const auditTypes = ['bag_audit', 'inventory_check', 'seal_check']
  const shiftTypes = ['shift_sign_out', 'shift_return']
  const discTypes = ['discrepancy', 'discrepancy_resolved']

  const dailyTrend = buckets.map((bucketStart, idx) => {
    const bucketEnd =
      idx < buckets.length - 1
        ? new Date(buckets[idx + 1].getTime() - 1)
        : end
    const inBucket = (iso: string) => inRange(iso, bucketStart, bucketEnd)
    const inBucketActs = activities.filter((a) => inBucket(a.timestamp))
    const yearCross = useMonths && format(start, 'yy') !== format(end, 'yy')

    let audits = 0
    let administered = 0
    let wasted = 0
    let shifts = 0
    let discrepancies = 0
    let other = 0
    inBucketActs.forEach((a) => {
      if (auditTypes.includes(a.type)) audits += 1
      else if (adminOnlyTypes.includes(a.type)) administered += 1
      else if (wasteTypes.includes(a.type)) wasted += 1
      else if (shiftTypes.includes(a.type)) shifts += 1
      else if (discTypes.includes(a.type) || a.discrepancy) discrepancies += 1
      else other += 1
    })

    return {
      date: format(bucketStart, 'yyyy-MM-dd'),
      label: useMonths
        ? format(bucketStart, yearCross ? 'MMM yy' : 'MMM')
        : period === '7d' || period === '14d'
          ? format(bucketStart, 'EEE d')
          : format(bucketStart, 'd'),
      audits,
      administered,
      wasted,
      shifts,
      discrepancies,
      other,
    }
  })

  const adminMedMap = new Map<string, number>()
  const wasteMedMap = new Map<string, number>()
  activities
    .filter((a) => a.medicationName && ['administration', 'part_dose', 'waste'].includes(a.type))
    .forEach((a) => {
      const name = a.medicationName!
      if (a.type === 'waste') {
        wasteMedMap.set(name, (wasteMedMap.get(name) ?? 0) + (a.quantity ?? 1))
      } else if (a.type === 'part_dose' && a.partDose) {
        adminMedMap.set(name, (adminMedMap.get(name) ?? 0) + (a.partDose.given || 0))
        if (a.partDose.wasted > 0) {
          wasteMedMap.set(name, (wasteMedMap.get(name) ?? 0) + a.partDose.wasted)
        }
      } else {
        adminMedMap.set(name, (adminMedMap.get(name) ?? 0) + (a.quantity ?? 1))
      }
    })

  const toTop = (map: Map<string, number>) =>
    [...map.entries()]
      .map(([label, count]) => ({ key: label, label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)

  const topMedsAdministered = toTop(adminMedMap)
  const topMedsWasted = toTop(wasteMedMap)
  const combinedMed = new Map<string, number>()
  ;[...adminMedMap.entries(), ...wasteMedMap.entries()].forEach(([name, count]) => {
    combinedMed.set(name, (combinedMed.get(name) ?? 0) + count)
  })
  const topMeds = toTop(combinedMed)

  const recentShifts = [...shifts]
    .sort((a, b) => new Date(b.signedOutAt).getTime() - new Date(a.signedOutAt).getTime())
    .slice(0, 12)
    .map((s) => ({
      bagCode: s.bagCode,
      holder: s.holderName,
      grade: String(gradeOf(state.staff, s.holderId)),
      signedOutAt: s.signedOutAt,
      returnedAt: s.returnedAt,
      active: s.active,
    }))

  return {
    period,
    periodLabel: label,
    start: start.toISOString(),
    end: end.toISOString(),
    generatedAt: new Date().toISOString(),
    totals: {
      activities: activities.length,
      shiftSignOuts,
      shiftReturns,
      administrations,
      wastes,
      audits,
      sealUpdates,
      stockUpdates,
      discrepancies: discrepancyActs + discrepancies.length,
      discrepanciesResolved,
      outOfScope,
      partDoses,
      eventPacks,
    },
    compliance: {
      audits,
      sealUpdates,
      discrepancyRate,
      outOfScopeRate,
      witnessCoverage,
      score,
    },
    byGradeShift,
    byGradeAdministered,
    byGradeWaste,
    byGradeAdmin,
    byActivityType,
    dailyTrend,
    topMedsAdministered,
    topMedsWasted,
    topMeds,
    recentShifts,
  }
}

export function activityGrade(staff: StaffMember[], activity: ActivityLog) {
  return gradeOf(staff, activity.practitionerId)
}
