'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold text-destructive">
            500 - Server Error
          </CardTitle>
          <CardDescription className="text-base">
            Terjadi kesalahan internal pada server. Tim kami telah diberitahu dan sedang memperbaikinya.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm text-muted-foreground">
              <strong>Error ID:</strong> {error.digest || 'unknown'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Silakan hubungi tim dukungan dengan ID error ini jika masalah berlanjut.
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
              Masalah ini tidak disebabkan oleh tindakan Anda.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Mohon tunggu beberapa saat dan coba lagi.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
