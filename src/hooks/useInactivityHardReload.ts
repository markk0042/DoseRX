import { useEffect } from 'react'

const LIVE_KEY = 'doserx-v5-live'
const SANDBOX_KEY = 'doserx-v5-sandbox'
const DEFAULT_MS = 10 * 60 * 1000

function clearDemoSession() {
  for (const key of [LIVE_KEY, SANDBOX_KEY]) {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const data = JSON.parse(raw) as { currentUserId?: string | null }
      data.currentUserId = null
      localStorage.setItem(key, JSON.stringify(data))
    } catch {
      /* ignore */
    }
  }
}

/** After `ms` with no pointer/keyboard activity, hard-refresh the demo (and clear login). */
export function useInactivityHardReload(ms = DEFAULT_MS) {
  useEffect(() => {
    let timer = 0

    const hardReload = () => {
      clearDemoSession()
      const url = new URL(window.location.href)
      url.searchParams.set('_r', String(Date.now()))
      window.location.replace(url.toString())
    }

    const bump = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(hardReload, ms)
    }

    const events: (keyof WindowEventMap)[] = [
      'mousedown',
      'mousemove',
      'keydown',
      'touchstart',
      'scroll',
      'click',
      'visibilitychange',
    ]

    events.forEach((name) => window.addEventListener(name, bump, { passive: true }))
    bump()

    return () => {
      window.clearTimeout(timer)
      events.forEach((name) => window.removeEventListener(name, bump))
    }
  }, [ms])
}
