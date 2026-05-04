'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, LogIn } from 'lucide-react'

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Authentication error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            Authentication Error
          </CardTitle>
          <CardDescription className="text-base">
            Terjadi kesalahan pada sistem autentikasi. Silakan login kembali.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm text-muted-foreground">
              <strong>Error ID:</strong> {error.digest || 'unknown'}
            </p>
            {process.env.NODE_ENV === 'development' && error.message && (
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                {error.message}
              </p>
            )}
          </div>

          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
            <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
              🔐 Sesi Anda mungkin telah kadaluarsa
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
              onClick={() => window.location.href = '/(auth)/login'}
              variant="outline"
              className="w-full"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Login Kembali
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Jika masalah berlanjut, hubungi administrator sistem.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
