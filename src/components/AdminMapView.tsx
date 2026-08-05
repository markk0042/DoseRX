import { format } from 'date-fns'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { demoLocationForBag } from '../lib/geo'

const icon = L.divIcon({
  className: 'doserx-map-marker',
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#0b3a4a;border:2px solid #e8f4f2;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

function destroyMap(map: L.Map | null, container: HTMLDivElement | null) {
  if (map) {
    try {
      map.off()
      map.remove()
    } catch {
      /* already removed */
    }
  }
  // Leaflet can leave panes/tiles in the container; wipe so nothing floats over other views on mobile
  if (container) {
    container.innerHTML = ''
    container.className = container.className
      .split(/\s+/)
      .filter((c) => c && !c.startsWith('leaflet'))
      .join(' ')
    container.removeAttribute('tabindex')
  }
}

export function AdminMapView() {
  const { state, isManagement } = useApp()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapObj = useRef<L.Map | null>(null)
  const markersLayer = useRef<L.LayerGroup | null>(null)

  const points = useMemo(() => {
    return state.bags
      .filter((b) => b.status === 'on_shift' || b.lastKnownLocation)
      .map((b) => {
        const shift = state.shifts.find((s) => s.bagId === b.id && s.active)
        const loc = b.lastKnownLocation ?? shift?.locationOut ?? demoLocationForBag(b.code)
        return {
          bag: b,
          shift,
          loc,
        }
      })
  }, [state.bags, state.shifts])

  // Create map once for this view mount; tear down fully on leave
  useEffect(() => {
    if (!isManagement) return
    const el = mapRef.current
    if (!el) return

    destroyMap(mapObj.current, el)
    mapObj.current = null
    markersLayer.current = null

    const map = L.map(el, {
      zoomControl: true,
      attributionControl: true,
    }).setView([53.35, -6.26], 7)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 18,
    }).addTo(map)

    const layer = L.layerGroup().addTo(map)
    markersLayer.current = layer
    mapObj.current = map

    // Fix blank/offset tiles after mobile layout settles
    const t = window.setTimeout(() => {
      map.invalidateSize()
    }, 80)

    return () => {
      window.clearTimeout(t)
      destroyMap(map, el)
      mapObj.current = null
      markersLayer.current = null
    }
  }, [isManagement])

  // Update markers without rebuilding the whole map
  useEffect(() => {
    const map = mapObj.current
    const layer = markersLayer.current
    if (!map || !layer) return

    layer.clearLayers()
    const bounds: L.LatLngExpression[] = []
    points.forEach(({ bag, shift, loc }) => {
      const marker = L.marker([loc.lat, loc.lng], { icon })
      marker.bindPopup(
        `<strong>${bag.code}</strong><br/>${bag.name}<br/>${
          shift ? `On shift: ${shift.holderName}<br/>Since ${format(new Date(shift.signedOutAt), 'HH:mm')}` : 'Last known'
        }<br/><small>${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}</small>`,
      )
      layer.addLayer(marker)
      bounds.push([loc.lat, loc.lng])
    })
    if (bounds.length) {
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [40, 40], maxZoom: 11 })
    }
    map.invalidateSize()
  }, [points])

  if (!isManagement) {
    return <p className="text-sm text-ink-soft">Admin map is available to administrators only.</p>
  }

  return (
    <div className="relative z-0 space-y-4">
      <div className="rounded-xl border border-line bg-panel p-4">
        <div className="mb-1 flex items-center gap-2">
          <MapPin className="text-sea" size={20} />
          <h2 className="font-display text-2xl font-bold">Live bag map</h2>
        </div>
        <p className="text-sm text-ink-soft">
          Bags on shift and last scan GPS. If location permission was denied, demo coordinates near Dublin are shown so
          the map still works in demos.
        </p>
      </div>
      {/* isolate + z-0 keeps Leaflet panes (z-index 200–700) from covering other pages after navigate */}
      <div className="relative z-0 isolate overflow-hidden rounded-xl border border-line shadow-sm">
        <div
          ref={mapRef}
          className="relative z-0 h-[min(55vh,420px)] min-h-[260px] w-full bg-surface"
          style={{ zIndex: 0 }}
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {points.map(({ bag, shift, loc }) => (
          <div key={bag.id} className="rounded-lg border border-line bg-panel p-3 text-sm">
            <p className="font-bold">{bag.code}</p>
            <p className="text-xs text-ink-soft">{shift ? `Held by ${shift.holderName}` : 'Not on active shift'}</p>
            <p className="font-mono text-[11px] text-ink-soft/70">
              {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
            </p>
          </div>
        ))}
        {points.length === 0 && (
          <p className="text-sm text-ink-soft">No location-tagged bags yet — sign a bag out to plot it.</p>
        )}
      </div>
    </div>
  )
}
