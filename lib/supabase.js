// lib/supabase.js
// Instância única do cliente Supabase usada em todo o projeto.
// Importe assim: import { sb } from '@/lib/supabase'

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const sb = createClient(url, key)
