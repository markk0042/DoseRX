export type ClinicalGrade = 'EMT' | 'Paramedic' | 'AP'
export type UserRole = 'management' | 'staff'
export type BagType = 'standard' | 'controlled' | 'event'
export type BagStatus =
  | 'sealed'
  | 'open'
  | 'check_due'
  | 'discrepancy'
  | 'expired_items'
  | 'on_shift'
export type TagStatus = 'green' | 'red' | 'untagged'
export type DiscrepancyStatus = 'open' | 'investigating' | 'resolved'
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
  | 'discrepancy_resolved'
  | 'shift_sign_out'
  | 'shift_return'
  | 'sync'
  | 'event_pack_created'
  | 'part_dose'
  | 'bag_renamed'
  | 'bag_audit'

export const CPG_VERSION = '2026 Edition'

export interface GeoPoint {
  lat: number
  lng: number
  accuracy?: number
  capturedAt: string
}

export interface PhotoEvidence {
  id: string
  dataUrl: string
  caption?: string
  capturedAt: string
}

/** Clinical / administration unit (what you enter when giving a dose) */
export type DoseUnit =
  | 'ml'
  | 'mg'
  | 'mcg'
  | 'g'
  | 'amp'
  | 'tab'
  | 'spray'
  | 'puff'
  | 'neb'
  | 'IU'
  | 'unit'
  | 'tube'
  | 'kit'
  | 'inhaler'
  | 'drop'

/** Inventory counting unit (what sits on the shelf / in the bag) */
export type StockUnit =
  | 'bottle'
  | 'amp'
  | 'tab'
  | 'ml'
  | 'vial'
  | 'neb'
  | 'tube'
  | 'kit'
  | 'spray'
  | 'inhaler'
  | 'cylinder'
  | 'bag'
  | 'prefill'
  | 'pack'
  | 'unit'
  | 'drop'

/**
 * Per-drug medication profile (formulary).
 * packSize = amount of doseUnit contained in one stockUnit
 * e.g. bottle of 100 ml oral solution → stockUnit bottle, doseUnit ml, packSize 100
 */
export interface MedicationProfile {
  /** e.g. 120mg/5ml, 500mg/tab, 1mg/1ml */
  strength: string
  doseUnit: DoseUnit
  stockUnit: StockUnit
  packSize: number
}

export interface MedicationDef extends MedicationProfile {
  id: string
  name: string
  presentation: string
  grades: ClinicalGrade[]
  controlled: boolean
  schedule?: '2' | '3' | '4'
  /** @deprecated prefer stockUnit — kept as inventory display alias */
  unit: string
  defaultQty: number
  category: string
}

export interface StockItem extends MedicationProfile {
  id: string
  medicationId: string
  name: string
  presentation: string
  quantity: number
  parLevel: number
  lotNumber: string
  expiryDate: string
  controlled: boolean
  schedule?: '2' | '3' | '4'
  /** Inventory display alias of stockUnit */
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
  activeShiftId?: string | null
  items: StockItem[]
  /** Event / multi-agency temporary pack */
  eventName?: string
  eventStartsAt?: string
  eventEndsAt?: string
  lastKnownLocation?: GeoPoint
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
  photoOut?: PhotoEvidence
  photoReturn?: PhotoEvidence
  locationOut?: GeoPoint
  locationReturn?: GeoPoint
}

export interface PartDoseRecord {
  drawn: number
  given: number
  wasted: number
  unit: string
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
  outOfScope?: boolean
  cpgVersion?: string
  partDose?: PartDoseRecord
  location?: GeoPoint
  photoIds?: string[]
  synced?: boolean
}

export interface DiscrepancyCase {
  id: string
  bagId: string
  bagCode: string
  status: DiscrepancyStatus
  reportedAt: string
  reportedById: string
  reportedByName: string
  witnessId?: string
  witnessName?: string
  summary: string
  details?: string
  itemNotes?: string
  assignedToId?: string
  assignedToName?: string
  resolution?: string
  resolvedAt?: string
  resolvedById?: string
  resolvedByName?: string
}

export interface PendingSyncItem {
  id: string
  createdAt: string
  label: string
  offline: boolean
  payloadType: string
}

export interface AppState {
  bags: DrugBag[]
  staff: StaffMember[]
  activities: ActivityLog[]
  shifts: ShiftAssignment[]
  discrepancies: DiscrepancyCase[]
  pendingSync: PendingSyncItem[]
  currentUserId: string | null
  sandboxMode: boolean
  lastSyncedAt?: string
}

export type QrPayload =
  | { kind: 'bag'; bagId: string }
  | { kind: 'med'; bagId: string; itemId: string; trackingCode?: string }
