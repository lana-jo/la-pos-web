'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

export type UserRole = 'admin' | 'cashier' | 'customer'

export function useUserRole() {
  const [userRole, setUserRole] = useState<UserRole>('customer')
  const [user, setUser] = useState<User | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialRole = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          setUser(session.user)
          
          // Get user role and full_name from profiles table
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('role, full_name')
            .eq('id', session.user.id)
            .single() as { data: Pick<Profile, 'role' | 'full_name'> | null, error: Error | null }
          
          if (profile && !error) {
            setUserRole(profile.role as UserRole)
            setUserName(profile.full_name || '')
          }
        }
      } catch (error) {
        console.error('Error getting user role:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialRole()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (session?.user) {
          setUser(session.user)
          
          // Get updated role and full_name from profiles
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('role, full_name')
            .eq('id', session.user.id)
            .single() as { data: Pick<Profile, 'role' | 'full_name'> | null, error: Error | null }
          
          if (profile && !error) {
            setUserRole(profile.role as UserRole)
            setUserName(profile.full_name || '')
          }
        } else {
          setUser(null)
          setUserRole('customer')
          setUserName('')
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { userRole, user, userName, loading }
}
