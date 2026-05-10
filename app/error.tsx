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
    <div className="min-h-screen pos-terminal flex items-center justify-center p-4">
      <Card className="w-full max-w-md pos-modal-content border-none shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4 shadow-inner">
            <Bug className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">
            Terjadi Kesalahan
          </CardTitle>
          <CardDescription className="text-base">
            Aplikasi mengalami kesalahan yang tidak terduga.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Error Details:</p>
            <p className="text-sm text-muted-foreground">
              <strong>Digest ID:</strong> {error.digest || 'unknown'}
            </p>
            {process.env.NODE_ENV === 'development' && error.message && (
              <div className="mt-3 p-3 bg-destructive/10 rounded-lg text-destructive text-xs font-mono break-all border border-destructive/20">
                {error.message}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Button 
              onClick={reset}
              className="w-full pos-button-primary h-12 shadow-md"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Coba Lagi
            </Button>
            
            <Button 
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.href = '/';
                }
              }}
              variant="outline"
              className="w-full h-12 border-primary-brand text-primary-brand hover:bg-primary/5 transition-colors"
            >
              <Home className="w-4 h-4 mr-2" />
              Kembali ke Beranda
            </Button>
          </div>

          <div className="text-center pt-2">
            <p className="text-xs text-muted-foreground italic">
              Maaf atas ketidaknyamanan ini. Tim kami telah diberitahu.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
