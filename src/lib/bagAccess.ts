import type { DrugBag, ShiftAssignment, StaffMember } from '../types'

/**
 * Staff may only work bags for their own clinical grade:
 * - EMT → EMT standard bags only (no CDs)
 * - Paramedic → Paramedic standard + Paramedic CD pouch
 * - AP → AP standard + AP CD pouch
 * Management can access all bags.
 */
export function canStaffHoldBag(user: StaffMember, bag: DrugBag): boolean {
  if (user.role === 'management') return true

  // Controlled pouches: grade must match exactly; EMT never
  if (bag.type === 'controlled') {
    if (user.grade === 'EMT') return false
    return bag.grade === user.grade
  }

  // Standard / event bags: exact grade match
  return bag.grade === user.grade
}

export function activeShiftForBag(
  bag: DrugBag,
  shifts: ShiftAssignment[],
): ShiftAssignment | undefined {
  if (!bag.activeShiftId) return undefined
  return shifts.find((s) => s.id === bag.activeShiftId && s.active)
}

/** Bags this staff member is allowed to see / sign out (by grade + CD scope) */
export function bagsInStaffScope(bags: DrugBag[], user: StaffMember): DrugBag[] {
  if (user.role === 'management') return bags
  return bags.filter((b) => canStaffHoldBag(user, b))
}

/** Bags currently signed out to this user */
export function bagsHeldOnShift(
  bags: DrugBag[],
  shifts: ShiftAssignment[],
  user: StaffMember,
): DrugBag[] {
  return bags.filter((b) => {
    const shift = activeShiftForBag(b, shifts)
    if (!shift) return false
    if (user.role === 'management') return true
    return shift.holderId === user.id
  })
}

/** Bags this user may administer / waste from right now */
export function bagsUsableForAdminister(
  bags: DrugBag[],
  shifts: ShiftAssignment[],
  user: StaffMember,
): DrugBag[] {
  return bagsHeldOnShift(bags, shifts, user).filter((b) => {
    if (b.eventEndsAt && new Date(b.eventEndsAt).getTime() < Date.now()) return false
    return canStaffHoldBag(user, b)
  })
}

export function gradeBagScopeLabel(user: StaffMember): string {
  if (user.role === 'management') return 'all bags'
  const g = user.grade === 'AP' ? 'AP' : user.grade
  if (user.grade === 'EMT') return 'EMT bags only'
  return `${g} bags + ${g} controlled drug pouch`
}
