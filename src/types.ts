export type ClinicalGrade = 'EMT' | 'Paramedic' | 'AP'
export type UserRole = 'management' | 'staff'
export type BagType = 'standard' | 'controlled'
export type BagStatus = 'sealed' | 'open' | 'check_due' | 'discrepancy' | 'expired_items' | 'on_shift'
export type TagStatus = 'green' | 'red' | 'untagged'
export type ActivityType =
  | 'inventory_check'
  | 'management_stock'
  | 'seal_check'
  | 'administration'
  | 'waste'
  | 'restock'
  | 'transfer'
  | 'cd_sign_out'
  | 'cd_sign_in'
  | 'discrepancy'
  | 'shift_sign_out'
  | 'shift_return'

export interface MedicationDef {
  id: string
  name: string
  presentation: string
  grades: ClinicalGrade[]
  controlled: boolean
  schedule?: '2' | '3' | '4'
  unit: string
  defaultQty: number
  category: string
}

export interface StockItem {
  id: string
  medicationId: string
  name: string
  presentation: string
  /** Live on-hand count — set by management, deducted by staff admin/waste */
  quantity: number
  /** Full-bag target set by management (does not change on administration) */
  parLevel: number
  lotNumber: string
  expiryDate: string
  controlled: boolean
  schedule?: '2' | '3' | '4'
  unit: string
}

export interface DrugBag {
  id: string
  code: string
  name: string
  grade: ClinicalGrade
  type: BagType
  sealNumber: string
  status: BagStatus
  tagStatus: TagStatus
  assignedVehicle?: string
  lastCheckedAt?: string
  lastCheckedBy?: string
  lastStockedAt?: string
  lastStockedBy?: string
  /** Active shift assignment id if bag is signed out */
  activeShiftId?: string | null
  items: StockItem[]
}

export interface StaffMember {
  id: string
  name: string
  grade: ClinicalGrade
  role: UserRole
  pin: string
  pheccNumber: string
}

export interface ShiftAssignment {
  id: string
  bagId: string
  bagCode: string
  signedOutAt: string
  returnedAt?: string
  holderId: string
  holderName: string
  witnessOutId: string
  witnessOutName: string
  witnessReturnId?: string
  witnessReturnName?: string
  tagOnSignOut: TagStatus
  medsCheckedOnUntagged?: boolean
  tagStillIntactOnReturn?: boolean
  tagOnReturn?: TagStatus
  active: boolean
  notesOut?: string
  notesReturn?: string
}

export interface ActivityLog {
  id: string
  type: ActivityType
  bagId: string
  bagCode: string
  timestamp: string
  practitionerId: string
  practitionerName: string
  witnessId?: string
  witnessName?: string
  medicationName?: string
  quantity?: number
  notes?: string
  patientRef?: string
  discrepancy?: boolean
}

export interface AppState {
  bags: DrugBag[]
  staff: StaffMember[]
  activities: ActivityLog[]
  shifts: ShiftAssignment[]
  currentUserId: string | null
}

export type QrPayload =
  | { kind: 'bag'; bagId: string }
  | { kind: 'med'; bagId: string; itemId: string }
