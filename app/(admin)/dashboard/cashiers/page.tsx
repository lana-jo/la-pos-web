'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Plus, Edit, Trash2, User, X, Eye, EyeOff, Package } from 'lucide-react'
import DashboardHeader from '@/components/layout/DashboardHeader'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { toast } from 'sonner'

// Types
interface Cashier {
  id: string
  full_name: string | null
  email: string
  is_active: boolean
  created_at: string
}

type FormData = {
  full_name: string
  email: string
  password: string
  pin: string
  is_active: boolean
}

const EMPTY_FORM: FormData = {
  full_name: '',
  email: '',
  password: '',
  pin: '',
  is_active: true,
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string) => supabase.from(table) as any

// Modal Component
function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg border p-6 w-full max-w-md max-h-[95vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  )
}

// Form Fields Component
function CashierFormFields({
  formData,
  setFormData,
  isSubmitting,
  idPrefix = '',
  showPassword,
  setShowPassword,
  showPin,
  setShowPin,
}: {
  formData: FormData
  setFormData: (data: FormData) => void
  isSubmitting: boolean
  idPrefix?: string
  showPassword: boolean
  setShowPassword: (show: boolean) => void
  showPin: boolean
  setShowPin: (show: boolean) => void
}) {
  const field = (key: string) => `${idPrefix}${key}`

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor={field('full_name')}>Nama Lengkap *</Label>
        <Input
          id={field('full_name')}
          value={formData.full_name}
          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          placeholder="Masukkan nama lengkap"
          disabled={isSubmitting}
        />
      </div>

      <div>
        <Label htmlFor={field('email')}>Email *</Label>
        <Input
          id={field('email')}
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="cashier@example.com"
          disabled={isSubmitting}
        />
      </div>

      <div>
        <Label htmlFor={field('password')}>Password *</Label>
        <div className="relative">
          <Input
            id={field('password')}
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Masukkan password"
            disabled={isSubmitting}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div>
        <Label htmlFor={field('pin')}>PIN *</Label>
        <div className="relative">
          <Input
            id={field('pin')}
            type={showPin ? 'text' : 'password'}
            value={formData.pin}
            onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
            placeholder="Masukkan 4 digit PIN"
            maxLength={4}
            disabled={isSubmitting}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPin(!showPin)}
          >
            {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={field('is_active')}
          checked={formData.is_active}
          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
          disabled={isSubmitting}
        />
        <Label htmlFor={field('is_active')}>Aktif</Label>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'

export default function CashiersPage() {
  const router = useRouter()

  const [cashiers, setCashiers] = useState<Cashier[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [modal, setModal] = useState<'add' | 'edit' | 'delete' | null>(null)
  const [selectedCashier, setSelectedCashier] = useState<Cashier | null>(null)
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM)
  const [showPassword, setShowPassword] = useState(false)
  const [showPin, setShowPin] = useState(false)

  // Auth guard
  const checkUserRole = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: profile, error } = await db('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle()

      if (error || !profile) { router.push('/login'); return }

      if (profile.role !== 'admin') {
        toast.error('Akses ditolak: Hanya admin yang dapat mengakses halaman ini')
        router.push('/auth/unauthorized')
      }
    } catch {
      router.push('/login')
    }
  }, [router])

  // Data fetching
  const fetchCashiers = useCallback(async () => {
    try {
      const { data, error } = await db('profiles')
        .select('id, full_name, created_at')
        .eq('role', 'cashier')
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Get emails from auth.users for each cashier
      const cashiersWithEmails = await Promise.all(
        (data || []).map(async (profile: { id: string; full_name: string | null; created_at: string }) => {
          const { data: userData } = await supabase.auth.admin.getUserById(profile.id)
          return {
            ...profile,
            email: userData?.user?.email || '',
            is_active: true // Default to active since profiles table doesn't have this column
          }
        })
      )
      
      setCashiers(cashiersWithEmails)
    } catch (error) {
      console.error('Error fetching cashiers:', error)
      toast.error('Gagal mengambil data kasir')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkUserRole()
    fetchCashiers()
  }, [checkUserRole, fetchCashiers])

  // Helpers
  const isFormValid = !!(
    formData.full_name.trim() &&
    formData.email.trim() &&
    formData.password &&
    formData.pin.length === 4
  )

  const closeModal = () => {
    setModal(null)
    setSelectedCashier(null)
    setFormData(EMPTY_FORM)
    setShowPassword(false)
    setShowPin(false)
  }

  const buildPayload = () => ({
    full_name: formData.full_name.trim(),
    email: formData.email.trim(),
    password: formData.password,
    pin: formData.pin,
    is_active: formData.is_active,
  })

  // CRUD operations
  const handleAdd = async () => {
    if (!isFormValid) {
      toast.error('Nama, email, password, dan PIN 4 digit harus diisi')
      return
    }

    setIsSubmitting(true)
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
          }
        }
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Gagal membuat user')

      // Create profile with cashier role and PIN
      const { error: profileError } = await supabase.auth.admin.updateUserById(
        authData.user.id,
        { 
          user_metadata: { role: 'cashier' },
          app_metadata: { role: 'cashier' }
        }
      )

      if (profileError) throw profileError

      // Store PIN hash in profiles table
      const { error: insertError } = await db('profiles')
        .insert({
          id: authData.user.id,
          full_name: formData.full_name,
          role: 'cashier',
          pin_hash: formData.pin, // In production, this should be hashed
        })

      if (insertError) throw insertError

      toast.success('Kasir berhasil ditambahkan')
      closeModal()
      fetchCashiers()
    } catch (error) {
      console.error('Error adding cashier:', error)
      toast.error('Gagal menambahkan kasir')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedCashier) return

    setIsSubmitting(true)
    try {
      // Update email in auth.users if provided
      if (formData.email.trim() !== selectedCashier.email) {
        const { error: emailError } = await supabase.auth.admin.updateUserById(
          selectedCashier.id,
          { email: formData.email.trim() }
        )
        if (emailError) throw emailError
      }

      // Update password if provided
      if (formData.password) {
        const { error: passwordError } = await supabase.auth.admin.updateUserById(
          selectedCashier.id,
          { password: formData.password }
        )
        if (passwordError) throw passwordError
      }

      // Update profile
      const profileUpdates: any = {
        full_name: formData.full_name.trim(),
      }

      // Update PIN if provided
      if (formData.pin) {
        profileUpdates.pin_hash = formData.pin // In production, this should be hashed
      }

      const { error } = await db('profiles')
        .update(profileUpdates)
        .eq('id', selectedCashier.id)

      if (error) throw error

      toast.success('Kasir berhasil diperbarui')
      closeModal()
      fetchCashiers()
    } catch (error) {
      console.error('Error updating cashier:', error)
      toast.error('Gagal memperbarui kasir')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedCashier) return

    setIsSubmitting(true)
    try {
      // Delete from auth
      const { error: authError } = await supabase.auth.admin.deleteUser(selectedCashier.id)
      if (authError) throw authError

      // Delete profile
      const { error } = await db('profiles').delete().eq('id', selectedCashier.id)
      if (error) throw error

      toast.success('Kasir berhasil dihapus')
      closeModal()
      fetchCashiers()
    } catch (error) {
      console.error('Error deleting cashier:', error)
      toast.error('Gagal menghapus kasir')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Modal openers
  const openEdit = (cashier: Cashier) => {
    setSelectedCashier(cashier)
    setFormData({
      full_name: cashier.full_name || '',
      email: cashier.email,
      password: '',
      pin: '',
      is_active: cashier.is_active,
    })
    setModal('edit')
  }

  const openDelete = (cashier: Cashier) => {
    setSelectedCashier(cashier)
    setModal('delete')
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <User className="h-12 w-12 mx-auto mb-4 text-blue-600" />
          <p className="text-lg">Loading cashiers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* <DashboardHeader title="Cashiers" subtitle="Manage cashier accounts" badgeText="Administrator">
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Button variant="outline" onClick={() => router.push('/cashier/pos')}>
            <Package className="h-4 w-4 mr-2" />
            POS
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </DashboardHeader> */}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Cashiers ({cashiers.length})</h2>
          <Button onClick={() => setModal('add')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Cashier
          </Button>
        </div>

        {cashiers.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <User className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">No cashiers found</h3>
              <p className="text-gray-500 mb-4">Start by adding your first cashier</p>
              <Button onClick={() => setModal('add')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Cashier
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cashiers.map((cashier) => (
              <Card key={cashier.id}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{cashier.full_name || 'No Name'}</CardTitle>
                      <p className="text-sm text-muted-foreground">{cashier.email}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge variant={cashier.is_active ? 'default' : 'secondary'}>
                        {cashier.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Joined</span>
                      <span className="text-sm">
                        {new Date(cashier.created_at).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(cashier)}>
                        <Edit className="h-4 w-4 mr-1" /> Edit
                      </Button>
                      <Button variant="destructive" size="sm" className="flex-1" onClick={() => openDelete(cashier)}>
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Modal */}
        {modal === 'add' && (
          <Modal title="Tambah Kasir Baru" onClose={closeModal}>
            <CashierFormFields
              formData={formData}
              setFormData={setFormData}
              isSubmitting={isSubmitting}
              idPrefix="add-"
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              showPin={showPin}
              setShowPin={setShowPin}
            />
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={closeModal} disabled={isSubmitting}>Batal</Button>
              <Button onClick={handleAdd} disabled={isSubmitting || !isFormValid}>
                {isSubmitting ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </Modal>
        )}

        {/* Edit Modal */}
        {modal === 'edit' && selectedCashier && (
          <Modal title="Edit Kasir" onClose={closeModal}>
            <CashierFormFields
              formData={formData}
              setFormData={setFormData}
              isSubmitting={isSubmitting}
              idPrefix="edit-"
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              showPin={showPin}
              setShowPin={setShowPin}
            />
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={closeModal} disabled={isSubmitting}>Batal</Button>
              <Button onClick={handleEdit} disabled={isSubmitting}>
                {isSubmitting ? 'Menyimpan...' : 'Perbarui'}
              </Button>
            </div>
          </Modal>
        )}

        {/* Delete Modal */}
        {modal === 'delete' && selectedCashier && (
          <Modal title="Hapus Kasir" onClose={closeModal}>
            <div className="text-center py-4">
              <Trash2 className="h-12 w-12 mx-auto mb-4 text-red-500" />
              <h4 className="font-semibold text-lg mb-1">{selectedCashier.full_name}</h4>
              <p className="text-muted-foreground mb-3">Apakah Anda yakin ingin menghapus kasir ini?</p>
              <p className="text-sm text-amber-600">
                <strong>Perhatian:</strong> Semua data kasir akan dihapus secara permanen.
              </p>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={closeModal} disabled={isSubmitting}>Batal</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
                {isSubmitting ? 'Menghapus...' : 'Hapus'}
              </Button>
            </div>
          </Modal>
        )}
      </main>
    </div>
  )
}
