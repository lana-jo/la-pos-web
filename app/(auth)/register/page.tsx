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
import { ThemeToggle } from '@/components/ui/theme-toggle'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Daftar Akun Baru</CardTitle>
          <CardDescription>
            Buat akun customer untuk mengakses katalog produk
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nama Lengkap</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="customer@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Minimal 6 karakter"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
              <PasswordInput
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Ulangi password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Mendaftar...' : 'Daftar'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Sudah punya akun?{' '}
              <button
                onClick={() => router.push('/login')}
                className="text-primary hover:underline"
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
