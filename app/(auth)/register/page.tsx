'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Store, Loader2, UserPlus, Sun, Moon, Laptop } from 'lucide-react'
import { useProfileTheme } from '@/hooks/useProfileTheme'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { theme, setTheme } = useProfileTheme()

  const handleRegister = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)

  try {
    if (password !== confirmPassword) {
      toast.error('Password tidak cocok')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      toast.error('Password minimal 6 karakter')
      setLoading(false)
      return
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    })

    if (authError) {
      toast.error('Gagal membuat akun: ' + authError.message)
      setLoading(false)
      return
    }

    // ✅ Supabase returns a user but with empty identities for duplicate emails
    if (authData.user && authData.user.identities?.length === 0) {
      toast.error('Email sudah terdaftar. Silakan gunakan email lain atau login.')
      setLoading(false)
      return
    }

    if (authData.user) {
      // Create profile record for customer
      try {
        const response = await fetch('/api/auth/create-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: authData.user.id, 
            fullName: fullName,
            email: email 
          })
        })
        
        if (!response.ok) {
          console.error('Profile creation failed, but user was created')
        }
      } catch (profileError) {
        console.error('Error creating profile:', profileError)
      }

      toast.success('Akun berhasil dibuat! Silakan Cek email verifikasi, lalu login.')
      setTimeout(() => {
        router.push('/login')
      }, 2000)
      // Note: don't setLoading(false) here — keep button disabled during redirect
    }
  } catch (err) {
    toast.error('Terjadi kesalahan saat membuat akun')
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
              console.log(`[THEME] Register page theme button clicked:`, {
                theme: 'light',
                source: 'register_page',
                timestamp: new Date().toISOString()
              });
              setTheme('light');
            }}>Terang</DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              console.log(`[THEME] Register page theme button clicked:`, {
                theme: 'dark',
                source: 'register_page',
                timestamp: new Date().toISOString()
              });
              setTheme('dark');
            }}>Gelap</DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              console.log(`[THEME] Register page theme button clicked:`, {
                theme: 'system',
                source: 'register_page',
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
            <UserPlus className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">Daftar Akun Baru</CardTitle>
          <CardDescription className="text-center">
            Buat akun pelanggan untuk mengakses katalog produk
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="pos-form-label">Nama Lengkap</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="John Doe"
                className="pos-form-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="pos-form-label">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="customer@example.com"
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
                placeholder="Minimal 6 karakter"
                className="pos-form-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" title="confirmPassword" className="pos-form-label">Konfirmasi Kata Sandi</Label>
              <PasswordInput
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Ulangi kata sandi"
                className="pos-form-input"
              />
            </div>
            <Button type="submit" className="w-full pos-button-primary h-12" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mendaftar...
                </>
              ) : 'Daftar'}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Sudah punya akun?{' '}
              <button
                onClick={() => router.push('/login')}
                className="text-primary font-semibold hover:underline"
              >
                Login di sini
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
