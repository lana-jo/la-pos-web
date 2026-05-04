'use client'

import { ReactNode, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import type { Database } from '@/types/database'

export default function CashierPOSlayout({
  children
}: {
  children: ReactNode
}) {
  const [userRole, setUserRole] = useState<'admin' | 'cashier' | 'customer'>('cashier')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single() as { data: { role: 'admin' | 'cashier' | 'customer' } | null, error: any }
          
          if (profile) {
            setUserRole(profile.role)
          }
        }
      } catch (error) {
        console.error('Error fetching user role:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserRole()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <DashboardLayout
      title="POS Terminal"
      subtitle="Point of Sale System"
      userRole={userRole}
      badgeText={userRole === 'admin' ? 'Administrator' : 'Cashier'}
      showSidebar={true}
    >
      {children}
    </DashboardLayout>
  )
}