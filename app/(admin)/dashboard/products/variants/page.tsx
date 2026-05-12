'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit2, Trash2, Package, RefreshCw,  Barcode } from 'lucide-react'
import { generateBarcode } from '@/lib/pos/utils'
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
    console.log('[Variants] Loading variants...')
    const result = await fetchAllVariants()
    console.log('[Variants] fetchAllVariants result:', result)
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
      console.log('[Variants] Loaded', variantsWithUnit.length, 'variants')
    } else {
      console.error('[Variants] Failed to load variants:', result.error)
      toast.error('Gagal memuat data varian')
    }
  }, [])

  const loadProducts = useCallback(async () => {
    console.log('[Variants] Loading products...')
    const { fetchProductsWithVariants } = await import('@/lib/products/actions')
    const result = await fetchProductsWithVariants()
    console.log('[Variants] fetchProductsWithVariants result:', result)
    if (result.success) {
      setProducts((result.data || []).map((p: { id: string; name: string; barcode: string; unit_id?: string | null }) => ({
        id: p.id,
        name: p.name,
        barcode: p.barcode,
        unit_id: p.unit_id
      })))
      console.log('[Variants] Loaded', result.data?.length || 0, 'products')
    } else {
      console.error('[Variants] Failed to load products:', result.error)
    }
  }, [])

  const loadUnits = useCallback(async () => {
    console.log('[Variants] Loading units...')
    const result = await fetchUnits()
    console.log('[Variants] fetchUnits result:', result)
    if (result.success) {
      setUnits(result.data || [])
      console.log('[Variants] Loaded', result.data?.length || 0, 'units')
      return result.data || []
    }
    console.error('[Variants] Failed to load units:', result.error)
    return []
  }, [])

  useEffect(() => {
    const loadData = async () => {
      console.log('[Variants] Initial data load started')
      setLoading(true)
      const [unitsData] = await Promise.all([loadUnits(), loadProducts()])
      await loadVariants(unitsData)
      console.log('[Variants] Initial data load completed')
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
      console.log('[Variants] Submitting variant payload:', variantPayload)

      let result
      if (editingVariant) {
        result = await updateVariant(editingVariant.id, variantPayload)
      } else {
        result = await createVariant(variantPayload)
      }

      console.log('[Variants] Save result:', result)
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
    console.log('[Variants] Editing variant:', variant)
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
    console.log('[Variants] Deactivating variant:', variant)
    if (!confirm(`Apakah Anda yakin ingin menghapus varian "${variant.variant_name}" dari produk "${variant.product_name}"?`)) {
      return
    }

    try {
      console.log('[Variants] Calling deactivateVariant for ID:', variant.id)
      const result = await deactivateVariant(variant.id)
      if (!result.success) {
        throw new Error(result.error)
      }
      console.log('[Variants] Deactivate result:', result)
      toast.success('Varian berhasil dinonaktifkan')
      await loadVariants(units)
    } catch (error) {
      console.error('[Variants] Error deactivating variant:', error)
      toast.error('Gagal menonaktifkan varian')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Package className="h-8 w-8 mx-auto mb-2 text-blue-600" />
          <p>Memuat varian produk...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pos-terminal p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Package className="h-8 w-8 text-primary-brand" />
            VARIAN PRODUK
          </h1>
          <p className="text-muted-foreground mt-2">Kelola varian harga dan satuan produk</p>
        </div>
        <Button onClick={() => { resetForm(); setIsModalOpen(true) }} className="pos-button-primary shadow-lg">
          <Plus className="h-4 w-4 mr-2" />
          Tambah Varian
        </Button>
      </div>

      <div className="pos-modal-content border-none shadow-xl p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 font-bold text-muted-foreground uppercase">Produk</th>
                <th className="px-4 py-3 font-bold text-muted-foreground uppercase">Varian</th>
                <th className="px-4 py-3 font-bold text-muted-foreground uppercase">Barcode</th>
                <th className="px-4 py-3 font-bold text-muted-foreground uppercase">Harga Jual</th>
                <th className="px-4 py-3 font-bold text-muted-foreground uppercase">Konversi</th>
                <th className="px-4 py-3 font-bold text-muted-foreground uppercase">Satuan</th>
                <th className="px-4 py-3 font-bold text-muted-foreground uppercase">Status</th>
                <th className="px-4 py-3 font-bold text-muted-foreground uppercase text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {variants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    Belum ada data varian
                  </td>
                </tr>
              ) : (
                variants.map((variant) => (
                  <tr key={variant.id} className="hover:bg-background/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{variant.product_name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{variant.variant_name}</span>
                        {variant.is_default && (
                          <Badge variant="secondary" className="bg-primary/10 text-primary">Default</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{variant.barcode || '-'}</td>
                    <td className="px-4 py-3 text-primary-brand font-black">
                      Rp {variant.price.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      1 {variant.variant_name} = {variant.conversion_qty} unit
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{variant.unit_name || '-'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={variant.is_active ? "default" : "secondary"} className={variant.is_active ? "bg-green-100 text-green-800" : ""}>
                        {variant.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(variant)} className="text-primary-brand hover:bg-primary-brand/10">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(variant)} className="text-destructive hover:bg-destructive/10">
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="pos-modal-content w-full max-w-md max-h-[90vh] overflow-y-auto p-6 rounded-2xl border-none shadow-2xl">
            <h3 className="text-xl font-bold text-foreground mb-6">
              {editingVariant ? 'Edit Varian Produk' : 'Tambah Varian Baru'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="product_id" className="pos-form-label">Produk *</Label>
                <select
                  id="product_id"
                  value={formData.product_id}
                  onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                  disabled={isSubmitting || !!editingVariant}
                  className="w-full p-2 border border-border bg-background rounded-lg pos-form-input"
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
                <Label htmlFor="variant_name" className="pos-form-label">Nama Varian *</Label>
                <Input
                  id="variant_name"
                  value={formData.variant_name}
                  onChange={(e) => setFormData({ ...formData, variant_name: e.target.value })}
                  placeholder="Eceran, Grosir, Box, Dus..."
                  disabled={isSubmitting}
                  required
                  className="pos-form-input"
                />
              </div>

              <div>
                <Label htmlFor="barcode" className="pos-form-label">Barcode</Label>
                <div className="flex gap-2">
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="Barcode khusus untuk varian ini"
                    disabled={isSubmitting}
                    className="pos-form-input"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const newBarcode = generateBarcode()
                      setFormData({ ...formData, barcode: newBarcode })
                      toast.success(`Barcode varian digenerate: ${newBarcode}`)
                    }}
                    disabled={isSubmitting}
                    title="Buat Barcode"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price" className="pos-form-label">Harga Jual (IDR) *</Label>
                  <Input
                    id="price"
                    type="number"
                    min={0}
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0"
                    disabled={isSubmitting}
                    required
                    className="pos-form-input"
                  />
                </div>
                <div>
                  <Label htmlFor="cost_price" className="pos-form-label">Harga Beli (IDR)</Label>
                  <Input
                    id="cost_price"
                    type="number"
                    min={0}
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                    placeholder="0"
                    disabled={isSubmitting}
                    className="pos-form-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="conversion_qty" className="pos-form-label">Faktor Konversi *</Label>
                  <Input
                    id="conversion_qty"
                    type="number"
                    min={1}
                    value={formData.conversion_qty}
                    onChange={(e) => setFormData({ ...formData, conversion_qty: e.target.value })}
                    placeholder="1"
                    disabled={isSubmitting}
                    required
                    className="pos-form-input"
                  />
                </div>
                <div>
                  <Label htmlFor="min_qty" className="pos-form-label">Minimum Qty</Label>
                  <Input
                    id="min_qty"
                    type="number"
                    min={1}
                    value={formData.min_qty}
                    onChange={(e) => setFormData({ ...formData, min_qty: e.target.value })}
                    placeholder="1"
                    disabled={isSubmitting}
                    className="pos-form-input"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 py-2">
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
                <Button type="submit" disabled={isSubmitting} className="pos-button-primary">
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
