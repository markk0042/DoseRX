import { format } from 'date-fns'
import {
  Activity,
  AlertTriangle,
  BookOpen,
  CheckSquare,
  ClipboardList,
  LayoutDashboard,
  Lock,
  LogOut,
  PackagePlus,
  Printer,
  QrCode,
  RotateCcw,
  Syringe,
} from 'lucide-react'
import { useEffect } from 'react'
import { useApp } from '../context/AppContext'

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

type NavItem = {
  id: View
  label: string
  icon: typeof LayoutDashboard
  /** Shown only to admin */
  adminOnly?: boolean
  /** Shown only to clinical staff */
  staffOnly?: boolean
}

const nav: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: true },
  { id: 'scan', label: 'QR · Bags & Meds', icon: QrCode },
  { id: 'administer', label: 'Administer / Waste', icon: Syringe },
  { id: 'labels', label: 'QR Generator', icon: Printer, adminOnly: true },
  { id: 'bags', label: 'Drug Bags', icon: ClipboardList, adminOnly: true },
  { id: 'stock', label: 'Stock Control', icon: PackagePlus, adminOnly: true },
  { id: 'check', label: 'Bag Check', icon: CheckSquare, adminOnly: true },
  { id: 'cds', label: 'Controlled Drugs', icon: Lock, adminOnly: true },
  { id: 'activity', label: 'Activity Log', icon: Activity, adminOnly: true },
  { id: 'formulary', label: 'PHECC Formulary', icon: BookOpen, adminOnly: true },
]

const STAFF_VIEWS: View[] = ['scan', 'administer']
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
  const { currentUser, setCurrentUser, state, resetDemo, isManagement } = useApp()
  const alerts =
    state.bags.filter((b) => b.status === 'check_due' || b.status === 'discrepancy' || b.status === 'on_shift')
      .length

  const visibleNav = nav.filter((item) => {
    if (item.adminOnly && !isManagement) return false
    if (item.staffOnly && isManagement) return false
    return true
  })

  // Keep staff off admin-only screens
  useEffect(() => {
    if (!currentUser) return
    if (!isManagement && !STAFF_VIEWS.includes(view)) {
      setView(STAFF_DEFAULT)
    }
  }, [currentUser, isManagement, view, setView])

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
      <aside className="border-b border-line bg-sea text-mint lg:w-64 lg:border-b-0 lg:border-r lg:border-sea-mid/40">
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

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible">
          {visibleNav.map((item) => {
            const Icon = item.icon
            const active = view === item.id || (view === 'bag-detail' && item.id === 'bags')
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
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
              </button>
            )
          })}
        </nav>

        <div className="mt-auto hidden border-t border-sea-mid/40 p-4 lg:block">
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
                onClick={() => {
                  setCurrentUser(null)
                }}
                className="inline-flex items-center gap-1.5 text-xs text-mint-deep hover:text-mint"
              >
                <LogOut size={12} /> Sign out
              </button>
            </div>
          )}
          {isManagement && (
            <button
              type="button"
              onClick={resetDemo}
              className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-mint-deep/70 hover:text-mint"
            >
              <RotateCcw size={11} /> Reset demo data
            </button>
          )}
        </div>
      </aside>

      <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sea-mid">
              {isManagement ? 'Administrator' : 'Clinical staff'}
            </p>
            <h1 className="font-display text-3xl font-extrabold text-ink sm:text-4xl">
              {isManagement ? 'System oversight' : 'Shift actions'}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-ink-soft/80">
              {isManagement
                ? 'Full access to stock, bags, labels, CDs, checks, and audit history.'
                : 'Sign bags in/out, administer or waste medications. Witness selects their name and enters their PIN.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isManagement && alerts > 0 && (
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-coral-soft px-3 py-1.5 text-sm font-semibold text-coral">
                <AlertTriangle size={14} /> {alerts} alert{alerts > 1 ? 's' : ''}
              </div>
            )}
            <p className="text-xs text-ink-soft/60">{format(new Date(), 'EEE d MMM yyyy · HH:mm')}</p>
          </div>
        </header>

        {children}
      </main>
    </div>
  )
}

export { ADMIN_DEFAULT, STAFF_DEFAULT }
