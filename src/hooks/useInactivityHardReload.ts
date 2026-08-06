import { useEffect } from 'react'

const LIVE_KEY = 'doserx-v6-live'
const SANDBOX_KEY = 'doserx-v6-sandbox'
const DEFAULT_MS = 10 * 60 * 1000

function clearDemoSession() {
  try {
    localStorage.removeItem(LIVE_KEY)
    localStorage.removeItem(SANDBOX_KEY)
  } catch {
    /* ignore */
  }
}

export function isTryDemoUrl(href = window.location.href) {
  const url = new URL(href)
  const demo = url.searchParams.get('demo')
  const tryParam = url.searchParams.get('try')
  return demo === '1' || demo === 'true' || tryParam === '1' || tryParam === 'demo'
}

/** After `ms` with no pointer/keyboard activity, hard-refresh the demo. */
export function useInactivityHardReload(ms = DEFAULT_MS, enabled = true) {
  useEffect(() => {
    if (!enabled) return

    let timer = 0

    const hardReload = () => {
      clearDemoSession()
      const url = new URL(window.location.href)
      // Keep public try-demo entry so reload stays PIN-free
      if (isTryDemoUrl(url.toString())) {
        url.search = '?demo=1'
      } else {
        url.search = ''
      }
      url.hash = ''
      url.searchParams.set('_r', String(Date.now()))
      window.location.replace(url.toString())
    }

    const bump = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(hardReload, ms)
    }

    const windowEvents: (keyof WindowEventMap)[] = [
      'mousedown',
      'mousemove',
      'keydown',
      'touchstart',
      'scroll',
      'click',
    ]

    windowEvents.forEach((name) => window.addEventListener(name, bump, { passive: true }))
    // Document event — must not be typed as keyof WindowEventMap (Vercel tsc failed)
    document.addEventListener('visibilitychange', bump, { passive: true })
    bump()

    return () => {
      window.clearTimeout(timer)
      windowEvents.forEach((name) => window.removeEventListener(name, bump))
      document.removeEventListener('visibilitychange', bump)
    }
  }, [ms, enabled])
}
