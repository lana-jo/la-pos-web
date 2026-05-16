import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { fetchProductsWithVariants, fetchUnits, fetchSuppliers } from '@/lib/products/actions'
import { supabase } from '@/lib/supabase/client'
import { Category, Product, Unit, Supplier } from '@/types'

export type ProductWithCategory = Product & {
    categories: Pick<Category, 'name'> | null
}

export function useProductData() {
    const [products, setProducts] = useState<ProductWithCategory[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [units, setUnits] = useState<Unit[]>([])
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [loading, setLoading] = useState(true)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const { data: categoriesData, error: categoriesError } = await (supabase.from('categories') as any)
                .select('*')
                .eq('is_active', true)
                .order('name')

            if (categoriesError) throw categoriesError
            setCategories(categoriesData ?? [])

            const result = await fetchProductsWithVariants()
            setProducts((result || []) as ProductWithCategory[])

            const unitsResult = await fetchUnits()
            if (unitsResult.success) setUnits(unitsResult.data ?? [])

            const suppliersResult = await fetchSuppliers()
            if (suppliersResult.success) setSuppliers(suppliersResult.data ?? [])
        } catch (error) {
            console.error('Error fetching products:', error)
            toast.error('Gagal mengambil data produk')
        } finally {
            setLoading(false)
        }
    }, [])

    return { products, categories, units, suppliers, loading, fetchData }
}
