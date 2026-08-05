/** Visual stock strip: filled ampoules = on hand, ghost slots = remaining to par. */

import type { ReactNode } from 'react'

export function QuantityAmpoules({
  quantity,
  parLevel,
  unit,
  controlled = false,
  size = 'md',
  showLabel = true,
}: {
  quantity: number
  parLevel: number
  unit: string
  controlled?: boolean
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}) {
  const slots = Math.min(Math.max(parLevel, quantity, 1), 12)
  const filled = Math.max(0, Math.min(quantity, slots))
  const low = quantity <= 0 || quantity < parLevel
  const fillClass = controlled
    ? low
      ? 'fill-coral'
      : 'fill-cd'
    : low
      ? 'fill-coral'
      : 'fill-sea'
  const dim = size === 'sm' ? 10 : size === 'lg' ? 16 : 12
  const gap = size === 'sm' ? 'gap-0.5' : 'gap-1'

  return (
    <div className={`flex min-w-0 flex-col ${size === 'lg' ? 'gap-1.5' : 'gap-1'}`}>
      {showLabel && (
        <p className={`leading-tight ${size === 'lg' ? 'text-base' : 'text-sm'}`}>
          <span className={`font-display font-extrabold ${low ? 'text-coral' : 'text-ink'}`}>
            {quantity}
          </span>
          <span className="ml-1 font-medium text-ink-soft">{unit}</span>
          {parLevel > 0 && (
            <span className="ml-1.5 text-xs text-ink-soft/60">/ par {parLevel}</span>
          )}
        </p>
      )}
      <div
        className={`flex flex-wrap items-end ${gap}`}
        role="img"
        aria-label={`${quantity} of ${parLevel} ${unit} on hand`}
      >
        {Array.from({ length: slots }, (_, i) => (
          <AmpouleIcon
            key={i}
            filled={i < filled}
            fillClass={fillClass}
            width={dim}
            height={Math.round(dim * 1.85)}
          />
        ))}
      </div>
    </div>
  )
}

function AmpouleIcon({
  filled,
  fillClass,
  width,
  height,
}: {
  filled: boolean
  fillClass: string
  width: number
  height: number
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 12 22"
      aria-hidden
      className={`shrink-0 ${filled ? fillClass : 'fill-line/70'}`}
    >
      {/* Cap */}
      <rect x="3.5" y="0.5" width="5" height="2.5" rx="0.6" />
      {/* Neck */}
      <path d="M4.2 3h3.6l0.6 2.2H3.6L4.2 3z" />
      {/* Shoulder + body */}
      <path d="M2.2 5.2h7.6c0.7 0 1.2 0.5 1.2 1.1v11.2c0 1.6-1.2 2.8-2.8 2.8H3.8C2.2 20.3 1 19.1 1 17.5V6.3c0-0.6 0.5-1.1 1.2-1.1z" />
      {/* Highlight on filled only */}
      {filled && (
        <rect x="3.2" y="7.5" width="1.4" height="7" rx="0.5" className="fill-white/25" />
      )}
    </svg>
  )
}

/** Card row for a stock item — LogRX-inspired, DoseRX styling */
export function StockItemCard({
  name,
  presentation,
  quantity,
  parLevel,
  unit,
  lotNumber,
  expiryLabel,
  controlled,
  schedule,
  status,
}: {
  name: string
  presentation: string
  quantity: number
  parLevel: number
  unit: string
  lotNumber?: string
  expiryLabel?: string
  controlled?: boolean
  schedule?: string
  status?: ReactNode
}) {
  return (
    <div className="rounded-xl border border-line bg-panel px-3.5 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug text-ink">
            {name}
            {controlled && (
              <span className="ml-1.5 rounded bg-cd-soft px-1.5 py-0.5 text-[10px] font-bold uppercase text-cd">
                CD{schedule ? ` Sch ${schedule}` : ''}
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-ink-soft">{presentation}</p>
          <div className="mt-2">
            <QuantityAmpoules
              quantity={quantity}
              parLevel={parLevel}
              unit={unit}
              controlled={controlled}
              size="md"
            />
          </div>
          {(lotNumber || expiryLabel) && (
            <p className="mt-2 text-[11px] text-ink-soft/75">
              {lotNumber && (
                <>
                  Batch <span className="font-mono font-semibold text-ink-soft">{lotNumber}</span>
                </>
              )}
              {lotNumber && expiryLabel ? ' · ' : null}
              {expiryLabel && <>Exp {expiryLabel}</>}
            </p>
          )}
        </div>
        {status && <div className="shrink-0 pt-0.5">{status}</div>}
      </div>
    </div>
  )
}
