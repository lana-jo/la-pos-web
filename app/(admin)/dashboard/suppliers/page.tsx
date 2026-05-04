'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Edit2, Trash2, Building, Phone, Mail, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@supabase/supabase-js'
import { Supplier } from '@/types'

// Untyped client to bypass TypeScript issues (same pattern as products/actions.ts)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    email: '',
    contact_person: '',
    notes: '',
    is_active: true
  })


  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name')

      if (error) throw error
      setSuppliers(data || [])
    } catch (error) {
      console.error('Error fetching suppliers:', error)
      toast.error('Gagal memuat data pemasok')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      address: '',
      email: '',
      contact_person: '',
      notes: '',
      is_active: true
    })
    setEditingSupplier(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!formData.name.trim()) {
        toast.error('Nama pemasok harus diisi')
        return
      }

      const supplierData = {
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        email: formData.email.trim() || null,
        contact_person: formData.contact_person.trim() || null,
        notes: formData.notes.trim() || null,
        is_active: formData.is_active
      }

      if (editingSupplier) {
        const { error } = await supabase
          .from('suppliers')
          .update(supplierData)
          .eq('id', editingSupplier.id)

        if (error) throw error
        toast.success('Pemasok berhasil diperbarui')
      } else {
        const { error } = await supabase
          .from('suppliers')
          .insert(supplierData)

        if (error) throw error
        toast.success('Pemasok berhasil ditambahkan')
      }

      await fetchSuppliers()
      setIsModalOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error saving supplier:', error)
      toast.error('Gagal menyimpan pemasok')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setFormData({
      name: supplier.name,
      phone: supplier.phone || '',
      address: supplier.address || '',
      email: supplier.email || '',
      contact_person: supplier.contact_person || '',
      notes: supplier.notes || '',
      is_active: supplier.is_active
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (supplier: Supplier) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus pemasok "${supplier.name}"?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('suppliers')
        .update({ is_active: false })
        .eq('id', supplier.id)

      if (error) throw error
      toast.success('Pemasok berhasil dinonaktifkan')
      await fetchSuppliers()
    } catch (error) {
      console.error('Error deleting supplier:', error)
      toast.error('Gagal menghapus pemasok')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Building className="h-8 w-8 mx-auto mb-2 text-blue-600" />
          <p>Loading pemasok...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Pemasok</h1>
          <p className="text-muted-foreground">Kelola data pemasok dan distributor barang</p>
        </div>
        <Button onClick={() => { resetForm(); setIsModalOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Pemasok
        </Button>
      </div>

      <div className="border rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Nama</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Kontak</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Telepon</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Belum ada data pemasok
                  </td>
                </tr>
              ) : (
                suppliers.map((supplier) => (
                  <tr key={supplier.id} className="border-t">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium">{supplier.name}</div>
                        {supplier.address && (
                          <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {supplier.address}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {supplier.contact_person && (
                          <div className="text-sm">{supplier.contact_person}</div>
                        )}
                        {supplier.email && (
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {supplier.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {supplier.phone && (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3" />
                          {supplier.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        supplier.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {supplier.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(supplier)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(supplier)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg border p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingSupplier ? 'Edit Pemasok' : 'Tambah Pemasok Baru'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nama Pemasok *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="PT. Contoh Supplier"
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div>
                <Label htmlFor="contact_person">Nama Kontak</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  placeholder="Nama PIC"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label htmlFor="phone">Telepon</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0812-3456-7890"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="supplier@contoh.com"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label htmlFor="address">Alamat</Label>
                <textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Alamat lengkap pemasok"
                  disabled={isSubmitting}
                  className="w-full min-h-[80px] p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="notes">Catatan</Label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Catatan tambahan tentang pemasok"
                  disabled={isSubmitting}
                  className="w-full min-h-[60px] p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  disabled={isSubmitting}
                />
                <Label htmlFor="is_active">Aktif</Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
