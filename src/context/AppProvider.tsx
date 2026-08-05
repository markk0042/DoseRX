import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { v4 as uuid } from 'uuid'
import { createInitialBags, createSeedActivityHistory, STAFF } from '../data/seed'
import { medsForGrade, controlledMedsForGrade } from '../data/formulary'
import type {
  ActivityLog,
  AppState,
  DiscrepancyCase,
  DrugBag,
  PendingSyncItem,
  ShiftAssignment,
  StockItem,
} from '../types'
import { CPG_VERSION } from '../types'
import { AppContext, type AppContextValue } from './AppContext'
import { isSupabaseSyncEnabled } from '../lib/supabase'
import {
  cloudBagCount,
  pullLiveStateFromCloud,
  pushLiveStateToCloud,
  setShiftPhotoPath,
  uploadEvidencePhoto,
} from '../lib/supabaseSync'

const LIVE_KEY = 'doserx-v5-live'
const SANDBOX_KEY = 'doserx-v5-sandbox'

function mergeStaff(rawStaff: AppState['staff'] | undefined) {
  if (!rawStaff?.length) return STAFF
  const byId = new Map(rawStaff.map((s) => [s.id, s]))
  return STAFF.map((seed) => {
    const existing = byId.get(seed.id)
    if (!existing) return seed
    return { ...seed, ...existing, role: seed.role, pin: seed.pin, name: seed.name, grade: seed.grade, pheccNumber: seed.pheccNumber }
  })
}

function freshState(sandbox: boolean): AppState {
  const bags = createInitialBags()
  return {
    bags,
    staff: STAFF,
    activities: createSeedActivityHistory(bags, STAFF),
    shifts: [],
    discrepancies: [],
    pendingSync: [],
    currentUserId: null,
    sandboxMode: sandbox,
  }
}

function normalizeState(raw: Partial<AppState> | null, sandbox: boolean): AppState | null {
  if (!raw?.bags?.length) return null
  return {
    bags: raw.bags.map((b) => ({
      ...b,
      tagStatus: b.tagStatus ?? 'green',
      activeShiftId: b.activeShiftId ?? null,
      type: b.type ?? 'standard',
    })),
    staff: mergeStaff(raw.staff),
    activities: raw.activities ?? [],
    shifts: raw.shifts ?? [],
    discrepancies: raw.discrepancies ?? [],
    pendingSync: raw.pendingSync ?? [],
    currentUserId: raw.currentUserId ?? null,
    sandboxMode: sandbox,
    lastSyncedAt: raw.lastSyncedAt,
  }
}

function loadState(sandbox: boolean): AppState {
  const key = sandbox ? SANDBOX_KEY : LIVE_KEY
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = normalizeState(JSON.parse(raw) as Partial<AppState>, sandbox)
      if (parsed) return parsed
    }
  } catch {
    /* ignore */
  }
  return freshState(sandbox)
}

function saveState(state: AppState) {
  const key = state.sandboxMode ? SANDBOX_KEY : LIVE_KEY
  localStorage.setItem(key, JSON.stringify(state))
}

function daysUntil(dateStr: string) {
  const target = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function offline() {
  return typeof navigator !== 'undefined' && !navigator.onLine
}

/** Event packs: full grade formulary, optionally plus CDs for P/AP */
function buildEventPackItems(
  grade: 'EMT' | 'Paramedic' | 'AP',
  includeControlled: boolean,
): StockItem[] {
  const standard = medsForGrade(grade, false)
  const cds =
    includeControlled && grade !== 'EMT' ? controlledMedsForGrade(grade as 'Paramedic' | 'AP') : []
  return [...standard, ...cds].map((m, i) => stockFromDef(m, i, 'EVT'))
}

function stockFromDef(
  m: ReturnType<typeof medsForGrade>[number],
  i: number,
  lotPrefix: string,
): StockItem {
  const d = new Date()
  d.setMonth(d.getMonth() + 6 + (i % 12))
  return {
    id: uuid(),
    medicationId: m.id,
    name: m.name,
    presentation: m.presentation,
    quantity: m.defaultQty,
    parLevel: m.defaultQty,
    lotNumber: `${lotPrefix}${1000 + i}`,
    expiryDate: d.toISOString().slice(0, 10),
    controlled: m.controlled,
    schedule: m.schedule,
    unit: m.unit,
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState(false))
  const [cloudReady, setCloudReady] = useState(false)
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  const scheduleCloudPush = useCallback((next: AppState) => {
    if (!isSupabaseSyncEnabled || next.sandboxMode || offline()) return
    if (pushTimer.current) clearTimeout(pushTimer.current)
    pushTimer.current = setTimeout(() => {
      void pushLiveStateToCloud(next).then((res) => {
        if (res.ok) {
          setCloudReady(true)
          setState((prev) => {
            if (prev.sandboxMode) return prev
            const updated = { ...prev, lastSyncedAt: new Date().toISOString() }
            saveState(updated)
            return updated
          })
        }
      })
    }, 1200)
  }, [])

  const persistWith = useCallback(
    (updater: (prev: AppState) => AppState) => {
      setState((prev) => {
        const next = updater(prev)
        saveState(next)
        scheduleCloudPush(next)
        return next
      })
    },
    [scheduleCloudPush],
  )

  // Hydrate from Supabase on startup (live mode only)
  useEffect(() => {
    if (!isSupabaseSyncEnabled) return
    let cancelled = false
    ;(async () => {
      try {
        const count = await cloudBagCount()
        if (cancelled) return
        if (count === 0) {
          const local = stateRef.current
          if (!local.sandboxMode) {
            const res = await pushLiveStateToCloud(local)
            if (!cancelled) setCloudReady(res.ok)
          } else if (!cancelled) {
            setCloudReady(true)
          }
          return
        }
        const cloud = await pullLiveStateFromCloud()
        if (cancelled || !cloud?.bags?.length) {
          setCloudReady(Boolean(cloud))
          return
        }
        setState((prev) => {
          if (prev.sandboxMode) return prev
          const next: AppState = {
            ...prev,
            staff: cloud.staff?.length ? cloud.staff : prev.staff,
            bags: cloud.bags ?? prev.bags,
            shifts: cloud.shifts ?? prev.shifts,
            activities: cloud.activities?.length ? cloud.activities : prev.activities,
            discrepancies: cloud.discrepancies ?? prev.discrepancies,
            lastSyncedAt: cloud.lastSyncedAt ?? new Date().toISOString(),
          }
          saveState(next)
          return next
        })
        setCloudReady(true)
      } catch {
        if (!cancelled) setCloudReady(false)
      }
    })()
    return () => {
      cancelled = true
      if (pushTimer.current) clearTimeout(pushTimer.current)
    }
  }, [])

  // When coming back online, push queued local state
  useEffect(() => {
    const onOnline = () => {
      const s = stateRef.current
      if (!s.sandboxMode) scheduleCloudPush(s)
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [scheduleCloudPush])

  // silence unused in non-management paths — used for readiness signal
  void cloudReady

  const pushActivity = useCallback((prev: AppState, activity: Omit<ActivityLog, 'id' | 'timestamp' | 'synced'>): AppState => {
    const isOff = offline()
    const entry: ActivityLog = {
      ...activity,
      id: uuid(),
      timestamp: new Date().toISOString(),
      cpgVersion: CPG_VERSION,
      synced: !isOff,
    }
    let pending = prev.pendingSync
    if (isOff) {
      const item: PendingSyncItem = {
        id: uuid(),
        createdAt: entry.timestamp,
        label: `${entry.type.replace(/_/g, ' ')} · ${entry.bagCode}`,
        offline: true,
        payloadType: entry.type,
      }
      pending = [item, ...pending].slice(0, 200)
    }
    return {
      ...prev,
      activities: [entry, ...prev.activities].slice(0, 2500),
      pendingSync: pending,
    }
  }, [])

  const updateBag = useCallback((prev: AppState, bagId: string, updater: (b: DrugBag) => DrugBag) => ({
    ...prev,
    bags: prev.bags.map((b) => (b.id === bagId ? updater(b) : b)),
  }), [])

  const value = useMemo<AppContextValue>(() => {
    const currentUser = state.staff.find((s) => s.id === state.currentUserId) ?? null
    const isManagement = currentUser?.role === 'management'
    const openDiscrepancies = state.discrepancies.filter((d) => d.status !== 'resolved')

    return {
      state,
      currentUser,
      isManagement,
      openDiscrepancies,
      getBag: (id) => state.bags.find((b) => b.id === id),
      getActiveShift: (bagId) => state.shifts.find((s) => s.bagId === bagId && s.active),
      expiringSoon: (item, days = 90) => {
        const d = daysUntil(item.expiryDate)
        return d >= 0 && d <= days
      },
      isExpired: (item) => daysUntil(item.expiryDate) < 0,

      setCurrentUser: (id) => persistWith((prev) => ({ ...prev, currentUserId: id })),

      setSandboxMode: (enabled) => {
        const next = loadState(enabled)
        next.sandboxMode = enabled
        next.currentUserId = null
        saveState(next)
        setState(next)
      },

      verifyPin: (staffId, pin) => {
        const s = state.staff.find((x) => x.id === staffId)
        return !!s && String(s.pin).trim() === String(pin).trim()
      },
      findStaffByPin: (pin) => state.staff.find((s) => s.pin === pin),

      completeStaffCheck: (bagId, counts, practitioner, witness, notes) => {
        persistWith((prev) => {
          const bag = prev.bags.find((b) => b.id === bagId)
          if (!bag) return prev
          let discrepancy = false
          bag.items.forEach((item) => {
            if ((counts[item.id] ?? item.quantity) !== item.quantity) discrepancy = true
          })
          let next = updateBag(prev, bagId, (b) => ({
            ...b,
            status: b.activeShiftId ? 'on_shift' : discrepancy ? 'discrepancy' : 'sealed',
            lastCheckedAt: new Date().toISOString(),
            lastCheckedBy: practitioner.name,
          }))
          return pushActivity(next, {
            type: 'inventory_check',
            bagId,
            bagCode: bag.code,
            practitionerId: practitioner.id,
            practitionerName: practitioner.name,
            witnessId: witness.id,
            witnessName: witness.name,
            notes: notes ?? (discrepancy ? 'Mismatch vs system stock' : 'Check OK'),
            discrepancy,
          })
        })
      },

      setManagementStock: (bagId, stocks, manager, witness, notes) => {
        if (manager.role !== 'management') return
        persistWith((prev) => {
          const bag = prev.bags.find((b) => b.id === bagId)
          if (!bag) return prev
          let next = updateBag(prev, bagId, (b) => ({
            ...b,
            status: b.activeShiftId ? 'on_shift' : 'sealed',
            lastStockedAt: new Date().toISOString(),
            lastStockedBy: manager.name,
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
          return pushActivity(next, {
            type: 'management_stock',
            bagId,
            bagCode: bag.code,
            practitionerId: manager.id,
            practitionerName: manager.name,
            witnessId: witness.id,
            witnessName: witness.name,
            notes: notes || 'Management set bag stock',
          })
        })
      },

      recordAdministration: ({
        bagId,
        itemId,
        qty,
        practitioner,
        witness,
        patientRef,
        notes,
        outOfScope,
        partDose,
        location,
      }) => {
        persistWith((prev) => {
          const bag = prev.bags.find((b) => b.id === bagId)
          const item = bag?.items.find((i) => i.id === itemId)
          if (!bag || !item || qty > item.quantity) return prev
          const deduct = partDose ? partDose.drawn : qty
          let next = updateBag(prev, bagId, (b) => ({
            ...b,
            status: b.activeShiftId ? 'on_shift' : 'open',
            lastKnownLocation: location ?? b.lastKnownLocation,
            items: b.items.map((i) =>
              i.id === itemId ? { ...i, quantity: Math.max(0, i.quantity - deduct) } : i,
            ),
          }))
          return pushActivity(next, {
            type: partDose ? 'part_dose' : 'administration',
            bagId,
            bagCode: bag.code,
            practitionerId: practitioner.id,
            practitionerName: practitioner.name,
            witnessId: witness?.id,
            witnessName: witness?.name,
            medicationName: item.name,
            quantity: partDose ? partDose.given : qty,
            patientRef,
            notes,
            outOfScope,
            partDose,
            location: location ?? undefined,
          })
        })
      },

      recordWaste: (bagId, itemId, qty, practitioner, witness, notes) => {
        persistWith((prev) => {
          const bag = prev.bags.find((b) => b.id === bagId)
          const item = bag?.items.find((i) => i.id === itemId)
          if (!bag || !item || qty > item.quantity) return prev
          let next = updateBag(prev, bagId, (b) => ({
            ...b,
            status: b.activeShiftId ? 'on_shift' : 'open',
            items: b.items.map((i) =>
              i.id === itemId ? { ...i, quantity: Math.max(0, i.quantity - qty) } : i,
            ),
          }))
          return pushActivity(next, {
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
        })
      },

      resignSeal: (bagId, newSeal, practitioner, witness) => {
        persistWith((prev) => {
          const bag = prev.bags.find((b) => b.id === bagId)
          if (!bag) return prev
          const now = new Date().toISOString()
          let next = updateBag(prev, bagId, (b) => ({
            ...b,
            sealNumber: newSeal,
            tagStatus: 'green',
            status: b.activeShiftId ? 'on_shift' : 'sealed',
            lastCheckedAt: now,
            lastCheckedBy: practitioner.name,
          }))
          return pushActivity(next, {
            type: 'seal_check',
            bagId,
            bagCode: bag.code,
            practitionerId: practitioner.id,
            practitionerName: practitioner.name,
            witnessId: witness.id,
            witnessName: witness.name,
            notes: `New seal: ${newSeal} · last checked updated`,
          })
        })
      },

      completeBagAudit: ({ bagId, auditor, witness, counts, notes, newSeal, tagStatus }) => {
        if (auditor.role !== 'management') return false
        if (auditor.id === witness.id) return false
        let ok = false
        persistWith((prev) => {
          const bag = prev.bags.find((b) => b.id === bagId)
          if (!bag) return prev
          ok = true
          let discrepancy = false
          const mismatchNotes: string[] = []
          bag.items.forEach((item) => {
            const counted = counts[item.id] ?? item.quantity
            if (counted !== item.quantity) {
              discrepancy = true
              mismatchNotes.push(`${item.name}: system ${item.quantity} vs count ${counted}`)
            }
          })
          const now = new Date().toISOString()
          const seal = newSeal?.trim()
          let next = updateBag(prev, bagId, (b) => ({
            ...b,
            sealNumber: seal || b.sealNumber,
            tagStatus: tagStatus ?? (discrepancy ? b.tagStatus : 'green'),
            status: b.activeShiftId
              ? 'on_shift'
              : discrepancy
                ? 'discrepancy'
                : 'sealed',
            lastCheckedAt: now,
            lastCheckedBy: auditor.name,
          }))
          next = pushActivity(next, {
            type: 'bag_audit',
            bagId,
            bagCode: bag.code,
            practitionerId: auditor.id,
            practitionerName: auditor.name,
            witnessId: witness.id,
            witnessName: witness.name,
            notes: [
              discrepancy ? `Mismatch · ${mismatchNotes.join('; ')}` : 'Audit OK — counts match system',
              seal ? `Resealed: ${seal}` : null,
              tagStatus ? `Tag: ${tagStatus}` : null,
              notes,
            ]
              .filter(Boolean)
              .join(' · '),
            discrepancy,
          })
          if (discrepancy) {
            // Open discrepancy case for workflow if none open for this bag
            const hasOpen = next.discrepancies.some(
              (d) => d.bagId === bagId && d.status !== 'resolved',
            )
            if (!hasOpen) {
              const caseItem = {
                id: uuid(),
                bagId,
                bagCode: bag.code,
                reportedAt: now,
                reportedById: auditor.id,
                reportedByName: auditor.name,
                witnessId: witness.id,
                witnessName: witness.name,
                summary: `Audit mismatch on ${bag.code}`,
                details: mismatchNotes.join('\n'),
                status: 'open' as const,
              }
              next = {
                ...next,
                discrepancies: [caseItem, ...next.discrepancies],
              }
            }
          }
          return next
        })
        return ok
      },

      restockItem: (bagId, itemId, qty, lot, expiry, manager) => {
        if (manager.role !== 'management') return
        persistWith((prev) => {
          const bag = prev.bags.find((b) => b.id === bagId)
          const item = bag?.items.find((i) => i.id === itemId)
          if (!bag || !item) return prev
          let next = updateBag(prev, bagId, (b) => ({
            ...b,
            lastStockedAt: new Date().toISOString(),
            lastStockedBy: manager.name,
            items: b.items.map((i) =>
              i.id === itemId
                ? { ...i, quantity: i.quantity + qty, lotNumber: lot || i.lotNumber, expiryDate: expiry || i.expiryDate }
                : i,
            ),
          }))
          return pushActivity(next, {
            type: 'restock',
            bagId,
            bagCode: bag.code,
            practitionerId: manager.id,
            practitionerName: manager.name,
            medicationName: item.name,
            quantity: qty,
            notes: `Lot ${lot || item.lotNumber}`,
          })
        })
      },

      signOutBagForShift: ({
        bagId,
        holder,
        witness,
        tagStatus,
        medsCheckedOnUntagged,
        notes,
        photo,
        location,
      }) => {
        let created: string | null = null
        persistWith((prev) => {
          const bag = prev.bags.find((b) => b.id === bagId)
          if (!bag || bag.activeShiftId || holder.id === witness.id) return prev
          if (bag.eventEndsAt && new Date(bag.eventEndsAt).getTime() < Date.now()) return prev
          const shiftId = uuid()
          created = shiftId
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
            photoOut: photo,
            locationOut: location ?? undefined,
          }
          let next: AppState = { ...prev, shifts: [shift, ...prev.shifts] }
          next = updateBag(next, bagId, (b) => ({
            ...b,
            status: 'on_shift',
            tagStatus,
            activeShiftId: shiftId,
            lastKnownLocation: location ?? b.lastKnownLocation,
          }))
          return pushActivity(next, {
            type: 'shift_sign_out',
            bagId,
            bagCode: bag.code,
            practitionerId: holder.id,
            practitionerName: holder.name,
            witnessId: witness.id,
            witnessName: witness.name,
            notes: [
              `Tag: ${tagStatus}`,
              photo ? 'Photo evidence attached' : null,
              notes,
            ]
              .filter(Boolean)
              .join(' · '),
            location: location ?? undefined,
            photoIds: photo ? [photo.id] : undefined,
          })
        })
        if (created && photo && isSupabaseSyncEnabled && !stateRef.current.sandboxMode) {
          void uploadEvidencePhoto(photo, { bagId, uploadedBy: holder.id }).then((path) => {
            if (path && created) void setShiftPhotoPath(created, 'out', path)
          })
        }
        return created
      },

      returnBagFromShift: ({
        bagId,
        returner,
        witness,
        tagStillIntact,
        tagStatus,
        notes,
        photo,
        location,
      }) => {
        let ok = false
        let shiftIdForPhoto: string | null = null
        persistWith((prev) => {
          const bag = prev.bags.find((b) => b.id === bagId)
          if (!bag?.activeShiftId || returner.id === witness.id) return prev
          ok = true
          const shiftId = bag.activeShiftId
          shiftIdForPhoto = shiftId
          let next: AppState = {
            ...prev,
            shifts: prev.shifts.map((s) =>
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
                    photoReturn: photo,
                    locationReturn: location ?? undefined,
                  }
                : s,
            ),
          }
          next = updateBag(next, bagId, (b) => {
            // Only a green intact tag means the bag is sealed for storage.
            // Red = opened/used (tagged). Untagged / broken tag = open & needs check.
            const sealedReturn = tagStillIntact && tagStatus === 'green'
            const needsCheck = !tagStillIntact || tagStatus === 'untagged'
            return {
              ...b,
              status: sealedReturn ? 'sealed' : needsCheck ? 'check_due' : 'open',
              tagStatus,
              activeShiftId: null,
              lastKnownLocation: location ?? b.lastKnownLocation,
            }
          })
          return pushActivity(next, {
            type: 'shift_return',
            bagId,
            bagCode: bag.code,
            practitionerId: returner.id,
            practitionerName: returner.name,
            witnessId: witness.id,
            witnessName: witness.name,
            notes: [
              `Tag intact: ${tagStillIntact ? 'Yes' : 'No'}`,
              `Tag: ${tagStatus}`,
              !tagStillIntact || tagStatus !== 'green'
                ? `Status set to ${!tagStillIntact || tagStatus === 'untagged' ? 'check due' : 'open'}`
                : 'Status set to sealed',
              photo ? 'Photo evidence attached' : null,
              notes,
            ]
              .filter(Boolean)
              .join(' · '),
            location: location ?? undefined,
            photoIds: photo ? [photo.id] : undefined,
          })
        })
        if (ok && photo && shiftIdForPhoto && isSupabaseSyncEnabled && !stateRef.current.sandboxMode) {
          void uploadEvidencePhoto(photo, { bagId, uploadedBy: returner.id }).then((path) => {
            if (path && shiftIdForPhoto) void setShiftPhotoPath(shiftIdForPhoto, 'return', path)
          })
        }
        return ok
      },

      reportDiscrepancy: ({ bagId, reporter, witness, summary, details, itemNotes }) => {
        const id = uuid()
        persistWith((prev) => {
          const bag = prev.bags.find((b) => b.id === bagId)
          if (!bag) return prev
          const caseItem: DiscrepancyCase = {
            id,
            bagId,
            bagCode: bag.code,
            status: 'open',
            reportedAt: new Date().toISOString(),
            reportedById: reporter.id,
            reportedByName: reporter.name,
            witnessId: witness?.id,
            witnessName: witness?.name,
            summary,
            details,
            itemNotes,
          }
          let next: AppState = {
            ...prev,
            discrepancies: [caseItem, ...prev.discrepancies],
          }
          next = updateBag(next, bagId, (b) => ({ ...b, status: 'discrepancy' }))
          return pushActivity(next, {
            type: 'discrepancy',
            bagId,
            bagCode: bag.code,
            practitionerId: reporter.id,
            practitionerName: reporter.name,
            witnessId: witness?.id,
            witnessName: witness?.name,
            notes: summary,
            discrepancy: true,
          })
        })
        return id
      },

      updateDiscrepancy: ({ id, status, actor, resolution }) => {
        persistWith((prev) => {
          const existing = prev.discrepancies.find((d) => d.id === id)
          if (!existing) return prev
          const updated: DiscrepancyCase = {
            ...existing,
            status,
            resolution: resolution ?? existing.resolution,
            resolvedAt: status === 'resolved' ? new Date().toISOString() : existing.resolvedAt,
            resolvedById: status === 'resolved' ? actor.id : existing.resolvedById,
            resolvedByName: status === 'resolved' ? actor.name : existing.resolvedByName,
            assignedToId: status === 'investigating' ? actor.id : existing.assignedToId,
            assignedToName: status === 'investigating' ? actor.name : existing.assignedToName,
          }
          let next: AppState = {
            ...prev,
            discrepancies: prev.discrepancies.map((d) => (d.id === id ? updated : d)),
          }
          if (status === 'resolved') {
            next = updateBag(next, existing.bagId, (b) => ({
              ...b,
              status: b.activeShiftId ? 'on_shift' : 'sealed',
            }))
            next = pushActivity(next, {
              type: 'discrepancy_resolved',
              bagId: existing.bagId,
              bagCode: existing.bagCode,
              practitionerId: actor.id,
              practitionerName: actor.name,
              notes: resolution || 'Resolved',
            })
          }
          return next
        })
      },

      createEventPack: ({ manager, name, grade, controlled, eventName, startsAt, endsAt, vehicle }) => {
        const id = uuid()
        persistWith((prev) => {
          if (manager.role !== 'management') return prev
          const includeCds = controlled && grade !== 'EMT'
          const code = `DRX-EVT-${eventName.slice(0, 3).toUpperCase()}-${String(prev.bags.length + 1).padStart(2, '0')}`
          const bag: DrugBag = {
            id,
            code,
            name,
            grade,
            type: 'event',
            sealNumber: `SL-EVT-${Math.floor(100000 + Math.random() * 900000)}`,
            status: 'sealed',
            tagStatus: 'green',
            assignedVehicle: vehicle || `Event · ${eventName}`,
            activeShiftId: null,
            items: buildEventPackItems(grade, includeCds),
            eventName,
            eventStartsAt: startsAt,
            eventEndsAt: endsAt,
          }
          let next: AppState = { ...prev, bags: [...prev.bags, bag] }
          return pushActivity(next, {
            type: 'event_pack_created',
            bagId: id,
            bagCode: code,
            practitionerId: manager.id,
            practitionerName: manager.name,
            notes: `${eventName} · ${grade} stock${includeCds ? ' + CDs' : ''} · privilege until ${endsAt}`,
          })
        })
        return id
      },

      flushSyncQueue: () => {
        persistWith((prev) => {
          const nextActivities = prev.activities.map((a) => ({ ...a, synced: true }))
          let next = {
            ...prev,
            activities: nextActivities,
            pendingSync: [],
            lastSyncedAt: new Date().toISOString(),
          }
          return pushActivity(next, {
            type: 'sync',
            bagId: 'system',
            bagCode: 'SYNC',
            practitionerId: prev.currentUserId ?? 'system',
            practitionerName: 'System',
            notes: `Flushed offline queue · ${prev.pendingSync.length} item(s)`,
          })
        })
        void pushLiveStateToCloud(stateRef.current).then((res) => {
          if (res.ok) setCloudReady(true)
        })
      },

      updateBagLocation: (bagId, location) => {
        persistWith((prev) => updateBag(prev, bagId, (b) => ({ ...b, lastKnownLocation: location })))
      },

      renameBag: (bagId, name, manager) => {
        const trimmed = name.trim()
        if (!trimmed || manager.role !== 'management') return false
        let ok = false
        persistWith((prev) => {
          const bag = prev.bags.find((b) => b.id === bagId)
          if (!bag) return prev
          const previous = bag.name
          if (previous === trimmed) {
            ok = true
            return prev
          }
          ok = true
          let next = updateBag(prev, bagId, (b) => ({ ...b, name: trimmed }))
          return pushActivity(next, {
            type: 'bag_renamed',
            bagId,
            bagCode: bag.code,
            practitionerId: manager.id,
            practitionerName: manager.name,
            notes: `Renamed “${previous}” → “${trimmed}”`,
          })
        })
        return ok
      },

      resetDemo: () => {
        const fresh = freshState(state.sandboxMode)
        saveState(fresh)
        setState(fresh)
      },
    }
  }, [state, persistWith, pushActivity, updateBag])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
