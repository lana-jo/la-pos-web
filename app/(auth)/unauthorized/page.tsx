'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldX, ArrowLeft } from 'lucide-react'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen pos-terminal flex items-center justify-center px-4">
      <Card className="w-full max-w-md pos-modal-content border-none shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 shadow-inner">
            <ShieldX className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">Akses Ditolak</CardTitle>
          <CardDescription>
            Anda tidak memiliki izin untuk mengakses halaman ini.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="bg-muted/50 p-4 rounded-lg border border-border/50">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Silakan hubungi administrator anda jika anda merasa ini adalah kesalahan atau jika anda memerlukan hak akses tambahan.
            </p>
          </div>
          <div className="space-y-3">
            <Button asChild className="w-full pos-button-primary h-12 shadow-md">
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali ke Beranda
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full h-12 border-primary-brand text-primary-brand hover:bg-primary/5 transition-colors">
              <Link href="/catalog">
                Lihat Katalog Produk
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
