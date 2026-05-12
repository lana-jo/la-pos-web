'use client'

import { Printer, Database } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ReactSelect } from '@/components/ui/react-select'

interface PrinterTabProps {
  formData: any;
  handleInputChange: (category: string, key: string, value: any) => void;
  handleSave: (category: string) => Promise<void>;
  handleTestPrint: () => Promise<void>;
  handleTestPrinterConnection: () => Promise<void>;
  isLoading: boolean;
  isSaving: boolean;
}

export function PrinterTab({ 
  formData, 
  handleInputChange, 
  handleSave, 
  handleTestPrint, 
  handleTestPrinterConnection, 
  isLoading, 
  isSaving 
}: PrinterTabProps) {
  return (
    <Card className="pos-modal-content border-none shadow-xl">
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
              <Label htmlFor="auto-print">Cetak Struk Otomatis</Label>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Cetak struk secara otomatis setelah pembayaran berhasil
              </p>
            </div>
            <Switch 
              id="auto-print" 
              checked={formData.printer?.auto_print !== false}
              onCheckedChange={(checked) => handleInputChange('printer', 'auto_print', checked)}
              disabled={isLoading}
            />
          </div>
          <Separator className="bg-border" />
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="print-logo">Cetak Logo</Label>
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
          <h4 className="text-lg font-semibold">Detail Printer</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="printer-type">Tipe Printer</Label>
              <ReactSelect
                value={{ value: formData.printer?.printer_type || 'thermal', label: formData.printer?.printer_type === 'laser' ? 'Printer Laser/Inkjet' : formData.printer?.printer_type === 'network' ? 'Printer Jaringan' : 'Printer Thermal' }}
                onChange={(option) => handleInputChange('printer', 'printer_type', option?.value)}
                options={[
                  { value: 'thermal', label: 'Printer Thermal' },
                  { value: 'laser', label: 'Printer Laser/Inkjet' },
                  { value: 'network', label: 'Printer Jaringan' }
                ]}
                placeholder="Pilih tipe printer"
                className="w-full"
                isDisabled={isLoading}
                instanceId="printer-type-select"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="printer-port">Port/Koneksi</Label>
              <Input 
                id="printer-port" 
                value={formData.printer?.printer_port || ''}
                onChange={(e) => handleInputChange('printer', 'printer_port', e.target.value)}
                placeholder="USB001 atau Alamat IP"
                disabled={isLoading}
                className="pos-form-input"
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
          <h4 className="text-lg font-semibold">Uji Printer</h4>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleTestPrint} disabled={isLoading} className="border-primary-brand text-primary-brand hover:bg-primary-brand/10">
              <Printer className="h-4 w-4 mr-2" />
              Cetak Uji
            </Button>
            <Button variant="outline" onClick={handleTestPrinterConnection} disabled={isLoading} className="border-primary-brand text-primary-brand hover:bg-primary-brand/10">
              <Database className="h-4 w-4 mr-2" />
              Uji Koneksi
            </Button>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button 
            onClick={() => handleSave('printer')}
            disabled={isSaving || isLoading}
            className="pos-button-primary"
          >
            {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
