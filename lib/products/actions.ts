'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { uploadProductImage, updateProductImage } from '@/lib/storage/actions'

// Temporary untyped client to bypass TypeScript issues
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseUntyped = createClient(supabaseUrl, supabaseServiceKey)

// Log authentication context for debugging
console.log('🔐 [AUTH] Product actions initialized', {
  supabaseUrl,
  hasServiceKey: !!supabaseServiceKey,
  serviceKeyPrefix: supabaseServiceKey ? supabaseServiceKey.substring(0, 10) + '...' : 'missing'
})

interface ProductPayload {
  name: string
  barcode: string
  price: number
  stock: number
  category_id: string | null
  image_url: string | null
  is_active: boolean
}

interface ProductWithImagePayload extends ProductWithVariantsPayload {
  imageFile?: File
}

interface VariantPayload {
  id?: string
  variant_name: string
  barcode: string | null
  price: number
  cost_price: number
  conversion_qty: number
  is_active: boolean
  is_default: boolean
}

interface ProductWithVariantsPayload {
  product: ProductPayload
  variants: VariantPayload[]
}

export async function createProductWithVariants(payload: ProductWithImagePayload) {
  console.log('➕ [DEBUG] createProductWithVariants called', {
    variantsCount: payload.variants.length,
    hasImage: !!payload.imageFile,
    payload: JSON.stringify({ ...payload, imageFile: payload.imageFile?.name || null }, null, 2)
  })

  try {
    // Insert product first
    console.log('📝 [DEBUG] Creating product', payload.product)
    
    const { data: newProduct, error: productError } = await supabaseUntyped
      .from('products')
      .insert(payload.product as any)
      .select('id')
      .single()
      .returns<{ id: string }>()

    if (productError) {
      console.error('❌ [ERROR] Product creation failed', productError)
      return { success: false, error: productError.message }
    }

    if (!newProduct) {
      console.error('❌ [ERROR] No product data returned')
      return { success: false, error: 'Failed to create product' }
    }

    // Extract product ID with explicit typing
    const productId = (newProduct as { id: string }).id;
    console.log('✅ [SUCCESS] Product created successfully', { productId })

    // Upload image if provided
    if (payload.imageFile) {
      console.log('📤 [DEBUG] Uploading product image')
      const uploadResult = await uploadProductImage(payload.imageFile, productId)
      
      if (!uploadResult.success) {
        console.error('❌ [ERROR] Image upload failed', uploadResult.error)
        // Don't fail the entire operation if image upload fails, just log it
        console.warn('⚠️ [WARN] Product created but image upload failed')
      } else {
        console.log('✅ [SUCCESS] Image uploaded successfully', { url: uploadResult.url })
        
        // Update product with image URL
        const { error: updateError } = await supabaseUntyped
          .from('products')
          .update({ image_url: uploadResult.url })
          .eq('id', productId)

        if (updateError) {
          console.error('❌ [ERROR] Failed to update product with image URL', updateError)
          // Don't fail the operation, just log it
          console.warn('⚠️ [WARN] Image uploaded but failed to update product record')
        }
      }
    }

    // Insert variants if any
    if (payload.variants.length > 0) {
      console.log('➕ [DEBUG] Creating variants', { count: payload.variants.length })
      
      const variantsWithProductId = payload.variants.map(v => ({
        product_id: productId,
        variant_name: v.variant_name,
        barcode: v.barcode,
        price: v.price,
        cost_price: v.cost_price,
        conversion_qty: v.conversion_qty,
        is_active: v.is_active,
        is_default: v.is_default,
      }))

      console.log('📝 [DEBUG] Inserting variants data', variantsWithProductId)

      const { error: variantError } = await supabaseUntyped
        .from('product_variants')
        .insert(variantsWithProductId as any)

      if (variantError) {
        console.error('❌ [ERROR] Variants creation failed', variantError)
        return { success: false, error: variantError.message }
      }
      
      console.log('✅ [SUCCESS] All variants created successfully')
    } else {
      console.log('ℹ️ [INFO] No variants to create')
    }

    console.log('🎉 [SUCCESS] Product creation completed successfully')
    revalidatePath('/dashboard/products')
    return { success: true, data: newProduct }
  } catch (error) {
    console.error('💥 [CRITICAL] Unexpected error in createProductWithVariants', error)
    return { success: false, error: 'Failed to create product' }
  }
}

export async function updateProductWithVariants(
  productId: string,
  existingVariantIds: string[],
  payload: ProductWithImagePayload,
  currentImageUrl?: string
) {
  console.log('🔄 [DEBUG] updateProductWithVariants called', {
    productId,
    existingVariantIds,
    variantsCount: payload.variants.length,
    hasImage: !!payload.imageFile,
    currentImageUrl,
    payload: JSON.stringify({ ...payload, imageFile: payload.imageFile?.name || null }, null, 2)
  })

  try {
    let finalImageUrl: string | null = payload.product.image_url

    // Handle image upload if new image provided
    if (payload.imageFile) {
      console.log('📤 [DEBUG] Uploading new product image')
      const uploadResult = await updateProductImage(payload.imageFile, productId, currentImageUrl)
      
      if (!uploadResult.success) {
        console.error('❌ [ERROR] Image upload failed', uploadResult.error)
        // Don't fail the entire operation if image upload fails, just log it
        console.warn('⚠️ [WARN] Product updated but image upload failed')
      } else {
        console.log('✅ [SUCCESS] Image uploaded successfully', { url: uploadResult.url })
        finalImageUrl = uploadResult.url || null
      }
    }

    // Update product with potentially new image URL
    const updateData = {
      ...payload.product,
      image_url: finalImageUrl || null,
      updated_at: new Date().toISOString(),
    };
    
    console.log('📝 [DEBUG] Updating product', { productId, updateData })
    
    const { error: productError } = await (supabaseUntyped as any)
      .from('products')
      .update(updateData)
      .eq('id', productId)

    if (productError) {
      console.error('❌ [ERROR] Product update failed', productError)
      return { success: false, error: productError.message }
    }
    
    console.log('✅ [SUCCESS] Product updated successfully')

    // Get updated variant IDs
    const updatedVariantIds = payload.variants.filter(v => v.id).map(v => v.id!)
    
    console.log('🔍 [DEBUG] Variant analysis', {
      existingVariantIds,
      updatedVariantIds,
      variantsToDelete: existingVariantIds.filter(id => !updatedVariantIds.includes(id))
    })

    // Delete variants that were removed
    const idsToDelete = existingVariantIds.filter(id => !updatedVariantIds.includes(id))
    if (idsToDelete.length > 0) {
      console.log('🗑️ [DEBUG] Deleting variants', { idsToDelete })
      
      const { error: deleteError } = await supabaseUntyped
        .from('product_variants')
        .delete()
        .in('id', idsToDelete)

      if (deleteError) {
        console.error('❌ [ERROR] Variant deletion failed', deleteError)
        return { success: false, error: deleteError.message }
      }
      
      console.log('✅ [SUCCESS] Variants deleted successfully')
    }

    // Update or insert variants
    for (const v of payload.variants) {
      console.log('🔄 [DEBUG] Processing variant', { 
        id: v.id, 
        variant_name: v.variant_name,
        isNew: !v.id 
      })
      
      if (v.id) {
        // Update existing variant
        console.log('✏️ [DEBUG] Updating existing variant', { variantId: v.id })
        
        const { error: updateError } = await supabaseUntyped
          .from('product_variants')
          .update({
            variant_name: v.variant_name,
            barcode: v.barcode,
            price: v.price,
            cost_price: v.cost_price,
            conversion_qty: v.conversion_qty,
            is_active: v.is_active,
            is_default: v.is_default,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', v.id)

        if (updateError) {
          console.error('❌ [ERROR] Variant update failed', { variantId: v.id, error: updateError })
          return { success: false, error: updateError.message }
        }
        
        console.log('✅ [SUCCESS] Variant updated successfully', { variantId: v.id })
      } else {
        // Insert new variant
        console.log('➕ [DEBUG] Inserting new variant', { 
          productId,
          variant_name: v.variant_name 
        })
        
        const { error: insertError } = await supabaseUntyped
          .from('product_variants')
          .insert({
            product_id: productId,
            variant_name: v.variant_name,
            barcode: v.barcode,
            price: v.price,
            cost_price: v.cost_price,
            conversion_qty: v.conversion_qty,
            is_active: v.is_active,
            is_default: v.is_default,
          } as any)

        if (insertError) {
          console.error('❌ [ERROR] Variant insert failed', { 
            productId,
            variant_name: v.variant_name,
            error: insertError 
          })
          return { success: false, error: insertError.message }
        }
        
        console.log('✅ [SUCCESS] Variant inserted successfully', { 
          productId,
          variant_name: v.variant_name 
        })
      }
    }

    console.log('🎉 [SUCCESS] All operations completed successfully')
    revalidatePath('/dashboard/products')
    return { success: true }
  } catch (error) {
    console.error('💥 [CRITICAL] Unexpected error in updateProductWithVariants', error)
    return { success: false, error: 'Failed to update product' }
  }
}

export async function deleteProduct(productId: string) {
  console.log('🗑️ [DEBUG] deleteProduct called', { productId })
  
  try {
    console.log('📝 [DEBUG] Deleting product', { productId })
    
    const { error } = await supabaseUntyped
      .from('products')
      .delete()
      .eq('id', productId)

    if (error) {
      console.error('❌ [ERROR] Product deletion failed', error)
      return { success: false, error: error.message }
    }

    console.log('✅ [SUCCESS] Product deleted successfully')
    revalidatePath('/dashboard/products')
    return { success: true }
  } catch (error) {
    console.error('💥 [CRITICAL] Unexpected error in deleteProduct', error)
    return { success: false, error: 'Failed to delete product' }
  }
}

export async function fetchProductsWithVariants() {
  console.log('📊 [DEBUG] fetchProductsWithVariants called')
  
  try {
    console.log('📝 [DEBUG] Fetching products with categories')
    
    // Fetch products with categories
    const { data: products, error: productsError } = await supabaseUntyped
      .from('products')
      .select('*, categories(name)')
      .order('name')

    if (productsError) {
      console.error('❌ [ERROR] Products fetch failed', productsError)
      return { success: false, error: productsError.message }
    }
    
    console.log('✅ [SUCCESS] Products fetched successfully', { count: products?.length || 0 })

    console.log('📝 [DEBUG] Fetching active variants')
    
    // Fetch all active variants
    const { data: variants, error: variantsError } = await supabaseUntyped
      .from('product_variants')
      .select('*')
      .eq('is_active', true)

    if (variantsError) {
      console.error('❌ [ERROR] Variants fetch failed', variantsError)
      return { success: false, error: variantsError.message }
    }
    
    console.log('✅ [SUCCESS] Variants fetched successfully', { count: variants?.length || 0 })

    console.log('🔗 [DEBUG] Attaching variants to products')
    
    // Attach variants to products
    const productsWithVariants = (products ?? []).map((p: any) => {
      const productVariants = (variants ?? []).filter((v: any) => v.product_id === p.id)
      return {
        ...p,
        variants: productVariants
      }
    })
    
    console.log('🎉 [SUCCESS] fetchProductsWithVariants completed', { 
      productsCount: productsWithVariants.length,
      totalVariants: (variants ?? []).length
    })

    return { success: true, data: productsWithVariants }
  } catch (error) {
    console.error('💥 [CRITICAL] Unexpected error in fetchProductsWithVariants', error)
    return { success: false, error: 'Failed to fetch products' }
  }
}
