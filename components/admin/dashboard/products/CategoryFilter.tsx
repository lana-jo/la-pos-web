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
                className={`rounded-full px-4 border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-brand shadow-sm transition-all duration-200 ${
                    selectedCategory === 'all' 
                        ? 'bg-primary-brand text-white border-primary-brand' 
                        : 'hover:bg-muted'
                }`}
                onClick={() => onSelectCategory('all')}
            >
                Semua
            </Button>
            {categories.map((cat) => (
                <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? 'default' : 'outline'}
                    size="sm"
                    className={`rounded-full px-4 border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-brand shadow-sm transition-all duration-200 ${
                        selectedCategory === cat.id 
                            ? 'bg-primary-brand text-white border-primary-brand' 
                            : 'hover:bg-muted'
                    }`}
                    onClick={() => onSelectCategory(cat.id)}
                >
                    {cat.name}
                </Button>
            ))}
        </div>
    )
}
