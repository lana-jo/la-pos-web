'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
            <Bug className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-600 dark:text-red-400">
            Terjadi Kesalahan
          </CardTitle>
          <CardDescription className="text-base">
            Aplikasi mengalami kesalahan yang tidak terduga.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm text-muted-foreground">
              <strong>Error ID:</strong> {error.digest || 'unknown'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {process.env.NODE_ENV === 'development' && error.message && (
                <span className="block mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-red-700 dark:text-red-300">
                  {error.message}
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              onClick={reset}
              className="w-full"
              variant="default"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Coba Lagi
            </Button>
            
            <Button 
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="w-full"
            >
              <Home className="w-4 h-4 mr-2" />
              Kembali ke Beranda
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Maaf atas ketidaknyamanan ini.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Jika masalah berlanjut, silakan hubungi tim dukungan kami.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
