import { createContext, useContext } from 'react'
import type {
  ActivityLog,
  AppState,
  DiscrepancyCase,
  DiscrepancyStatus,
  DrugBag,
  GeoPoint,
  PartDoseRecord,
  PhotoEvidence,
  ShiftAssignment,
  StaffMember,
  StockItem,
  TagStatus,
} from '../types'

export interface AppActions {
  setCurrentUser: (id: string | null) => void
  setSandboxMode: (enabled: boolean) => void
  completeStaffCheck: (
    bagId: string,
    counts: Record<string, number>,
    practitioner: StaffMember,
    witness: StaffMember,
    notes?: string,
  ) => void
  setManagementStock: (
    bagId: string,
    stocks: Record<string, { quantity: number; parLevel: number; lotNumber?: string; expiryDate?: string }>,
    manager: StaffMember,
    witness: StaffMember,
    notes?: string,
  ) => void
  recordAdministration: (args: {
    bagId: string
    itemId: string
    qty: number
    practitioner: StaffMember
    witness: StaffMember | null
    patientRef: string
    notes?: string
    outOfScope?: boolean
    partDose?: PartDoseRecord
    location?: GeoPoint | null
  }) => void
  recordWaste: (
    bagId: string,
    itemId: string,
    qty: number,
    practitioner: StaffMember,
    witness: StaffMember,
    notes: string,
  ) => void
  resignSeal: (bagId: string, newSeal: string, practitioner: StaffMember, witness: StaffMember) => void
  completeBagAudit: (args: {
    bagId: string
    auditor: StaffMember
    witness: StaffMember
    counts: Record<string, number>
    notes?: string
    newSeal?: string
    tagStatus?: TagStatus
  }) => boolean
  restockItem: (
    bagId: string,
    itemId: string,
    qty: number,
    lot: string,
    expiry: string,
    manager: StaffMember,
  ) => void
  signOutBagForShift: (args: {
    bagId: string
    holder: StaffMember
    witness: StaffMember
    tagStatus: TagStatus
    medsCheckedOnUntagged?: boolean
    notes?: string
    photo?: PhotoEvidence
    location?: GeoPoint | null
  }) => string | null
  returnBagFromShift: (args: {
    bagId: string
    returner: StaffMember
    witness: StaffMember
    tagStillIntact: boolean
    tagStatus: TagStatus
    notes?: string
    photo?: PhotoEvidence
    location?: GeoPoint | null
  }) => boolean
  reportDiscrepancy: (args: {
    bagId: string
    reporter: StaffMember
    witness?: StaffMember
    summary: string
    details?: string
    itemNotes?: string
  }) => string
  updateDiscrepancy: (args: {
    id: string
    status: DiscrepancyStatus
    actor: StaffMember
    resolution?: string
  }) => void
  createEventPack: (args: {
    manager: StaffMember
    name: string
    grade: 'EMT' | 'Paramedic' | 'AP'
    controlled: boolean
    eventName: string
    startsAt: string
    endsAt: string
    vehicle?: string
  }) => string
  flushSyncQueue: () => void
  updateBagLocation: (bagId: string, location: GeoPoint) => void
  renameBag: (bagId: string, name: string, manager: StaffMember) => boolean
  verifyPin: (staffId: string, pin: string) => boolean
  findStaffByPin: (pin: string) => StaffMember | undefined
  resetDemo: () => void
}

export interface AppContextValue extends AppActions {
  state: AppState
  currentUser: StaffMember | null
  isManagement: boolean
  getBag: (id: string) => DrugBag | undefined
  getActiveShift: (bagId: string) => ShiftAssignment | undefined
  expiringSoon: (item: StockItem, days?: number) => boolean
  isExpired: (item: StockItem) => boolean
  openDiscrepancies: DiscrepancyCase[]
}

export const AppContext = createContext<AppContextValue | null>(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

export type { ActivityLog }
