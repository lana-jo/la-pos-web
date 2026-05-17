'use server'

import { revalidatePath } from 'next/cache'
import { uploadProductImage, updateProductImage } from '@/lib/storage/actions'
import { supabaseServer, createSupabaseServerClient } from '@/lib/supabase/server'
import { Database } from '@/types'

// Types based on Database schema
type ProductInsert = Database['public']['Tables']['products']['Insert']
type ProductUpdate = Database['public']['Tables']['products']['Update']
type VariantInsert = Database['public']['Tables']['product_variants']['Insert']
type VariantUpdate = Database['public']['Tables']['product_variants']['Update']

interface ProductPayload extends Omit<ProductInsert, 'id' | 'created_at' | 'updated_at'> {}
interface VariantPayload extends Omit<VariantInsert, 'id' | 'created_at' | 'updated_at'> {
  id?: string
}

export async function createProductWithVariants(formData: FormData) {
  try {
    const product = JSON.parse(formData.get('product') as string) as ProductPayload
    const variants = JSON.parse(formData.get('variants') as string) as VariantPayload[]
    const imageFile = formData.get('imageFile') as File | null

    console.log('➕ [DEBUG] createProductWithVariants called', {
      name: product.name,
      variantsCount: variants.length,
      hasImage: !!imageFile
    })

    const supabase = await createSupabaseServerClient()

    // Check for duplicate barcode (more critical than name)
    const { data: existingBarcode } = await (supabase as any)
      .from('products')
      .select('id, name')
      .eq('barcode', product.barcode)
      .maybeSingle()

    if (existingBarcode) {
      return { success: false, error: `Barcode "${product.barcode}" sudah digunakan oleh produk "${existingBarcode.name}"` }
    }

    // Check for duplicate product name (case-insensitive)
    const { data: existingNames } = await (supabase as any)
      .from('products')
      .select('id, name')
      .ilike('name', product.name)
      .eq('is_active', true)
      .limit(1)

    if (existingNames && existingNames.length > 0) {
      return { success: false, error: `Produk dengan nama "${product.name}" sudah terdaftar` }
    }

    // Insert product
    const { data: newProduct, error: productError } = await (supabase as any)
      .from('products')
      .insert(product)
      .select('id')
      .single()

    if (productError) {
      console.error('❌ [ERROR] Product creation failed', productError)
      return { success: false, error: productError.message }
    }

    const productId = (newProduct as any).id

    // Upload image if provided
    if (imageFile) {
      const uploadResult = await uploadProductImage(imageFile, productId)
      
      if (uploadResult.success && uploadResult.url) {
        await (supabase as any)
          .from('products')
          .update({ image_url: uploadResult.url })
          .eq('id', productId)
      }
    }

    // Insert variants
    if (variants.length > 0) {
      const variantsWithProductId = variants.map(v => ({
        ...v,
        product_id: productId,
        // Ensure cost_price is calculated correctly if inherited
        cost_price: v.inherit_cost_price ? ((product.cost_price || 0) * (v.conversion_qty || 1)) : v.cost_price,
      }))

      const { error: variantError } = await (supabase as any)
        .from('product_variants')
        .insert(variantsWithProductId as any[]) // Casting to any[] because of complex Insert type

      if (variantError) {
        console.error('❌ [ERROR] Variants creation failed', variantError)
        return { success: false, error: 'Produk dibuat tapi gagal menambahkan varian: ' + variantError.message }
      }
    }

    revalidatePath('/dashboard/products')
    revalidatePath('/dashboard/inventory')
    return { success: true, data: newProduct }
  } catch (error: any) {
    console.error('💥 [CRITICAL] Unexpected error in createProductWithVariants', error)
    return { success: false, error: error.message || 'Gagal membuat produk' }
  }
}

export async function updateProductWithVariants(
  productId: string,
  existingVariantIds: string[],
  formData: FormData,
  currentImageUrl?: string
) {
  try {
    const product = JSON.parse(formData.get('product') as string) as ProductUpdate
    const variants = JSON.parse(formData.get('variants') as string) as VariantPayload[]
    const imageFile = formData.get('imageFile') as File | null

    console.log('🔄 [DEBUG] updateProductWithVariants called', { productId, name: product.name })

    const supabase = await createSupabaseServerClient()

    // Check for duplicate barcode
    if (product.barcode) {
      const { data: existingBarcode } = await (supabase as any)
        .from('products')
        .select('id, name')
        .eq('barcode', product.barcode)
        .neq('id', productId)
        .maybeSingle()

      if (existingBarcode) {
        return { success: false, error: `Barcode "${product.barcode}" sudah digunakan oleh produk "${existingBarcode.name}"` }
      }
    }

    // Check for duplicate product name (case-insensitive)
    if (product.name) {
      const { data: existingNames } = await (supabase as any)
        .from('products')
        .select('id, name')
        .ilike('name', product.name)
        .eq('is_active', true)
        .neq('id', productId)
        .limit(1)

      if (existingNames && existingNames.length > 0) {
        return { success: false, error: `Produk dengan nama "${product.name}" sudah terdaftar` }
      }
    }

    let finalImageUrl = product.image_url

    // Handle image upload
    if (imageFile) {
      const uploadResult = await updateProductImage(imageFile, productId, currentImageUrl)
      if (uploadResult.success) {
        finalImageUrl = uploadResult.url
      }
    }

    // Update product
    const { error: productError } = await (supabase as any)
      .from('products')
      .update({
        ...product,
        image_url: finalImageUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId)

    if (productError) {
      console.error('❌ [ERROR] Product update failed', productError)
      return { success: false, error: productError.message }
    }

    // Variant sync logic
    const updatedVariantIds = variants.filter(v => v.id).map(v => v.id!)
    const idsToDelete = existingVariantIds.filter(id => !updatedVariantIds.includes(id))

    if (idsToDelete.length > 0) {
      await (supabase as any).from('product_variants').delete().in('id', idsToDelete)
    }

    for (const v of variants) {
      const variantData = {
        ...v,
        cost_price: v.inherit_cost_price ? (((product as any).cost_price || 0) * (v.conversion_qty || 1)) : v.cost_price,
        updated_at: new Date().toISOString(),
      }

      if (v.id) {
        const { id, ...updateFields } = variantData
        await (supabase as any).from('product_variants').update(updateFields as any).eq('id', v.id)
      } else {
        await (supabase as any).from('product_variants').insert({ ...variantData, product_id: productId } as any)
      }
    }

    revalidatePath('/dashboard/products')
    revalidatePath('/dashboard/inventory')
    return { success: true }
  } catch (error: any) {
    console.error('💥 [CRITICAL] Unexpected error in updateProductWithVariants', error)
    return { success: false, error: error.message || 'Gagal memperbarui produk' }
  }
}

export async function deleteProduct(productId: string) {
  try {
    const supabase = await createSupabaseServerClient()
    const { error } = await (supabase as any)
      .from('products')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', productId)

    if (error) throw error
    revalidatePath('/dashboard/products')
    revalidatePath('/dashboard/inventory')
    return { success: true }
  } catch (error: any) {
    console.error('💥 [CRITICAL] Error in deleteProduct', error)
    return { success: false, error: error.message }
  }
}

export async function fetchProductsWithVariants() {
  try {
    const { data, error } = await (supabaseServer as any)
      .from('products')
      .select('*, categories(name), product_variants(*)')
      .eq('is_active', true)
      .order('name')

    if (error) throw error
    
    return (data || []).map((p: any) => ({
      ...p,
      variants: p.product_variants || []
    }))
  } catch (error) {
    console.error('Error fetching products:', error)
    return []
  }
}

export async function fetchAllVariants() {
  try {
    const { data: variants, error } = await (supabaseServer as any)
      .from('product_variants')
      .select(`
        *,
        products!inner(id, name, unit_id)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    const formattedData = (variants || []).map((variant: any) => ({
      ...variant,
      product_name: variant.products.name,
      unit_id: variant.products.unit_id
    }))

    return { success: true, data: formattedData }
  } catch (error: any) {
    console.error('Error fetching variants:', error)
    return { success: false, error: error.message }
  }
}

export async function createVariant(payload: VariantInsert) {
  try {
    const supabase = await createSupabaseServerClient()
    const { error } = await (supabase as any).from('product_variants').insert(payload)
    if (error) throw error
    revalidatePath('/dashboard/products/variants')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateVariant(variantId: string, payload: VariantUpdate) {
  try {
    const supabase = await createSupabaseServerClient()
    const { error } = await (supabase as any)
      .from('product_variants')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', variantId)
    if (error) throw error
    revalidatePath('/dashboard/products/variants')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deactivateVariant(variantId: string) {
  try {
    const supabase = await createSupabaseServerClient()
    const { error } = await (supabase as any)
      .from('product_variants')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', variantId)
    if (error) throw error
    revalidatePath('/dashboard/products/variants')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function fetchSuppliers() {
  try {
    const { data, error } = await (supabaseServer as any)
      .from('suppliers')
      .select('*')
      .eq('is_active', true)
      .order('name')
    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function fetchUnits() {
  try {
    const { data, error } = await (supabaseServer as any)
      .from('units')
      .select('*')
      .eq('is_active', true)
      .order('name')
    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
