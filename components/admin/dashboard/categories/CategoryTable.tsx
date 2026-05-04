'use client'

import {Button} from '@/components/ui/button'
import {Badge} from '@/components/ui/badge'
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table'
import {Edit, Trash2} from 'lucide-react'
import {Category} from '@/types'

interface CategoryTableProps {
    categories: Category[]
    onEdit: (category: Category) => void
    onDelete: (category: Category) => void
}

export default function CategoryTable({categories, onEdit, onDelete}: CategoryTableProps) {
    if (categories.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="text-6xl mb-4">📂</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No categories found</h3>
                <p className="text-gray-500">Start by adding your first category</p>
            </div>
        )
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Icon</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {categories.map((category) => (
                    <TableRow key={category.id}>
                        <TableCell>
                            <span className="text-xl">{category.icon || '📁'}</span>
                        </TableCell>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell>{category.slug}</TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2">
                                <div 
                                    className="w-6 h-6 rounded border border-gray-300" 
                                    style={{ backgroundColor: category.color || '#6366f1' }}
                                />
                                <span className="text-sm text-gray-600">{category.color || '#6366f1'}</span>
                            </div>
                        </TableCell>
                        <TableCell>{category.sort_order || 0}</TableCell>
                        <TableCell>
                            <Badge variant={category.is_active ? 'default' : 'secondary'}>
                                {category.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                        </TableCell>
                        <TableCell>{category.product_count || 0}</TableCell>
                        <TableCell>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => onEdit(category)}>
                                    <Edit className="h-4 w-4 mr-1"/>
                                    Edit
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => onDelete(category)}>
                                    <Trash2 className="h-4 w-4 mr-1"/>
                                    Delete
                                </Button>
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}
