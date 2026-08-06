import type { ClinicalGrade, DrugBag, ShiftAssignment, StaffMember } from '../types'

const gradeRank: Record<ClinicalGrade, number> = {
  EMT: 1,
  Paramedic: 2,
  AP: 3,
}

/** Whether this clinician may sign out / work from this bag on shift */
export function canStaffHoldBag(user: StaffMember, bag: DrugBag): boolean {
  if (user.role === 'management') return true

  if (bag.type === 'controlled') {
    if (user.grade === 'EMT') return false
    // Paramedic CD pouch — Paramedic or AP
    if (bag.grade === 'Paramedic') return user.grade === 'Paramedic' || user.grade === 'AP'
    // AP CD pouch — AP only
    if (bag.grade === 'AP') return user.grade === 'AP'
    return false
  }

  // Standard / event bags: own grade, or higher grade covering down
  return gradeRank[user.grade] >= gradeRank[bag.grade]
}

export function activeShiftForBag(
  bag: DrugBag,
  shifts: ShiftAssignment[],
): ShiftAssignment | undefined {
  if (!bag.activeShiftId) return undefined
  return shifts.find((s) => s.id === bag.activeShiftId && s.active)
}

/** Bags currently signed out to this user (any grade) */
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
