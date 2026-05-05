'use client'

import { useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ReactSelect } from '@/components/ui/react-select'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { Category, Supplier, Unit } from '@/types'
import { useAdminBarcodeScanner } from '@/hooks/useAdminBarcodeScanner'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, Check, Package } from 'lucide-react'

export type FormVariant = {
    id?: string  // undefined for new variants
    variant_name: string
    barcode: string
    price: string
    cost_price: string
    conversion_qty: string
    is_active: boolean
    is_default: boolean
}

export type FormData = {
    name: string
    barcode: string
    description: string
    cost_price: string
    price: string
    stock: string
    min_stock: string
    max_stock: string
    track_stock: boolean
    low_stock_threshold: string
    category_id: string
    unit_id: string
    supplier_id: string
    image_url: string
    imageFile?: File
    is_active: boolean
    is_consignment: boolean
    variants: FormVariant[]
}

const PG_INT_MAX = 2147483647

const validateVariant = (variant: FormVariant): string | null => {
    if (!variant.variant_name.trim()) return 'Nama satuan harus diisi'
    if (!variant.price) return 'Harga harus diisi'
    if (!variant.conversion_qty) return 'Faktor konversi harus diisi'
    
    const price = parseInt(variant.price, 10)
    const costPrice = parseInt(variant.cost_price, 10)
    const conversionQty = parseInt(variant.conversion_qty, 10)
    
    if (price > PG_INT_MAX || price < 0) return `Harga maksimum Rp ${PG_INT_MAX.toLocaleString('id-ID')}`
    if (costPrice > PG_INT_MAX || costPrice < 0) return `Harga beli maksimum Rp ${PG_INT_MAX.toLocaleString('id-ID')}`
    if (conversionQty > PG_INT_MAX || conversionQty <= 0) return `Faktor konversi maksimum ${PG_INT_MAX.toLocaleString('id-ID')}`
    
    return null
}

interface ProductFormFieldsProps {
    formData: FormData
    setFormData: (data: FormData) => void
    categories: Category[]
    suppliers: Supplier[]
    units: Unit[]
    isSubmitting: boolean
    idPrefix?: string
}

export function ProductFormFields({
    formData,
    setFormData,
    categories,
    suppliers,
    units,
    isSubmitting,
    idPrefix = '',
}: ProductFormFieldsProps) {
    const field = (key: string) => `${idPrefix}${key}`

    const handleBarcodeScanned = useCallback((barcode: string) => {
        if (formData.barcode && formData.barcode !== barcode) {
            toast.info(`Barcode "${barcode}" akan menggantikan barcode yang ada`)
        }
        setFormData({ ...formData, barcode })
        toast.success(`Barcode terdeteksi: ${barcode}`)
    }, [formData, setFormData])

    const { clearBuffer } = useAdminBarcodeScanner(handleBarcodeScanned)

    return (
        <div className="space-y-4">
            <div>
                <Label htmlFor={field('name')}>Nama Produk *</Label>
                <Input
                    id={field('name')}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Masukkan nama produk"
                    disabled={isSubmitting}
                />
            </div>

            <div>
                <Label htmlFor={field('description')}>Deskripsi</Label>
                <textarea
                    id={field('description')}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Masukkan deskripsi produk (opsional)"
                    disabled={isSubmitting}
                    className="w-full min-h-[80px] p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                />
            </div>

            <div>
                <Label htmlFor={field('barcode')}>
                    Barcode *
                    <span className="ml-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                        📷 Scanner Aktif
                    </span>
                </Label>
                <Input
                    id={field('barcode')}
                    data-scanner-input
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="Scan barcode atau ketik manual"
                    disabled={isSubmitting}
                    className="border-green-200 focus:border-green-400"
                />
                <p className="text-xs text-muted-foreground mt-1">
                    Gunakan scanner USB atau ketik barcode secara manual
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor={field('cost_price')}>Harga Beli (IDR)</Label>
                    <Input
                        id={field('cost_price')}
                        type="number"
                        min={0}
                        value={formData.cost_price}
                        onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                        placeholder="0"
                        disabled={isSubmitting}
                    />
                </div>
                <div>
                    <Label htmlFor={field('price')}>Harga Jual (IDR) *</Label>
                    <Input
                        id={field('price')}
                        type="number"
                        min={0}
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="0"
                        disabled={isSubmitting}
                    />
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id={field('track_stock')}
                        checked={formData.track_stock}
                        onChange={(e) => setFormData({ ...formData, track_stock: e.target.checked })}
                        disabled={isSubmitting}
                    />
                    <Label htmlFor={field('track_stock')} className="font-medium">
                        Lacak Stok Otomatis
                    </Label>
                    <span className="text-xs text-muted-foreground">
                        (Aktifkan untuk tracking stok real-time)
                    </span>
                </div>

                {formData.track_stock && (
                    <div className="grid grid-cols-3 gap-4 pl-6 border-l-2 border-blue-200">
                        <div>
                            <Label htmlFor={field('stock')}>Stok Awal *</Label>
                            <Input
                                id={field('stock')}
                                type="number"
                                min={0}
                                value={formData.stock}
                                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                placeholder="0"
                                disabled={isSubmitting}
                            />
                        </div>
                        <div>
                            <Label htmlFor={field('min_stock')}>Stok Minimum</Label>
                            <Input
                                id={field('min_stock')}
                                type="number"
                                min={0}
                                value={formData.min_stock}
                                onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                                placeholder="0"
                                disabled={isSubmitting}
                            />
                        </div>
                        <div>
                            <Label htmlFor={field('max_stock')}>Stok Maksimum</Label>
                            <Input
                                id={field('max_stock')}
                                type="number"
                                min={0}
                                value={formData.max_stock}
                                onChange={(e) => setFormData({ ...formData, max_stock: e.target.value })}
                                placeholder="Kosongkan jika tidak ada batas"
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>
                )}

                {formData.track_stock && (
                    <div className="pl-6 border-l-2 border-blue-200">
                        <Label htmlFor={field('low_stock_threshold')}>
                            Threshold Alert Stok Rendah
                        </Label>
                        <Input
                            id={field('low_stock_threshold')}
                            type="number"
                            min={1}
                            value={formData.low_stock_threshold}
                            onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
                            placeholder="5"
                            disabled={isSubmitting}
                            className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Alert akan muncul saat stok mencapai angka ini atau lebih rendah
                        </p>
                    </div>
                )}

                {!formData.track_stock && (
                    <div className="pl-6 border-l-2 border-gray-200">
                        <p className="text-sm text-muted-foreground">
                            Stok tidak akan dilacak secara otomatis. Produk ini cocok untuk jasa atau barang digital.
                        </p>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor={field('category_id')}>Kategori</Label>
                    <ReactSelect
                        value={formData.category_id ? { value: formData.category_id, label: categories.find(c => c.id === formData.category_id)?.name || '' } : null}
                        onChange={(option) => setFormData({ ...formData, category_id: option?.value || '' })}
                        options={categories.map((cat) => ({ value: cat.id, label: cat.name }))}
                        placeholder="-- Pilih Kategori --"
                        isDisabled={isSubmitting}
                        isClearable
                        className="w-full"
                    />
                </div>
                <div>
                    <Label htmlFor={field('unit_id')}>Satuan</Label>
                    <ReactSelect
                        value={formData.unit_id ? { value: formData.unit_id, label: units.find(u => u.id === formData.unit_id)?.symbol || '' } : null}
                        onChange={(option) => setFormData({ ...formData, unit_id: option?.value || '' })}
                        options={units.map((unit) => ({ value: unit.id, label: `${unit.name} (${unit.symbol})` }))}
                        placeholder="-- Pilih Satuan --"
                        isDisabled={isSubmitting}
                        isClearable
                        className="w-full"
                    />
                </div>
            </div>

            <div>
                <Label htmlFor={field('supplier_id')}>Supplier</Label>
                <ReactSelect
                    value={formData.supplier_id ? { value: formData.supplier_id, label: suppliers.find(s => s.id === formData.supplier_id)?.name || '' } : null}
                    onChange={(option) => setFormData({ ...formData, supplier_id: option?.value || '' })}
                    options={suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))}
                    placeholder="-- Pilih Supplier --"
                    isDisabled={isSubmitting}
                    isClearable
                    className="w-full"
                />
            </div>

            <ImageUpload
                currentImageUrl={formData.image_url}
                onImageChange={(file) => setFormData({ ...formData, imageFile: file || undefined })}
                disabled={isSubmitting}
            />

            <div className="flex items-center gap-4">
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
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id={field('is_consignment')}
                        checked={formData.is_consignment}
                        onChange={(e) => setFormData({ ...formData, is_consignment: e.target.checked })}
                        disabled={isSubmitting}
                    />
                    <Label htmlFor={field('is_consignment')}>Barang Titipan</Label>
                </div>
            </div>

            {/* Variant Manager */}
            <div className="border-t pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                    <Label className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Varian Harga / Satuan
                    </Label>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            const newVariant: FormVariant = {
                                variant_name: '',
                                barcode: '',
                                price: '',
                                cost_price: '',
                                conversion_qty: '1',
                                is_active: true,
                                is_default: formData.variants.length === 0, // First variant is default
                            }
                            setFormData({ ...formData, variants: [...formData.variants, newVariant] })
                        }}
                        disabled={isSubmitting}
                    >
                        <Plus className="h-4 w-4 mr-1" />
                        Tambah Satuan
                    </Button>
                </div>

                {formData.variants.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                        Belum ada varian. Klik "Tambah Satuan" untuk menambahkan (contoh: Eceran, Grosir, Box, Dus)
                    </p>
                ) : (
                    <div className="space-y-3">
                        {formData.variants.map((variant, index) => (
                            <div
                                key={variant.id || `new-${index}`}
                                className={`border rounded-lg p-3 space-y-3 ${variant.is_default ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200'}`}
                            >
                                {/* Variant Header */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-muted-foreground">
                                            #{index + 1}
                                        </span>
                                        {variant.is_default && (
                                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                <Check className="h-3 w-3" />
                                                Default
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {/* Set Default Button */}
                                        {!variant.is_default && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-xs"
                                                onClick={() => {
                                                    const updated = formData.variants.map((v, i) => ({
                                                        ...v,
                                                        is_default: i === index,
                                                    }))
                                                    setFormData({ ...formData, variants: updated })
                                                }}
                                                disabled={isSubmitting}
                                            >
                                                Jadikan Default
                                            </Button>
                                        )}
                                        {/* Delete Button */}
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                                            onClick={() => {
                                                const updated = formData.variants.filter((_, i) => i !== index)
                                                // If we removed the default, set first remaining as default
                                                if (variant.is_default && updated.length > 0) {
                                                    updated[0].is_default = true
                                                }
                                                setFormData({ ...formData, variants: updated })
                                            }}
                                            disabled={isSubmitting}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Variant Fields */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="col-span-2">
                                        <Label className="text-xs">Nama Satuan *</Label>
                                        <Input
                                            value={variant.variant_name}
                                            onChange={(e) => {
                                                const updated = [...formData.variants]
                                                updated[index].variant_name = e.target.value
                                                setFormData({ ...formData, variants: updated })
                                            }}
                                            placeholder="Eceran, Grosir, Box, Dus..."
                                            disabled={isSubmitting}
                                            className="h-8"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Harga Beli (IDR)</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={variant.cost_price}
                                            onChange={(e) => {
                                                const updated = [...formData.variants]
                                                updated[index].cost_price = e.target.value
                                                setFormData({ ...formData, variants: updated })
                                            }}
                                            placeholder="0"
                                            disabled={isSubmitting}
                                            className="h-8"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Harga Jual (IDR) *</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={variant.price}
                                            onChange={(e) => {
                                                const updated = [...formData.variants]
                                                updated[index].price = e.target.value
                                                setFormData({ ...formData, variants: updated })
                                            }}
                                            placeholder="0"
                                            disabled={isSubmitting}
                                            className="h-8"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Faktor Konversi *</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            value={variant.conversion_qty}
                                            onChange={(e) => {
                                                const updated = [...formData.variants]
                                                updated[index].conversion_qty = e.target.value
                                                setFormData({ ...formData, variants: updated })
                                            }}
                                            placeholder="1"
                                            disabled={isSubmitting}
                                            className="h-8"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <Label className="text-xs">Barcode (Opsional)</Label>
                                        <Input
                                            value={variant.barcode}
                                            onChange={(e) => {
                                                const updated = [...formData.variants]
                                                updated[index].barcode = e.target.value
                                                setFormData({ ...formData, variants: updated })
                                            }}
                                            placeholder="Barcode khusus untuk varian ini"
                                            disabled={isSubmitting}
                                            className="h-8"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
