'use client'

import { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { logout } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { LogOut, Store } from 'lucide-react'
import { toast } from 'sonner'

interface DashboardHeaderProps {
  title: string
  subtitle: string
  badgeText?: string
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline'
  onLogout?: () => void
  showLogout?: boolean
  children?: ReactNode
}

export default function DashboardHeader({
  title,
  subtitle,
  badgeText,
  badgeVariant = 'default',
  onLogout,
  showLogout = true,
  children
}: DashboardHeaderProps) {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      const result = await logout()
      if (!result.success) {
        toast.error(result.error || 'Gagal logout')
        return
      }
      toast.success('Logout berhasil')
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Terjadi kesalahan saat logout')
    }
  }

  const logoutFunction = onLogout || handleLogout
  return (
    <header className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <Store className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-foreground">{title}</h1>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {children}
            <ThemeToggle />
            {badgeText && (
              <Badge variant={badgeVariant}>{badgeText}</Badge>
            )}
            {showLogout && (
              <Button variant="outline" size="sm" onClick={logoutFunction}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
