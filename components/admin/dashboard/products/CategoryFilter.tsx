'use client'

import { Button } from '@/components/ui/button'
import { Category } from '@/types'

interface CategoryFilterProps {
    categories: Category[]
    selectedCategory: string
    onSelectCategory: (categoryId: string) => void
}

export function CategoryFilter({ categories, selectedCategory, onSelectCategory }: CategoryFilterProps) {
    return (
        <div className="flex gap-2">
            <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onSelectCategory('all')}
            >
                All
            </Button>
            {categories.map((cat) => (
                <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onSelectCategory(cat.id)}
                >
                    {cat.name}
                </Button>
            ))}
        </div>
    )
}
