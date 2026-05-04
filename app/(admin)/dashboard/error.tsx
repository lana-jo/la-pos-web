'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, LayoutDashboard } from 'lucide-react'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Admin dashboard error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-600 dark:text-red-400">
            Admin Dashboard Error
          </CardTitle>
          <CardDescription className="text-base">
            Terjadi kesalahan pada dashboard admin. Silakan coba lagi.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm text-muted-foreground">
              <strong>Error ID:</strong> {error.digest || 'unknown'}
            </p>
            {process.env.NODE_ENV === 'development' && error.message && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {error.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              onClick={reset}
              className="w-full"
              variant="default"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Dashboard
            </Button>
            
            <Button 
              onClick={() => window.location.href = '/(admin)/dashboard'}
              variant="outline"
              className="w-full"
            >
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Kembali ke Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
