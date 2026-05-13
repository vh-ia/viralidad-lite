import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import type { Profile } from '@/integrations/supabase/types'
import { AuthContext, fetchProfile } from '@/hooks/useAuth'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fast path: read session from localStorage (no network needed if token is fresh).
    // Sets loading=false immediately — profile loads in the background.
    supabase.auth.getSession().then(({ data: { session: s }, error }) => {
      console.log('[AuthProvider] getSession:', { hasSession: !!s, error })
      if (error) {
        console.error('[AuthProvider] getSession error:', error)
        setSession(null)
        setLoading(false)
        return
      }
      setSession(s)
      setLoading(false) // ← unblock UI immediately
      if (s?.user) {
        fetchProfile(s.user.id).then(setProfile)
      }
    })

    // Ongoing auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, s) => {
        console.log('[AuthProvider] onAuthStateChange:', event, !!s)
        setSession(s)
        setLoading(false)
        if (s?.user) {
          fetchProfile(s.user.id).then(setProfile)
        } else {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const refreshProfile = async () => {
    if (session?.user) {
      const p = await fetchProfile(session.user.id)
      setProfile(p)
    }
  }

  const isMaster = profile?.role === 'master'
  const isAdmin = profile?.role === 'admin' || isMaster

  return (
    <AuthContext.Provider value={{ session, profile, loading, isAdmin, isMaster, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
