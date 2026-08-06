import type { DrugBag, QrPayload, StockItem } from '../types'

const PREFIX = 'DOSERX'

export function encodeBagQr(bagId: string): string {
  return `${PREFIX}|BAG|${bagId}`
}

/** Stable stock-line id — same on every device for a given bag × medication */
export function stockItemId(bagId: string, medicationId: string): string {
  return `${bagId}__${medicationId}`
}

/**
 * Short, stable med QR (reliable on phone cameras).
 * Format: DOSERX|MED|<bagId>|<medicationId>
 */
export function encodeMedQr(bagId: string, medicationId: string): string {
  return `${PREFIX}|MED|${bagId}|${medicationId}`
}

/** Human-readable label code unique to this bag's medication stock line */
export function buildTrackingCode(bagCode: string, medicationId: string): string {
  const med = medicationId.replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase() || 'MED'
  return `${bagCode}-${med}`
}

export function bagDeepLink(bagId: string): string {
  return `doserx://bag/${bagId}`
}

export function medDeepLink(bagId: string, medicationId: string): string {
  return `doserx://med/${bagId}/${medicationId}`
}

export function parseQrPayload(raw: string): QrPayload | null {
  const text = raw.trim()
  if (!text) return null

  // Some scanners wrap the payload in a URL or add whitespace/newlines
  const unwrapped = text
    .replace(/^https?:\/\/[^\s]+[?&](?:code|qr|payload)=/i, '')
    .replace(/^["']|["']$/g, '')
    .trim()

  if (unwrapped.startsWith('doserx://')) {
    const parts = unwrapped.replace('doserx://', '').split('/')
    if (parts[0] === 'bag' && parts[1]) return { kind: 'bag', bagId: parts[1] }
    if (parts[0] === 'med' && parts[1] && parts[2]) {
      return { kind: 'med', bagId: parts[1], itemId: parts[2] }
    }
    return null
  }

  const pipeIdx = unwrapped.indexOf(`${PREFIX}|`)
  const candidate = pipeIdx >= 0 ? unwrapped.slice(pipeIdx) : unwrapped
  const parts = candidate.split('|').map((p) => p.trim()).filter(Boolean)
  if (parts[0] === PREFIX) {
    if (parts[1] === 'BAG' && parts[2]) return { kind: 'bag', bagId: parts[2] }
    // MED: DOSERX|MED|bagId|medicationIdOrItemId(|optionalTracking)
    if (parts[1] === 'MED' && parts[2] && parts[3]) {
      return {
        kind: 'med',
        bagId: parts[2],
        itemId: parts[3],
        trackingCode: parts[4] || undefined,
      }
    }
  }
  return null
}

/**
 * Resolve camera/manual input to a bag or med.
 * Accepts full QR payloads, bag codes (DRX-EMT-02), bag ids, tracking codes, or medication names.
 */
export function resolveScanInput(
  raw: string,
  bags: DrugBag[],
): { payload: QrPayload } | { error: string } {
  const text = raw.trim()
  if (!text) return { error: 'Enter a bag code, medication name, or DoseRX QR payload.' }

  const parsed = parseQrPayload(text)
  if (parsed) return { payload: parsed }

  const upper = text.toUpperCase()
  const lower = text.toLowerCase()

  // Human bag code: DRX-EMT-02
  const byCode = bags.find((b) => b.code.toUpperCase() === upper)
  if (byCode) return { payload: { kind: 'bag', bagId: byCode.id } }

  // Internal bag id: bag-emt-02
  const byId = bags.find((b) => b.id.toLowerCase() === lower)
  if (byId) return { payload: { kind: 'bag', bagId: byId.id } }

  // Tracking code printed on med labels: DRX-EMT-02-ASPIRIN
  for (const bag of bags) {
    for (const item of bag.items) {
      const track = buildTrackingCode(bag.code, item.medicationId)
      if (track.toUpperCase() === upper) {
        return {
          payload: {
            kind: 'med',
            bagId: bag.id,
            itemId: item.medicationId,
            trackingCode: track,
          },
        }
      }
    }
  }

  // "DRX-EMT-02 Aspirin" or "DRX-EMT-02|aspirin"
  const split = text.split(/[\s|,]+/).filter(Boolean)
  if (split.length >= 2) {
    const bagToken = split[0]!
    const medToken = split.slice(1).join(' ')
    const bag =
      bags.find((b) => b.code.toUpperCase() === bagToken.toUpperCase()) ||
      bags.find((b) => b.id.toLowerCase() === bagToken.toLowerCase())
    if (bag) {
      const item =
        resolveStockItem(bag, medToken) ||
        bag.items.find(
          (i) =>
            i.name.toLowerCase() === medToken.toLowerCase() ||
            i.name.toLowerCase().includes(medToken.toLowerCase()) ||
            i.medicationId.toLowerCase() === medToken.toLowerCase(),
        )
      if (item) {
        return {
          payload: { kind: 'med', bagId: bag.id, itemId: item.medicationId },
        }
      }
      return { error: `No medication matching “${medToken}” in ${bag.code}.` }
    }
  }

  // Medication name / id alone — only if unique across visible bags
  if (lower.length >= 3) {
    const hits: { bag: DrugBag; item: StockItem }[] = []
    for (const bag of bags) {
      for (const item of bag.items) {
        if (
          item.name.toLowerCase() === lower ||
          item.medicationId.toLowerCase() === lower ||
          item.name.toLowerCase().includes(lower)
        ) {
          hits.push({ bag, item })
        }
      }
    }
    if (hits.length === 1) {
      const hit = hits[0]!
      return {
        payload: { kind: 'med', bagId: hit.bag.id, itemId: hit.item.medicationId },
      }
    }
    if (hits.length > 1) {
      const bagsHit = [...new Set(hits.map((h) => h.bag.code))].slice(0, 4).join(', ')
      return {
        error: `“${text}” is in multiple bags (${bagsHit}). Enter bag code first, e.g. DRX-EMT-02 ${text}.`,
      }
    }
  }

  return {
    error: `Unrecognised “${text.slice(0, 48)}${text.length > 48 ? '…' : ''}”. Try a bag code (DRX-EMT-02), tracking code, or DOSERX|BAG|… / DOSERX|MED|….`,
  }
}

/**
 * Resolve a scanned med token against a bag's stock lines.
 * Accepts: medicationId, stable item id, legacy UUID item id, or tracking code.
 */
export function resolveStockItem(
  bag: DrugBag,
  token: string,
  trackingCode?: string,
): StockItem | undefined {
  const t = token.trim()
  if (!t) return undefined

  const direct =
    bag.items.find((i) => i.id === t) ||
    bag.items.find((i) => i.medicationId === t) ||
    bag.items.find((i) => i.id === stockItemId(bag.id, t)) ||
    bag.items.find((i) => i.id === stockItemId(bag.id, i.medicationId) && i.medicationId === t)
  if (direct) return direct

  if (trackingCode) {
    const byExactTrack = bag.items.find(
      (i) => buildTrackingCode(bag.code, i.medicationId) === trackingCode,
    )
    if (byExactTrack) return byExactTrack

    // Legacy tracking: BAGCODE-MEDSLUG-HEX (e.g. DRX-CD-AP-01-DIAZEP-92CE58)
    const withoutBag = trackingCode.startsWith(bag.code)
      ? trackingCode.slice(bag.code.length).replace(/^-/, '')
      : trackingCode
    const slug = withoutBag.split('-')[0]?.replace(/[^a-z0-9]/gi, '').toLowerCase()
    if (slug && slug.length >= 3) {
      const bySlug = bag.items.find((i) => {
        const mid = i.medicationId.replace(/[^a-z0-9]/gi, '').toLowerCase()
        return mid.startsWith(slug.slice(0, 6)) || slug.startsWith(mid.slice(0, 6))
      })
      if (bySlug) return bySlug
    }
  }

  return undefined
}
