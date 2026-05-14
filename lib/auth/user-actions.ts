'use server'

import { supabaseServer } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ThemePreference } from '@/types'


export async function getUserEmail(userId: string): Promise<{ success: boolean; email?: string; error?: string }> {
  try {
    const supabase = supabaseServer

    const { data, error } = await supabase.auth.admin.getUserById(userId)

    if (error || !data.user) {
      return { success: false, error: error?.message ?? 'User not found' }
    }

    return { success: true, email: data.user.email ?? '' }
  } catch (error) {
    console.error('Server error fetching user email:', error)
    return { success: false, error: 'Failed to fetch user email' }
  }
}

export async function createUser(formData: {
  full_name: string
  email: string
  password: string
  role: 'admin' | 'cashier' | 'customer'
  phone?: string
}) {
  try {
    const supabase = supabaseServer

    // Validation
    if (!formData.full_name.trim()) {
      return { success: false, error: 'Nama user harus diisi' }
    }

    if (!formData.email.trim()) {
      return { success: false, error: 'Email harus diisi' }
    }

    if (!formData.password.trim()) {
      return { success: false, error: 'Password harus diisi' }
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      return { success: false, error: 'Format email tidak valid' }
    }

    // Password validation
    if (formData.password.length < 6) {
      return { success: false, error: 'Password minimal 6 karakter' }
    }

    if (!['admin', 'cashier', 'customer'].includes(formData.role)) {
      return { success: false, error: 'Role tidak valid' }
    }

    const email = formData.email.toLowerCase().trim()
    const password = formData.password

    console.log('Creating new user:', { email, role: formData.role, name: formData.full_name })

    // Create auth user using service role with automatic email confirmation
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: formData.full_name.trim(),
        role: formData.role,
        created_by: 'admin'
      }
    })

    if (authError) {
      console.error('Auth error:', authError)
      return { success: false, error: `Gagal membuat user: ${authError.message}` }
    }

    if (!authData.user) {
      return { success: false, error: 'User gagal dibuat - tidak ada data yang dikembalikan' }
    }

    console.log('Auth user created successfully:', authData.user.id)

    // Wait for trigger to create profile
    await new Promise(resolve => setTimeout(resolve, 800))

    // Verify profile was created by trigger and update if needed
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, role, full_name, phone')
      .eq('id', authData.user.id)
      .maybeSingle()

    let profileData = existingProfile

    if (!existingProfile) {
      // Profile not created by trigger, create it manually
      console.log('Profile not found, creating manually...')
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          full_name: formData.full_name.trim(),
          role: formData.role,
          email: email,
          phone: formData.phone?.trim() || null
        })
        .select()
        .single()

      if (insertError) {
        console.error('Profile insert error:', insertError)
      } else {
        profileData = newProfile
        console.log('Profile created manually:', newProfile)
      }
    } else if (existingProfile.role !== formData.role || existingProfile.full_name !== formData.full_name.trim() || existingProfile.phone !== (formData.phone?.trim() || null)) {
      // Profile exists but needs update
      const profileUpdate = {
        full_name: formData.full_name.trim(),
        role: formData.role,
        phone: formData.phone?.trim() || null,
        updated_at: new Date().toISOString()
      }

      const { data: updatedProfile, error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', authData.user.id)
        .select()
        .maybeSingle()

      if (profileError) {
        console.error('Profile update error:', profileError)
      } else if (updatedProfile) {
        profileData = updatedProfile
        console.log('Profile updated successfully:', updatedProfile)
      }
    } else {
      console.log('Profile already up to date:', existingProfile)
    }

    revalidatePath('/dashboard/users')
    
    return { 
      success: true, 
      data: {
        user: authData.user,
        profile: profileData,
        email,
        password,
        message: `User ${formData.full_name} berhasil dibuat dan ter-register dengan email ${email}`
      }
    }
  } catch (error) {
    console.error('Server error during user creation:', error)
    return { success: false, error: 'Terjadi kesalahan server saat membuat user' }
  }
}

export async function updateUser(userId: string, formData: {
  full_name: string
  email?: string
  password?: string
  role: 'admin' | 'cashier' | 'customer'
  phone?: string
  is_active?: boolean
}) {
  try {
    const supabase = supabaseServer

    // Validation
    if (!formData.full_name.trim()) {
      return { success: false, error: 'Nama user harus diisi' }
    }

    if (!['admin', 'cashier', 'customer'].includes(formData.role)) {
      return { success: false, error: 'Role tidak valid' }
    }

    // Prepare auth metadata update
    const userMetadata = {
      full_name: formData.full_name.trim(),
      role: formData.role,
      updated_by: 'admin'
    }

    // Update auth user metadata first
    const { error: authError } = await supabase.auth.admin.updateUserById(
      userId,
      { 
        user_metadata: userMetadata
      }
    )

    if (authError) {
      console.error('Auth update error:', authError)
      return { success: false, error: `Gagal update auth user: ${authError.message}` }
    }

    // Update profile
    const profileUpdate: Record<string, unknown> = {
      full_name: formData.full_name.trim(),
      role: formData.role,
      updated_at: new Date().toISOString()
    }

    if (formData.phone !== undefined) {
      profileUpdate.phone = formData.phone?.trim() || null
    }

    if (formData.is_active !== undefined) {
      profileUpdate.is_active = formData.is_active
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', userId)

    if (profileError) {
      console.error('Profile update error:', profileError)
      return { success: false, error: `Gagal update profile: ${profileError.message}` }
    }

    // Update email if provided
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        return { success: false, error: 'Format email tidak valid' }
      }

      const { error: emailError } = await supabase.auth.admin.updateUserById(
        userId,
        { 
          email: formData.email.toLowerCase().trim(),
          user_metadata: userMetadata
        }
      )

      if (emailError) {
        return { success: false, error: `Gagal update email: ${emailError.message}` }
      }
    }

    // Update password if provided
    if (formData.password && formData.password.trim()) {
      if (formData.password.length < 6) {
        return { success: false, error: 'Password minimal 6 karakter' }
      }

      const { error: passwordError } = await supabase.auth.admin.updateUserById(
        userId,
        { 
          password: formData.password,
          user_metadata: userMetadata
        }
      )

      if (passwordError) {
        return { success: false, error: `Gagal update password: ${passwordError.message}` }
      }
    }

    revalidatePath('/dashboard/users')
    
    return { 
      success: true,
      message: 'User berhasil diperbarui'
    }
  } catch (error) {
    console.error('Server error:', error)
    return { success: false, error: 'Internal server error' }
  }
}

export async function deleteUser(userId: string) {
  try {
    const supabase = supabaseServer

    // Delete from auth.users first (this will cascade to profiles)
    const { error } = await supabase.auth.admin.deleteUser(userId)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/users')
    
    return { success: true }
  } catch (error) {
    console.error('Server error:', error)
    return { success: false, error: 'Internal server error' }
  }
}

export async function updateThemePreference(theme: ThemePreference) {
  try {
    const supabase = supabaseServer

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { error } = await supabase
      .from('profiles')
      .update({ theme_preference: theme })
      .eq('id', user.id)

    if (error) {
      console.error('Theme preference update error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Server error updating theme preference:', error)
    return { success: false, error: 'Internal server error' }
  }
}
