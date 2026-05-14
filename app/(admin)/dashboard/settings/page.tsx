'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Store, 
  CreditCard, 
  Printer, 
  Shield,
  Bell
} from 'lucide-react'
import { toast } from 'sonner'
import { getSettings, updateSettings, updateAllSettings, testPrinterConnection, testPrint, exportSettings, importSettings } from '@/lib/settings/actions'
import { supabase } from '@/lib/supabase/client'
import { Setting } from '@/types'
// Refactored Components
import { SettingsHeader } from '@/components/admin/dashboard/settings/SettingsHeader'
import { GeneralTab } from '@/components/admin/dashboard/settings/GeneralTab'
import { PaymentTab } from '@/components/admin/dashboard/settings/PaymentTab'
import { PrinterTab } from '@/components/admin/dashboard/settings/PrinterTab'
import { SystemTab } from '@/components/admin/dashboard/settings/SystemTab'
import { NotificationTab } from '@/components/admin/dashboard/settings/NotificationTab'

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [formData, setFormData] = useState<Record<string, Record<string, any>>>({
    general: {
      language: 'id',
      currency: 'IDR',
      timezone: 'Asia/Jakarta'
    },
    payment: {
      qris_enabled: true,
      cash_enabled: true,
      card_enabled: true,
      midtrans_environment: 'sandbox'
    },
    printer: {
      auto_print: true,
      print_logo: true,
      printer_type: 'thermal',
      paper_width: '58mm'
    },
    system: {
      session_timeout_enabled: true,
      session_timeout_duration: 30,
      max_login_attempts: 5,
      auto_backup_enabled: true,
      backup_frequency: 'daily'
    },
    notifications: {
      sale_alert: true,
      low_stock_alert: true,
      system_updates: true,
      error_reports: true
    }
  })

  const loadSettings = async () => {
    setIsLoading(true)
    try {
      const result = await getSettings()
      if (result.success && result.data) {
        setSettings(result.data)
        
        // Organize settings by category for form data
        const categorizedData: Record<string, Record<string, any>> = {
          general: {},
          payment: {},
          printer: {},
          system: {},
          notifications: {}
        }
        
        // Use the existing settings rows to group by category if available, 
        // or fetch all and categorize based on category property
        const { data: allSettings, error: fetchError } = await supabase
          .from('settings')
          .select('*')
        
        if (!fetchError && allSettings) {
          (allSettings as Setting[]).forEach((setting: Setting) => {
            if (categorizedData[setting.category]) {
              let value: any = setting.value
              if (setting.data_type === 'boolean') {
                value = setting.value === 'true'
              } else if (setting.data_type === 'number') {
                value = parseInt(setting.value || '0')
              }
              categorizedData[setting.category][setting.key] = value
            }
          })
        }
        
        setFormData(categorizedData)
      } else {
        toast.error(result.error || 'Gagal memuat pengaturan')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat memuat pengaturan')
    } finally {
      setIsLoading(false)
    }
  }

  // Load settings on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      loadSettings()
    }, 0);
    return () => clearTimeout(timer);
  }, [])

  const handleSave = async (category: string) => {
    setIsSaving(true)
    try {
      // Merge current form data with existing settings to ensure all required fields are present
      const categoryData = {
        ...settings,
        ...formData[category]
      }
      
      // Filter only the fields that belong to this category
      const filteredData: Record<string, any> = {}
      Object.keys(categoryData).forEach(key => {
        if (category === 'general' && ['store_name', 'store_phone', 'store_email', 'store_address', 'language', 'currency', 'timezone'].includes(key)) {
          filteredData[key] = categoryData[key]
        } else if (category === 'payment' && (key.includes('qris') || key.includes('cash') || key.includes('card') || key.includes('midtrans'))) {
          filteredData[key] = categoryData[key]
        } else if (category === 'printer' && (key.includes('print') || key.includes('printer') || key.includes('paper'))) {
          filteredData[key] = categoryData[key]
        } else if (category === 'system' && (key.includes('session') || key.includes('login') || key.includes('backup'))) {
          filteredData[key] = categoryData[key]
        } else if (category === 'notifications' && (key.includes('alert') || key.includes('notification') || key.includes('update') || key.includes('error'))) {
          filteredData[key] = categoryData[key]
        }
      })
      
      const result = await updateSettings(category, filteredData)
      
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Gagal menyimpan pengaturan')
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (category: string, key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }))
  }

  const handleTestPrinterConnection = async () => {
    const printerData = formData.printer
    const result = await testPrinterConnection(
      printerData.printer_port || 'USB001',
      printerData.printer_type || 'thermal'
    )
    
    if (result.success) {
      toast.success(result.message)
    } else {
      toast.error(result.error)
    }
  }

  const handleTestPrint = async () => {
    const printerData = formData.printer
    const result = await testPrint(
      printerData.printer_port || 'USB001',
      printerData.printer_type || 'thermal',
      printerData.paper_width || '58mm'
    )
    
    if (result.success) {
      toast.success(result.message)
    } else {
      toast.error(result.error)
    }
  }

  const handleExportSettings = async () => {
    try {
      const result = await exportSettings()
      if (result.success && result.data) {
        const blob = new Blob([JSON.stringify(result.data, null, 2)], {
          type: 'application/json'
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `settings-backup-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        if (a.parentNode === document.body) {
          document.body.removeChild(a)
        }
        URL.revokeObjectURL(url)
        toast.success('Pengaturan berhasil diekspor')
      } else {
        toast.error(result.error || 'Gagal mengekspor pengaturan')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat mengekspor pengaturan')
    }
  }

  const handleImportSettings = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)
      const result = await importSettings(data)
      
      if (result.success) {
        toast.success(result.message)
        loadSettings() // Reload settings
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('File pengaturan tidak valid')
    }
    
    // Reset file input
    event.target.value = ''
  }

  return (
    <div className="min-h-screen page-background p-8">
      <SettingsHeader 
        handleExportSettings={handleExportSettings}
        handleImportSettings={handleImportSettings}
        isLoading={isLoading}
      />

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="pos-modal-content border border-border/50 p-1 rounded-full w-full justify-start shadow-lg">
          <TabsTrigger value="general" className="rounded-full data-[state=active]:pos-button-primary data-[state=inactive]:bg-background/80 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-background/60 transition-all duration-300 flex items-center gap-2">
            <Store className="h-4 w-4" />
            Umum
          </TabsTrigger>
          <TabsTrigger value="payment" className="rounded-full data-[state=active]:pos-button-primary data-[state=inactive]:bg-background/80 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-background/60 transition-all duration-300 flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Pembayaran
          </TabsTrigger>
          <TabsTrigger value="printer" className="rounded-full data-[state=active]:pos-button-primary data-[state=inactive]:bg-background/80 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-background/60 transition-all duration-300 flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Printer
          </TabsTrigger>
          <TabsTrigger value="system" className="rounded-full data-[state=active]:pos-button-primary data-[state=inactive]:bg-background/80 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-background/60 transition-all duration-300 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Sistem
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-full data-[state=active]:pos-button-primary data-[state=inactive]:bg-background/80 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-background/60 transition-all duration-300 flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifikasi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralTab 
            formData={formData}
            handleInputChange={handleInputChange}
            handleSave={handleSave}
            isLoading={isLoading}
            isSaving={isSaving}
          />
        </TabsContent>

        <TabsContent value="payment">
          <PaymentTab 
            formData={formData}
            handleInputChange={handleInputChange}
            handleSave={handleSave}
            isLoading={isLoading}
            isSaving={isSaving}
          />
        </TabsContent>

        <TabsContent value="printer">
          <PrinterTab 
            formData={formData}
            handleInputChange={handleInputChange}
            handleSave={handleSave}
            handleTestPrint={handleTestPrint}
            handleTestPrinterConnection={handleTestPrinterConnection}
            isLoading={isLoading}
            isSaving={isSaving}
          />
        </TabsContent>

        <TabsContent value="system">
          <SystemTab 
            formData={formData}
            handleInputChange={handleInputChange}
            handleSave={handleSave}
            isLoading={isLoading}
            isSaving={isSaving}
          />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationTab 
            formData={formData}
            handleInputChange={handleInputChange}
            handleSave={handleSave}
            isLoading={isLoading}
            isSaving={isSaving}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
