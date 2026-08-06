import { Html5Qrcode } from 'html5-qrcode'
import { Camera, Keyboard } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

export function QrScanner({
  onScan,
  active = true,
}: {
  onScan: (text: string) => void
  active?: boolean
}) {
  const reactId = useId().replace(/:/g, '')
  const elementId = `doserx-qr-${reactId}`
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  const [mode, setMode] = useState<'camera' | 'manual'>('manual')
  const [manual, setManual] = useState('')
  const [error, setError] = useState('')
  const [cameraReady, setCameraReady] = useState(false)
  const [lastSeen, setLastSeen] = useState('')

  useEffect(() => {
    if (!active || mode !== 'camera') return

    let cancelled = false
    let scanner: Html5Qrcode | null = null
    let lastDecoded = ''
    let lastAt = 0

    const start = async () => {
      try {
        await new Promise((r) => setTimeout(r, 80))
        if (cancelled) return

        const el = document.getElementById(elementId)
        if (!el) {
          setError('Scanner area not ready — use manual entry or demo quick pick')
          setMode('manual')
          return
        }

        scanner = new Html5Qrcode(elementId)

        // Prefer rear camera; fall back to any available device
        let cameraConfig: MediaTrackConstraints | string = { facingMode: 'environment' }
        try {
          const cameras = await Html5Qrcode.getCameras()
          if (cameras.length) {
            const back =
              cameras.find((c) => /back|rear|environment/i.test(c.label)) ?? cameras[cameras.length - 1]
            cameraConfig = back.id
          }
        } catch {
          /* facingMode fallback below */
        }

        await scanner.start(
          cameraConfig,
          {
            fps: 12,
            // Relative box works better across phone/desktop viewports than a fixed 240px
            qrbox: (viewW, viewH) => {
              const side = Math.floor(Math.min(viewW, viewH) * 0.72)
              return { width: side, height: side }
            },
            aspectRatio: 1.333,
          },
          (decoded) => {
            if (cancelled) return
            const text = decoded.trim()
            if (!text) return
            const now = Date.now()
            // Debounce repeats, but allow a different code (or retry after 1.5s)
            if (text === lastDecoded && now - lastAt < 1500) return
            lastDecoded = text
            lastAt = now
            setLastSeen(text.length > 64 ? `${text.slice(0, 64)}…` : text)
            onScanRef.current(text)
          },
          () => undefined,
        )
        if (!cancelled) {
          setCameraReady(true)
          setError('')
        }
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Camera unavailable'
        setError(`${message} — use Manual / paste or Demo quick pick below`)
        setMode('manual')
        setCameraReady(false)
        if (scanner) {
          try {
            await scanner.stop()
          } catch {
            /* ignore */
          }
          try {
            scanner.clear()
          } catch {
            /* ignore */
          }
        }
      }
    }

    void start()

    return () => {
      cancelled = true
      setCameraReady(false)
      const s = scanner
      if (!s) return
      void s
        .stop()
        .catch(() => undefined)
        .finally(() => {
          try {
            s.clear()
          } catch {
            /* ignore */
          }
        })
    }
  }, [active, mode, elementId])

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setError('')
            setLastSeen('')
            setMode('camera')
          }}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${
            mode === 'camera' ? 'bg-sea text-mint' : 'border border-line bg-panel'
          }`}
        >
          <Camera size={14} /> Camera
        </button>
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${
            mode === 'manual' ? 'bg-sea text-mint' : 'border border-line bg-panel'
          }`}
        >
          <Keyboard size={14} /> Manual / paste
        </button>
      </div>

      {mode === 'camera' && (
        <div className="overflow-hidden rounded-xl border border-line bg-ink">
          <div id={elementId} className="min-h-[280px] w-full overflow-hidden [&_video]:max-h-[360px] [&_video]:w-full [&_video]:object-cover" />
          {!cameraReady && !error && (
            <p className="bg-ink px-3 py-2 text-center text-xs text-mint-deep">Starting camera… allow access if prompted</p>
          )}
          {cameraReady && (
            <p className="bg-ink px-3 py-2 text-center text-xs text-mint-deep">
              Hold steady over a DoseRX bag or med QR
              {lastSeen ? ` · last read: ${lastSeen}` : ''}
            </p>
          )}
        </div>
      )}

      {mode === 'manual' && (
        <div className="space-y-2 rounded-xl border border-line bg-panel p-4">
          <p className="text-sm text-ink-soft">
            Paste a bag code (<strong>DRX-EMT-02</strong>), medication name, tracking code, or full DoseRX QR payload.
          </p>
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="DRX-EMT-02 · bag code, med name, or DOSERX|BAG|…"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 font-mono text-sm"
          />
          <button
            type="button"
            onClick={() => manual.trim() && onScan(manual.trim())}
            className="rounded-lg bg-sea px-4 py-2 text-sm font-bold text-mint"
          >
            Submit code
          </button>
        </div>
      )}

      {error && <p className="text-sm text-coral">{error}</p>}
    </div>
  )
}
