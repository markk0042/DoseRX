import type {
  ActivityLog,
  AppState,
  DiscrepancyCase,
  DrugBag,
  PhotoEvidence,
  ShiftAssignment,
  StaffMember,
  StockItem,
} from '../types'
import { enrichStockProfile } from '../data/formulary'
import { isSupabaseConfigured, isSupabaseSyncEnabled, supabase } from './supabase'

type DbStaff = {
  id: string
  name: string
  grade: StaffMember['grade']
  role: StaffMember['role']
  pin: string
  phecc_number: string
}

function staffFromDb(row: DbStaff): StaffMember {
  return {
    id: row.id,
    name: row.name,
    grade: row.grade,
    role: row.role,
    pin: row.pin,
    pheccNumber: row.phecc_number,
  }
}

function bagToRow(b: DrugBag, sandbox: boolean) {
  return {
    id: b.id,
    code: b.code,
    name: b.name,
    grade: b.grade,
    type: b.type,
    seal_number: b.sealNumber,
    status: b.status,
    tag_status: b.tagStatus,
    assigned_vehicle: b.assignedVehicle ?? null,
    last_checked_at: b.lastCheckedAt ?? null,
    last_checked_by: b.lastCheckedBy ?? null,
    last_stocked_at: b.lastStockedAt ?? null,
    last_stocked_by: b.lastStockedBy ?? null,
    active_shift_id: b.activeShiftId ?? null,
    event_name: b.eventName ?? null,
    event_starts_at: b.eventStartsAt ?? null,
    event_ends_at: b.eventEndsAt ?? null,
    last_lat: b.lastKnownLocation?.lat ?? null,
    last_lng: b.lastKnownLocation?.lng ?? null,
    last_location_at: b.lastKnownLocation?.capturedAt ?? null,
    sandbox,
  }
}

function stockToRow(item: StockItem, bagId: string) {
  return {
    id: item.id,
    bag_id: bagId,
    medication_id: item.medicationId,
    name: item.name,
    presentation: item.presentation,
    quantity: item.quantity,
    par_level: item.parLevel,
    lot_number: item.lotNumber,
    expiry_date: item.expiryDate,
    controlled: item.controlled,
    schedule: item.schedule ?? null,
    unit: item.unit,
    strength: item.strength,
    dose_unit: item.doseUnit,
    stock_unit: item.stockUnit,
    pack_size: item.packSize,
  }
}

function bagFromRows(
  bag: Record<string, unknown>,
  items: StockItem[],
): DrugBag {
  const lat = bag.last_lat as number | null
  const lng = bag.last_lng as number | null
  return {
    id: String(bag.id),
    code: String(bag.code),
    name: String(bag.name),
    grade: bag.grade as DrugBag['grade'],
    type: bag.type as DrugBag['type'],
    sealNumber: String(bag.seal_number ?? ''),
    status: bag.status as DrugBag['status'],
    tagStatus: (bag.tag_status as DrugBag['tagStatus']) ?? 'green',
    assignedVehicle: (bag.assigned_vehicle as string) || undefined,
    lastCheckedAt: (bag.last_checked_at as string) || undefined,
    lastCheckedBy: (bag.last_checked_by as string) || undefined,
    lastStockedAt: (bag.last_stocked_at as string) || undefined,
    lastStockedBy: (bag.last_stocked_by as string) || undefined,
    activeShiftId: (bag.active_shift_id as string) || null,
    eventName: (bag.event_name as string) || undefined,
    eventStartsAt: (bag.event_starts_at as string) || undefined,
    eventEndsAt: (bag.event_ends_at as string) || undefined,
    lastKnownLocation:
      lat != null && lng != null
        ? {
            lat,
            lng,
            capturedAt: String(bag.last_location_at ?? new Date().toISOString()),
          }
        : undefined,
    items,
  }
}

function activityToRow(a: ActivityLog, sandbox: boolean) {
  return {
    id: a.id,
    type: a.type,
    bag_id: a.bagId,
    bag_code: a.bagCode,
    occurred_at: a.timestamp,
    practitioner_id: a.practitionerId,
    practitioner_name: a.practitionerName,
    witness_id: a.witnessId ?? null,
    witness_name: a.witnessName ?? null,
    medication_name: a.medicationName ?? null,
    quantity: a.quantity ?? null,
    notes: a.notes ?? null,
    patient_ref: a.patientRef ?? null,
    discrepancy: a.discrepancy ?? false,
    out_of_scope: a.outOfScope ?? false,
    cpg_version: a.cpgVersion ?? null,
    part_dose: a.partDose ?? null,
    loc_lat: a.location?.lat ?? null,
    loc_lng: a.location?.lng ?? null,
    photo_paths: a.photoIds ?? [],
    synced: a.synced ?? true,
    sandbox,
  }
}

function activityFromRow(row: Record<string, unknown>): ActivityLog {
  const lat = row.loc_lat as number | null
  const lng = row.loc_lng as number | null
  return {
    id: String(row.id),
    type: row.type as ActivityLog['type'],
    bagId: String(row.bag_id ?? ''),
    bagCode: String(row.bag_code),
    timestamp: String(row.occurred_at),
    practitionerId: String(row.practitioner_id ?? ''),
    practitionerName: String(row.practitioner_name),
    witnessId: (row.witness_id as string) || undefined,
    witnessName: (row.witness_name as string) || undefined,
    medicationName: (row.medication_name as string) || undefined,
    quantity: row.quantity != null ? Number(row.quantity) : undefined,
    notes: (row.notes as string) || undefined,
    patientRef: (row.patient_ref as string) || undefined,
    discrepancy: Boolean(row.discrepancy),
    outOfScope: Boolean(row.out_of_scope),
    cpgVersion: (row.cpg_version as string) || undefined,
    partDose: (row.part_dose as ActivityLog['partDose']) || undefined,
    location:
      lat != null && lng != null
        ? { lat, lng, capturedAt: String(row.occurred_at) }
        : undefined,
    photoIds: (row.photo_paths as string[]) || undefined,
    synced: row.synced !== false,
  }
}

function shiftToRow(s: ShiftAssignment, sandbox: boolean) {
  return {
    id: s.id,
    bag_id: s.bagId,
    bag_code: s.bagCode,
    signed_out_at: s.signedOutAt,
    returned_at: s.returnedAt ?? null,
    holder_id: s.holderId,
    holder_name: s.holderName,
    witness_out_id: s.witnessOutId,
    witness_out_name: s.witnessOutName,
    witness_return_id: s.witnessReturnId ?? null,
    witness_return_name: s.witnessReturnName ?? null,
    tag_on_sign_out: s.tagOnSignOut,
    tag_on_return: s.tagOnReturn ?? null,
    tag_still_intact_on_return: s.tagStillIntactOnReturn ?? null,
    meds_checked_on_untagged: s.medsCheckedOnUntagged ?? null,
    active: s.active,
    notes_out: s.notesOut ?? null,
    notes_return: s.notesReturn ?? null,
    photo_out_path: s.photoOut ? `local:${s.photoOut.id}` : null,
    photo_return_path: s.photoReturn ? `local:${s.photoReturn.id}` : null,
    loc_out_lat: s.locationOut?.lat ?? null,
    loc_out_lng: s.locationOut?.lng ?? null,
    loc_return_lat: s.locationReturn?.lat ?? null,
    loc_return_lng: s.locationReturn?.lng ?? null,
    sandbox,
  }
}

function shiftFromRow(row: Record<string, unknown>): ShiftAssignment {
  return {
    id: String(row.id),
    bagId: String(row.bag_id),
    bagCode: String(row.bag_code),
    signedOutAt: String(row.signed_out_at),
    returnedAt: (row.returned_at as string) || undefined,
    holderId: String(row.holder_id),
    holderName: String(row.holder_name),
    witnessOutId: String(row.witness_out_id ?? ''),
    witnessOutName: String(row.witness_out_name ?? ''),
    witnessReturnId: (row.witness_return_id as string) || undefined,
    witnessReturnName: (row.witness_return_name as string) || undefined,
    tagOnSignOut: row.tag_on_sign_out as ShiftAssignment['tagOnSignOut'],
    tagOnReturn: (row.tag_on_return as ShiftAssignment['tagOnReturn']) || undefined,
    tagStillIntactOnReturn:
      row.tag_still_intact_on_return == null ? undefined : Boolean(row.tag_still_intact_on_return),
    medsCheckedOnUntagged:
      row.meds_checked_on_untagged == null ? undefined : Boolean(row.meds_checked_on_untagged),
    active: Boolean(row.active),
    notesOut: (row.notes_out as string) || undefined,
    notesReturn: (row.notes_return as string) || undefined,
    locationOut:
      row.loc_out_lat != null && row.loc_out_lng != null
        ? {
            lat: Number(row.loc_out_lat),
            lng: Number(row.loc_out_lng),
            capturedAt: String(row.signed_out_at),
          }
        : undefined,
    locationReturn:
      row.loc_return_lat != null && row.loc_return_lng != null
        ? {
            lat: Number(row.loc_return_lat),
            lng: Number(row.loc_return_lng),
            capturedAt: String(row.returned_at ?? row.signed_out_at),
          }
        : undefined,
  }
}

function discrepancyToRow(d: DiscrepancyCase, sandbox: boolean) {
  return {
    id: d.id,
    bag_id: d.bagId,
    bag_code: d.bagCode,
    status: d.status,
    reported_at: d.reportedAt,
    reported_by_id: d.reportedById,
    reported_by_name: d.reportedByName,
    witness_id: d.witnessId ?? null,
    witness_name: d.witnessName ?? null,
    summary: d.summary,
    details: d.details ?? null,
    item_notes: d.itemNotes ?? null,
    assigned_to_id: d.assignedToId ?? null,
    assigned_to_name: d.assignedToName ?? null,
    resolution: d.resolution ?? null,
    resolved_at: d.resolvedAt ?? null,
    resolved_by_id: d.resolvedById ?? null,
    resolved_by_name: d.resolvedByName ?? null,
    sandbox,
  }
}

function discrepancyFromRow(row: Record<string, unknown>): DiscrepancyCase {
  return {
    id: String(row.id),
    bagId: String(row.bag_id ?? ''),
    bagCode: String(row.bag_code),
    status: row.status as DiscrepancyCase['status'],
    reportedAt: String(row.reported_at),
    reportedById: String(row.reported_by_id ?? ''),
    reportedByName: String(row.reported_by_name),
    witnessId: (row.witness_id as string) || undefined,
    witnessName: (row.witness_name as string) || undefined,
    summary: String(row.summary),
    details: (row.details as string) || undefined,
    itemNotes: (row.item_notes as string) || undefined,
    assignedToId: (row.assigned_to_id as string) || undefined,
    assignedToName: (row.assigned_to_name as string) || undefined,
    resolution: (row.resolution as string) || undefined,
    resolvedAt: (row.resolved_at as string) || undefined,
    resolvedById: (row.resolved_by_id as string) || undefined,
    resolvedByName: (row.resolved_by_name as string) || undefined,
  }
}

export async function fetchStaffFromCloud(): Promise<StaffMember[] | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('staff').select('*').order('name')
  if (error || !data?.length) return null
  return (data as DbStaff[]).map(staffFromDb)
}

export async function pullLiveStateFromCloud(): Promise<Partial<AppState> | null> {
  if (!supabase || !isSupabaseSyncEnabled) return null

  const [staffRes, bagsRes, stockRes, shiftsRes, actsRes, discRes] = await Promise.all([
    supabase.from('staff').select('*'),
    supabase.from('bags').select('*').eq('sandbox', false),
    supabase.from('stock_items').select('*'),
    supabase.from('shifts').select('*').eq('sandbox', false),
    supabase.from('activities').select('*').eq('sandbox', false).order('occurred_at', { ascending: false }).limit(2500),
    supabase.from('discrepancies').select('*').eq('sandbox', false),
  ])

  if (bagsRes.error || !bagsRes.data) return null

  const stockByBag = new Map<string, StockItem[]>()
  for (const row of stockRes.data ?? []) {
    const item = enrichStockProfile({
      id: String(row.id),
      medicationId: String(row.medication_id),
      name: String(row.name),
      presentation: String(row.presentation ?? ''),
      quantity: Number(row.quantity),
      parLevel: Number(row.par_level),
      lotNumber: String(row.lot_number ?? ''),
      expiryDate: String(row.expiry_date),
      controlled: Boolean(row.controlled),
      schedule: (row.schedule as StockItem['schedule']) || undefined,
      unit: String(row.unit ?? 'unit'),
      strength: row.strength != null ? String(row.strength) : undefined,
      doseUnit: row.dose_unit != null ? (String(row.dose_unit) as StockItem['doseUnit']) : undefined,
      stockUnit: row.stock_unit != null ? (String(row.stock_unit) as StockItem['stockUnit']) : undefined,
      packSize: row.pack_size != null ? Number(row.pack_size) : undefined,
    })
    const list = stockByBag.get(String(row.bag_id)) ?? []
    list.push(item)
    stockByBag.set(String(row.bag_id), list)
  }

  const bags = bagsRes.data.map((b) => bagFromRows(b, stockByBag.get(String(b.id)) ?? []))

  return {
    staff: staffRes.data?.length ? (staffRes.data as DbStaff[]).map(staffFromDb) : undefined,
    bags,
    shifts: (shiftsRes.data ?? []).map((r) => shiftFromRow(r)),
    activities: (actsRes.data ?? []).map((r) => activityFromRow(r)),
    discrepancies: (discRes.data ?? []).map((r) => discrepancyFromRow(r)),
    lastSyncedAt: new Date().toISOString(),
  }
}

/** Full live-mode upsert of operational data (not sandbox). */
export async function pushLiveStateToCloud(state: AppState): Promise<{ ok: boolean; message: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return { ok: false, message: 'Supabase not configured' }
  }
  if (!isSupabaseSyncEnabled) {
    return { ok: true, message: 'Cloud sync disabled — local demo only' }
  }
  if (state.sandboxMode) {
    return { ok: true, message: 'Sandbox stays local only' }
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { ok: false, message: 'Offline — will sync when back online' }
  }

  const sandbox = false
  const bagRows = state.bags.map((b) => bagToRow(b, sandbox))
  const stockRows = state.bags.flatMap((b) => b.items.map((i) => stockToRow(i, b.id)))
  const shiftRows = state.shifts.map((s) => shiftToRow(s, sandbox))
  const activityRows = state.activities.slice(0, 800).map((a) => activityToRow(a, sandbox))
  const discRows = state.discrepancies.map((d) => discrepancyToRow(d, sandbox))

  const { error: bagErr } = await supabase.from('bags').upsert(bagRows, { onConflict: 'id' })
  if (bagErr) return { ok: false, message: bagErr.message }

  // Replace stock for these bags
  const bagIds = state.bags.map((b) => b.id)
  if (bagIds.length) {
    await supabase.from('stock_items').delete().in('bag_id', bagIds)
  }
  if (stockRows.length) {
    const { error: stockErr } = await supabase.from('stock_items').upsert(stockRows, { onConflict: 'id' })
    if (stockErr) return { ok: false, message: stockErr.message }
  }

  if (shiftRows.length) {
    const { error } = await supabase.from('shifts').upsert(shiftRows, { onConflict: 'id' })
    if (error) return { ok: false, message: error.message }
  }

  if (activityRows.length) {
    const { error } = await supabase.from('activities').upsert(activityRows, { onConflict: 'id' })
    if (error) return { ok: false, message: error.message }
  }

  if (discRows.length) {
    const { error } = await supabase.from('discrepancies').upsert(discRows, { onConflict: 'id' })
    if (error) return { ok: false, message: error.message }
  }

  return { ok: true, message: 'Synced to Supabase' }
}

export async function uploadEvidencePhoto(
  photo: PhotoEvidence,
  meta: { bagId?: string; uploadedBy?: string },
): Promise<string | null> {
  if (!supabase || !isSupabaseSyncEnabled) return null
  try {
    const res = await fetch(photo.dataUrl)
    const blob = await res.blob()
    const path = `${meta.bagId ?? 'general'}/${photo.id}.jpg`
    const { error } = await supabase.storage.from('evidence').upload(path, blob, {
      contentType: 'image/jpeg',
      upsert: true,
    })
    if (error) {
      console.warn('Photo upload failed', error.message)
      return null
    }
    await supabase.from('photos').upsert({
      id: photo.id,
      bag_id: meta.bagId ?? null,
      storage_path: path,
      caption: photo.caption ?? null,
      captured_at: photo.capturedAt,
      uploaded_by: meta.uploadedBy ?? null,
      sandbox: false,
    })
    return path
  } catch (e) {
    console.warn('Photo upload error', e)
    return null
  }
}

export async function setShiftPhotoPath(
  shiftId: string,
  side: 'out' | 'return',
  path: string,
): Promise<void> {
  if (!supabase) return
  const col = side === 'out' ? 'photo_out_path' : 'photo_return_path'
  await supabase.from('shifts').update({ [col]: path }).eq('id', shiftId)
}

export async function cloudBagCount(): Promise<number> {
  if (!supabase || !isSupabaseSyncEnabled) return 0
  const { count } = await supabase
    .from('bags')
    .select('id', { count: 'exact', head: true })
    .eq('sandbox', false)
  return count ?? 0
}
