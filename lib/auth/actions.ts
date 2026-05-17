'use server'

import { safeAction } from '@/lib/utils/action-wrapper'
import { supabaseServer } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function logout() {
  return await safeAction(async () => {
    const cookieStore = await cookies()

    // Preserve theme preference during logout
    const allCookies = cookieStore.getAll()
    const themeCookie = allCookies.find(cookie => cookie.name === 'pos-theme')

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return allCookies },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.signOut()
    if (error) throw error

    // Restore theme cookie after logout if it existed
    if (themeCookie) {
      cookieStore.set('pos-theme', themeCookie.value)
    }

    return true
  })
}

export async function loginWithCookie(email: string, password: string) {
  try {
    const cookieStore = await cookies()

    // 1. Buat SSR Client untuk menanamkan cookie
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try {
              console.log('[loginWithCookie] Setting cookies:', cookiesToSet.map(c => c.name))
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch (err) {
              console.error('[loginWithCookie] Cookie set error:', err)
            }
          },
        },
      }
    )

    // 2. Lakukan proses login
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.user) {
      return { success: false, error: 'Email atau password salah' }
    }

    // 3. Ambil role user dari tabel profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !profile) {
      return { success: false, error: 'Gagal mengambil data profil' }
    }

    // 4. Berhasil! Kembalikan role untuk keperluan redirect di UI
    return { success: true, role: profile.role }
    
  } catch (err) {
    console.error('Login action error:', err)
    return { success: false, error: 'Terjadi kesalahan sistem saat login' }
  }
}

// Cast query builder to avoid `never` parameter errors without generated schema
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const client = supabaseServer as any
const db = (table: string) => client.from(table)

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function createProfile(userId: string, email: string, fullName?: string) {
  try {
    const { error } = await db('profiles').upsert(
        { 
          id: userId, 
          full_name: fullName || email, 
          role: 'customer' 
        },
        { onConflict: 'id' }
    )

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Error creating profile:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function createCashierAccount(data: {
  email:    string
  password: string
  fullName: string
  pin:      string
}) {
  try {
    const { data: authData, error: authError } = await supabaseServer.auth.admin.createUser({
      email:          data.email,
      password:       data.password,
      email_confirm:  true,
      user_metadata:  { full_name: data.fullName, role: 'cashier' },
    })

    if (authError) throw authError

    const pinHash = await bcrypt.hash(data.pin, 10)

    const { error: profileError } = await db('profiles')
        .update({ pin_hash: pinHash, role: 'cashier' })
        .eq('id', authData.user.id)   // ← was missing! without this, ALL profiles get updated

    if (profileError) {
      // Roll back the auth user if profile update fails
      await supabaseServer.auth.admin.deleteUser(authData.user.id)
      throw profileError
    }

    return { success: true, userId: authData.user.id }
  } catch (error) {
    console.error('Error creating cashier account:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function createAdminAccount(data: {
  email:    string
  password: string
  fullName: string
}) {
  try {
    const { data: authData, error: authError } = await supabaseServer.auth.admin.createUser({
      email:         data.email,
      password:      data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, role: 'admin' },
    })

    if (authError) throw authError

    const { error: profileError } = await db('profiles')
        .update({ role: 'admin' })
        .eq('id', authData.user.id)

    if (profileError) {
      await supabaseServer.auth.admin.deleteUser(authData.user.id)
      throw profileError
    }

    return { success: true, userId: authData.user.id }
  } catch (error) {
    console.error('Error creating admin account:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function verifyCashierPin(pin: string): Promise<boolean> {
  try {
    const { data, error } = await (supabaseServer as any).rpc('fn_verify_pin', {
      p_pin: pin,
    })

    if (error) throw error
    return data ?? false
  } catch (error) {
    console.error('Error verifying PIN:', error)
    return false
  }
}

export async function checkRole(requiredRoles: ('owner' | 'manager' | 'cashier')[]) {
  const { data: { user } } = await supabaseServer.auth.getUser()
  if (!user) return false

  const { data: profile } = await (supabaseServer as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) return false
  return requiredRoles.includes(profile.role)
}

export async function logCashierAction(data: {
  cashierId:   string
  actionType:  'void' | 'discount' | 'refund' | 'stock_adjustment' | 'shift_open' | 'shift_close'
  targetId?:   string
  targetType?: string
  pinVerified: boolean
  notes?:      string
  metadata?:   any
  shiftId?:    string
}) {
  try {
    const { error } = await db('cashier_actions').insert({
      cashier_id:  data.cashierId,
      shift_id:    data.shiftId    ?? null,
      action_type: data.actionType,
      target_id:   data.targetId   ?? null,
      target_type: data.targetType ?? null,
      pin_verified: data.pinVerified,
      notes:       data.notes      ?? null,
      metadata:    data.metadata   ?? null,
    })

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Error logging cashier action:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function updateUserRole(userId: string, role: 'admin' | 'cashier' | 'customer') {
  try {
    const { error: profileError } = await db('profiles')
        .update({ role })
        .eq('id', userId)

    if (profileError) throw profileError

    const { error: authError } = await supabaseServer.auth.admin.updateUserById(
        userId,
        { user_metadata: { role } }
    )

    if (authError) throw authError

    return { success: true }
  } catch (error) {
    console.error('Error updating user role:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}