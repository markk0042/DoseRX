import { createContext, useContext } from 'react'
import type {
  ActivityLog,
  AppState,
  DrugBag,
  ShiftAssignment,
  StaffMember,
  StockItem,
  TagStatus,
} from '../types'

export interface AppActions {
  setCurrentUser: (id: string | null) => void
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
  recordAdministration: (
    bagId: string,
    itemId: string,
    qty: number,
    practitioner: StaffMember,
    witness: StaffMember | null,
    patientRef: string,
    notes?: string,
  ) => void
  recordWaste: (
    bagId: string,
    itemId: string,
    qty: number,
    practitioner: StaffMember,
    witness: StaffMember,
    notes: string,
  ) => void
  resignSeal: (bagId: string, newSeal: string, practitioner: StaffMember, witness: StaffMember) => void
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
  }) => string | null
  returnBagFromShift: (args: {
    bagId: string
    returner: StaffMember
    witness: StaffMember
    tagStillIntact: boolean
    tagStatus: TagStatus
    notes?: string
  }) => boolean
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
}

export const AppContext = createContext<AppContextValue | null>(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

export type { ActivityLog }
