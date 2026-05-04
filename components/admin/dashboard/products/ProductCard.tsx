'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Package, Edit, Trash2 } from 'lucide-react'
import { Category, Product } from '@/types'

type ProductWithCategory = Product & {
    categories: Pick<Category, 'name'> | null
}

interface ProductCardProps {
    product: ProductWithCategory
    onEdit: (product: ProductWithCategory) => void
    onDelete: (product: ProductWithCategory) => void
    formatCurrency: (amount: number) => string
}

export function ProductCard({ product, onEdit, onDelete, formatCurrency }: ProductCardProps) {
    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex-shrink-0 pb-2">
                <div className="aspect-square bg-gray-100 rounded-md mb-2 flex items-center justify-center overflow-hidden">
                    {product.image_url ? (
                        <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <Package className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-gray-400" />
                    )}
                </div>
                <CardTitle className="text-xs sm:text-sm md:text-base line-clamp-2 leading-tight">{product.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between space-y-1">
                <div className="space-y-1">
                    <div className="flex justify-between items-start">
                        <span className="text-xs sm:text-sm md:text-base font-bold text-blue-600 leading-tight">
                            {formatCurrency(product.price)}
                        </span>
                        <Badge variant={product.stock > 10 ? 'default' : 'secondary'} className="text-xs px-1 py-0.5">
                            {product.stock > 10 ? '✓' : `${product.stock}`}
                        </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                        {product.barcode}
                    </p>
                </div>
                <div className="flex gap-1 pt-1">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-7 text-xs px-1"
                        onClick={() => onEdit(product)}
                    >
                        <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1 h-7 text-xs px-1"
                        onClick={() => onDelete(product)}
                    >
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
