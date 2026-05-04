'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

// Server-side client with service role key (bypasses RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseUntyped = createClient(supabaseUrl, supabaseServiceKey)

interface UnitPayload {
  name: string
  symbol: string
  is_active?: boolean
}

export async function fetchUnits() {
  console.log('📊 [DEBUG] fetchUnits called')

  try {
    const { data: units, error } = await supabaseUntyped
      .from('units')
      .select('*')
      .order('name')

    if (error) {
      console.error('❌ [ERROR] Units fetch failed', error)
      return { success: false, error: error.message }
    }

    console.log('✅ [SUCCESS] Units fetched successfully', { count: units?.length || 0 })
    return { success: true, data: units || [] }
  } catch (error) {
    console.error('💥 [CRITICAL] Unexpected error in fetchUnits', error)
    return { success: false, error: 'Failed to fetch units' }
  }
}

export async function createUnit(payload: UnitPayload) {
  console.log('➕ [DEBUG] createUnit called', { payload })

  try {
    // Check for duplicate name
    const { data: existingUnit, error: checkError } = await supabaseUntyped
      .from('units')
      .select('id')
      .eq('name', payload.name.trim())
      .single()

    if (existingUnit) {
      console.error('❌ [ERROR] Unit name already exists', { name: payload.name })
      return { success: false, error: 'Nama satuan sudah ada' }
    }

    const { data, error } = await supabaseUntyped
      .from('units')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('❌ [ERROR] Unit creation failed', error)
      return { success: false, error: error.message }
    }

    console.log('✅ [SUCCESS] Unit created successfully', { id: data?.id })
    revalidatePath('/dashboard/units')
    return { success: true, data }
  } catch (error) {
    console.error('💥 [CRITICAL] Unexpected error in createUnit', error)
    return { success: false, error: 'Failed to create unit' }
  }
}

export async function updateUnit(unitId: string, payload: UnitPayload) {
  console.log('🔄 [DEBUG] updateUnit called', { unitId, payload })

  try {
    // Check for duplicate name (excluding current unit)
    const { data: existingUnit, error: checkError } = await supabaseUntyped
      .from('units')
      .select('id')
      .eq('name', payload.name.trim())
      .neq('id', unitId)
      .single()

    if (existingUnit) {
      console.error('❌ [ERROR] Unit name already exists', { name: payload.name })
      return { success: false, error: 'Nama satuan sudah ada' }
    }

    const { data, error } = await supabaseUntyped
      .from('units')
      .update(payload)
      .eq('id', unitId)
      .select()
      .single()

    if (error) {
      console.error('❌ [ERROR] Unit update failed', error)
      return { success: false, error: error.message }
    }

    console.log('✅ [SUCCESS] Unit updated successfully', { id: unitId })
    revalidatePath('/dashboard/units')
    return { success: true, data }
  } catch (error) {
    console.error('💥 [CRITICAL] Unexpected error in updateUnit', error)
    return { success: false, error: 'Failed to update unit' }
  }
}

export async function deactivateUnit(unitId: string) {
  console.log('🗑️ [DEBUG] deactivateUnit called', { unitId })

  try {
    const { error } = await supabaseUntyped
      .from('units')
      .update({ is_active: false })
      .eq('id', unitId)

    if (error) {
      console.error('❌ [ERROR] Unit deactivation failed', error)
      return { success: false, error: error.message }
    }

    console.log('✅ [SUCCESS] Unit deactivated successfully', { id: unitId })
    revalidatePath('/dashboard/units')
    return { success: true }
  } catch (error) {
    console.error('💥 [CRITICAL] Unexpected error in deactivateUnit', error)
    return { success: false, error: 'Failed to deactivate unit' }
  }
}
