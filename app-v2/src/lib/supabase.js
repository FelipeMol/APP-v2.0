import { createClient } from '@supabase/supabase-js'

// Credenciais do Supabase (apenas a publishable key vai no frontend)
const SUPABASE_URL    = 'https://zkjrghjwnalfhzprsrpc.supabase.co'
const SUPABASE_ANON   = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_JjS4xfCV-i7B3orHHNi0bw_ALiM2e-5'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

export default supabase
