'use client'

import { Store, Globe } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ReactSelect } from '@/components/ui/react-select'

interface GeneralTabProps {
  formData: any;
  handleInputChange: (category: string, key: string, value: any) => void;
  handleSave: (category: string) => Promise<void>;
  isLoading: boolean;
  isSaving: boolean;
}

export function GeneralTab({ formData, handleInputChange, handleSave, isLoading, isSaving }: GeneralTabProps) {
  return (
    <div className="space-y-6">
      <Card className="pos-modal-content border-none shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Store Information
          </CardTitle>
          <CardDescription>
            Manage your basic store information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="store-name">Store Name</Label>
              <Input 
                id="store-name" 
                value={formData.general?.store_name || ''}
                onChange={(e) => handleInputChange('general', 'store_name', e.target.value)}
                placeholder="Enter store name"
                disabled={isLoading}
                className="pos-form-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store-phone">Phone</Label>
              <Input 
                id="store-phone" 
                value={formData.general?.store_phone || ''}
                onChange={(e) => handleInputChange('general', 'store_phone', e.target.value)}
                placeholder="Enter phone number"
                disabled={isLoading}
                className="pos-form-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store-email">Email</Label>
              <Input 
                id="store-email" 
                value={formData.general?.store_email || ''}
                onChange={(e) => handleInputChange('general', 'store_email', e.target.value)}
                placeholder="Enter email"
                type="email"
                disabled={isLoading}
                className="pos-form-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store-address">Address</Label>
              <Input 
                id="store-address" 
                value={formData.general?.store_address || ''}
                onChange={(e) => handleInputChange('general', 'store_address', e.target.value)}
                placeholder="Enter address"
                disabled={isLoading}
                className="pos-form-input"
              />
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <Button 
              onClick={() => handleSave('general')}
              disabled={isSaving || isLoading}
              className="pos-button-primary"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="pos-modal-content border-none shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Regional Settings
          </CardTitle>
          <CardDescription>
            Configure language, currency, and timezone
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <ReactSelect
                value={{ value: formData.general?.language || 'id', label: formData.general?.language === 'en' ? 'English' : 'Bahasa Indonesia' }}
                onChange={(option) => handleInputChange('general', 'language', option?.value)}
                options={[
                  { value: 'id', label: 'Bahasa Indonesia' },
                  { value: 'en', label: 'English' }
                ]}
                placeholder="Select language"
                className="w-full"
                isDisabled={isLoading}
                instanceId="language-select"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <ReactSelect
                value={{ value: formData.general?.currency || 'IDR', label: formData.general?.currency === 'USD' ? 'US Dollar (USD)' : 'Indonesian Rupiah (IDR)' }}
                onChange={(option) => handleInputChange('general', 'currency', option?.value)}
                options={[
                  { value: 'IDR', label: 'Indonesian Rupiah (IDR)' },
                  { value: 'USD', label: 'US Dollar (USD)' }
                ]}
                placeholder="Select currency"
                className="w-full"
                isDisabled={isLoading}
                instanceId="currency-select"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <ReactSelect
                value={{ value: formData.general?.timezone || 'Asia/Jakarta', label: formData.general?.timezone === 'Asia/Makassar' ? 'Makassar (WITA)' : formData.general?.timezone === 'Asia/Jayapura' ? 'Jayapura (WIT)' : 'Jakarta (WIB)' }}
                onChange={(option) => handleInputChange('general', 'timezone', option?.value)}
                options={[
                  { value: 'Asia/Jakarta', label: 'Jakarta (WIB)' },
                  { value: 'Asia/Makassar', label: 'Makassar (WITA)' },
                  { value: 'Asia/Jayapura', label: 'Jayapura (WIT)' }
                ]}
                placeholder="Select timezone"
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
              className="pos-button-primary"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
