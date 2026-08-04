import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { v4 as uuid } from 'uuid'
import { createInitialBags, STAFF } from '../data/seed'
import type { ActivityLog, AppState, DrugBag, ShiftAssignment, StockItem } from '../types'
import { AppContext, type AppContextValue } from './AppContext'

const STORAGE_KEY = 'doserx-v3'

function mergeStaff(rawStaff: AppState['staff'] | undefined) {
  // Always prefer seed accounts for login (roles + PINs). Keeps demo login reliable.
  if (!rawStaff?.length) return STAFF
  const byId = new Map(rawStaff.map((s) => [s.id, s]))
  return STAFF.map((seed) => {
    const existing = byId.get(seed.id)
    if (!existing) return seed
    return {
      ...seed,
      ...existing,
      role: seed.role,
      pin: seed.pin,
      name: seed.name,
      grade: seed.grade,
      pheccNumber: seed.pheccNumber,
    }
  })
}

function normalizeState(raw: Partial<AppState> | null): AppState | null {
  if (!raw?.bags?.length) return null
  return {
    bags: raw.bags.map((b) => ({
      ...b,
      tagStatus: b.tagStatus ?? 'green',
      activeShiftId: b.activeShiftId ?? null,
    })),
    staff: mergeStaff(raw.staff),
    activities: raw.activities ?? [],
    shifts: raw.shifts ?? [],
    currentUserId: raw.currentUserId ?? null,
  }
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = normalizeState(JSON.parse(raw) as Partial<AppState>)
      if (parsed) return parsed
    }
  } catch {
    /* ignore */
  }
  return {
    bags: createInitialBags(),
    staff: STAFF,
    activities: [],
    shifts: [],
    currentUserId: null,
  }
}

function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function daysUntil(dateStr: string) {
  const target = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState())

  const persist = useCallback((next: AppState) => {
    setState(next)
    saveState(next)
  }, [])

  const persistWith = useCallback((updater: (prev: AppState) => AppState) => {
    setState((prev) => {
      const next = updater(prev)
      saveState(next)
      return next
    })
  }, [])

  const pushActivity = useCallback(
    (prev: AppState, activity: Omit<ActivityLog, 'id' | 'timestamp'>): AppState => {
      const entry: ActivityLog = {
        ...activity,
        id: uuid(),
        timestamp: new Date().toISOString(),
      }
      return { ...prev, activities: [entry, ...prev.activities].slice(0, 500) }
    },
    [],
  )

  const updateBag = useCallback((prev: AppState, bagId: string, updater: (b: DrugBag) => DrugBag) => {
    return {
      ...prev,
      bags: prev.bags.map((b) => (b.id === bagId ? updater(b) : b)),
    }
  }, [])

  const value = useMemo<AppContextValue>(() => {
    const currentUser = state.staff.find((s) => s.id === state.currentUserId) ?? null
    const isManagement = currentUser?.role === 'management'

    return {
      state,
      currentUser,
      isManagement,
      getBag: (id) => state.bags.find((b) => b.id === id),
      getActiveShift: (bagId) => state.shifts.find((s) => s.bagId === bagId && s.active),
      expiringSoon: (item: StockItem, days = 90) => {
        const d = daysUntil(item.expiryDate)
        return d >= 0 && d <= days
      },
      isExpired: (item: StockItem) => daysUntil(item.expiryDate) < 0,

      setCurrentUser: (id) => {
        persistWith((prev) => ({ ...prev, currentUserId: id }))
      },

      verifyPin: (staffId, pin) => {
        const s = state.staff.find((x) => x.id === staffId)
        if (!s) return false
        return String(s.pin).trim() === String(pin).trim()
      },

      findStaffByPin: (pin) => state.staff.find((s) => s.pin === pin),

      completeStaffCheck: (bagId, counts, practitioner, witness, notes) => {
        let discrepancy = false
        const bag = state.bags.find((b) => b.id === bagId)
        if (!bag) return

        bag.items.forEach((item) => {
          const counted = counts[item.id] ?? item.quantity
          if (counted !== item.quantity) discrepancy = true
        })

        let next = updateBag(state, bagId, (b) => ({
          ...b,
          status: b.activeShiftId ? 'on_shift' : discrepancy ? 'discrepancy' : 'sealed',
          lastCheckedAt: new Date().toISOString(),
          lastCheckedBy: practitioner.name,
        }))
        next = pushActivity(next, {
          type: 'inventory_check',
          bagId,
          bagCode: bag.code,
          practitionerId: practitioner.id,
          practitionerName: practitioner.name,
          witnessId: witness.id,
          witnessName: witness.name,
          notes: notes
            ? `${notes}${discrepancy ? ' · Discrepancy vs management stock' : ''}`
            : discrepancy
              ? 'Physical count does not match management stock — management to investigate'
              : 'Staff check OK — matches management stock',
          discrepancy,
        })
        persist(next)
      },

      setManagementStock: (bagId, stocks, manager, witness, notes) => {
        if (manager.role !== 'management') return
        const bag = state.bags.find((b) => b.id === bagId)
        if (!bag) return

        let next = updateBag(state, bagId, (b) => ({
          ...b,
          status: b.activeShiftId ? 'on_shift' : 'sealed',
          lastStockedAt: new Date().toISOString(),
          lastStockedBy: manager.name,
          lastCheckedAt: new Date().toISOString(),
          lastCheckedBy: manager.name,
          items: b.items.map((item) => {
            const entry = stocks[item.id]
            if (!entry) return item
            return {
              ...item,
              quantity: Math.max(0, entry.quantity),
              parLevel: Math.max(0, entry.parLevel),
              lotNumber: entry.lotNumber || item.lotNumber,
              expiryDate: entry.expiryDate || item.expiryDate,
            }
          }),
        }))
        next = pushActivity(next, {
          type: 'management_stock',
          bagId,
          bagCode: bag.code,
          practitionerId: manager.id,
          practitionerName: manager.name,
          witnessId: witness.id,
          witnessName: witness.name,
          notes: notes || 'Management set bag stock levels',
        })
        persist(next)
      },

      recordAdministration: (bagId, itemId, qty, practitioner, witness, patientRef, notes) => {
        const bag = state.bags.find((b) => b.id === bagId)
        const item = bag?.items.find((i) => i.id === itemId)
        if (!bag || !item) return
        if (qty > item.quantity) return

        let next = updateBag(state, bagId, (b) => ({
          ...b,
          status: b.activeShiftId ? 'on_shift' : 'open',
          items: b.items.map((i) =>
            i.id === itemId ? { ...i, quantity: Math.max(0, i.quantity - qty) } : i,
          ),
        }))
        next = pushActivity(next, {
          type: 'administration',
          bagId,
          bagCode: bag.code,
          practitionerId: practitioner.id,
          practitionerName: practitioner.name,
          witnessId: witness?.id,
          witnessName: witness?.name,
          medicationName: item.name,
          quantity: qty,
          patientRef,
          notes,
        })
        persist(next)
      },

      recordWaste: (bagId, itemId, qty, practitioner, witness, notes) => {
        const bag = state.bags.find((b) => b.id === bagId)
        const item = bag?.items.find((i) => i.id === itemId)
        if (!bag || !item) return
        if (qty > item.quantity) return

        let next = updateBag(state, bagId, (b) => ({
          ...b,
          status: b.activeShiftId ? 'on_shift' : 'open',
          items: b.items.map((i) =>
            i.id === itemId ? { ...i, quantity: Math.max(0, i.quantity - qty) } : i,
          ),
        }))
        next = pushActivity(next, {
          type: 'waste',
          bagId,
          bagCode: bag.code,
          practitionerId: practitioner.id,
          practitionerName: practitioner.name,
          witnessId: witness.id,
          witnessName: witness.name,
          medicationName: item.name,
          quantity: qty,
          notes,
        })
        persist(next)
      },

      resignSeal: (bagId, newSeal, practitioner, witness) => {
        const bag = state.bags.find((b) => b.id === bagId)
        if (!bag) return
        let next = updateBag(state, bagId, (b) => ({
          ...b,
          sealNumber: newSeal,
          status: b.activeShiftId ? 'on_shift' : 'sealed',
          lastCheckedAt: new Date().toISOString(),
          lastCheckedBy: practitioner.name,
        }))
        next = pushActivity(next, {
          type: 'seal_check',
          bagId,
          bagCode: bag.code,
          practitionerId: practitioner.id,
          practitionerName: practitioner.name,
          witnessId: witness.id,
          witnessName: witness.name,
          notes: `New seal applied: ${newSeal}`,
        })
        persist(next)
      },

      restockItem: (bagId, itemId, qty, lot, expiry, manager) => {
        if (manager.role !== 'management') return
        const bag = state.bags.find((b) => b.id === bagId)
        const item = bag?.items.find((i) => i.id === itemId)
        if (!bag || !item) return
        let next = updateBag(state, bagId, (b) => ({
          ...b,
          status: b.activeShiftId ? 'on_shift' : 'open',
          lastStockedAt: new Date().toISOString(),
          lastStockedBy: manager.name,
          items: b.items.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  quantity: i.quantity + qty,
                  lotNumber: lot || i.lotNumber,
                  expiryDate: expiry || i.expiryDate,
                }
              : i,
          ),
        }))
        next = pushActivity(next, {
          type: 'restock',
          bagId,
          bagCode: bag.code,
          practitionerId: manager.id,
          practitionerName: manager.name,
          medicationName: item.name,
          quantity: qty,
          notes: `Management restock · Lot ${lot || item.lotNumber}`,
        })
        persist(next)
      },

      signOutBagForShift: ({ bagId, holder, witness, tagStatus, medsCheckedOnUntagged, notes }) => {
        const bag = state.bags.find((b) => b.id === bagId)
        if (!bag) return null
        if (bag.activeShiftId) return null
        if (holder.id === witness.id) return null
        if (tagStatus === 'untagged' && medsCheckedOnUntagged !== true && medsCheckedOnUntagged !== false) {
          return null
        }

        const shiftId = uuid()
        const shift: ShiftAssignment = {
          id: shiftId,
          bagId,
          bagCode: bag.code,
          signedOutAt: new Date().toISOString(),
          holderId: holder.id,
          holderName: holder.name,
          witnessOutId: witness.id,
          witnessOutName: witness.name,
          tagOnSignOut: tagStatus,
          medsCheckedOnUntagged: tagStatus === 'untagged' ? medsCheckedOnUntagged : undefined,
          active: true,
          notesOut: notes,
        }

        let next: AppState = {
          ...state,
          shifts: [shift, ...state.shifts],
        }
        next = updateBag(next, bagId, (b) => ({
          ...b,
          status: 'on_shift',
          tagStatus,
          activeShiftId: shiftId,
        }))
        next = pushActivity(next, {
          type: 'shift_sign_out',
          bagId,
          bagCode: bag.code,
          practitionerId: holder.id,
          practitionerName: holder.name,
          witnessId: witness.id,
          witnessName: witness.name,
          notes: [
            `Tag: ${tagStatus}`,
            tagStatus === 'untagged'
              ? `Meds checked: ${medsCheckedOnUntagged ? 'Yes' : 'No'}`
              : null,
            notes,
          ]
            .filter(Boolean)
            .join(' · '),
        })
        persist(next)
        return shiftId
      },

      returnBagFromShift: ({ bagId, returner, witness, tagStillIntact, tagStatus, notes }) => {
        const bag = state.bags.find((b) => b.id === bagId)
        if (!bag?.activeShiftId) return false
        if (returner.id === witness.id) return false

        const shiftId = bag.activeShiftId
        let next: AppState = {
          ...state,
          shifts: state.shifts.map((s) =>
            s.id === shiftId
              ? {
                  ...s,
                  active: false,
                  returnedAt: new Date().toISOString(),
                  witnessReturnId: witness.id,
                  witnessReturnName: witness.name,
                  tagStillIntactOnReturn: tagStillIntact,
                  tagOnReturn: tagStatus,
                  notesReturn: notes,
                }
              : s,
          ),
        }
        next = updateBag(next, bagId, (b) => ({
          ...b,
          status: 'sealed',
          tagStatus,
          activeShiftId: null,
        }))
        next = pushActivity(next, {
          type: 'shift_return',
          bagId,
          bagCode: bag.code,
          practitionerId: returner.id,
          practitionerName: returner.name,
          witnessId: witness.id,
          witnessName: witness.name,
          notes: [
            `Tag intact: ${tagStillIntact ? 'Yes' : 'No'}`,
            `Tag status: ${tagStatus}`,
            notes,
          ]
            .filter(Boolean)
            .join(' · '),
        })
        persist(next)
        return true
      },

      resetDemo: () => {
        const fresh: AppState = {
          bags: createInitialBags(),
          staff: STAFF,
          activities: [],
          shifts: [],
          currentUserId: null,
        }
        persist(fresh)
      },
    }
  }, [state, persist, persistWith, pushActivity, updateBag])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
