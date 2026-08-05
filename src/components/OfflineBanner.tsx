import { Cloud, CloudOff, RefreshCw, Wifi } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useOnlineStatus } from '../lib/offline'
import { isSupabaseSyncEnabled } from '../lib/supabase'

export function OfflineBanner() {
  const online = useOnlineStatus()
  const { state, flushSyncQueue, isManagement } = useApp()
  const pending = state.pendingSync.length

  if (online && pending === 0 && !state.sandboxMode && !isSupabaseSyncEnabled) return null
  if (online && pending === 0 && !state.sandboxMode && isSupabaseSyncEnabled && !isManagement) {
    // Staff: stay quiet unless offline / sandbox
    if (!state.sandboxMode) return null
  }

  return (
    <div className="mb-4 space-y-2">
      {state.sandboxMode && (
        <div className="rounded-lg border border-amber/40 bg-amber-soft/70 px-3 py-2 text-sm font-semibold text-ink">
          Training / sandbox mode — fake stock only. Live CDs are untouched. (Not synced to Supabase.)
        </div>
      )}
      {!online && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-coral/30 bg-coral-soft/50 px-3 py-2 text-sm text-ink">
          <CloudOff size={16} className="text-coral" />
          <span className="font-semibold">Offline field mode</span>
          <span className="text-ink-soft">Actions are saved locally and queued for sync.</span>
        </div>
      )}
      {online && pending > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-sea/30 bg-mint/60 px-3 py-2 text-sm">
          <Wifi size={16} className="text-sea" />
          <span className="font-semibold">{pending} offline action{pending > 1 ? 's' : ''} ready to sync</span>
          <button
            type="button"
            onClick={flushSyncQueue}
            className="inline-flex items-center gap-1 rounded-lg bg-sea px-3 py-1 text-xs font-bold text-mint"
          >
            <RefreshCw size={12} /> Sync now
          </button>
        </div>
      )}
      {online && isSupabaseSyncEnabled && isManagement && !state.sandboxMode && pending === 0 && (
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-soft/70">
          <Cloud size={12} className="text-sea" />
          <span>
            Supabase sync on
            {state.lastSyncedAt ? ` · last sync ${new Date(state.lastSyncedAt).toLocaleString()}` : ''}
          </span>
        </div>
      )}
    </div>
  )
}
