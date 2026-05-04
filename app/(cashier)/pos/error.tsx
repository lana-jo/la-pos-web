'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Terminal } from 'lucide-react'

export default function PosError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('POS terminal error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            POS Terminal Error
          </CardTitle>
          <CardDescription className="text-base">
            Terjadi kesalahan pada sistem POS. Mohon segera hubungi supervisor.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm text-muted-foreground">
              <strong>Error ID:</strong> {error.digest || 'unknown'}
            </p>
            {process.env.NODE_ENV === 'development' && error.message && (
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                {error.message}
              </p>
            )}
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm font-medium text-red-700 dark:text-red-300">
              ⚠️ Penting: Catat Error ID untuk laporan supervisor
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              onClick={reset}
              className="w-full"
              variant="default"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Coba Kembali
            </Button>
            
            <Button 
              onClick={() => window.location.href = '/(cashier)/pos'}
              variant="outline"
              className="w-full"
            >
              <Terminal className="w-4 h-4 mr-2" />
              Restart POS Terminal
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Jika masalah berlanjut, gunakan terminal cadangan atau hubungi IT support.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
