'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, ShoppingBag } from 'lucide-react'

export default function CustomerError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Customer catalog error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            Katalog Error
          </CardTitle>
          <CardDescription className="text-base">
            Terjadi kesalahan saat memuat katalog produk. Silakan coba lagi.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm text-muted-foreground">
              <strong>Error ID:</strong> {error.digest || 'unknown'}
            </p>
            {process.env.NODE_ENV === 'development' && error.message && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
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
              Refresh Katalog
            </Button>
            
            <Button 
              onClick={() => window.location.href = '/(customer)/catalog'}
              variant="outline"
              className="w-full"
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Kembali ke Katalog
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Mohon maaf atas ketidaknyamanan ini.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
