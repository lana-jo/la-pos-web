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
import { ThemeToggle } from '@/components/ui/theme-toggle'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>POS System Login</CardTitle>
          <CardDescription>
            Masukkan kredensial Anda untuk mengakses sistem
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@example.com"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Masukkan password"
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Masuk...' : 'Masuk'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Belum punya akun?{' '}
              <button
                onClick={() => router.push('/register')}
                className="text-primary hover:underline"
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
