'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Edit2, Trash2, Package, Barcode } from 'lucide-react'
import { toast } from 'sonner'
import { ProductVariant } from '@/types'
import {
  fetchAllVariants,
  createVariant,
  updateVariant,
  deactivateVariant,
  fetchUnits
} from '@/lib/products/actions'
import { Unit } from '@/types'

export default function ProductVariantsPage() {
  const [variants, setVariants] = useState<(ProductVariant & { product_name: string; unit_name?: string })[]>([])
  const [products, setProducts] = useState<{ id: string; name: string; barcode: string; unit_id?: string | null }[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingVariant, setEditingVariant] = useState<(ProductVariant & { product_name: string }) | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    product_id: '',
    variant_name: '',
    barcode: '',
    price: '',
    cost_price: '',
    conversion_qty: '1',
    min_qty: '1',
    is_active: true,
    is_default: false
  })

  const loadVariants = useCallback(async (unitsData: Unit[]) => {
    const result = await fetchAllVariants()
    if (result.success) {
      // Attach unit name to each variant based on product's unit_id
      const variantsWithUnit = (result.data || []).map((v: ProductVariant & { product_name: string; unit_id?: string | null }) => {
        const unit = unitsData.find(u => u.id === v.unit_id)
        return {
          ...v,
          unit_name: unit?.name || unit?.symbol || '-'
        }
      })
      setVariants(variantsWithUnit)
    } else {
      toast.error('Gagal memuat data varian')
    }
  }, [])

  const loadProducts = useCallback(async () => {
    const { fetchProductsWithVariants } = await import('@/lib/products/actions')
    const result = await fetchProductsWithVariants()
    if (result.success) {
      setProducts((result.data || []).map((p: { id: string; name: string; barcode: string; unit_id?: string | null }) => ({
        id: p.id,
        name: p.name,
        barcode: p.barcode,
        unit_id: p.unit_id
      })))
    }
  }, [])

  const loadUnits = useCallback(async () => {
    const result = await fetchUnits()
    if (result.success) {
      setUnits(result.data || [])
      return result.data || []
    }
    return []
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      const [unitsData] = await Promise.all([loadUnits(), loadProducts()])
      await loadVariants(unitsData)
      setLoading(false)
    }
    loadData()
  }, [loadVariants, loadProducts, loadUnits])

  const resetForm = () => {
    setFormData({
      product_id: '',
      variant_name: '',
      barcode: '',
      price: '',
      cost_price: '',
      conversion_qty: '1',
      min_qty: '1',
      is_active: true,
      is_default: false
    })
    setEditingVariant(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!formData.product_id || !formData.variant_name.trim() || !formData.price) {
        toast.error('Produk, nama varian, dan harga harus diisi')
        return
      }

      const price = parseInt(formData.price, 10)
      const costPrice = parseInt(formData.cost_price, 10)
      const conversionQty = parseInt(formData.conversion_qty, 10)
      const minQty = parseInt(formData.min_qty, 10)

      if (price < 0 || costPrice < 0 || conversionQty <= 0 || minQty < 0) {
        toast.error('Harga dan konversi harus bernilai positif')
        return
      }

      const variantPayload = {
        product_id: formData.product_id,
        variant_name: formData.variant_name.trim(),
        barcode: formData.barcode.trim() || null,
        price,
        cost_price: costPrice,
        conversion_qty: conversionQty,
        min_qty: minQty,
        is_active: formData.is_active,
        is_default: formData.is_default
      }

      let result
      if (editingVariant) {
        result = await updateVariant(editingVariant.id, variantPayload)
      } else {
        result = await createVariant(variantPayload)
      }

      if (!result.success) {
        throw new Error(result.error)
      }

      toast.success(editingVariant ? 'Varian berhasil diperbarui' : 'Varian berhasil ditambahkan')
      await loadVariants(units)
      setIsModalOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error saving variant:', error)
      toast.error('Gagal menyimpan varian')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (variant: ProductVariant & { product_name: string }) => {
    setEditingVariant(variant)
    setFormData({
      product_id: variant.product_id,
      variant_name: variant.variant_name,
      barcode: variant.barcode || '',
      price: variant.price.toString(),
      cost_price: variant.cost_price.toString(),
      conversion_qty: variant.conversion_qty.toString(),
      min_qty: variant.min_qty.toString(),
      is_active: variant.is_active,
      is_default: variant.is_default
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (variant: ProductVariant & { product_name: string }) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus varian "${variant.variant_name}" dari produk "${variant.product_name}"?`)) {
      return
    }

    try {
      const result = await deactivateVariant(variant.id)
      if (!result.success) {
        throw new Error(result.error)
      }
      toast.success('Varian berhasil dinonaktifkan')
      await loadVariants(units)
    } catch (error) {
      console.error('Error deactivating variant:', error)
      toast.error('Gagal menonaktifkan varian')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Package className="h-8 w-8 mx-auto mb-2 text-blue-600" />
          <p>Loading varian produk...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Varian Produk</h1>
          <p className="text-muted-foreground">Kelola varian harga dan satuan produk</p>
        </div>
        <Button onClick={() => { resetForm(); setIsModalOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Varian
        </Button>
      </div>

      <div className="border rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Produk</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Varian</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Barcode</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Harga Jual</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Konversi</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Satuan</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {variants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    Belum ada data varian
                  </td>
                </tr>
              ) : (
                variants.map((variant) => (
                  <tr key={variant.id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="font-medium">{variant.product_name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{variant.variant_name}</span>
                        {variant.is_default && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {variant.barcode && (
                        <div className="flex items-center gap-1">
                          <Barcode className="h-3 w-3" />
                          <span className="font-mono text-sm">{variant.barcode}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      Rp {variant.price.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        1 {variant.variant_name} = {variant.conversion_qty} unit
                        {variant.min_qty > 1 ? (
                          <div className="text-muted-foreground">
                            Min. {variant.min_qty} {variant.variant_name}
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium">{variant.unit_name || '-'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        variant.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {variant.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(variant)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(variant)}
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
              {editingVariant ? 'Edit Varian Produk' : 'Tambah Varian Baru'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="product_id">Produk *</Label>
                <select
                  id="product_id"
                  value={formData.product_id}
                  onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                  disabled={isSubmitting || !!editingVariant}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">-- Pilih Produk --</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.barcode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="variant_name">Nama Varian *</Label>
                <Input
                  id="variant_name"
                  value={formData.variant_name}
                  onChange={(e) => setFormData({ ...formData, variant_name: e.target.value })}
                  placeholder="Eceran, Grosir, Box, Dus..."
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div>
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  placeholder="Barcode khusus untuk varian ini"
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Harga Jual (IDR) *</Label>
                  <Input
                    id="price"
                    type="number"
                    min={0}
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0"
                    disabled={isSubmitting}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cost_price">Harga Beli (IDR)</Label>
                  <Input
                    id="cost_price"
                    type="number"
                    min={0}
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                    placeholder="0"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="conversion_qty">Faktor Konversi *</Label>
                  <Input
                    id="conversion_qty"
                    type="number"
                    min={1}
                    value={formData.conversion_qty}
                    onChange={(e) => setFormData({ ...formData, conversion_qty: e.target.value })}
                    placeholder="1"
                    disabled={isSubmitting}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    1 varian = berapa unit dasar
                  </p>
                </div>
                <div>
                  <Label htmlFor="min_qty">Minimum Qty</Label>
                  <Input
                    id="min_qty"
                    type="number"
                    min={1}
                    value={formData.min_qty}
                    onChange={(e) => setFormData({ ...formData, min_qty: e.target.value })}
                    placeholder="1"
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimal pembelian varian ini
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
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
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_default"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="is_default">Default</Label>
                </div>
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
