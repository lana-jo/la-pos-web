'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { logout } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Store, Package, Grid, List, LogOut } from 'lucide-react'
import { Product, Category } from '@/types'

// Extended product type with Supabase joined categories
interface ProductWithCategory extends Product {
  category: Category | null
}
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

export default function CatalogPage() {
  const router = useRouter()
  const [products, setProducts] = useState<ProductWithCategory[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<any>(null)
  const [selectedProduct, setSelectedProduct] = useState<ProductWithCategory | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    setSession(session)
  }

  const handleLogout = async () => {
    try {
      const result = await logout()
      if (!result.success) {
        toast.error(result.error || 'Gagal logout')
        return
      }
      toast.success('Logout berhasil')
      setSession(null)
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Terjadi kesalahan saat logout')
    }
  }

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        supabase
          .from('products')
          .select('*, categories(*)')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('name')
      ])

      if (productsRes.error) throw productsRes.error
      if (categoriesRes.error) throw categoriesRes.error

      // Map categories (Supabase returns as array) to single category
      const mappedProducts: ProductWithCategory[] = (productsRes.data || []).map((p: any) => ({
        ...p,
        category: Array.isArray(p.categories) ? p.categories[0] ?? null : p.categories ?? null
      }))
      setProducts(mappedProducts)
      setCategories(categoriesRes.data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setIsMounted(true)
    fetchData()
    checkSession()
  }, [])

  if (!isMounted) return null;

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.barcode.includes(searchQuery)
    const matchesCategory = !selectedCategory || product.category_id === selectedCategory
    return matchesSearch && matchesCategory
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Group products by category for display
  const groupedProducts = () => {
    if (selectedCategory || viewMode === 'list') {
      return { '': filteredProducts }
    }
    return filteredProducts.reduce((acc, product) => {
      const catName = product.category?.name || 'Uncategorized'
      if (!acc[catName]) acc[catName] = []
      acc[catName].push(product)
      return acc
    }, {} as Record<string, typeof filteredProducts>)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Store className="h-12 w-12 mx-auto mb-4 text-primary-brand" />
          <p className="text-lg">Loading catalog...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Store className="h-8 w-8 text-primary-brand" />
              <div>
                <h1 className="text-xl font-bold text-foreground">Product Catalog</h1>
                <p className="text-sm text-muted-foreground">Browse our products</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              {session ? (
                <Button variant="outline" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              ) : (
                <Button variant="outline" onClick={() => router.push('/login')}>
                  Login
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Category Filters */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                variant={!selectedCategory ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                All Categories
              </Button>
              {categories.filter(category => 
                products.some(product => product.category_id === category.id)
              ).map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Products */}
        {filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium text-foreground mb-2">No products found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filters</p>
            </CardContent>
          </Card>
        ) : viewMode === 'list' || selectedCategory ? (
          // List view OR filtered by category - show flat list
          <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4' : 'space-y-4'}>
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col card-hover"
                onClick={() => {
                  setSelectedProduct(product)
                  setIsModalOpen(true)
                }}
              >
                  <CardHeader className="pb-2 flex-shrink-0">
                    <div className="aspect-square bg-muted rounded-md mb-2 flex items-center justify-center border">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover rounded-md"
                        />
                      ) : (
                        <Package className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-gray-400" />
                      )}
                    </div>
                    <CardTitle className="text-xs sm:text-sm md:text-base line-clamp-2 leading-tight">{product.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm md:text-base font-bold text-primary-brand leading-tight">
                        {formatCurrency(product.price)}
                      </span>
                      <Badge variant={product.stock > 10 ? 'default' : 'secondary'} className="text-xs px-1 py-0.5">
                        {product.stock > 10 ? '✓' : `${product.stock}`}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
            ))}
          </div>
        ) : (
          // Grid view without category filter - group by category
          <div className="space-y-8">
            {Object.entries(groupedProducts()).map(([catName, products]) => (
              <div key={catName}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-primary-brand"></span>
                  {catName}
                  <span className="text-sm font-normal text-muted-foreground">({products.length})</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {products.map((product) => (
                    <Card
                      key={product.id}
                      className="hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col card-hover"
                      onClick={() => {
                        setSelectedProduct(product)
                        setIsModalOpen(true)
                      }}
                    >
                        <CardHeader className="pb-2 flex-shrink-0">
                          <div className="aspect-square bg-muted rounded-md mb-2 flex items-center justify-center border">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-full h-full object-cover rounded-md"
                              />
                            ) : (
                              <Package className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-gray-400" />
                            )}
                          </div>
                          <CardTitle className="text-xs sm:text-sm md:text-base line-clamp-2 leading-tight">{product.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 flex-1 flex flex-col justify-between">
                          <div className="flex justify-between items-center">
                            <span className="text-xs sm:text-sm md:text-base font-bold text-primary-brand leading-tight">
                              {formatCurrency(product.price)}
                            </span>
                            <Badge variant={product.stock > 10 ? 'default' : 'secondary'} className="text-xs px-1 py-0.5">
                              {product.stock > 10 ? '✓' : `${product.stock}`}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Product Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md w-full mx-4">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Product Details</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Detailed information about the selected product
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div className="aspect-square bg-muted rounded-md flex items-center justify-center overflow-hidden border">
                {selectedProduct.image_url ? (
                  <img
                    src={selectedProduct.image_url}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 text-gray-400" />
                )}
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-semibold">{selectedProduct.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Category: {selectedProduct.category?.name || 'Uncategorized'}
                </p>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xl sm:text-2xl font-bold text-primary-brand">
                  {formatCurrency(selectedProduct.price)}
                </span>
                <Badge variant={selectedProduct.stock > 10 ? 'default' : 'secondary'} className="text-xs">
                  {selectedProduct.stock > 10 ? 'In Stock' : `Only ${selectedProduct.stock} left`}
                </Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stock:</span>
                  <span className="font-medium">{selectedProduct.stock} units</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
