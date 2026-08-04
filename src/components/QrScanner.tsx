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

  useEffect(() => {
    if (!active || mode !== 'camera') return

    let cancelled = false
    let scanner: Html5Qrcode | null = null
    let handled = false

    const start = async () => {
      try {
        // Wait a tick so the scanner mount node exists in the DOM
        await new Promise((r) => setTimeout(r, 50))
        if (cancelled) return

        const el = document.getElementById(elementId)
        if (!el) {
          setError('Scanner area not ready — use manual entry')
          setMode('manual')
          return
        }

        scanner = new Html5Qrcode(elementId)
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 8, qrbox: { width: 240, height: 240 } },
          (decoded) => {
            if (handled || cancelled) return
            handled = true
            onScanRef.current(decoded)
          },
          () => undefined,
        )
        if (!cancelled) setCameraReady(true)
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Camera unavailable'
        setError(`${message} — use manual entry or demo quick pick`)
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
          <div id={elementId} className="min-h-[260px] w-full overflow-hidden" />
          {!cameraReady && !error && (
            <p className="bg-ink px-3 py-2 text-center text-xs text-mint-deep">Starting camera…</p>
          )}
        </div>
      )}

      {mode === 'manual' && (
        <div className="space-y-2 rounded-xl border border-line bg-panel p-4">
          <p className="text-sm text-ink-soft">
            Paste a DoseRX QR payload, or use demo quick pick below.
          </p>
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="DOSERX|BAG|… or DOSERX|MED|…"
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
