import type { ClinicalGrade } from '../types'
import { ADMIN_OPTIONS, type AdminOptions } from './adminOptions'
import { PHECC_FORMULARY } from './formulary'
import { CPG_VERSION } from '../types'

export { CPG_VERSION }

/** Routes typically restricted below certain grades */
const AP_ONLY_ROUTES = ['IV', 'IO', 'IV (rapid)', 'SC / local infiltration']

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

  let routes = [...base.routes]
  if (grade === 'EMT') {
    routes = routes.filter((r) => !AP_ONLY_ROUTES.includes(r) && !['IV', 'IO'].includes(r))
    if (routes.length === 0) routes = ['IM', 'PO', 'Inhaled', 'SL (spray)', 'Buccal / PO', 'NEB']
  } else if (grade === 'Paramedic') {
    routes = routes.filter((r) => !r.toLowerCase().includes('local infiltration'))
  }

  // Keep indications that mention higher grades only for AP when relevant
  let indications = [...base.indications]
  if (grade === 'EMT') {
    indications = indications.filter((i) => !i.includes('(P/AP)') && !i.includes('(AP)'))
  }

  return {
    doses: base.doses,
    routes: routes.length ? routes : base.routes,
    indications: indications.length ? indications : base.indications,
    outOfScopeMed,
    cpgVersion: CPG_VERSION,
  }
}

export function isRouteLikelyOutOfScope(route: string, grade: ClinicalGrade): boolean {
  if (grade === 'AP') return false
  if (grade === 'EMT' && (route.includes('IV') || route.includes('IO'))) return true
  if (grade === 'Paramedic' && AP_ONLY_ROUTES.some((r) => route === r && r.includes('local'))) return true
  return false
}

export function gradeCanUseBag(bagGrade: ClinicalGrade, userGrade: ClinicalGrade, bagType: string): boolean {
  if (bagType === 'controlled') {
    if (userGrade === 'EMT') return false
    if (bagGrade === 'AP' && userGrade !== 'AP') return false
  }
  const order: ClinicalGrade[] = ['EMT', 'Paramedic', 'AP']
  return order.indexOf(userGrade) >= order.indexOf(bagGrade)
}
