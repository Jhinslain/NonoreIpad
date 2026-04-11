import { createClient } from '@supabase/supabase-js'

/** URL du projet (dashboard → Project Settings → API). */
const url = import.meta.env.VITE_SUPABASE_URL || ''
/**
 * Clé publique : `anon` JWT **ou** clé « publishable » (dashboard Supabase récent).
 * Voir `.env.example`.
 */
const anonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  ''

const noopChannel = {
  on: () => ({
    subscribe: () => ({
      unsubscribe: () => {},
    }),
  }),
}

/**
 * Client minimal si les variables d’environnement manquent (mode démo local).
 */
const fallbackClient = {
  from: () => ({
    select: async () => ({ data: [], error: null }),
    insert: async () => ({ error: new Error('Supabase non configuré') }),
    update: async () => ({ error: new Error('Supabase non configuré') }),
  }),
  storage: {
    from: () => ({
      upload: async () => ({ error: new Error('Supabase non configuré') }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
    }),
  },
  channel: () => noopChannel,
  removeChannel: () => {},
}

export const supabase =
  url && anonKey ? createClient(url, anonKey) : fallbackClient

export function isSupabaseConfigured() {
  return Boolean(url && anonKey)
}
