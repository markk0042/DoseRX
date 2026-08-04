import type { QrPayload } from '../types'

const PREFIX = 'DOSERX'

export function encodeBagQr(bagId: string): string {
  return `${PREFIX}|BAG|${bagId}`
}

/** Unique per bag × medication stock line — used for vial-level tracking */
export function encodeMedQr(bagId: string, itemId: string, trackingCode?: string): string {
  if (trackingCode) return `${PREFIX}|MED|${bagId}|${itemId}|${trackingCode}`
  return `${PREFIX}|MED|${bagId}|${itemId}`
}

/** Human-readable label code unique to this bag's medication stock line */
export function buildTrackingCode(bagCode: string, medicationId: string, itemId: string): string {
  const med = medicationId.replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase() || 'MED'
  const uniq = itemId.replace(/-/g, '').slice(0, 6).toUpperCase()
  return `${bagCode}-${med}-${uniq}`
}

export function bagDeepLink(bagId: string): string {
  return `doserx://bag/${bagId}`
}

export function medDeepLink(bagId: string, itemId: string): string {
  return `doserx://med/${bagId}/${itemId}`
}

export function parseQrPayload(raw: string): QrPayload | null {
  const text = raw.trim()

  if (text.startsWith('doserx://')) {
    const parts = text.replace('doserx://', '').split('/')
    if (parts[0] === 'bag' && parts[1]) return { kind: 'bag', bagId: parts[1] }
    if (parts[0] === 'med' && parts[1] && parts[2]) {
      return { kind: 'med', bagId: parts[1], itemId: parts[2] }
    }
    return null
  }

  const parts = text.split('|')
  if (parts[0] !== PREFIX) return null
  if (parts[1] === 'BAG' && parts[2]) return { kind: 'bag', bagId: parts[2] }
  if (parts[1] === 'MED' && parts[2] && parts[3]) {
    return { kind: 'med', bagId: parts[2], itemId: parts[3] }
  }
  return null
}
