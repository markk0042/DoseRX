import type { GeoPoint } from '../types'

export function captureLocation(): Promise<GeoPoint | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(null)
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          capturedAt: new Date().toISOString(),
        })
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    )
  })
}

/** Demo fallbacks around Ireland if GPS denied — still useful for admin map */
export function demoLocationForBag(bagCode: string): GeoPoint {
  const base = { lat: 53.3498, lng: -6.2603 }
  const hash = [...bagCode].reduce((n, c) => n + c.charCodeAt(0), 0)
  return {
    lat: base.lat + ((hash % 20) - 10) * 0.01,
    lng: base.lng + ((hash % 17) - 8) * 0.015,
    capturedAt: new Date().toISOString(),
  }
}
