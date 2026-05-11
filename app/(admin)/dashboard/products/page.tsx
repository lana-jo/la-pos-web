'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Plus, Package, Scan, Camera } from 'lucide-react'
import { toast } from 'sonner'
import { LoadingSpinner } from '@/components/ui/LoadingStates'
import { Category, Product, ProductVariant, Unit, Supplier } from '@/types'
import { FormVariant } from '@/components/admin/dashboard/products'
import { useAdminBarcodeScanner } from '@/hooks/useAdminBarcodeScanner'
import { CameraScanner } from '@/components/camera/CameraScanner'
import { createProductWithVariants, updateProductWithVariants, deleteProduct, fetchProductsWithVariants, fetchUnits, fetchSuppliers } from '@/lib/products/actions'
import {
    CategoryFilter,
    EmptyState,
    ProductTable,
    AddProductModal,
    EditProductModal,
    DeleteProductModal,
    type FormData,
} from '@/components/admin/dashboard/products'

type ProductWithCategory = Product & {
    categories: Pick<Category, 'name'> | null
}

const EMPTY_FORM: FormData = {
    name: '',
    barcode: '',
    description: '',
    cost_price: '',
    price: '',
    stock: '',
    min_stock: '',
    max_stock: '',
    track_stock: true,
    low_stock_threshold: '5',
    category_id: '',
    unit_id: '',
    supplier_id: '',
    image_url: '',
    is_active: true,
    is_consignment: false,
    variants: [],
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string) => supabase.from(table) as any

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)

export default function ProductsPage() {
    const router = useRouter()

    const [products, setProducts] = useState<ProductWithCategory[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [units, setUnits] = useState<Unit[]>([])
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [loading, setLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [modal, setModal] = useState<'add' | 'edit' | 'delete' | null>(null)
    const [selectedProduct, setSelectedProduct] = useState<ProductWithCategory | null>(null)
    const [formData, setFormData] = useState<FormData>(EMPTY_FORM)
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [isScanning, setIsScanning] = useState(false)
    const [showCameraScanner, setShowCameraScanner] = useState(false)

    // ── Auth guard ─────────────────────────────────────────────────────────────
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

    // ── Data fetching ──────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        try {
            // Fetch categories (client-side - RLS allows)
            const { data: categoriesData, error: categoriesError } = await db('categories')
                .select('*')
                .eq('is_active', true)
                .order('name')

            if (categoriesError) throw categoriesError
            setCategories(categoriesData ?? [])

            // Fetch products with variants (server action - bypasses RLS)
            const result = await fetchProductsWithVariants()
            if (!result.success) {
                throw new Error(result.error)
            }
            setProducts(result.data ?? [])

            // Fetch units from database
            const unitsResult = await fetchUnits()
            if (unitsResult.success) {
                setUnits(unitsResult.data ?? [])
            } else {
                console.error('Error fetching units:', unitsResult.error)
            }

            // Fetch suppliers from database
            const suppliersResult = await fetchSuppliers()
            if (suppliersResult.success) {
                setSuppliers(suppliersResult.data ?? [])
            } else {
                console.error('Error fetching suppliers:', suppliersResult.error)
            }
        } catch (error) {
            console.error('Error fetching products:', error)
            toast.error('Gagal mengambil data produk')
        } finally {
            setLoading(false)
        }
    }, [])

    // ── Barcode Scanner ─────────────────────────────────────────────────────────
    const handleBarcodeScanned = useCallback((barcode: string) => {
        // Check if barcode already exists
        const existingProduct = products.find(p => p.barcode === barcode)
        
        if (existingProduct) {
            toast.error(`Barcode ${barcode} sudah digunakan oleh produk "${existingProduct.name}"`)
            return
        }

        // Fill barcode field in form
        setFormData(prev => ({ ...prev, barcode }))
        toast.success(`Barcode ${barcode} berhasil di-scan`)
        
        // Open add modal if not already open
        if (modal !== 'add') {
            setModal('add')
        }
        
        setIsScanning(false)
    }, [products, modal])

    const { clearBuffer } = useAdminBarcodeScanner(handleBarcodeScanned)

    const startScanning = useCallback(() => {
        setIsScanning(true)
        clearBuffer()
        toast.info('Silakan scan barcode produk', { duration: 3000 })
    }, [clearBuffer])

    const handleCameraScanDetected = useCallback((barcode: string) => {
        // Check if barcode already exists
        const existingProduct = products.find(p => p.barcode === barcode)
        
        if (existingProduct) {
            toast.error(`Barcode ${barcode} sudah digunakan oleh produk "${existingProduct.name}"`)
            return
        }

        // Fill barcode field in form
        setFormData(prev => ({ ...prev, barcode }))
        toast.success(`Barcode ${barcode} berhasil di-scan`)
        
        // Open add modal if not already open
        if (modal !== 'add') {
            setModal('add')
        }
        
        setShowCameraScanner(false)
    }, [products, modal])

    const startCameraScanning = useCallback(() => {
        setShowCameraScanner(true)
    }, [])

    useEffect(() => {
        checkUserRole()
        fetchData()
    }, [checkUserRole, fetchData])

    // ── Helpers ────────────────────────────────────────────────────────────────
    const isFormValid = !!(formData.name.trim() && formData.barcode.trim() && formData.price && formData.cost_price && formData.stock)

    const closeModal = () => {
        setModal(null)
        setSelectedProduct(null)
        setFormData(EMPTY_FORM)
    }

    const PG_INT_MAX = 2147483647

    const validateVariants = (variants: FormVariant[]): string | null => {
        for (const v of variants) {
            if (!v.variant_name.trim()) return 'Nama satuan harus diisi untuk semua varian'
            if (!v.price) return 'Harga harus diisi untuk semua varian'
            if (!v.conversion_qty) return 'Faktor konversi harus diisi untuk semua varian'
            
            const price = parseInt(v.price, 10)
            const costPrice = parseInt(v.cost_price, 10)
            const conversionQty = parseInt(v.conversion_qty, 10)
            
            if (price > PG_INT_MAX || price < 0) {
                return `Harga varian "${v.variant_name}" melebihi batas maksimum`
            }
            if (costPrice > PG_INT_MAX || costPrice < 0) {
                return `Harga beli varian "${v.variant_name}" melebihi batas maksimum`
            }
            if (conversionQty > PG_INT_MAX || conversionQty <= 0) {
                return `Faktor konversi varian "${v.variant_name}" melebihi batas maksimum`
            }
        }
        return null
    }

    const buildPayload = () => {
        const price = parseInt(formData.price, 10)
        const stock = parseInt(formData.stock, 10)
        const costPrice = parseInt(formData.cost_price, 10) || 0

        if (price > PG_INT_MAX || price < 0) {
            toast.error(`Harga jual tidak valid: maksimum Rp ${PG_INT_MAX.toLocaleString('id-ID')}`)
            return null
        }
        if (costPrice > PG_INT_MAX || costPrice < 0) {
            toast.error(`Harga beli tidak valid: maksimum Rp ${PG_INT_MAX.toLocaleString('id-ID')}`)
            return null
        }
        if (stock > PG_INT_MAX || stock < 0) {
            toast.error(`Stok tidak valid: maksimum ${PG_INT_MAX.toLocaleString('id-ID')}`)
            return null
        }

        // Validate variants
        const variantError = validateVariants(formData.variants)
        if (variantError) {
            toast.error(variantError)
            return null
        }

        // Build variant payloads
        const variantPayloads = formData.variants.map(v => ({
            id: v.id, // undefined for new variants
            variant_name: v.variant_name.trim(),
            barcode: v.barcode.trim() || null,
            price: parseInt(v.price, 10),
            cost_price: parseInt(v.cost_price, 10),
            conversion_qty: parseInt(v.conversion_qty, 10),
            is_active: v.is_active,
            is_default: v.is_default,
        }))

        const minStock = parseInt(formData.min_stock, 10) || null
        const maxStock = parseInt(formData.max_stock, 10) || null
        const lowStockThreshold = parseInt(formData.low_stock_threshold, 10) || 5

        return {
            product: {
                name: formData.name.trim(),
                barcode: formData.barcode.trim(),
                description: formData.description.trim() || null,
                cost_price: costPrice,
                price,
                stock,
                min_stock: minStock,
                max_stock: maxStock,
                track_stock: formData.track_stock,
                low_stock_threshold: lowStockThreshold,
                category_id: formData.category_id || null,
                unit_id: formData.unit_id || null,
                supplier_id: formData.supplier_id || null,
                image_url: (formData.image_url || '').trim() || null,
                is_active: formData.is_active,
                is_consignment: formData.is_consignment,
            },
            variants: variantPayloads,
            imageFile: formData.imageFile,
        }
    }

    // ── CRUD Handlers ──────────────────────────────────────────────────────────
    const handleAdd = async () => {
        if (!isFormValid) { toast.error('Nama, barcode, harga beli, harga jual, dan stok harus diisi'); return }

        const payload = buildPayload()
        if (!payload) {
            setIsSubmitting(false)
            return
        }

        setIsSubmitting(true)
        try {
            const result = await createProductWithVariants(payload)
            
            if (!result.success) {
                throw new Error(result.error)
            }

            toast.success('Produk berhasil ditambahkan')
            closeModal()
            fetchData()
        } catch (error) {
            console.error('Error adding product:', error)
            toast.error('Gagal menambahkan produk')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleEdit = async () => {
        if (!selectedProduct || !isFormValid) { toast.error('Nama, barcode, harga beli, harga jual, dan stok harus diisi'); return }

        const payload = buildPayload()
        if (!payload) {
            setIsSubmitting(false)
            return
        }

        setIsSubmitting(true)
        try {
            const existingVariantIds = (selectedProduct.variants || []).map(v => v.id)
            const result = await updateProductWithVariants(
                selectedProduct.id, 
                existingVariantIds, 
                payload, 
                selectedProduct.image_url || undefined
            )
            
            if (!result.success) {
                throw new Error(result.error)
            }

            toast.success('Produk berhasil diperbarui')
            closeModal()
            fetchData()
        } catch (error) {
            console.error('Error updating product:', error)
            toast.error('Gagal memperbarui produk')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async () => {
        if (!selectedProduct) return

        setIsSubmitting(true)
        try {
            const result = await deleteProduct(selectedProduct.id)
            
            if (!result.success) {
                throw new Error(result.error)
            }
            
            toast.success('Produk berhasil dihapus')
            closeModal()
            fetchData()
        } catch (error) {
            console.error('Error deleting product:', error)
            toast.error('Gagal menghapus produk')
        } finally {
            setIsSubmitting(false)
        }
    }

    const openEdit = (product: ProductWithCategory) => {
        setSelectedProduct(product)
        setFormData({
            name: product.name,
            barcode: product.barcode,
            description: product.description || '',
            cost_price: product.cost_price?.toString() || '',
            price: product.price.toString(),
            stock: product.stock.toString(),
            min_stock: product.min_stock?.toString() || '',
            max_stock: product.max_stock?.toString() || '',
            track_stock: product.track_stock ?? true,
            low_stock_threshold: product.low_stock_threshold?.toString() || '5',
            category_id: product.category_id || '',
            unit_id: product.unit_id || '',
            supplier_id: product.supplier_id || '',
            image_url: product.image_url || '',
            is_active: product.is_active,
            is_consignment: product.is_consignment || false,
            variants: (product.variants || []).map(v => ({
                id: v.id,
                variant_name: v.variant_name,
                barcode: v.barcode || '',
                price: v.price.toString(),
                cost_price: v.cost_price?.toString() || '',
                conversion_qty: v.conversion_qty.toString(),
                is_active: v.is_active,
                is_default: v.is_default,
            })),
        })
        setModal('edit')
    }

    const openDelete = (product: ProductWithCategory) => {
        setSelectedProduct(product)
        setModal('delete')
    }

    const filteredProducts = products.filter(p => {
        const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
        return matchesCategory && matchesSearch
    })

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen pos-terminal">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex flex-col gap-4 mb-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-4">
                            <h2 className="text-3xl font-bold text-foreground">Products ({products.length})</h2>
                            <CategoryFilter
                                categories={categories}
                                selectedCategory={selectedCategory}
                                onSelectCategory={setSelectedCategory}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={startScanning}
                                disabled={isScanning}
                                className="border-primary-brand text-primary-brand"
                            >
                                <Scan className="h-4 w-4 mr-2" />
                                {isScanning ? 'Scanning...' : 'Scan USB'}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={startCameraScanning}
                                className="border-primary-brand text-primary-brand"
                            >
                                <Camera className="h-4 w-4 mr-2" />
                                Scan Kamera
                            </Button>
                            <Button onClick={() => setModal('add')} className="pos-button-primary shadow-lg">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Product
                            </Button>
                        </div>
                    </div>
                    {/* Search Input */}
                    <div className="max-w-md">
                        <input
                            type="text"
                            placeholder="Cari produk berdasarkan nama atau barcode..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-border bg-background pos-form-input shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-brand"
                        />
                    </div>
                </div>
                {/* Content */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <LoadingSpinner size="lg" />
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <EmptyState
                        isCategoryFiltered={selectedCategory !== 'all' || searchTerm !== ''}
                        onAddProduct={() => setModal('add')}
                    />
                ) : (
                    <ProductTable
                        products={filteredProducts}
                        categories={categories}
                        selectedCategory={selectedCategory}
                        onEdit={openEdit}
                        onDelete={openDelete}
                        formatCurrency={formatCurrency}
                    />
                )}

                {/* Modals */}
                <AddProductModal
                    isOpen={modal === 'add'}
                    formData={formData}
                    setFormData={setFormData}
                    categories={categories}
                    suppliers={suppliers}
                    units={units}
                    isSubmitting={isSubmitting}
                    isFormValid={isFormValid}
                    onClose={closeModal}
                    onSubmit={handleAdd}
                />

                <EditProductModal
                    isOpen={modal === 'edit'}
                    selectedProduct={selectedProduct}
                    formData={formData}
                    setFormData={setFormData}
                    categories={categories}
                    suppliers={suppliers}
                    units={units}
                    isSubmitting={isSubmitting}
                    isFormValid={isFormValid}
                    onClose={closeModal}
                    onSubmit={handleEdit}
                />

                <DeleteProductModal
                    isOpen={modal === 'delete'}
                    selectedProduct={selectedProduct}
                    isSubmitting={isSubmitting}
                    onClose={closeModal}
                    onConfirm={handleDelete}
                />

                {/* Camera Scanner Modal */}
                <CameraScanner
                    isOpen={showCameraScanner}
                    onClose={() => setShowCameraScanner(false)}
                    onBarcodeDetected={handleCameraScanDetected}
                />
            </main>
        </div>
    )
}