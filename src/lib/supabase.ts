import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Keys present in env (project exists) */
export const isSupabaseConfigured = Boolean(url && anonKey)

/**
 * When false (default), Try now / demo stays local-only:
 * no cloud hydrate, no DB writes, no photo uploads.
 * Set VITE_SUPABASE_SYNC_ENABLED=true when you go live.
 */
export const isSupabaseSyncEnabled =
  isSupabaseConfigured && String(import.meta.env.VITE_SUPABASE_SYNC_ENABLED).toLowerCase() === 'true'

/** Browser client — null until .env.local is filled */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null

export async function pingSupabase(): Promise<{ ok: boolean; message: string }> {
  if (!supabase) {
    return {
      ok: false,
      message: 'Supabase not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local',
    }
  }
  if (!isSupabaseSyncEnabled) {
    return {
      ok: true,
      message: 'Supabase keys present, but sync is OFF (local demo only). Set VITE_SUPABASE_SYNC_ENABLED=true to go live.',
    }
  }
  const { error } = await supabase.from('staff').select('id').limit(1)
  if (error) {
    return { ok: false, message: error.message }
  }
  return { ok: true, message: 'Connected to Supabase (sync on)' }
}

