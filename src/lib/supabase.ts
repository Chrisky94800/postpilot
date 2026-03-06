// PostPilot — Client Supabase (singleton)
// Un seul client initialisé ici, utilisé partout dans l'app.

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY manquantes dans .env',
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persistance de la session dans localStorage
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
