import { Hourglass } from 'lucide-react'

export function BusyOverlay({
  label = 'Working…',
  detail,
}: {
  label?: string
  detail?: string
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/45 px-6 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex max-w-xs flex-col items-center gap-4 rounded-2xl border border-line bg-panel px-8 py-7 text-center shadow-xl">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <span className="absolute inset-0 rounded-full border-2 border-sea/15" />
          <span className="absolute inset-1 animate-spin rounded-full border-2 border-transparent border-t-sea border-r-sea/40" />
          <Hourglass className="relative z-10 text-sea animate-hourglass" size={28} strokeWidth={2.25} />
        </div>
        <div>
          <p className="font-display text-xl font-bold text-ink">{label}</p>
          {detail && <p className="mt-1 text-sm text-ink-soft/80">{detail}</p>}
        </div>
      </div>
    </div>
  )
}
