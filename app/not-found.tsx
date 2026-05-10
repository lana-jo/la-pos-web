import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Home, Package } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen pos-terminal flex items-center justify-center p-4">
      <Card className="w-full max-w-md pos-modal-content border-none shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4 shadow-inner">
            <Search className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">
            404 - Halaman Tidak Ditemukan
          </CardTitle>
          <CardDescription className="text-base">
            Halaman yang Anda cari tidak ada atau telah dipindahkan.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
            <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-3">Apa yang bisa Anda lakukan:</h4>
            <ul className="text-sm text-foreground/80 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span>Periksa kembali URL yang Anda ketik</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span>Gunakan menu navigasi untuk menemukan halaman</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span>Kembali ke beranda dan mulai dari sana</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <Link href="/" className="w-full">
              <Button variant="default" className="w-full pos-button-primary h-12 shadow-md">
                <Home className="w-4 h-4 mr-2" />
                Kembali ke Beranda
              </Button>
            </Link>
            
            <Link href="/catalog" className="w-full">
              <Button variant="outline" className="w-full h-12 border-primary-brand text-primary-brand hover:bg-primary/5 transition-colors">
                <Package className="w-4 h-4 mr-2" />
                Lihat Katalog Produk
              </Button>
            </Link>
          </div>

          <div className="text-center pt-2">
            <p className="text-xs text-muted-foreground italic">
              Jika Anda memerlukan bantuan, silakan hubungi tim IT kami.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
