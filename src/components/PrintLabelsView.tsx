import { format } from 'date-fns'
import { CheckSquare, Package, Pill, Printer, QrCode } from 'lucide-react'
import { useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useApp } from '../context/AppContext'
import { buildTrackingCode, encodeBagQr, encodeMedQr } from '../lib/qr'
import type { DrugBag, StockItem } from '../types'

type Scope = 'one' | 'all'
type Content = 'both' | 'bags' | 'meds'

export function PrintLabelsView() {
  const { state, isManagement } = useApp()
  const [scope, setScope] = useState<Scope>('one')
  const [bagId, setBagId] = useState(state.bags[0]?.id ?? '')
  const [content, setContent] = useState<Content>('both')
  const [gradeFilter, setGradeFilter] = useState<'all' | 'EMT' | 'Paramedic' | 'AP' | 'CD'>('all')

  const selectedBags = useMemo(() => {
    let bags = state.bags
    if (gradeFilter === 'CD') bags = bags.filter((b) => b.type === 'controlled')
    else if (gradeFilter !== 'all') {
      bags = bags.filter((b) => b.grade === gradeFilter && b.type === 'standard')
    }
    if (scope === 'one') bags = bags.filter((b) => b.id === bagId)
    return bags
  }, [state.bags, scope, bagId, gradeFilter])

  const medLabelCount = selectedBags.reduce((n, b) => n + b.items.length, 0)
  const bagLabelCount = content === 'meds' ? 0 : selectedBags.length
  const medLabelsShown = content === 'bags' ? 0 : medLabelCount

  const exportCsv = () => {
    const rows = [['type', 'bag_code', 'bag_id', 'medication', 'item_id', 'tracking_code', 'batch', 'expiry', 'qty', 'qr_payload']]
    for (const bag of selectedBags) {
      if (content !== 'meds') {
        rows.push([
          'bag',
          bag.code,
          bag.id,
          '',
          '',
          bag.code,
          '',
          '',
          '',
          encodeBagQr(bag.id),
        ])
      }
      if (content !== 'bags') {
        for (const item of bag.items) {
          const tracking = buildTrackingCode(bag.code, item.medicationId)
          rows.push([
            'medication',
            bag.code,
            bag.id,
            item.name,
            item.id,
            tracking,
            item.lotNumber,
            item.expiryDate,
            String(item.quantity),
            encodeMedQr(bag.id, item.medicationId),
          ])
        }
      }
    }
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `doserx-qr-labels-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!isManagement) {
    return (
      <div className="rounded-xl border border-amber/40 bg-amber-soft/50 p-5">
        <p className="font-semibold">Admin only</p>
        <p className="text-sm text-ink-soft">QR generation for bag and medication labels is restricted to administrators.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-panel p-4 print:hidden">
        <div className="mb-1 flex items-center gap-2">
          <QrCode className="text-sea" size={22} />
          <h2 className="font-display text-2xl font-bold">QR code generator</h2>
        </div>
        <p className="mb-4 max-w-3xl text-sm text-ink-soft/80">
          Every medication in every bag gets its own unique QR. Scanning Midazolam on{' '}
          <strong>DRX-CD-P-01</strong> is not the same code as Midazolam on <strong>DRX-CD-AP-01</strong> — DoseRX
          tracks stock against that exact bag line (batch, expiry, on-hand qty).
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm">
            <span className="mb-1 block font-semibold">Scope</span>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as Scope)}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2"
            >
              <option value="one">One bag</option>
              <option value="all">All bags (filtered)</option>
            </select>
          </label>

          {scope === 'one' && (
            <label className="text-sm">
              <span className="mb-1 block font-semibold">Bag</span>
              <select
                value={bagId}
                onChange={(e) => setBagId(e.target.value)}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2"
              >
                {state.bags.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} — {b.name} ({b.items.length} meds)
                  </option>
                ))}
              </select>
            </label>
          )}

          {scope === 'all' && (
            <label className="text-sm">
              <span className="mb-1 block font-semibold">Filter</span>
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value as typeof gradeFilter)}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2"
              >
                <option value="all">All 10 bags</option>
                <option value="EMT">EMT bags</option>
                <option value="Paramedic">Paramedic bags</option>
                <option value="AP">AP bags</option>
                <option value="CD">Controlled drug pouches</option>
              </select>
            </label>
          )}

          <label className="text-sm">
            <span className="mb-1 block font-semibold">Label content</span>
            <select
              value={content}
              onChange={(e) => setContent(e.target.value as Content)}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2"
            >
              <option value="both">Bag QR + medication QRs</option>
              <option value="meds">Medication QRs only</option>
              <option value="bags">Bag shift QRs only</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg bg-sea px-4 py-2.5 text-sm font-bold text-mint"
          >
            <Printer size={16} /> Print {bagLabelCount + medLabelsShown} labels
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-semibold"
          >
            Export QR list (CSV)
          </button>
          <span className="text-xs text-ink-soft">
            {selectedBags.length} bag{selectedBags.length === 1 ? '' : 's'} · {bagLabelCount} bag QR
            {bagLabelCount === 1 ? '' : 's'} · {medLabelsShown} unique medication QR
            {medLabelsShown === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      <div className="print-area space-y-8">
        {selectedBags.map((bag) => (
          <BagLabelSection key={bag.id} bag={bag} content={content} />
        ))}
        {selectedBags.length === 0 && (
          <p className="rounded-xl border border-line bg-panel p-6 text-sm text-ink-soft">No bags match this filter.</p>
        )}
      </div>
    </div>
  )
}

function BagLabelSection({ bag, content }: { bag: DrugBag; content: Content }) {
  const bagPayload = encodeBagQr(bag.id)

  return (
    <section className="space-y-4 break-before-page first:break-before-auto">
      <div className="print:hidden flex items-center gap-2 border-b border-line pb-2">
        <Package size={16} className="text-sea" />
        <h3 className="font-display text-xl font-bold">
          {bag.code} · {bag.name}
        </h3>
        <span className="text-xs text-ink-soft">{bag.items.length} medication codes</span>
      </div>

      {content !== 'meds' && (
        <div className="break-inside-avoid rounded-xl border-2 border-dashed border-sea bg-panel p-5">
          <div className="mb-3 flex items-center gap-2">
            <img src="/doserx-logo.png" alt="" className="h-8 w-8 rounded-md object-cover" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-sea-mid">DoseRX · Bag shift QR</p>
              <p className="text-[11px] text-ink-soft">Unique to this bag — sign out / return</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <QRCodeSVG value={bagPayload} size={148} level="M" includeMargin />
            <div>
              <p className="font-display text-3xl font-extrabold">{bag.code}</p>
              <p className="text-sm text-ink-soft">{bag.name}</p>
              <p className="mt-1 text-xs text-ink-soft">
                {bag.type === 'controlled' ? 'Controlled drugs' : bag.grade} · Seal {bag.sealNumber}
              </p>
              <p className="mt-2 font-mono text-[10px] break-all text-ink-soft/60">{bagPayload}</p>
            </div>
          </div>
        </div>
      )}

      {content !== 'bags' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bag.items.map((item) => (
            <MedLabelCard key={item.id} bag={bag} item={item} />
          ))}
        </div>
      )}
    </section>
  )
}

function MedLabelCard({ bag, item }: { bag: DrugBag; item: StockItem }) {
  const tracking = buildTrackingCode(bag.code, item.medicationId)
  const payload = encodeMedQr(bag.id, item.medicationId)

  return (
    <div className="break-inside-avoid rounded-xl border border-line bg-panel p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 rounded bg-sea/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sea">
          <Pill size={10} /> Med QR
        </span>
        {item.controlled && (
          <span className="rounded bg-cd-soft px-1.5 py-0.5 text-[10px] font-bold text-cd">
            Sch {item.schedule}
          </span>
        )}
      </div>
      <div className="flex gap-3">
        <QRCodeSVG value={payload} size={140} level="H" includeMargin />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-tight">{item.name}</p>
          <p className="text-[11px] text-ink-soft">{item.presentation}</p>
          <p className="mt-1.5 font-mono text-[10px] font-bold text-sea break-all">{tracking}</p>
          <p className="mt-1 text-[11px]">
            <span className="font-semibold">Bag</span> {bag.code}
          </p>
          <p className="text-[11px]">
            <span className="font-semibold">Batch</span> {item.lotNumber}
          </p>
          <p className="text-[11px]">
            <span className="font-semibold">Expiry</span> {format(new Date(item.expiryDate), 'MMM yyyy')}
          </p>
          <p className="text-[11px]">
            <span className="font-semibold">On hand</span> {item.quantity} {item.unit}
          </p>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(payload)
            }}
            className="mt-2 rounded border border-line bg-surface px-2 py-1 text-[10px] font-semibold print:hidden hover:border-sea"
            title={payload}
          >
            Copy QR payload
          </button>
        </div>
      </div>
      <p className="mt-2 font-mono text-[9px] break-all text-ink-soft/50 print:hidden">{payload}</p>
      <p className="mt-1 flex items-start gap-1 text-[10px] text-ink-soft/70">
        <CheckSquare size={10} className="mt-0.5 shrink-0" />
        Unique to this bag — not interchangeable with the same drug in another bag
      </p>
    </div>
  )
}
