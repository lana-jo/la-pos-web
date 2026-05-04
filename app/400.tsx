'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, ArrowLeft, Home } from 'lucide-react'

export default function BadRequest() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            400 - Bad Request
          </CardTitle>
          <CardDescription className="text-base">
            Permintaan yang Anda kirim tidak valid atau tidak dapat diproses.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium text-sm mb-2">Kemungkinan penyebab:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Format data yang dikirim tidak sesuai</li>
              <li>• Parameter yang diperlukan hilang</li>
              <li>• Akses ke halaman yang tidak diizinkan</li>
              <li>• Session telah kadaluarsa</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              onClick={() => window.history.back()}
              variant="default"
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali ke Halaman Sebelumnya
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
              Periksa kembali data yang Anda masukkan dan coba lagi.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Jika masalah berlanjut, hubungi tim dukungan kami.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
