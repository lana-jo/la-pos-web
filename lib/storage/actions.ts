'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const BUCKET_NAME = 'product-images'

export async function uploadProductImage(file: File, productId: string): Promise<{ success: boolean; url?: string; error?: string }> {
  const startTime = Date.now()
  
  try {
    console.log('📤 [UPLOAD] Starting image upload', { 
      fileName: file.name, 
      fileSize: file.size, 
      fileType: file.type,
      productId,
      timestamp: new Date().toISOString()
    })

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Tipe file tidak didukung. Gunakan JPG, PNG, atau WebP.' }
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return { success: false, error: 'Ukuran file terlalu besar. Maksimal 5MB.' }
    }

    // Generate unique file name
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `${productId}/${Date.now()}.${fileExt}`

    console.log('📝 [UPLOAD] Generated file name', { fileName })

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        contentType: file.type,
        upsert: true
      })

    if (error) {
      console.error('❌ [ERROR] Upload failed', error)
      return { success: false, error: 'Gagal mengupload gambar: ' + error.message }
    }

    console.log('✅ [SUCCESS] File uploaded', { data })

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName)

    console.log('🔗 [SUCCESS] Public URL generated', { publicUrl })

    const uploadDuration = Date.now() - startTime
    console.log('⏱️ [PERFORMANCE] Upload completed', { 
      duration: `${uploadDuration}ms`,
      fileSize: file.size,
      throughput: `${(file.size / 1024 / 1024 / (uploadDuration / 1000)).toFixed(2)} MB/s`
    })

    return { success: true, url: publicUrl }
  } catch (error) {
    const uploadDuration = Date.now() - startTime
    console.error('💥 [CRITICAL] Unexpected error in uploadProductImage', { 
      error,
      duration: `${uploadDuration}ms`,
      fileName: file.name,
      productId
    })
    return { success: false, error: 'Terjadi kesalahan saat mengupload gambar' }
  }
}

export async function deleteProductImage(imageUrl: string): Promise<{ success: boolean; error?: string }> {
  const startTime = Date.now()
  
  try {
    console.log('🗑️ [DELETE] Starting image deletion', { 
      imageUrl,
      timestamp: new Date().toISOString()
    })

    // Extract file path from URL
    const url = new URL(imageUrl)
    const pathParts = url.pathname.split('/')
    const bucketIndex = pathParts.findIndex(part => part === BUCKET_NAME)
    
    if (bucketIndex === -1) {
      return { success: false, error: 'URL gambar tidak valid' }
    }

    const filePath = pathParts.slice(bucketIndex + 1).join('/')
    
    if (!filePath) {
      return { success: false, error: 'Path file tidak ditemukan' }
    }

    console.log('📝 [DELETE] Extracted file path', { filePath })

    // Delete file from Supabase Storage
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath])

    if (error) {
      console.error('❌ [ERROR] Deletion failed', error)
      return { success: false, error: 'Gagal menghapus gambar: ' + error.message }
    }

    console.log('✅ [SUCCESS] Image deleted successfully')

    const deleteDuration = Date.now() - startTime
    console.log('⏱️ [PERFORMANCE] Delete completed', { 
      duration: `${deleteDuration}ms`,
      filePath
    })

    return { success: true }
  } catch (error) {
    const deleteDuration = Date.now() - startTime
    console.error('💥 [CRITICAL] Unexpected error in deleteProductImage', { 
      error,
      duration: `${deleteDuration}ms`,
      imageUrl
    })
    return { success: false, error: 'Terjadi kesalahan saat menghapus gambar' }
  }
}

export async function updateProductImage(
  file: File, 
  productId: string, 
  oldImageUrl?: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  const startTime = Date.now()
  
  try {
    console.log('🔄 [UPDATE] Starting image update', { 
      fileName: file.name, 
      productId, 
      hasOldImage: !!oldImageUrl,
      timestamp: new Date().toISOString()
    })

    // Upload new image first
    const uploadResult = await uploadProductImage(file, productId)
    
    if (!uploadResult.success) {
      return uploadResult
    }

    // Delete old image if it exists and upload was successful
    if (oldImageUrl) {
      console.log('🗑️ [UPDATE] Deleting old image')
      await deleteProductImage(oldImageUrl)
    }

    console.log('✅ [SUCCESS] Image update completed')

    const updateDuration = Date.now() - startTime
    console.log('⏱️ [PERFORMANCE] Update completed', { 
      duration: `${updateDuration}ms`,
      fileName: file.name,
      productId,
      operations: oldImageUrl ? 'upload+delete' : 'upload'
    })

    return { success: true, url: uploadResult.url }
  } catch (error) {
    const updateDuration = Date.now() - startTime
    console.error('💥 [CRITICAL] Unexpected error in updateProductImage', { 
      error,
      duration: `${updateDuration}ms`,
      fileName: file.name,
      productId,
      hasOldImage: !!oldImageUrl
    })
    return { success: false, error: 'Terjadi kesalahan saat mengupdate gambar' }
  }
}
