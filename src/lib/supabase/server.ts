import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { cookies } from 'next/headers'

export const createServerClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  })
}

export const getServerSession = async () => {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}
