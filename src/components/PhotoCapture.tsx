import { Camera, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { v4 as uuid } from 'uuid'
import type { PhotoEvidence } from '../types'

const MAX_BYTES = 2_500_000
const MAX_EDGE = 1600
const JPEG_QUALITY = 0.72

export function PhotoCapture({
  label = 'Photo evidence',
  value,
  onChange,
}: {
  label?: string
  value: PhotoEvidence | null
  onChange: (photo: PhotoEvidence | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const onFile = async (file: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file (JPG, PNG, HEIC).')
      return
    }

    setBusy(true)
    setError('')
    try {
      const dataUrl = await preparePhoto(file)
      if (!dataUrl) {
        setError('Could not process that photo. Try another image under 10MB.')
        return
      }
      // Rough size check on base64 payload
      const approxBytes = Math.ceil((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75)
      if (approxBytes > MAX_BYTES) {
        setError('Photo is still too large after resize. Try a simpler/closer shot.')
        return
      }
      onChange({
        id: uuid(),
        dataUrl,
        caption: label,
        capturedAt: new Date().toISOString(),
      })
    } catch {
      setError('Could not read that photo. Please try again.')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-line bg-surface p-3">
      <p className="text-sm font-semibold">{label}</p>
      <p className="text-xs text-ink-soft">
        Snap tag colour / seal number for the audit trail. Large camera photos are resized automatically.
      </p>
      {value ? (
        <div className="relative">
          <img src={value.dataUrl} alt="Evidence" className="max-h-48 w-full rounded-lg object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-2 top-2 rounded-full bg-ink/70 p-1 text-mint"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-sea/40 bg-panel px-3 py-2 text-sm font-semibold text-sea disabled:opacity-60"
        >
          <Camera size={16} /> {busy ? 'Processing photo…' : 'Take / upload photo'}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
      />
      {error && <p className="text-xs font-medium text-coral">{error}</p>}
    </div>
  )
}

async function preparePhoto(file: File): Promise<string | null> {
  // Small enough already — keep original encoding when possible
  if (file.size <= MAX_BYTES && file.type !== 'image/heic' && file.type !== 'image/heif') {
    return readAsDataUrl(file)
  }

  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) {
    // Fallback: try raw read (may still fail size check later)
    if (file.size <= MAX_BYTES) return readAsDataUrl(file)
    return null
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return null
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  let quality = JPEG_QUALITY
  let dataUrl = canvas.toDataURL('image/jpeg', quality)
  while (dataUrl.length > MAX_BYTES * 1.37 && quality > 0.4) {
    quality -= 0.1
    dataUrl = canvas.toDataURL('image/jpeg', quality)
  }
  return dataUrl
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
