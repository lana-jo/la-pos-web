'use client'

import {Button} from '@/components/ui/button'
import {X, Edit, Trash2} from 'lucide-react'
import {Category} from '@/types'
import CategoryForm from './CategoryForm'

interface CategoryFormData {
    name: string
    slug: string
    icon: string
    color: string
    sort_order: number
    is_active: boolean
}

interface CategoryModalProps {
    showAddModal: boolean
    showEditModal: boolean
    showDeleteModal: boolean
    selectedCategory: Category | null
    formData: CategoryFormData
    setFormData: (data: CategoryFormData) => void
    isSubmitting: boolean
    onCloseAdd: () => void
    onCloseEdit: () => void
    onCloseDelete: () => void
    onAdd: () => void
    onEdit: () => void
    onDelete: () => void
}

export default function CategoryModal({
    showAddModal,
    showEditModal,
    showDeleteModal,
    selectedCategory,
    formData,
    setFormData,
    isSubmitting,
    onCloseAdd,
    onCloseEdit,
    onCloseDelete,
    onAdd,
    onEdit,
    onDelete
}: CategoryModalProps) {
    
    // Add Modal
    if (showAddModal) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-card rounded-lg border p-6 w-full max-w-md">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Tambah Kategori Baru</h3>
                        <Button variant="ghost" size="sm" onClick={onCloseAdd}>
                            <X className="h-4 w-4"/>
                        </Button>
                    </div>

                    <CategoryForm 
                        formData={formData} 
                        setFormData={setFormData} 
                        isSubmitting={isSubmitting}
                        isEdit={false}
                    />

                    <div className="flex justify-end gap-2 mt-6">
                        <Button variant="outline" onClick={onCloseAdd} disabled={isSubmitting}>
                            Batal
                        </Button>
                        <Button onClick={onAdd} disabled={isSubmitting || !formData.name.trim()}>
                            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    // Edit Modal
    if (showEditModal) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-card rounded-lg border p-6 w-full max-w-md">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Edit Kategori</h3>
                        <Button variant="ghost" size="sm" onClick={onCloseEdit}>
                            <X className="h-4 w-4"/>
                        </Button>
                    </div>

                    <CategoryForm 
                        formData={formData} 
                        setFormData={setFormData} 
                        isSubmitting={isSubmitting}
                        isEdit={true}
                    />

                    <div className="flex justify-end gap-2 mt-6">
                        <Button variant="outline" onClick={onCloseEdit} disabled={isSubmitting}>
                            Batal
                        </Button>
                        <Button onClick={onEdit} disabled={isSubmitting || !formData.name.trim()}>
                            {isSubmitting ? 'Menyimpan...' : 'Perbarui'}
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    // Delete Modal
    if (showDeleteModal && selectedCategory) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-card rounded-lg border p-6 w-full max-w-md">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-red-600">Hapus Kategori</h3>
                        <Button variant="ghost" size="sm" onClick={onCloseDelete}>
                            <X className="h-4 w-4"/>
                        </Button>
                    </div>

                    <div className="space-y-4">
                        <div className="text-center py-4">
                            <Trash2 className="h-12 w-12 mx-auto mb-4 text-red-500"/>
                            <h4 className="font-medium text-lg mb-2">{selectedCategory.name}</h4>
                            <p className="text-gray-500">
                                Apakah Anda yakin ingin menghapus kategori ini?
                            </p>
                            {selectedCategory.product_count && selectedCategory.product_count > 0 && (
                                <p className="text-sm text-amber-600 mt-2">
                                    <strong>Perhatian:</strong> Kategori ini
                                    memiliki {selectedCategory.product_count} produk.
                                    Produk tidak akan dihapus, tetapi akan kehilangan kategorinya.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-6">
                        <Button variant="outline" onClick={onCloseDelete} disabled={isSubmitting}>
                            Batal
                        </Button>
                        <Button variant="destructive" onClick={onDelete} disabled={isSubmitting}>
                            {isSubmitting ? 'Menghapus...' : 'Hapus'}
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return null
}
