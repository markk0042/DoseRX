import { useEffect, useState } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { ActivityView } from './components/ActivityView'
import { AdministerView } from './components/AdministerView'
import { AdminMapView } from './components/AdminMapView'
import { AnalyticsView } from './components/AnalyticsView'
import { BagDetail } from './components/BagDetail'
import { BagsView } from './components/BagsView'
import { ControlledDrugsView } from './components/ControlledDrugsView'
import { Dashboard } from './components/Dashboard'
import { DiscrepancyView } from './components/DiscrepancyView'
import { FormularyView } from './components/FormularyView'
import { InventoryCheck } from './components/InventoryCheck'
import { LoginScreen } from './components/LoginScreen'
import { ManagementStockView } from './components/ManagementStockView'
import { PrintLabelsView } from './components/PrintLabelsView'
import { ScanFlowView } from './components/ScanFlowView'
import { ADMIN_DEFAULT, Shell, STAFF_DEFAULT, type View } from './components/Shell'
import { useApp } from './context/AppContext'
import { AppProvider } from './context/AppProvider'
import { isTryDemoUrl, useInactivityHardReload } from './hooks/useInactivityHardReload'

/** Public Try demo staff account (no PIN) */
const TRY_DEMO_USER_ID = 'staff-1'

function AppRoutes() {
  const { currentUser, setCurrentUser, isManagement } = useApp()
  const [view, setView] = useState<View>(STAFF_DEFAULT)
  const [selectedBagId, setSelectedBagId] = useState<string | null>(null)
  const tryDemo = isTryDemoUrl()

  // Hard refresh after 10 minutes idle (public try-demo / shared devices)
  useInactivityHardReload(10 * 60 * 1000)

  // Try demo link (?demo=1): enter as staff with no login screen
  useEffect(() => {
    if (!tryDemo || currentUser) return
    setCurrentUser(TRY_DEMO_USER_ID)
    setView(STAFF_DEFAULT)
  }, [tryDemo, currentUser, setCurrentUser])

  if (!currentUser) {
    return (
      <LoginScreen
        onLoggedIn={(role) => setView(role === 'admin' ? ADMIN_DEFAULT : STAFF_DEFAULT)}
      />
    )
  }

  const openBag = (id: string) => {
    if (!isManagement) return
    setSelectedBagId(id)
    setView('bag-detail')
  }

  return (
    <Shell view={view} setView={setView}>
      {view === 'dashboard' && isManagement && (
        <Dashboard onOpenBag={openBag} setView={setView} />
      )}
      {view === 'scan' && <ScanFlowView />}
      {view === 'labels' && isManagement && <PrintLabelsView />}
      {view === 'bags' && isManagement && <BagsView onOpenBag={openBag} />}
      {view === 'bag-detail' && isManagement && selectedBagId && (
        <BagDetail bagId={selectedBagId} onBack={() => setView('bags')} />
      )}
      {view === 'stock' && isManagement && (
        <ManagementStockView preferredBagId={selectedBagId ?? undefined} />
      )}
      {view === 'check' && isManagement && (
        <InventoryCheck preferredBagId={selectedBagId ?? undefined} />
      )}
      {view === 'administer' && <AdministerView preferredBagId={selectedBagId ?? undefined} />}
      {view === 'discrepancies' && <DiscrepancyView />}
      {view === 'map' && isManagement && <AdminMapView />}
      {view === 'cds' && isManagement && <ControlledDrugsView onOpenBag={openBag} />}
      {view === 'activity' && isManagement && <ActivityView />}
      {view === 'analytics' && isManagement && <AnalyticsView />}
      {view === 'formulary' && isManagement && <FormularyView />}
    </Shell>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
      <Analytics />
    </AppProvider>
  )
}
