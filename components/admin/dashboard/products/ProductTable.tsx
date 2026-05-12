'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Package, Edit, Trash2, Layers, ChevronDown, ChevronUp, Barcode, Printer } from 'lucide-react'
import { Category, Product } from '@/types'
import { useState } from 'react'
import { PrintManager } from '@/lib/printer/printManager'
import { toast } from 'sonner'

type ProductWithCategory = Product & {
    categories: Pick<Category, 'name'> | null
    variants?: Product['variants']
}

interface ProductTableProps {
    products: ProductWithCategory[]
    categories: Category[]
    selectedCategory: string
    onEdit: (product: ProductWithCategory) => void
    onDelete: (product: ProductWithCategory) => void
    formatCurrency: (amount: number) => string
}

export function ProductTable({
    products,
    categories,
    selectedCategory,
    onEdit,
    onDelete,
    formatCurrency,
}: ProductTableProps) {
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
    
    // Filter products based on selected category
    const filteredProducts = selectedCategory === 'all'
        ? products
        : products.filter(p => p.category_id === selectedCategory)
    
    const toggleRow = (productId: string) => {
        const newExpanded = new Set(expandedRows)
        if (newExpanded.has(productId)) {
            newExpanded.delete(productId)
        } else {
            newExpanded.add(productId)
        }
        setExpandedRows(newExpanded)
    }

    return (
        <div className="border rounded-lg overflow-hidden card-hover">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="w-16 font-semibold">Image</TableHead>
                        <TableHead className="w-64 font-semibold">Product Name</TableHead>
                        <TableHead className="w-32 font-semibold">Barcode</TableHead>
                        <TableHead className="w-40 font-semibold hidden lg:table-cell">Category</TableHead>
                        <TableHead className="w-32 text-right font-semibold">Price (Base)</TableHead>
                        <TableHead className="w-28 text-center font-semibold">Stock</TableHead>
                        <TableHead className="w-28 text-center font-semibold hidden md:table-cell">Status</TableHead>
                        <TableHead className="w-24 text-center font-semibold">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredProducts.map((product) => (
                        <TableRow key={product.id}>
                            {/* ... existing Image cell ... */}
                            <TableCell className="w-16">
                                <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center border">
                                    {product.image_url ? (
                                        <img
                                            src={product.image_url}
                                            alt={product.name}
                                            className="w-full h-full object-cover rounded-md"
                                        />
                                    ) : (
                                        <Package className="h-5 w-5 text-muted-foreground" />
                                    )}
                                </div>
                            </TableCell>
                            {/* ... existing Name cell ... */}
                            <TableCell className="w-64 font-medium">
                                <div className="max-w-none">
                                    <p className="truncate" title={product.name}>
                                        {product.name}
                                    </p>
                                    {product.variants && product.variants.length > 0 && (
                                        <div className="mt-1 flex items-center gap-1">
                                            <Badge 
                                                variant="outline" 
                                                className="text-xs flex items-center gap-1 cursor-pointer hover:bg-muted/80 transition-colors"
                                                onClick={() => toggleRow(product.id)}
                                            >
                                                <Layers className="h-3 w-3" />
                                                {product.variants.length}
                                                {expandedRows.has(product.id) ? (
                                                    <ChevronUp className="h-3 w-3" />
                                                ) : (
                                                    <ChevronDown className="h-3 w-3" />
                                                )}
                                            </Badge>
                                        </div>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell className="w-32">
                                <code className="text-xs bg-muted px-2 py-1 rounded border break-all">
                                    {product.barcode}
                                </code>
                            </TableCell>
                            <TableCell className="w-40 hidden lg:table-cell">
                                {product.categories?.name || (
                                    <Badge variant="secondary">Uncategorized</Badge>
                                )}
                            </TableCell>
                            <TableCell className="w-32 text-right font-medium text-primary-brand">
                                {product.variants && product.variants.length > 0 ? (
                                    <div className="space-y-1">
                                        <p className="font-semibold">
                                            {formatCurrency(product.price)}
                                        </p>
                                    </div>
                                ) : (
                                    formatCurrency(product.price)
                                )}
                            </TableCell>
                            <TableCell className="w-28 text-center">
                                <Badge variant={product.stock > 10 ? 'default' : 'secondary'}>
                                    {product.stock}
                                </Badge>
                            </TableCell>
                            <TableCell className="w-28 text-center hidden md:table-cell">
                                <Badge 
                                    variant={product.is_active ? 'default' : 'secondary'}
                                    className={product.is_active ? 'status-active' : 'status-inactive'}
                                >
                                    {product.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                            </TableCell>
                            <TableCell className="w-24 text-center">
                                <div className="flex justify-center gap-1">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onEdit(product)}
                                        className="h-8 w-8 p-0 focus-ring transition-theme"
                                    >
                                        <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => onDelete(product)}
                                        className="h-8 w-8 p-0 focus-ring transition-theme"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            
            {/* Variants dropdown section */}
            <div className="border-t-0">
                {filteredProducts.map((product) => (
                    product.variants && product.variants.length > 0 && expandedRows.has(product.id) && (
                        <div key={`${product.id}-variants`} className="bg-muted/30 border-t border-b">
                            <div className="p-4">
                                <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Variant Harga - {product.name}</h4>
                                <div className="space-y-2">
                                    {product.variants.map((variant) => (
                                        <div key={variant.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2">
                                                    <Barcode className="h-4 w-4 text-muted-foreground" />
                                                    <code className="text-xs bg-muted px-2 py-1 rounded border">
                                                        {variant.barcode || 'No barcode'}
                                                    </code>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm">{variant.variant_name}</p>
                                                    {variant.is_default && (
                                                        <Badge variant="secondary" className="text-xs mt-1">Default</Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0"
                                                    title="Cetak Barcode"
                                                    onClick={async () => {
                                                        if (variant.barcode) {
                                                            const printer = PrintManager.getInstance()
                                                            await printer.printBarcode(variant.barcode, `${product.name} (${variant.variant_name})`)
                                                        } else {
                                                            toast.error("Barcode tidak tersedia")
                                                        }
                                                    }}
                                                >
                                                    <Printer className="h-4 w-4" />
                                                </Button>
                                                <div className="text-right">
                                                    <p className="font-semibold text-primary-brand">
                                                        {formatCurrency(variant.price)}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Konversi: {variant.conversion_qty}x
                                                    </p>
                                                </div>
                                                <Badge 
                                                    variant={variant.is_active ? 'default' : 'secondary'}
                                                    className={variant.is_active ? 'status-active' : 'status-inactive'}
                                                >
                                                    {variant.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )
                ))}
            </div>
        </div>
    )
}
