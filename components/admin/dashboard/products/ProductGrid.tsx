'use client'

import { Badge } from '@/components/ui/badge'
import { ProductCard } from './ProductCard'
import { Category, Product } from '@/types'

type ProductWithCategory = Product & {
    categories: Pick<Category, 'name'> | null
}

interface ProductGridProps {
    products: ProductWithCategory[]
    categories: Category[]
    selectedCategory: string
    onEdit: (product: ProductWithCategory) => void
    onDelete: (product: ProductWithCategory) => void
    formatCurrency: (amount: number) => string
}

export function ProductGrid({
    products,
    categories,
    selectedCategory,
    onEdit,
    onDelete,
    formatCurrency,
}: ProductGridProps) {
    // Single category view
    if (selectedCategory !== 'all') {
        const categoryName = categories.find(c => c.id === selectedCategory)?.name || 'Category'
        const filteredProducts = products.filter(p => p.category_id === selectedCategory)

        return (
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-xl font-semibold text-gray-700">{categoryName}</h3>
                    <Badge variant="secondary">{filteredProducts.length} products</Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {filteredProducts.map((product) => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            formatCurrency={formatCurrency}
                        />
                    ))}
                </div>
            </div>
        )
    }

    // All categories view - grouped by category
    const uncategorized = products.filter(p => !p.category_id)

    return (
        <div className="space-y-8">
            {categories.map((category) => {
                const categoryProducts = products.filter(p => p.category_id === category.id)
                if (categoryProducts.length === 0) return null

                return (
                    <div key={category.id}>
                        <div className="flex items-center gap-2 mb-4">
                            <h3 className="text-xl font-semibold text-gray-700">{category.name}</h3>
                            <Badge variant="secondary">{categoryProducts.length} products</Badge>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {categoryProducts.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                    formatCurrency={formatCurrency}
                                />
                            ))}
                        </div>
                    </div>
                )
            })}

            {/* Uncategorized products */}
            {uncategorized.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <h3 className="text-xl font-semibold text-gray-700">Uncategorized</h3>
                        <Badge variant="secondary">{uncategorized.length} products</Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {uncategorized.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                formatCurrency={formatCurrency}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
