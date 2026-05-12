'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Package, Plus } from 'lucide-react'

interface EmptyStateProps {
    isCategoryFiltered: boolean
    onAddProduct: () => void
}

export function EmptyState({ isCategoryFiltered, onAddProduct }: EmptyStateProps) {
    return (
        <Card>
            <CardContent className="text-center py-12">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">
                    {isCategoryFiltered ? 'Tidak ada produk dalam kategori ini' : 'Tidak ada produk ditemukan'}
                </h3>
                <p className="text-gray-500 mb-4">
                    {isCategoryFiltered
                        ? 'Coba pilih kategori yang berbeda'
                        : 'Mulai dengan menambahkan produk pertama Anda'}
                </p>
                <Button onClick={onAddProduct}>
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Produk
                </Button>
            </CardContent>
        </Card>
    )
}
