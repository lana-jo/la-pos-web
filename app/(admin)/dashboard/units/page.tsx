'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Edit2, Trash2, Package } from 'lucide-react'
import { toast } from 'sonner'
import { Unit } from '@/types'
import { fetchUnits, createUnit, updateUnit, deactivateUnit } from '@/lib/units/actions'

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    is_active: true
  })


  const loadUnits = async () => {
    try {
      const result = await fetchUnits()
      if (result.success) {
        setUnits(result.data || [])
      } else {
        toast.error('Gagal memuat data satuan')
      }
    } catch (error) {
      console.error('Error fetching units:', error)
      toast.error('Gagal memuat data satuan')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUnits()
  }, [])

  const resetForm = () => {
    setFormData({ name: '', symbol: '', is_active: true })
    setEditingUnit(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!formData.name.trim() || !formData.symbol.trim()) {
        toast.error('Nama dan simbol satuan harus diisi')
        return
      }

      if (editingUnit) {
        const result = await updateUnit(editingUnit.id, {
          name: formData.name.trim(),
          symbol: formData.symbol.trim(),
          is_active: formData.is_active
        })
        if (!result.success) throw new Error(result.error)
        toast.success('Satuan berhasil diperbarui')
      } else {
        const result = await createUnit({
          name: formData.name.trim(),
          symbol: formData.symbol.trim(),
          is_active: formData.is_active
        })
        if (!result.success) throw new Error(result.error)
        toast.success('Satuan berhasil ditambahkan')
      }

      await loadUnits()
      setIsModalOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error saving unit:', error)
      toast.error('Gagal menyimpan satuan')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (unit: Unit) => {
    setEditingUnit(unit)
    setFormData({
      name: unit.name,
      symbol: unit.symbol,
      is_active: unit.is_active
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (unit: Unit) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus satuan "${unit.name}"?`)) {
      return
    }

    try {
      const result = await deactivateUnit(unit.id)
      if (!result.success) throw new Error(result.error)
      toast.success('Satuan berhasil dinonaktifkan')
      await loadUnits()
    } catch (error) {
      console.error('Error deleting unit:', error)
      toast.error('Gagal menghapus satuan')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Package className="h-8 w-8 mx-auto mb-2 text-blue-600" />
          <p>Loading satuan...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Satuan</h1>
          <p className="text-muted-foreground">Kelola satuan produk (pcs, kg, liter, dll)</p>
        </div>
        <Button onClick={() => { resetForm(); setIsModalOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Satuan
        </Button>
      </div>

      <div className="border rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Nama</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Simbol</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {units.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    Belum ada data satuan
                  </td>
                </tr>
              ) : (
                units.map((unit) => (
                  <tr key={unit.id} className="border-t">
                    <td className="px-4 py-3">{unit.name}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono bg-muted px-2 py-1 rounded text-sm">
                        {unit.symbol}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        unit.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {unit.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(unit)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(unit)}
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
          <div className="bg-card rounded-lg border p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingUnit ? 'Edit Satuan' : 'Tambah Satuan Baru'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nama Satuan *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Kilogram, Liter, Pieces"
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div>
                <Label htmlFor="symbol">Simbol *</Label>
                <Input
                  id="symbol"
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                  placeholder="Contoh: kg, L, pcs"
                  disabled={isSubmitting}
                  required
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
