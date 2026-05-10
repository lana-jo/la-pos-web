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
          Printer Configuration
        </CardTitle>
        <CardDescription>
          Thermal printer and receipt printer settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="auto-print">Auto Print Receipt</Label>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Automatically print receipt after successful payment
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
              <Label htmlFor="print-logo">Print Logo</Label>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Print store logo on receipt
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
          <h4 className="text-lg font-semibold">Printer Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="printer-type">Printer Type</Label>
              <ReactSelect
                value={{ value: formData.printer?.printer_type || 'thermal', label: formData.printer?.printer_type === 'laser' ? 'Laser/Inkjet Printer' : formData.printer?.printer_type === 'network' ? 'Network Printer' : 'Thermal Printer' }}
                onChange={(option) => handleInputChange('printer', 'printer_type', option?.value)}
                options={[
                  { value: 'thermal', label: 'Thermal Printer' },
                  { value: 'laser', label: 'Laser/Inkjet Printer' },
                  { value: 'network', label: 'Network Printer' }
                ]}
                placeholder="Select printer type"
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
                placeholder="USB001 or IP Address"
                disabled={isLoading}
                className="pos-form-input"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="paper-width">Paper Width</Label>
            <ReactSelect
              value={{ value: formData.printer?.paper_width || '58mm', label: formData.printer?.paper_width === '80mm' ? '80mm' : formData.printer?.paper_width === 'a4' ? 'A4' : '58mm' }}
              onChange={(option) => handleInputChange('printer', 'paper_width', option?.value)}
              options={[
                { value: '58mm', label: '58mm' },
                { value: '80mm', label: '80mm' },
                { value: 'a4', label: 'A4' }
              ]}
              placeholder="Select paper width"
              className="w-full"
              isDisabled={isLoading}
              instanceId="paper-width-select"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-lg font-semibold">Test Printer</h4>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleTestPrint} disabled={isLoading} className="border-primary-brand text-primary-brand hover:bg-primary-brand/10">
              <Printer className="h-4 w-4 mr-2" />
              Test Print
            </Button>
            <Button variant="outline" onClick={handleTestPrinterConnection} disabled={isLoading} className="border-primary-brand text-primary-brand hover:bg-primary-brand/10">
              <Database className="h-4 w-4 mr-2" />
              Test Connection
            </Button>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button 
            onClick={() => handleSave('printer')}
            disabled={isSaving || isLoading}
            className="pos-button-primary"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
