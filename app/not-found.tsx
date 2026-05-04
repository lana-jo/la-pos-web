import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Home, Package } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            404 - Halaman Tidak Ditemukan
          </CardTitle>
          <CardDescription className="text-base">
            Halaman yang Anda cari tidak ada atau telah dipindahkan.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium text-sm mb-2">Apa yang bisa Anda lakukan:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Periksa kembali URL yang Anda ketik</li>
              <li>• Gunakan menu navigasi untuk menemukan halaman</li>
              <li>• Kembali ke beranda dan mulai dari sana</li>
              <li>• Hubungi admin jika Anda yakin halaman ini seharusnya ada</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <Link href="/" className="w-full">
              <Button variant="default" className="w-full">
                <Home className="w-4 h-4 mr-2" />
                Kembali ke Beranda
              </Button>
            </Link>
            
            <Link href="/(customer)/catalog" className="w-full">
              <Button variant="outline" className="w-full">
                <Package className="w-4 h-4 mr-2" />
                Lihat Katalog Produk
              </Button>
            </Link>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Jika Anda mengikuti link dari email atau website lain,
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              mungkin link tersebut sudah tidak berlaku.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
