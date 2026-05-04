'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

// Server-side client with service role key (bypasses RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseUntyped = createClient(supabaseUrl, supabaseServiceKey)

interface SupplierPayload {
  name: string
  phone?: string | null
  address?: string | null
  email?: string | null
  contact_person?: string | null
  notes?: string | null
  is_active?: boolean
}

export async function fetchSuppliers() {
  console.log('📊 [DEBUG] fetchSuppliers called')

  try {
    const { data: suppliers, error } = await supabaseUntyped
      .from('suppliers')
      .select('*')
      .order('name')

    if (error) {
      console.error('❌ [ERROR] Suppliers fetch failed', error)
      return { success: false, error: error.message }
    }

    console.log('✅ [SUCCESS] Suppliers fetched successfully', { count: suppliers?.length || 0 })
    return { success: true, data: suppliers || [] }
  } catch (error) {
    console.error('💥 [CRITICAL] Unexpected error in fetchSuppliers', error)
    return { success: false, error: 'Failed to fetch suppliers' }
  }
}

export async function createSupplier(payload: SupplierPayload) {
  console.log('➕ [DEBUG] createSupplier called', { payload })

  try {
    // Check for duplicate name
    const { data: existingSupplier, error: checkError } = await supabaseUntyped
      .from('suppliers')
      .select('id')
      .eq('name', payload.name.trim())
      .single()

    if (existingSupplier) {
      console.error('❌ [ERROR] Supplier name already exists', { name: payload.name })
      return { success: false, error: 'Nama pemasok sudah ada' }
    }

    const { data, error } = await supabaseUntyped
      .from('suppliers')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('❌ [ERROR] Supplier creation failed', error)
      return { success: false, error: error.message }
    }

    console.log('✅ [SUCCESS] Supplier created successfully', { id: data?.id })
    revalidatePath('/dashboard/suppliers')
    return { success: true, data }
  } catch (error) {
    console.error('💥 [CRITICAL] Unexpected error in createSupplier', error)
    return { success: false, error: 'Failed to create supplier' }
  }
}

export async function updateSupplier(supplierId: string, payload: SupplierPayload) {
  console.log('🔄 [DEBUG] updateSupplier called', { supplierId, payload })

  try {
    // Check for duplicate name (excluding current supplier)
    const { data: existingSupplier, error: checkError } = await supabaseUntyped
      .from('suppliers')
      .select('id')
      .eq('name', payload.name.trim())
      .neq('id', supplierId)
      .single()

    if (existingSupplier) {
      console.error('❌ [ERROR] Supplier name already exists', { name: payload.name })
      return { success: false, error: 'Nama pemasok sudah ada' }
    }

    const { data, error } = await supabaseUntyped
      .from('suppliers')
      .update({
        ...payload,
        updated_at: new Date().toISOString()
      })
      .eq('id', supplierId)
      .select()
      .single()

    if (error) {
      console.error('❌ [ERROR] Supplier update failed', error)
      return { success: false, error: error.message }
    }

    console.log('✅ [SUCCESS] Supplier updated successfully', { id: supplierId })
    revalidatePath('/dashboard/suppliers')
    return { success: true, data }
  } catch (error) {
    console.error('💥 [CRITICAL] Unexpected error in updateSupplier', error)
    return { success: false, error: 'Failed to update supplier' }
  }
}

export async function deactivateSupplier(supplierId: string) {
  console.log('🗑️ [DEBUG] deactivateSupplier called', { supplierId })

  try {
    const { error } = await supabaseUntyped
      .from('suppliers')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', supplierId)

    if (error) {
      console.error('❌ [ERROR] Supplier deactivation failed', error)
      return { success: false, error: error.message }
    }

    console.log('✅ [SUCCESS] Supplier deactivated successfully', { id: supplierId })
    revalidatePath('/dashboard/suppliers')
    return { success: true }
  } catch (error) {
    console.error('💥 [CRITICAL] Unexpected error in deactivateSupplier', error)
    return { success: false, error: 'Failed to deactivate supplier' }
  }
}
