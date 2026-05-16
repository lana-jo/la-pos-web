'use client'

import { Button } from '@/components/ui/button'
import { X, Trash2 } from 'lucide-react'
import { Category, Product, Supplier, Unit } from '@/types'
import { ProductFormFields, FormData } from './ProductFormFields'

type ProductWithCategory = Product & {
    categories: Pick<Category, 'name'> | null
}

interface ModalProps {
    title: string
    onClose: () => void
    children: React.ReactNode
}

function Modal({ title, onClose, children }: ModalProps) {
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

interface AddProductModalProps {
    isOpen: boolean
    formData: FormData
    setFormData: (data: FormData) => void
    categories: Category[]
    suppliers: Supplier[]
    units: Unit[]
    isSubmitting: boolean
    isFormValid: boolean
    onClose: () => void
    onSubmit: () => void
}

export function AddProductModal({
    isOpen,
    formData,
    setFormData,
    categories,
    suppliers,
    units,
    isSubmitting,
    isFormValid,
    onClose,
    onSubmit,
}: AddProductModalProps) {
    if (!isOpen) return null
    console.log('[ProductModal] AddProductModal opened', { formData, categories: categories.length, suppliers: suppliers.length, units: units.length })

    return (
        <Modal title="Tambah Produk Baru" onClose={onClose}>
            <ProductFormFields
                formData={formData}
                setFormData={setFormData}
                categories={categories}
                suppliers={suppliers}
                units={units}
                isSubmitting={isSubmitting}
                idPrefix="add-"
            />
            <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => { console.log('[ProductModal] Add cancelled'); onClose(); }} disabled={isSubmitting}>Batal</Button>
                <Button onClick={() => { console.log('[ProductModal] Add submit clicked', formData); onSubmit(); }} disabled={isSubmitting || !isFormValid}>
                    {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </Button>
            </div>
        </Modal>
    )
}

interface EditProductModalProps {
    isOpen: boolean
    selectedProduct: ProductWithCategory | null
    formData: FormData
    setFormData: (data: FormData) => void
    categories: Category[]
    suppliers: Supplier[]
    units: Unit[]
    isSubmitting: boolean
    isFormValid: boolean
    onClose: () => void
    onSubmit: () => void
}

export function EditProductModal({
    isOpen,
    selectedProduct,
    formData,
    setFormData,
    categories,
    suppliers,
    units,
    isSubmitting,
    isFormValid,
    onClose,
    onSubmit,
}: EditProductModalProps) {
    if (!isOpen || !selectedProduct) return null
    console.log('[ProductModal] EditProductModal opened', { selectedProduct: selectedProduct.id, formData })

    return (
        <Modal title="Edit Produk" onClose={onClose}>
            <ProductFormFields
                formData={formData}
                setFormData={setFormData}
                categories={categories}
                suppliers={suppliers}
                units={units}
                isSubmitting={isSubmitting}
                idPrefix="edit-"
                isEdit={true}
            />
            <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => { console.log('[ProductModal] Edit cancelled'); onClose(); }} disabled={isSubmitting}>Batal</Button>
                <Button onClick={() => { console.log('[ProductModal] Edit submit clicked', { id: selectedProduct.id, formData }); onSubmit(); }} disabled={isSubmitting || !isFormValid}>
                    {isSubmitting ? 'Menyimpan...' : 'Perbarui'}
                </Button>
            </div>
        </Modal>
    )
}

interface DeleteProductModalProps {
    isOpen: boolean
    selectedProduct: ProductWithCategory | null
    isSubmitting: boolean
    onClose: () => void
    onConfirm: () => void
}

export function DeleteProductModal({
    isOpen,
    selectedProduct,
    isSubmitting,
    onClose,
    onConfirm,
}: DeleteProductModalProps) {
    if (!isOpen || !selectedProduct) return null
    console.log('[ProductModal] DeleteProductModal opened', { selectedProduct: selectedProduct.id, name: selectedProduct.name })

    return (
        <Modal title="Hapus Produk" onClose={onClose}>
            <div className="text-center py-4">
                <Trash2 className="h-12 w-12 mx-auto mb-4 text-red-500" />
                <h4 className="font-semibold text-lg mb-1">{selectedProduct.name}</h4>
                <p className="text-muted-foreground mb-3">Apakah Anda yakin ingin menghapus produk ini?</p>
                <p className="text-sm text-amber-600">
                    <strong>Perhatian:</strong> Data transaksi historis tetap tersimpan.
                </p>
            </div>
            <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => { console.log('[ProductModal] Delete cancelled'); onClose(); }} disabled={isSubmitting}>Batal</Button>
                <Button variant="destructive" onClick={() => { console.log('[ProductModal] Delete confirmed for:', selectedProduct.id); onConfirm(); }} disabled={isSubmitting}>
                    {isSubmitting ? 'Menghapus...' : 'Hapus'}
                </Button>
            </div>
        </Modal>
    )
}
