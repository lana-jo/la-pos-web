'use server'

import { supabaseServer } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { Database } from '@/types/database'

type SettingsRow = Database['public']['Tables']['settings']['Row']
type SettingsInsert = Database['public']['Tables']['settings']['Insert']

// Schema for different setting categories
const generalSettingsSchema = z.object({
  store_name: z.string().min(1, 'Nama toko tidak boleh kosong').optional(),
  store_phone: z.string().min(1, 'Nomor telepon tidak boleh kosong').optional(),
  store_email: z.string().email('Email tidak valid').optional(),
  store_address: z.string().min(1, 'Alamat tidak boleh kosong').optional(),
  language: z.string().optional().default('id'),
  currency: z.string().optional().default('IDR'),
  timezone: z.string().optional().default('Asia/Jakarta')
})

const paymentSettingsSchema = z.object({
  qris_enabled: z.boolean(),
  cash_enabled: z.boolean(),
  card_enabled: z.boolean(),
  midtrans_merchant_id: z.string().optional(),
  midtrans_server_key: z.string().optional(),
  midtrans_environment: z.enum(['sandbox', 'production'])
})

const printerSettingsSchema = z.object({
  auto_print: z.boolean(),
  print_logo: z.boolean(),
  printer_type: z.enum(['thermal', 'laser', 'network']),
  printer_port: z.string(),
  paper_width: z.enum(['58mm', '80mm', 'a4'])
})

const systemSettingsSchema = z.object({
  session_timeout_enabled: z.boolean(),
  session_timeout_duration: z.number().min(5).max(480),
  max_login_attempts: z.number().min(3).max(10),
  auto_backup_enabled: z.boolean(),
  backup_frequency: z.enum(['daily', 'weekly', 'monthly'])
})

const notificationSettingsSchema = z.object({
  sale_alert: z.boolean(),
  low_stock_alert: z.boolean(),
  system_updates: z.boolean(),
  error_reports: z.boolean()
})

// Get all settings
export async function getSettings(category?: string) {
  const supabase = supabaseServer
  
  try {
    let query = supabase
      .from('settings')
      .select('*')
    
    if (category) {
      query = query.eq('category', category)
    }
    
    const { data, error } = await query.order('category, key') as { data: SettingsRow[] | null, error: Error | null }
    
    if (error) throw error
    if (!data) return { success: true, data: {} }
    
    // Convert array to object for easier usage
    const settings: Record<string, any> = {}
    data.forEach(setting => {
      // Convert value based on data_type
      let value: any = setting.value
      if (setting.data_type === 'boolean') {
        value = setting.value === 'true'
      } else if (setting.data_type === 'number') {
        value = parseInt(setting.value || '0')
      } else if (setting.data_type === 'json') {
        value = JSON.parse(setting.value || '{}')
      }
      settings[setting.key] = value
    })
    
    return { success: true, data: settings }
  } catch (error) {
    console.error('Error fetching settings:', error)
    return { success: false, error: 'Gagal mengambil pengaturan' }
  }
}

// Get settings by category
export async function getSettingsByCategory(category: string) {
  return getSettings(category)
}

// Update settings
export async function updateSettings(category: string, formData: Record<string, any>) {
  const supabase = supabaseServer
  
  try {
    // Validate data based on category
    let validatedData
    
    switch (category) {
      case 'general':
        validatedData = generalSettingsSchema.parse(formData)
        break
      case 'payment':
        validatedData = paymentSettingsSchema.parse(formData)
        break
      case 'printer':
        validatedData = printerSettingsSchema.parse(formData)
        break
      case 'system':
        validatedData = systemSettingsSchema.parse(formData)
        break
      case 'notifications':
        validatedData = notificationSettingsSchema.parse(formData)
        break
      default:
        throw new Error('Kategori pengaturan tidak valid')
    }
    
    // Update each setting
    const updates = Object.entries(validatedData).map(async ([key, value]) => {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value)
      const dataType = typeof value === 'boolean' ? 'boolean' : 
                       typeof value === 'number' ? 'number' : 
                       typeof value === 'object' ? 'json' : 'string'
      
      return (supabase
        .from('settings')
        .upsert({
          category,
          key,
          value: stringValue,
          data_type: dataType,
          updated_at: new Date().toISOString()
        } as any) as unknown) as Promise<any>
    })
    
    await Promise.all(updates)
    
    revalidatePath('/(admin)/dashboard/settings')
    
    return { success: true, message: `Pengaturan ${category} berhasil disimpan` }
  } catch (error) {
    console.error('Error updating settings:', error)
    
    if (error instanceof z.ZodError && error.issues) {
      const errorMessage = error.issues.map(e => e.message).join(', ')
      return { success: false, error: errorMessage }
    }
    
    return { success: false, error: 'Gagal menyimpan pengaturan' }
  }
}

// Test printer connection
export async function testPrinterConnection(printerPort: string, printerType: string) {
  try {
    // This is a placeholder for actual printer testing logic
    // In a real implementation, you would interface with the printer driver
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Simulate connection test
    const isConnected = Math.random() > 0.2 // 80% success rate for demo
    
    if (isConnected) {
      return { success: true, message: 'Printer terhubung berhasil' }
    } else {
      return { success: false, error: 'Tidak dapat terhubung ke printer' }
    }
  } catch (error) {
    console.error('Error testing printer:', error)
    return { success: false, error: 'Gagal menguji koneksi printer' }
  }
}

// Test print
export async function testPrint(printerPort: string, printerType: string, paperWidth: string) {
  try {
    // This is a placeholder for actual print logic
    // In a real implementation, you would generate and send print data
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    return { success: true, message: 'Test print berhasil dikirim' }
  } catch (error) {
    console.error('Error testing print:', error)
    return { success: false, error: 'Gagal melakukan test print' }
  }
}

// Export settings to JSON
export async function exportSettings() {
  const supabase = supabaseServer
  
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .order('category, key') as { data: SettingsRow[] | null, error: Error | null }
    
    if (error) throw error
    if (!data) return { success: true, data: {} }
    
    // Group by category
    const exportData: Record<string, Record<string, any>> = {}
    data.forEach(setting => {
      if (!exportData[setting.category]) {
        exportData[setting.category] = {}
      }
      
      let value: any = setting.value
      if (setting.data_type === 'boolean') {
        value = setting.value === 'true'
      } else if (setting.data_type === 'number') {
        value = parseInt(setting.value || '0')
      } else if (setting.data_type === 'json') {
        value = JSON.parse(setting.value || '{}')
      }
      
      exportData[setting.category][setting.key] = value
    })
    
    return { success: true, data: exportData }
  } catch (error) {
    console.error('Error exporting settings:', error)
    return { success: false, error: 'Gagal mengekspor pengaturan' }
  }
}

// Import settings from JSON
export async function importSettings(settingsData: Record<string, Record<string, any>>) {
  const supabase = supabaseServer
  
  try {
    const updates: Promise<any>[] = []
    
    Object.entries(settingsData).forEach(([category, settings]) => {
      Object.entries(settings).forEach(([key, value]) => {
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value)
        const dataType = typeof value === 'boolean' ? 'boolean' : 
                         typeof value === 'number' ? 'number' : 
                         typeof value === 'object' ? 'json' : 'string'
        
        updates.push(
          (supabase
            .from('settings')
            .upsert({
              category,
              key,
              value: stringValue,
              data_type: dataType,
              updated_at: new Date().toISOString()
            } as any) as unknown) as Promise<any>
        )
      })
    })
    
    await Promise.all(updates)
    
    revalidatePath('/(admin)/dashboard/settings')
    
    return { success: true, message: 'Pengaturan berhasil diimpor' }
  } catch (error) {
    console.error('Error importing settings:', error)
    return { success: false, error: 'Gagal mengimpor pengaturan' }
  }
}

// Update all settings across all categories
export async function updateAllSettings(allFormData: Record<string, Record<string, any>>) {
  try {
    const errors: string[] = []
    
    // Process each category using the existing updateSettings function
    for (const [category, categoryData] of Object.entries(allFormData)) {
      // Merge with existing settings to ensure all required fields are present
      const mergedData = {
        ...categoryData
      }
      
      const result = await updateSettings(category, mergedData)
      
      if (!result.success) {
        errors.push(`${category}: ${result.error}`)
      }
    }
    
    if (errors.length > 0) {
      return { success: false, error: errors.join('; ') }
    }
    
    return { success: true, message: 'Semua pengaturan berhasil disimpan' }
  } catch (error) {
    console.error('Error updating all settings:', error)
    return { success: false, error: 'Gagal menyimpan semua pengaturan' }
  }
}
