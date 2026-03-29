import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[FitCoach] Supabase env missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local — auth and data features stay disabled until then.'
  )
}

function supabaseFetch(url, options = {}) {
  return fetch(url, options).catch((err) => {
    const msg = err?.message || ''
    if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')) {
      throw new Error(
        'Network error. Check: 1) Internet connection 2) Supabase project not paused (open Dashboard) 3) VPN/firewall not blocking Supabase'
      )
    }
    throw err
  })
}

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      global: { fetch: supabaseFetch },
    })
  : null

