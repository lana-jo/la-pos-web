'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { loginWithCookie } from '@/lib/auth/actions' 
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Store, Loader2, Sun, Moon, Laptop } from 'lucide-react'
import { useProfileTheme } from '@/hooks/useProfileTheme'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function LoginPage() {
  const [mounted, setMounted] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const router = useRouter()
  const { theme, setTheme } = useProfileTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Panggil Server Action
      const result = await loginWithCookie(email, password)

      if (!result.success) {
        toast.error(result.error)
        setLoading(false)
        return
      }

      // Jika sukses
      setRedirecting(true)
      toast.success('Login berhasil! Mengalihkan...', { duration: 3000 })

      // Penting: Refresh router agar Next.js membaca status cookie terbaru
      router.refresh() 

      // Tunggu sebentar lalu redirect ke root
      setTimeout(() => {
        router.push('/')
      }, 1000)

    } catch (err) {
      toast.error('Terjadi kesalahan saat login')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center pos-terminal p-4">
      {redirecting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-xl font-semibold text-foreground">Sedang masuk ke sistem...</p>
        </div>
      )}
      <div className="absolute top-4 right-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10">
              {!mounted ? (
                <div className="h-5 w-5" />
              ) : theme === 'light' ? (
                <Sun className="h-5 w-5" />
              ) : theme === 'dark' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Laptop className="h-5 w-5" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {
              console.log(`[THEME] Login page theme button clicked:`, {
                theme: 'light',
                source: 'login_page',
                timestamp: new Date().toISOString()
              });
              setTheme('light');
            }}>Terang</DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              console.log(`[THEME] Login page theme button clicked:`, {
                theme: 'dark',
                source: 'login_page',
                timestamp: new Date().toISOString()
              });
              setTheme('dark');
            }}>Gelap</DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              console.log(`[THEME] Login page theme button clicked:`, {
                theme: 'system',
                source: 'login_page',
                timestamp: new Date().toISOString()
              });
              setTheme('system');
            }}>Sistem</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Card className="w-full max-w-md pos-modal-content border-none shadow-2xl">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="w-12 h-12 bg-primary-brand rounded-full flex items-center justify-center mb-4 shadow-lg">
            <Store className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">Login Sistem POS</CardTitle>
          <CardDescription className="text-center">
            Masukkan kredensial Anda untuk mengakses sistem
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="pos-form-label">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@example.com"
                disabled={loading}
                className="pos-form-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" title="password" className="pos-form-label">Kata Sandi</Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Masukkan kata sandi"
                disabled={loading}
                className="pos-form-input"
              />
            </div>
            <Button type="submit" className="w-full pos-button-primary h-12" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Masuk...
                </>
              ) : 'Masuk'}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Belum punya akun?{' '}
              <button
                onClick={() => router.push('/register')}
                className="text-primary font-semibold hover:underline"
                disabled={loading}
              >
                Daftar di sini
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
