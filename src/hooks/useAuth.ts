import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Profile } from '@/integrations/supabase/types'
import { supabase } from '@/integrations/supabase/client'

export interface AuthContextType {
  session: Session | null
  profile: Profile | null
  loading: boolean
  isAdmin: boolean  // true for admin AND master
  isMaster: boolean // true only for master
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType>({
  session: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isMaster: false,
  signOut: async () => {},
  refreshProfile: async () => {},
})

export async function fetchProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) { console.error('[useAuth] fetchProfile error:', error); return null }
    return data
  } catch (e) {
    console.error('[useAuth] fetchProfile threw:', e)
    return null
  }
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  return {
    ...ctx,
    user: ctx.session?.user ?? null,
  }
}
