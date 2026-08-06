import { format } from 'date-fns'
import {
  Activity,
  AlertTriangle,
  BookOpen,
  CheckSquare,
  ChevronDown,
  ClipboardList,
  FileWarning,
  LayoutDashboard,
  Lock,
  LogOut,
  Map,
  Menu,
  PackagePlus,
  Printer,
  QrCode,
  RotateCcw,
  Syringe,
  BarChart3,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { bagsHeldOnShift } from '../lib/bagAccess'
import { downloadCdRegisterPdf } from '../lib/cdRegisterPdf'
import { buildOversightAlerts } from '../lib/oversightAlerts'
import { OfflineBanner } from './OfflineBanner'

export type View =
  | 'dashboard'
  | 'bags'
  | 'check'
  | 'stock'
  | 'scan'
  | 'labels'
  | 'administer'
  | 'cds'
  | 'activity'
  | 'formulary'
  | 'bag-detail'
  | 'discrepancies'
  | 'map'
  | 'analytics'

type NavItem = {
  id: View
  label: string
  icon: typeof LayoutDashboard
  adminOnly?: boolean
  staffOnly?: boolean
}

const nav: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: true },
  { id: 'scan', label: 'QR · Bags & Meds', icon: QrCode },
  { id: 'administer', label: 'Administer / Waste', icon: Syringe },
  { id: 'discrepancies', label: 'Discrepancies', icon: FileWarning },
  { id: 'map', label: 'Live Map', icon: Map, adminOnly: true },
  { id: 'labels', label: 'QR Generator', icon: Printer, adminOnly: true },
  { id: 'bags', label: 'Drug Bags', icon: ClipboardList, adminOnly: true },
  { id: 'stock', label: 'Stock Control', icon: PackagePlus, adminOnly: true },
  { id: 'check', label: 'Audit Bags', icon: CheckSquare, adminOnly: true },
  { id: 'cds', label: 'Controlled Drugs', icon: Lock, adminOnly: true },
  { id: 'activity', label: 'Activity Log', icon: Activity, adminOnly: true },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, adminOnly: true },
  { id: 'formulary', label: 'PHECC Formulary', icon: BookOpen, adminOnly: true },
]

const STAFF_VIEWS: View[] = ['scan', 'administer', 'discrepancies']
const ADMIN_DEFAULT: View = 'dashboard'
const STAFF_DEFAULT: View = 'scan'

export function Shell({
  view,
  setView,
  children,
}: {
  view: View
  setView: (v: View) => void
  children: React.ReactNode
}) {
  const { currentUser, setCurrentUser, state, resetDemo, isManagement, setSandboxMode, isExpired, expiringSoon } =
    useApp()
  const [menuOpen, setMenuOpen] = useState(false)

  const oversight = useMemo(
    () => buildOversightAlerts(state, { isExpired, expiringSoon }),
    [state, isExpired, expiringSoon],
  )
  const alerts = oversight.total
  const openDiscrepancyCount = oversight.openDiscrepancies
  const onShiftCount = oversight.onShift

  /** Show Administer once any bag is signed out to this user (page explains grade mismatches) */
  const canAdminister = useMemo(() => {
    if (!currentUser) return false
    return bagsHeldOnShift(state.bags, state.shifts, currentUser).length > 0
  }, [currentUser, state.bags, state.shifts])

  const visibleNav = nav.filter((item) => {
    if (item.adminOnly && !isManagement) return false
    if (item.staffOnly && isManagement) return false
    if (item.id === 'administer' && !canAdminister) return false
    return true
  })

  const currentNav = useMemo(() => {
    if (view === 'bag-detail') return visibleNav.find((n) => n.id === 'bags')
    return visibleNav.find((n) => n.id === view)
  }, [view, visibleNav])

  useEffect(() => {
    if (!currentUser) return
    if (!isManagement && !STAFF_VIEWS.includes(view)) {
      setView(STAFF_DEFAULT)
    }
  }, [currentUser, isManagement, view, setView])

  useEffect(() => {
    if (view === 'administer' && !canAdminister) {
      setView(STAFF_DEFAULT)
    }
  }, [view, canAdminister, setView])

  useEffect(() => {
    setMenuOpen(false)
  }, [view])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const go = (id: View) => {
    setView(id)
    setMenuOpen(false)
  }

  return (
    <div className="mx-auto flex min-h-screen min-h-[100dvh] max-w-7xl flex-col lg:flex-row">
      {/* —— Mobile top bar + dropdown nav —— */}
      <header className="sticky top-0 z-40 border-b border-sea-mid/40 bg-sea text-mint lg:hidden safe-top">
        <div className="flex items-center gap-2.5 px-3 py-2.5 sm:px-4">
          <img
            src="/doserx-logo.png"
            alt="DoseRX"
            className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-mint/20"
          />
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl font-extrabold leading-none tracking-wide">DoseRX</p>
            <p className="truncate text-[11px] text-mint-deep">
              {currentNav?.label ?? (isManagement ? 'Admin' : 'Staff')}
              {currentUser ? ` · ${currentUser.name.split(' ')[0]}` : ''}
            </p>
          </div>
          {alerts > 0 && (
            <span
              className="shrink-0 rounded-md bg-coral px-1.5 py-0.5 text-[10px] font-bold text-white"
              title="Discrepancies, bag reviews, expiries, recent waste"
            >
              {alerts} alert{alerts === 1 ? '' : 's'}
            </span>
          )}
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sea-mid/50 px-2.5 py-2 text-sm font-bold"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-menu"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
            <span className="sm:inline">Menu</span>
            <ChevronDown
              size={14}
              className={`hidden text-mint-deep transition sm:block ${menuOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {menuOpen && (
          <>
            <button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-[1px]"
              onClick={() => setMenuOpen(false)}
            />
            <div
              id="mobile-nav-menu"
              className="absolute left-0 right-0 z-50 max-h-[min(70vh,560px)] overflow-y-auto border-b border-sea-mid/40 bg-sea shadow-xl"
            >
              <nav className="flex flex-col gap-0.5 p-2">
                {visibleNav.map((item) => {
                  const Icon = item.icon
                  const active = view === item.id || (view === 'bag-detail' && item.id === 'bags')
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => go(item.id)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold transition ${
                        active ? 'bg-mint text-sea' : 'text-mint/90 active:bg-sea-mid/60'
                      }`}
                    >
                      <Icon size={18} className="shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {item.id === 'dashboard' && alerts > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1.5 text-[10px] text-white">
                          {alerts}
                        </span>
                      )}
                      {item.id === 'discrepancies' && openDiscrepancyCount > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1.5 text-[10px] text-white">
                          {openDiscrepancyCount}
                        </span>
                      )}
                    </button>
                  )
                })}
              </nav>

              <div className="space-y-2 border-t border-sea-mid/40 p-3">
                {currentUser && (
                  <div className="rounded-lg bg-sea-mid/30 px-3 py-2">
                    <p className="text-sm font-semibold">{currentUser.name}</p>
                    <p className="text-xs text-mint-deep">
                      {isManagement
                        ? 'Admin'
                        : currentUser.grade === 'AP'
                          ? 'Advanced Paramedic'
                          : currentUser.grade}
                      {' · '}
                      {currentUser.pheccNumber}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false)
                        setCurrentUser(null)
                      }}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-mint-deep"
                    >
                      <LogOut size={12} /> Sign out
                    </button>
                  </div>
                )}
                {isManagement && (
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => setSandboxMode(!state.sandboxMode)}
                      className={`w-full rounded-lg px-3 py-2.5 text-left text-xs font-bold ${
                        state.sandboxMode ? 'bg-amber text-ink' : 'bg-sea-mid/40 text-mint'
                      }`}
                    >
                      {state.sandboxMode ? 'Exit sandbox / training' : 'Training / sandbox mode'}
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadCdRegisterPdf(state)}
                      className="w-full rounded-lg bg-sea-mid/40 px-3 py-2.5 text-left text-xs font-bold text-mint"
                    >
                      Print CD register PDF
                    </button>
                    <button
                      type="button"
                      onClick={resetDemo}
                      className="inline-flex items-center gap-1.5 px-1 text-[11px] text-mint-deep/80"
                    >
                      <RotateCcw size={11} /> Reset demo data
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </header>

      {/* —— Desktop sidebar —— */}
      <aside className="hidden border-r border-sea-mid/40 bg-sea text-mint lg:flex lg:w-64 lg:shrink-0 lg:flex-col">
        <div className="px-5 py-5">
          <div className="mb-1 flex items-center gap-2.5">
            <img
              src="/doserx-logo.png"
              alt="DoseRX"
              className="h-10 w-10 rounded-lg object-cover shadow-sm ring-1 ring-mint/20"
            />
            <div>
              <p className="font-display text-2xl font-extrabold leading-none tracking-wide">DoseRX</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-mint-deep">
                {isManagement ? 'Admin oversight' : 'Staff actions'}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-3">
          {visibleNav.map((item) => {
            const Icon = item.icon
            const active = view === item.id || (view === 'bag-detail' && item.id === 'bags')
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                  active ? 'bg-mint text-sea' : 'text-mint/80 hover:bg-sea-mid/50 hover:text-mint'
                }`}
              >
                <Icon size={16} />
                {item.label}
                {item.id === 'dashboard' && alerts > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1.5 text-[10px] text-white">
                    {alerts}
                  </span>
                )}
                {item.id === 'discrepancies' && openDiscrepancyCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1.5 text-[10px] text-white">
                    {openDiscrepancyCount}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="mt-auto border-t border-sea-mid/40 p-4">
          {currentUser && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">{currentUser.name}</p>
              <p className="text-xs text-mint-deep">
                {isManagement
                  ? 'Admin'
                  : currentUser.grade === 'AP'
                    ? 'Advanced Paramedic'
                    : currentUser.grade}
                {' · '}
                {currentUser.pheccNumber}
              </p>
              <button
                type="button"
                onClick={() => setCurrentUser(null)}
                className="inline-flex items-center gap-1.5 text-xs text-mint-deep hover:text-mint"
              >
                <LogOut size={12} /> Sign out
              </button>
            </div>
          )}
          {isManagement && (
            <div className="mt-3 space-y-2">
              <button
                type="button"
                onClick={() => setSandboxMode(!state.sandboxMode)}
                className={`w-full rounded-lg px-3 py-2 text-left text-[11px] font-bold ${
                  state.sandboxMode ? 'bg-amber text-ink' : 'bg-sea-mid/40 text-mint-deep hover:text-mint'
                }`}
              >
                {state.sandboxMode ? 'Exit sandbox / training' : 'Training / sandbox mode'}
              </button>
              <button
                type="button"
                onClick={() => downloadCdRegisterPdf(state)}
                className="w-full rounded-lg bg-sea-mid/40 px-3 py-2 text-left text-[11px] font-bold text-mint-deep hover:text-mint"
              >
                Print CD register PDF
              </button>
              <button
                type="button"
                onClick={resetDemo}
                className="inline-flex items-center gap-1.5 text-[11px] text-mint-deep/70 hover:text-mint"
              >
                <RotateCcw size={11} /> Reset demo data
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden px-3 py-4 sm:px-6 sm:py-5 lg:px-8 safe-bottom">
        <header className="mb-4 flex flex-wrap items-end justify-between gap-2 sm:mb-6 sm:gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sea-mid sm:text-xs">
              {isManagement ? 'Administrator' : 'Clinical staff'}
            </p>
            <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl lg:text-4xl">
              {isManagement ? 'System oversight' : 'Shift actions'}
            </h1>
            <p className="mt-1 hidden max-w-2xl text-sm text-ink-soft/80 sm:block">
              {isManagement
                ? 'Stock, bags, map, discrepancies, CDs, and HPRA-ready audit.'
                : 'Offline-capable bag sign-out, administer/waste, and discrepancy reporting. Witness uses PIN.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {isManagement && (
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-sea/10 px-2.5 py-1.5 text-xs font-semibold text-sea sm:px-3 sm:text-sm">
                {onShiftCount} on shift
              </div>
            )}
            {isManagement && alerts > 0 && (
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-coral-soft px-2.5 py-1.5 text-xs font-semibold text-coral sm:px-3 sm:text-sm">
                <AlertTriangle size={14} /> {alerts} alert{alerts > 1 ? 's' : ''}
              </div>
            )}
            <p className="font-mono text-[10px] tabular-nums text-ink-soft/60 sm:text-xs">
              <LiveClock />
            </p>
          </div>
        </header>

        <OfflineBanner />
        <div className="min-w-0">{children}</div>
      </main>
    </div>
  )
}

function LiveClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  return <>{format(now, 'EEE d MMM yyyy · HH:mm:ss')}</>
}

export { ADMIN_DEFAULT, STAFF_DEFAULT }
