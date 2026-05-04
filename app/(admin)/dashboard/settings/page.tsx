'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ReactSelect } from '@/components/ui/react-select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Settings, 
  Store, 
  CreditCard, 
  Printer, 
  Shield,
  Bell,
  Globe,
  Database,
  Smartphone,
  Download,
  Upload
} from 'lucide-react'
import { toast } from 'sonner'
import { getSettings, updateSettings, updateAllSettings, testPrinterConnection, testPrint, exportSettings, importSettings } from '@/lib/settings/actions'

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

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [])

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
        
        Object.entries(result.data).forEach(([key, value]) => {
          // Determine category based on key prefixes
          if (['store_name', 'store_phone', 'store_email', 'store_address', 'language', 'currency', 'timezone'].includes(key)) {
            categorizedData.general[key] = value
          } else if (key.includes('qris') || key.includes('cash') || key.includes('card') || key.includes('midtrans')) {
            categorizedData.payment[key] = value
          } else if (key.includes('print') || key.includes('printer') || key.includes('paper')) {
            categorizedData.printer[key] = value
          } else if (key.includes('session') || key.includes('login') || key.includes('backup')) {
            categorizedData.system[key] = value
          } else if (key.includes('alert') || key.includes('notification') || key.includes('update') || key.includes('error')) {
            categorizedData.notifications[key] = value
          }
        })
        
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

  const handleSaveAll = async () => {
    setIsSaving(true)
    try {
      // Prepare all form data for saving
      const allDataToSave: Record<string, Record<string, any>> = {}
      
      // Process each category and filter relevant fields
      Object.entries(formData).forEach(([category, categoryData]) => {
        const mergedData = {
          ...settings,
          ...categoryData
        }
        
        const filteredData: Record<string, any> = {}
        Object.keys(mergedData).forEach(key => {
          if (category === 'general' && ['store_name', 'store_phone', 'store_email', 'store_address', 'language', 'currency', 'timezone'].includes(key)) {
            filteredData[key] = mergedData[key]
          } else if (category === 'payment' && (key.includes('qris') || key.includes('cash') || key.includes('card') || key.includes('midtrans'))) {
            filteredData[key] = mergedData[key]
          } else if (category === 'printer' && (key.includes('print') || key.includes('printer') || key.includes('paper'))) {
            filteredData[key] = mergedData[key]
          } else if (category === 'system' && (key.includes('session') || key.includes('login') || key.includes('backup'))) {
            filteredData[key] = mergedData[key]
          } else if (category === 'notifications' && (key.includes('alert') || key.includes('notification') || key.includes('update') || key.includes('error'))) {
            filteredData[key] = mergedData[key]
          }
        })
        
        if (Object.keys(filteredData).length > 0) {
          allDataToSave[category] = filteredData
        }
      })
      
      const result = await updateAllSettings(allDataToSave)
      
      if (result.success) {
        toast.success(result.message)
        // Reload settings to get the latest data
        await loadSettings()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Gagal menyimpan semua pengaturan')
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
        document.body.removeChild(a)
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Pengaturan</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Kelola konfigurasi dan preferensi sistem POS
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportSettings} disabled={isLoading}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleImportSettings}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={isLoading}
            />
            <Button variant="outline" disabled={isLoading}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
          </div>
          <Button 
            onClick={handleSaveAll} 
            disabled={isSaving || isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Settings className="h-4 w-4 mr-2" />
            {isSaving ? 'Menyimpan...' : 'Simpan Semua Perubahan'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Umum
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Pembayaran
          </TabsTrigger>
          <TabsTrigger value="printer" className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Printer
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Sistem
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifikasi
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Informasi Toko
              </CardTitle>
              <CardDescription>
                Kelola informasi dasar toko Anda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="store-name">Nama Toko</Label>
                  <Input 
                    id="store-name" 
                    value={formData.general?.store_name || ''}
                    onChange={(e) => handleInputChange('general', 'store_name', e.target.value)}
                    placeholder="Masukkan nama toko"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store-phone">Telepon</Label>
                  <Input 
                    id="store-phone" 
                    value={formData.general?.store_phone || ''}
                    onChange={(e) => handleInputChange('general', 'store_phone', e.target.value)}
                    placeholder="Masukkan nomor telepon"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store-email">Email</Label>
                  <Input 
                    id="store-email" 
                    value={formData.general?.store_email || ''}
                    onChange={(e) => handleInputChange('general', 'store_email', e.target.value)}
                    placeholder="Masukkan email"
                    type="email"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store-address">Alamat</Label>
                  <Input 
                    id="store-address" 
                    value={formData.general?.store_address || ''}
                    onChange={(e) => handleInputChange('general', 'store_address', e.target.value)}
                    placeholder="Masukkan alamat"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button 
                  onClick={() => handleSave('general')}
                  disabled={isSaving || isLoading}
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Pengaturan Regional
              </CardTitle>
              <CardDescription>
                Konfigurasi bahasa, mata uang, dan zona waktu
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Bahasa</Label>
                  <ReactSelect
                    value={{ value: formData.general?.language || 'id', label: formData.general?.language === 'en' ? 'English' : 'Bahasa Indonesia' }}
                    onChange={(option) => handleInputChange('general', 'language', option?.value)}
                    options={[
                      { value: 'id', label: 'Bahasa Indonesia' },
                      { value: 'en', label: 'English' }
                    ]}
                    placeholder="Pilih bahasa"
                    className="w-full"
                    isDisabled={isLoading}
                    instanceId="language-select"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Mata Uang</Label>
                  <ReactSelect
                    value={{ value: formData.general?.currency || 'IDR', label: formData.general?.currency === 'USD' ? 'US Dollar (USD)' : 'Indonesian Rupiah (IDR)' }}
                    onChange={(option) => handleInputChange('general', 'currency', option?.value)}
                    options={[
                      { value: 'IDR', label: 'Indonesian Rupiah (IDR)' },
                      { value: 'USD', label: 'US Dollar (USD)' }
                    ]}
                    placeholder="Pilih mata uang"
                    className="w-full"
                    isDisabled={isLoading}
                    instanceId="currency-select"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Zona Waktu</Label>
                  <ReactSelect
                    value={{ value: formData.general?.timezone || 'Asia/Jakarta', label: formData.general?.timezone === 'Asia/Makassar' ? 'Makassar (WITA)' : formData.general?.timezone === 'Asia/Jayapura' ? 'Jayapura (WIT)' : 'Jakarta (WIB)' }}
                    onChange={(option) => handleInputChange('general', 'timezone', option?.value)}
                    options={[
                      { value: 'Asia/Jakarta', label: 'Jakarta (WIB)' },
                      { value: 'Asia/Makassar', label: 'Makassar (WITA)' },
                      { value: 'Asia/Jayapura', label: 'Jayapura (WIT)' }
                    ]}
                    placeholder="Pilih zona waktu"
                    className="w-full"
                    isDisabled={isLoading}
                    instanceId="timezone-select"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button 
                  onClick={() => handleSave('general')}
                  disabled={isSaving || isLoading}
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Settings */}
        <TabsContent value="payment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Konfigurasi Pembayaran
              </CardTitle>
              <CardDescription>
                Kelola metode pembayaran dan gateway pembayaran
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="qris-enabled">QRIS Payment</Label>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Aktifkan pembayaran QRIS melalui Midtrans
                    </p>
                  </div>
                  <Switch 
                    id="qris-enabled" 
                    checked={formData.payment?.qris_enabled !== false}
                    onCheckedChange={(checked) => handleInputChange('payment', 'qris_enabled', checked)}
                    disabled={isLoading}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="cash-enabled">Pembayaran Tunai</Label>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Aktifkan pembayaran tunai
                    </p>
                  </div>
                  <Switch 
                    id="cash-enabled" 
                    checked={formData.payment?.cash_enabled !== false}
                    onCheckedChange={(checked) => handleInputChange('payment', 'cash_enabled', checked)}
                    disabled={isLoading}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="card-enabled">Pembayaran Kartu</Label>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Aktifkan pembayaran kartu kredit/debit
                    </p>
                  </div>
                  <Switch 
                    id="card-enabled" 
                    checked={formData.payment?.card_enabled !== false}
                    onCheckedChange={(checked) => handleInputChange('payment', 'card_enabled', checked)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-semibold">Midtrans Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="midtrans-merchant">Merchant ID</Label>
                    <Input 
                      id="midtrans-merchant" 
                      value={formData.payment?.midtrans_merchant_id || ''}
                      onChange={(e) => handleInputChange('payment', 'midtrans_merchant_id', e.target.value)}
                      placeholder="Masukkan Midtrans Merchant ID"
                      type="password"
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="midtrans-key">Server Key</Label>
                    <Input 
                      id="midtrans-key" 
                      value={formData.payment?.midtrans_server_key || ''}
                      onChange={(e) => handleInputChange('payment', 'midtrans_server_key', e.target.value)}
                      placeholder="Masukkan Midtrans Server Key"
                      type="password"
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="midtrans-env">Environment</Label>
                  <ReactSelect
                    value={{ value: formData.payment?.midtrans_environment || 'sandbox', label: formData.payment?.midtrans_environment === 'production' ? 'Production' : 'Sandbox (Testing)' }}
                    onChange={(option) => handleInputChange('payment', 'midtrans_environment', option?.value)}
                    options={[
                      { value: 'sandbox', label: 'Sandbox (Testing)' },
                      { value: 'production', label: 'Production' }
                    ]}
                    placeholder="Pilih environment"
                    className="w-full"
                    isDisabled={isLoading}
                    instanceId="midtrans-env-select"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={() => handleSave('payment')}
                  disabled={isSaving || isLoading}
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Printer Settings */}
        <TabsContent value="printer" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5" />
                Konfigurasi Printer
              </CardTitle>
              <CardDescription>
                Pengaturan printer thermal dan printer struk
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="auto-print">Auto Print Receipt</Label>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Cetak struk otomatis setelah pembayaran berhasil
                    </p>
                  </div>
                  <Switch 
                    id="auto-print" 
                    checked={formData.printer?.auto_print !== false}
                    onCheckedChange={(checked) => handleInputChange('printer', 'auto_print', checked)}
                    disabled={isLoading}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="print-logo">Print Logo</Label>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Cetak logo toko pada struk
                    </p>
                  </div>
                  <Switch 
                    id="print-logo" 
                    checked={formData.printer?.print_logo !== false}
                    onCheckedChange={(checked) => handleInputChange('printer', 'print_logo', checked)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-semibold">Printer Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="printer-type">Tipe Printer</Label>
                    <ReactSelect
                      value={{ value: formData.printer?.printer_type || 'thermal', label: formData.printer?.printer_type === 'laser' ? 'Laser/Inkjet Printer' : formData.printer?.printer_type === 'network' ? 'Network Printer' : 'Thermal Printer' }}
                      onChange={(option) => handleInputChange('printer', 'printer_type', option?.value)}
                      options={[
                        { value: 'thermal', label: 'Thermal Printer' },
                        { value: 'laser', label: 'Laser/Inkjet Printer' },
                        { value: 'network', label: 'Network Printer' }
                      ]}
                      placeholder="Pilih tipe printer"
                      className="w-full"
                      isDisabled={isLoading}
                      instanceId="printer-type-select"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="printer-port">Port/Connection</Label>
                    <Input 
                      id="printer-port" 
                      value={formData.printer?.printer_port || ''}
                      onChange={(e) => handleInputChange('printer', 'printer_port', e.target.value)}
                      placeholder="USB001 atau IP Address"
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paper-width">Lebar Kertas</Label>
                  <ReactSelect
                    value={{ value: formData.printer?.paper_width || '58mm', label: formData.printer?.paper_width === '80mm' ? '80mm' : formData.printer?.paper_width === 'a4' ? 'A4' : '58mm' }}
                    onChange={(option) => handleInputChange('printer', 'paper_width', option?.value)}
                    options={[
                      { value: '58mm', label: '58mm' },
                      { value: '80mm', label: '80mm' },
                      { value: 'a4', label: 'A4' }
                    ]}
                    placeholder="Pilih lebar kertas"
                    className="w-full"
                    isDisabled={isLoading}
                    instanceId="paper-width-select"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-semibold">Test Printer</h4>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleTestPrint} disabled={isLoading}>
                    <Printer className="h-4 w-4 mr-2" />
                    Test Print
                  </Button>
                  <Button variant="outline" onClick={handleTestPrinterConnection} disabled={isLoading}>
                    <Database className="h-4 w-4 mr-2" />
                    Test Connection
                  </Button>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={() => handleSave('printer')}
                  disabled={isSaving || isLoading}
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Pengaturan Sistem
              </CardTitle>
              <CardDescription>
                Konfigurasi keamanan dan backup sistem
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-lg font-semibold">Security Settings</h4>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="session-timeout">Session Timeout</Label>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Logout otomatis setelah tidak aktif
                    </p>
                  </div>
                  <Switch 
                    id="session-timeout" 
                    checked={formData.system?.session_timeout_enabled !== false}
                    onCheckedChange={(checked) => handleInputChange('system', 'session_timeout_enabled', checked)}
                    disabled={isLoading}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="timeout-duration">Durasi (menit)</Label>
                    <Input 
                      id="timeout-duration" 
                      type="number"
                      value={formData.system?.session_timeout_duration || 30}
                      onChange={(e) => handleInputChange('system', 'session_timeout_duration', parseInt(e.target.value))}
                      min="5"
                      max="480"
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-login">Max Login Attempts</Label>
                    <Input 
                      id="max-login" 
                      type="number"
                      value={formData.system?.max_login_attempts || 5}
                      onChange={(e) => handleInputChange('system', 'max_login_attempts', parseInt(e.target.value))}
                      min="3"
                      max="10"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-lg font-semibold">Backup Settings</h4>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="auto-backup">Auto Backup</Label>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Backup database otomatis
                    </p>
                  </div>
                  <Switch 
                    id="auto-backup" 
                    checked={formData.system?.auto_backup_enabled !== false}
                    onCheckedChange={(checked) => handleInputChange('system', 'auto_backup_enabled', checked)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="backup-frequency">Backup Frequency</Label>
                  <ReactSelect
                    value={{ value: formData.system?.backup_frequency || 'daily', label: formData.system?.backup_frequency === 'weekly' ? 'Mingguan' : formData.system?.backup_frequency === 'monthly' ? 'Bulanan' : 'Harian' }}
                    onChange={(option) => handleInputChange('system', 'backup_frequency', option?.value)}
                    options={[
                      { value: 'daily', label: 'Harian' },
                      { value: 'weekly', label: 'Mingguan' },
                      { value: 'monthly', label: 'Bulanan' }
                    ]}
                    placeholder="Pilih frekuensi backup"
                    className="w-full"
                    isDisabled={isLoading}
                    instanceId="backup-frequency-select"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={() => handleSave('system')}
                  disabled={isSaving || isLoading}
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Pengaturan Notifikasi
              </CardTitle>
              <CardDescription>
                Kelola notifikasi sistem dan alert
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-lg font-semibold">Sales Notifications</h4>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="sale-alert">Sale Alert</Label>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Notifikasi saat ada transaksi baru
                    </p>
                  </div>
                  <Switch 
                    id="sale-alert" 
                    checked={formData.notifications?.sale_alert !== false}
                    onCheckedChange={(checked) => handleInputChange('notifications', 'sale_alert', checked)}
                    disabled={isLoading}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="low-stock">Low Stock Alert</Label>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Notifikasi stok produk menipis
                    </p>
                  </div>
                  <Switch 
                    id="low-stock" 
                    checked={formData.notifications?.low_stock_alert !== false}
                    onCheckedChange={(checked) => handleInputChange('notifications', 'low_stock_alert', checked)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-lg font-semibold">System Notifications</h4>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="system-update">System Updates</Label>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Notifikasi pembaruan sistem
                    </p>
                  </div>
                  <Switch 
                    id="system-update" 
                    checked={formData.notifications?.system_updates !== false}
                    onCheckedChange={(checked) => handleInputChange('notifications', 'system_updates', checked)}
                    disabled={isLoading}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="error-report">Error Reports</Label>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Notifikasi error sistem
                    </p>
                  </div>
                  <Switch 
                    id="error-report" 
                    checked={formData.notifications?.error_reports !== false}
                    onCheckedChange={(checked) => handleInputChange('notifications', 'error_reports', checked)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={() => handleSave('notifications')}
                  disabled={isSaving || isLoading}
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
