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
  quantity: number
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
  | { kind: 'med'; bagId: string; itemId: string }
