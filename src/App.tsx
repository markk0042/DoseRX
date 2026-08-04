import { useState } from 'react'
import { ActivityView } from './components/ActivityView'
import { AdministerView } from './components/AdministerView'
import { BagDetail } from './components/BagDetail'
import { BagsView } from './components/BagsView'
import { ControlledDrugsView } from './components/ControlledDrugsView'
import { Dashboard } from './components/Dashboard'
import { FormularyView } from './components/FormularyView'
import { InventoryCheck } from './components/InventoryCheck'
import { LoginScreen } from './components/LoginScreen'
import { ManagementStockView } from './components/ManagementStockView'
import { PrintLabelsView } from './components/PrintLabelsView'
import { ScanFlowView } from './components/ScanFlowView'
import { ADMIN_DEFAULT, Shell, STAFF_DEFAULT, type View } from './components/Shell'
import { useApp } from './context/AppContext'
import { AppProvider } from './context/AppProvider'

function AppRoutes() {
  const { currentUser, isManagement } = useApp()
  const [view, setView] = useState<View>(STAFF_DEFAULT)
  const [selectedBagId, setSelectedBagId] = useState<string | null>(null)

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
      {view === 'cds' && isManagement && <ControlledDrugsView onOpenBag={openBag} />}
      {view === 'activity' && isManagement && <ActivityView />}
      {view === 'formulary' && isManagement && <FormularyView />}
    </Shell>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  )
}
