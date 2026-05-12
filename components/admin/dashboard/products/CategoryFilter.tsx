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
        <div className="flex flex-wrap gap-2">
            <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                className="rounded-full px-4"
                onClick={() => onSelectCategory('all')}
            >
                Semua
            </Button>
            {categories.map((cat) => (
                <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-full px-4"
                    onClick={() => onSelectCategory(cat.id)}
                >
                    {cat.name}
                </Button>
            ))}
        </div>
    )
}
