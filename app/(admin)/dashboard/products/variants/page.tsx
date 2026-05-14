'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Package } from 'lucide-react'
import { toast } from 'sonner'
import { ProductVariant, Unit } from '@/types'
import {
  fetchAllVariants,
  createVariant,
  updateVariant,
  deactivateVariant,
  fetchUnits,
  fetchProductsWithVariants
} from '@/lib/products/actions'
import { VariantsTable } from '@/components/admin/dashboard/products/variants/VariantsTable'
import { VariantForm } from '@/components/admin/dashboard/products/variants/VariantForm'
import { VariantModal } from '@/components/admin/dashboard/products/variants/VariantModal'

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
    inherit_cost_price: false,
    is_active: true,
    is_default: false
  })

  const loadVariants = useCallback(async (unitsData: Unit[]) => {
    const result = await fetchAllVariants()
    if (result.success) {
      const variantsWithUnit = (result.data || []).map((v: any) => {
        const unit = unitsData.find(u => u.id === v.products?.unit_id)
        return {
          ...v,
          product_name: v.products?.name || '-',
          unit_name: unit?.name || unit?.symbol || '-'
        }
      })
      setVariants(variantsWithUnit)
    } else {
      toast.error('Gagal memuat data varian')
    }
  }, [])

  const loadProducts = useCallback(async () => {
    const result = await fetchProductsWithVariants()
    if (result.success) {
      setProducts((result.data || []).map((p: any) => ({
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
      inherit_cost_price: false,
      is_active: true,
      is_default: false
    })
    setEditingVariant(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const price = parseInt(formData.price, 10)
      const costPrice = parseInt(formData.cost_price, 10)
      const conversionQty = parseInt(formData.conversion_qty, 10)
      const minQty = parseInt(formData.min_qty, 10)

      const variantPayload = {
        product_id: formData.product_id,
        variant_name: formData.variant_name.trim(),
        barcode: formData.barcode.trim() || null,
        price,
        cost_price: costPrice,
        inherit_cost_price: formData.inherit_cost_price,
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

      if (!result.success) throw new Error(result.error)

      toast.success(editingVariant ? 'Varian berhasil diperbarui' : 'Varian berhasil ditambahkan')
      await loadVariants(units)
      setIsModalOpen(false)
      resetForm()
    } catch (error: unknown) {
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
      inherit_cost_price: variant.inherit_cost_price,
      is_active: variant.is_active,
      is_default: variant.is_default
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (variant: ProductVariant & { product_name: string }) => {
    if (!confirm(`Hapus "${variant.variant_name}"?`)) return

    try {
      const result = await deactivateVariant(variant.id)
      if (!result.success) throw new Error(result.error)
      toast.success('Varian berhasil dinonaktifkan')
      await loadVariants(units)
    } catch (error) {
      toast.error('Gagal menonaktifkan varian')
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Package className="h-8 w-8 animate-pulse text-blue-600" /></div>

  return (
    <div className="min-h-screen pos-terminal p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">VARIAN PRODUK</h1>
          <p className="text-muted-foreground mt-2">Kelola varian harga dan satuan produk</p>
        </div>
        <Button onClick={() => { resetForm(); setIsModalOpen(true) }} className="pos-button-primary shadow-lg">
          <Plus className="h-4 w-4 mr-2" />
          Tambah Varian
        </Button>
      </div>

      <div className="pos-modal-content border-none shadow-xl p-6">
        <VariantsTable variants={variants} onEdit={handleEdit} onDelete={handleDelete} />
      </div>

      <VariantModal isOpen={isModalOpen} title={editingVariant ? 'Edit Varian' : 'Tambah Varian'}>
        <VariantForm 
          formData={formData} 
          setFormData={setFormData} 
          isSubmitting={isSubmitting} 
          products={products} 
          onSubmit={handleSubmit} 
          onCancel={() => setIsModalOpen(false)} 
          isEdit={!!editingVariant}
        />
      </VariantModal>
    </div>
  )
}
