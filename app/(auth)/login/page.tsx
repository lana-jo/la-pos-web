'use client'
import { useState } from 'react'
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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { theme, setTheme } = useProfileTheme()

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

      // Jika sukses, cookie sudah otomatis terpasang oleh server!
      toast.success('Login berhasil!', { duration: 3000 })

      // Penting: Refresh router agar Next.js membaca status cookie terbaru
      // Middleware akan otomatis redirect ke halaman yang sesuai berdasarkan role
      router.refresh() 

      // Tunggu sebentar lalu redirect ke root, middleware akan handle redirect berdasarkan role
      setTimeout(() => {
        router.push('/')
      }, 1500)

    } catch (err) {
      toast.error('Terjadi kesalahan saat login')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center pos-terminal p-4">
      <div className="absolute top-4 right-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10">
              {theme === 'light' ? <Sun className="h-5 w-5" /> : theme === 'dark' ? <Moon className="h-5 w-5" /> : <Laptop className="h-5 w-5" />}
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
            }}>Light</DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              console.log(`[THEME] Login page theme button clicked:`, {
                theme: 'dark',
                source: 'login_page',
                timestamp: new Date().toISOString()
              });
              setTheme('dark');
            }}>Dark</DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              console.log(`[THEME] Login page theme button clicked:`, {
                theme: 'system',
                source: 'login_page',
                timestamp: new Date().toISOString()
              });
              setTheme('system');
            }}>System</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Card className="w-full max-w-md pos-modal-content border-none shadow-2xl">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="w-12 h-12 bg-primary-brand rounded-full flex items-center justify-center mb-4 shadow-lg">
            <Store className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">POS System Login</CardTitle>
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
              <Label htmlFor="password" title="password" className="pos-form-label">Password</Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Masukkan password"
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
