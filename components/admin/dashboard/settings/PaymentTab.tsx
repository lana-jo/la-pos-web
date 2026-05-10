'use client'

import { CreditCard } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ReactSelect } from '@/components/ui/react-select'

interface PaymentTabProps {
  formData: any;
  handleInputChange: (category: string, key: string, value: any) => void;
  handleSave: (category: string) => Promise<void>;
  isLoading: boolean;
  isSaving: boolean;
}

export function PaymentTab({ formData, handleInputChange, handleSave, isLoading, isSaving }: PaymentTabProps) {
  return (
    <Card className="pos-modal-content border-none shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Configuration
        </CardTitle>
        <CardDescription>
          Manage payment methods and payment gateway
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="qris-enabled">QRIS Payment</Label>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Enable QRIS payment through Midtrans
              </p>
            </div>
            <Switch 
              id="qris-enabled" 
              checked={formData.payment?.qris_enabled !== false}
              onCheckedChange={(checked) => handleInputChange('payment', 'qris_enabled', checked)}
              disabled={isLoading}
            />
          </div>
          <Separator className="bg-border" />
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="cash-enabled">Cash Payment</Label>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Enable cash payments
              </p>
            </div>
            <Switch 
              id="cash-enabled" 
              checked={formData.payment?.cash_enabled !== false}
              onCheckedChange={(checked) => handleInputChange('payment', 'cash_enabled', checked)}
              disabled={isLoading}
            />
          </div>
          <Separator className="bg-border" />
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="card-enabled">Card Payment</Label>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Enable credit/debit card payments
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
                placeholder="Enter Midtrans Merchant ID"
                type="password"
                disabled={isLoading}
                className="pos-form-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="midtrans-key">Server Key</Label>
              <Input 
                id="midtrans-key" 
                value={formData.payment?.midtrans_server_key || ''}
                onChange={(e) => handleInputChange('payment', 'midtrans_server_key', e.target.value)}
                placeholder="Enter Midtrans Server Key"
                type="password"
                disabled={isLoading}
                className="pos-form-input"
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
              placeholder="Select environment"
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
            className="pos-button-primary"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
