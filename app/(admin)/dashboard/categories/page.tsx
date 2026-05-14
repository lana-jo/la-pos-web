'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Grid3x3, Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Category } from '@/types'
import { Database } from '@/types/database'
import CategoryTable from '@/components/admin/dashboard/categories/CategoryTable'
import CategoryModal from '@/components/admin/dashboard/categories/CategoryModal'

interface CategoryFormData {
  name: string
  slug: string
  icon: string
  color: string
  sort_order: number
  is_active: boolean
}

export default function CategoriesPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    slug: '',
    icon: '',
    color: '#6366f1',
    sort_order: 0,
    is_active: true
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const checkUserRole = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return false
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', session.user.id)
        .maybeSingle() as { data: { role: string; is_active: boolean } | null, error: any }

      if (profileError || !profile) {
        console.error('Error fetching profile:', profileError)
        router.push('/login')
        return false
      }

      if (profile.role !== 'admin') {
        toast.error('Akses ditolak: Hanya admin yang dapat mengakses halaman ini')
        router.push('/auth/unauthorized')
        return false
      }

      if (!profile.is_active) {
        toast.error('Akun Anda tidak aktif')
        router.push('/login')
        return false
      }

      return true
    } catch (error) {
      console.error('Error checking user role:', error)
      router.push('/login')
      return false
    }
  }, [router])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      console.log('🔄 Fetching categories from Supabase...')

      const { data, error } = await supabase
        .from('categories')
        .select(`
          *,
          products(count)
        `)
        .order('name')

      console.log('📊 Categories response:', {
        data: data ? `${data.length} items` : 'null',
        error: error?.message || 'none'
      })

      if (error) {
        console.error('❌ Supabase error:', error)
        toast.error('Database error: ' + error.message)
        throw error
      }

      // Type assertion for the nested structure returned by Supabase
      type CategoryWithProducts = Category & {
        products?: { count: number }[]
      }

      // Flatten product count from nested structure
      const categoriesWithCount = (data as CategoryWithProducts[] || []).map((cat) => ({
        ...cat,
        product_count: cat.products?.[0]?.count ?? 0
      }))

      if (!categoriesWithCount || categoriesWithCount.length === 0) {
        console.log('⚠️ No categories found in database')
        toast.warning('Tidak ada kategori di database')
      } else {
        console.log('✅ Successfully retrieved', categoriesWithCount.length, 'categories')
        toast.success(`Berhasil mengambil ${categoriesWithCount.length} kategori`)
      }

      setCategories(categoriesWithCount)
    } catch (error) {
      console.error('💥 Critical error fetching categories:', error)
      toast.error('Gagal koneksi ke database')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      const isAdmin = await checkUserRole()
      if (isAdmin) {
        fetchData()
      }
    }
    init()
  }, [checkUserRole, fetchData])

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      icon: '',
      color: '#6366f1',
      sort_order: 0,
      is_active: true
    })
    setSelectedCategory(null)
  }

  const handleAddCategory = async () => {
    if (!formData.name.trim()) {
      toast.error('Nama kategori harus diisi')
      return
    }

    setIsSubmitting(true)
    try {
      // Check for duplicate category name
      const { data: existingCategory } = await supabase
        .from('categories')
        .select('id')
        .eq('name', formData.name.trim())
        .maybeSingle()

      if (existingCategory) {
        toast.error('Nama kategori sudah ada')
        setIsSubmitting(false)
        return
      }

      const categoryData: Database['public']['Tables']['categories']['Insert'] = {
        name: formData.name.trim(),
        slug: formData.slug.trim() || formData.name.trim().toLowerCase().replace(/\s+/g, '-'),
        icon: formData.icon.trim() || null,
        color: formData.color.trim() || '#6366f1',
        sort_order: formData.sort_order,
        is_active: formData.is_active
      }

      console.log('📝 Category data to insert:', categoryData)

      const { data, error } = await supabase
        .from('categories')
        .insert(categoryData as any)
        .select()
        .single()

      if (error) {
        console.error('❌ Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }

      if (!data) throw new Error('Gagal membuat kategori: No data returned')

      toast.success('Kategori berhasil ditambahkan')
      setShowAddModal(false)
      resetForm()
      fetchData()
    } catch (error: unknown) {
      console.error('💥 Error adding category:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast.error('Gagal menambahkan kategori: ' + message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditCategory = async () => {
    if (!selectedCategory || !formData.name.trim()) {
      toast.error('Nama kategori harus diisi')
      return
    }

    setIsSubmitting(true)
    try {
      // Check for duplicate category name (excluding current category)
      const { data: existingCategory } = await supabase
        .from('categories')
        .select('id')
        .eq('name', formData.name.trim())
        .neq('id', selectedCategory.id)
        .maybeSingle()

      if (existingCategory) {
        toast.error('Nama kategori sudah ada')
        setIsSubmitting(false)
        return
      }

      const categoryData = {
        name: formData.name.trim(),
        slug: formData.slug.trim() || formData.name.trim().toLowerCase().replace(/\s+/g, '-'),
        icon: formData.icon.trim() || null,
        color: formData.color.trim() || '#6366f1',
        sort_order: formData.sort_order,
        is_active: formData.is_active
      }

      const { data, error } = await supabase
        .from('categories')
        .update(categoryData as any)
        .eq('id', selectedCategory.id)
        .select()
        .single()

      if (error) throw error
      if (!data) throw new Error('Update gagal: Kategori tidak ditemukan atau akses ditolak (RLS)')

      toast.success('Kategori berhasil diperbarui')
      setShowEditModal(false)
      resetForm()
      fetchData()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error('Error updating category:', error)
      toast.error('Gagal memperbarui kategori: ' + message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteCategory = async () => {
    if (!selectedCategory) return

    setIsSubmitting(true)

    try {
      if (selectedCategory.product_count && selectedCategory.product_count > 0) {
        const { error: unlinkError } = await supabase
          .from('products')
          .update({ category_id: null })
          .eq('category_id', selectedCategory.id)

        if (unlinkError) throw unlinkError
      }

      const { data, error } = await supabase
        .from('categories')
        .delete()
        .eq('id', selectedCategory.id)
        .select()

      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('Hapus gagal: Kategori tidak ditemukan atau akses ditolak (RLS)')
      }

      toast.success('Kategori berhasil dihapus')
      setShowDeleteModal(false)
      setSelectedCategory(null)
      fetchData()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error('💥 Delete failed:', error)
      toast.error('Gagal: ' + message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const openDeleteModal = (category: Category) => {
    setSelectedCategory(category)
    setShowDeleteModal(true)
  }

  const openEditModal = (category: Category) => {
    setSelectedCategory(category)
    setFormData({
      name: category.name,
      slug: category.slug,
      icon: category.icon || '',
      color: category.color || '#6366f1',
      sort_order: category.sort_order || 0,
      is_active: category.is_active
    })
    setShowEditModal(true)
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Kategori</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchData} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Grid3x3 className="h-4 w-4 mr-2" />}
              Refresh Data
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Kategori
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Memuat data...</span>
          </div>
        ) : (
          <CategoryTable
            categories={categories}
            onEdit={openEditModal}
            onDelete={openDeleteModal}
          />
        )}

        <CategoryModal
          showAddModal={showAddModal}
          showEditModal={showEditModal}
          showDeleteModal={showDeleteModal}
          selectedCategory={selectedCategory}
          formData={formData}
          setFormData={setFormData}
          isSubmitting={isSubmitting}
          onCloseAdd={() => setShowAddModal(false)}
          onCloseEdit={() => setShowEditModal(false)}
          onCloseDelete={() => {
            setShowDeleteModal(false)
            setSelectedCategory(null)
          }}
          onAdd={handleAddCategory}
          onEdit={handleEditCategory}
          onDelete={handleDeleteCategory}
        />
      </main>
    </div>
  )
}
