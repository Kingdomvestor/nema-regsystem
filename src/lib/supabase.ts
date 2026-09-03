// The single Supabase browser client. The anon key is safe to ship — RLS
// (migration 0002) is what actually protects the data. The service_role key is
// never referenced here or anywhere in the bundle.
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Missing Supabase config. Copy .env.example to .env and set ' +
      'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (Dashboard → Project Settings → API).',
  )
}

export const supabase = createClient(url, anonKey)
