import { useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { Profile } from '@/integrations/supabase/types'

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (fetchError) {
      setError(fetchError.message)
    } else {
      setProfile(data)
    }
    setLoading(false)
  }, [userId])

  const updateProfile = useCallback(
    async (updates: Partial<Profile>) => {
      if (!userId) return
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId)
      if (!updateError) {
        setProfile(prev => (prev ? { ...prev, ...updates } : prev))
      }
      return updateError
    },
    [userId]
  )

  return { profile, loading, error, fetchProfile, updateProfile, setProfile }
}
