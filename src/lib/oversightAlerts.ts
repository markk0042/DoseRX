import { subHours } from 'date-fns'
import type { AppState, StockItem } from '../types'

export type OversightAlerts = {
  /** Total count for nav badges (real exceptions only — not bags on shift) */
  total: number
  openDiscrepancies: number
  bagReviewsDue: number
  bagsWithDiscrepancyStatus: number
  expiredMedications: number
  expiringSoonMedications: number
  recentWastes: number
  /** Operational — show in System oversight, not as a nav “alert” */
  onShift: number
}

export function buildOversightAlerts(
  state: AppState,
  opts: {
    isExpired: (item: StockItem) => boolean
    expiringSoon: (item: StockItem, days?: number) => boolean
  },
): OversightAlerts {
  const openDiscrepancies = state.discrepancies.filter((d) => d.status !== 'resolved').length
  const bagReviewsDue = state.bags.filter((b) => b.status === 'check_due').length
  const bagsWithDiscrepancyStatus = state.bags.filter((b) => b.status === 'discrepancy').length

  const allItems = state.bags.flatMap((b) => b.items)
  const expiredMedications = allItems.filter((i) => opts.isExpired(i)).length
  const expiringSoonMedications = allItems.filter((i) => !opts.isExpired(i) && opts.expiringSoon(i)).length

  const since = subHours(new Date(), 24).getTime()
  const recentWastes = state.activities.filter(
    (a) =>
      (a.type === 'waste' || (a.type === 'part_dose' && (a.partDose?.wasted ?? 0) > 0)) &&
      new Date(a.timestamp).getTime() >= since,
  ).length

  const onShift = state.bags.filter((b) => b.status === 'on_shift').length

  const total =
    openDiscrepancies +
    bagReviewsDue +
    bagsWithDiscrepancyStatus +
    expiredMedications +
    expiringSoonMedications +
    recentWastes

  return {
    total,
    openDiscrepancies,
    bagReviewsDue,
    bagsWithDiscrepancyStatus,
    expiredMedications,
    expiringSoonMedications,
    recentWastes,
    onShift,
  }
}
