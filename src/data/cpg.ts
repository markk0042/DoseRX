import type { ClinicalGrade } from '../types'
import { ADMIN_OPTIONS, type AdminOptions } from './adminOptions'
import { PHECC_FORMULARY } from './formulary'
import { CPG_VERSION } from '../types'

export { CPG_VERSION }

/**
 * Normalise a route label for matching (e.g. "SL (spray)" → "sl spray").
 */
function normRoute(route: string) {
  return route.toLowerCase().replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim()
}

/**
 * Grade-permitted routes (families).
 * EMT & Paramedic (Ireland): PO, sublingual, IM (+ buccal / inhaled / neb on formulary).
 * IV / IO (and other parenteral CPG routes) are Advanced Paramedic only.
 * AP: all routes defined on the medication.
 *
 * Final dropdown = medication routes ∩ grade-permitted routes.
 */
function routeAllowedForGrade(route: string, grade: ClinicalGrade): boolean {
  if (grade === 'AP') return true

  const r = normRoute(route)

  const isPo =
    r === 'po' ||
    r.startsWith('po ') ||
    r.endsWith(' po') ||
    r.includes('/ po') ||
    r.includes('buccal')
  const isSl =
    r === 'sl' ||
    r.includes('sublingual') ||
    r.startsWith('sl ') ||
    r.includes('sl (') ||
    (r.includes('spray') && r.includes('sl'))
  const isIm = r === 'im' || r.startsWith('im ') || /\bim\b/.test(r)
  const isInhaledOrNeb =
    r.includes('inhaled') || r.includes('neb') || r.includes('nebulis') || r.includes('mdi')
  const isTopicalOcular = r.includes('topical') || r.includes('ocular')

  // Explicitly blocked for EMT / Paramedic (AP-only in Ireland)
  if (
    /\biv\b/.test(r) ||
    r.startsWith('iv') ||
    /\bio\b/.test(r) ||
    r.startsWith('io') ||
    r.includes('infiltration') ||
    r.includes('sc /')
  ) {
    return false
  }

  return isPo || isSl || isIm || isInhaledOrNeb || isTopicalOcular
}

function filterRoutesForGrade(routes: string[], grade: ClinicalGrade): string[] {
  return routes.filter((r) => routeAllowedForGrade(r, grade))
}

/** Drop dose lines that only make sense for routes this grade cannot use. */
function filterDosesForGrade(doses: string[], routes: string[], grade: ClinicalGrade): string[] {
  if (grade === 'AP') return doses
  const routeSet = routes.map(normRoute)
  const hasPo = routeSet.some((r) => r.includes('po') || r.includes('buccal'))
  const hasIv = routeSet.some((r) => /\biv\b/.test(r) || r.startsWith('iv'))
  const hasPr = routeSet.some((r) => r === 'pr' || /\bpr\b/.test(r))

  return doses.filter((d) => {
    const x = d.toLowerCase()
    if (x.includes('pr dose') || (x.includes(' pr') && !hasPr)) return hasPr
    // Keep "1 g PO/IV" when PO is available
    if (x.includes('po/iv') || x.includes('po / iv')) return hasPo || hasIv
    if (x.includes('iv') && !x.includes('po') && !hasIv) return false
    return true
  })
}

export function medicationAllowedForGrade(medicationId: string, grade: ClinicalGrade): boolean {
  const def = PHECC_FORMULARY.find((m) => m.id === medicationId)
  if (!def) return false
  return def.grades.includes(grade)
}

export function filterOptionsForGrade(
  medicationId: string,
  grade: ClinicalGrade,
): AdminOptions & { outOfScopeMed: boolean; cpgVersion: string } {
  const base = ADMIN_OPTIONS[medicationId] ?? {
    doses: ['As per CPG'],
    routes: ['As per CPG'],
    indications: ['As per CPG'],
  }
  const outOfScopeMed = !medicationAllowedForGrade(medicationId, grade)

  // Medication routes first, then grade gate — never re-expand to blocked routes
  let routes = filterRoutesForGrade(base.routes, grade)
  if (routes.length === 0 && base.routes.includes('As per CPG')) {
    routes = ['As per CPG']
  }

  const doses = filterDosesForGrade(base.doses, routes, grade)

  let indications = [...base.indications]
  if (grade === 'EMT') {
    indications = indications.filter((i) => !i.includes('(P/AP)') && !i.includes('(AP)'))
  } else if (grade === 'Paramedic') {
    indications = indications.filter((i) => !i.includes('(AP)') || i.includes('(P/AP)'))
  }

  return {
    doses: doses.length ? doses : base.doses,
    routes,
    indications: indications.length ? indications : base.indications,
    outOfScopeMed,
    cpgVersion: CPG_VERSION,
  }
}

export function isRouteLikelyOutOfScope(route: string, grade: ClinicalGrade): boolean {
  if (!route) return false
  if (route === 'As per CPG') return false
  return !routeAllowedForGrade(route, grade)
}

export function gradeCanUseBag(bagGrade: ClinicalGrade, userGrade: ClinicalGrade, bagType: string): boolean {
  if (bagType === 'controlled') {
    if (userGrade === 'EMT') return false
    if (bagGrade === 'AP' && userGrade !== 'AP') return false
  }
  const order: ClinicalGrade[] = ['EMT', 'Paramedic', 'AP']
  return order.indexOf(userGrade) >= order.indexOf(bagGrade)
}
