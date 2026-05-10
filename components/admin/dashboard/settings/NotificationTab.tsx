'use client'

import { Bell } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'

interface NotificationTabProps {
  formData: any;
  handleInputChange: (category: string, key: string, value: any) => void;
  handleSave: (category: string) => Promise<void>;
  isLoading: boolean;
  isSaving: boolean;
}

export function NotificationTab({ formData, handleInputChange, handleSave, isLoading, isSaving }: NotificationTabProps) {
  return (
    <Card className="pos-modal-content border-none shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Settings
        </CardTitle>
        <CardDescription>
          Manage system notifications and alerts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h4 className="text-lg font-semibold">Sales Notifications</h4>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="sale-alert">Sale Alert</Label>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Notify when there is a new transaction
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
                Notify when product stock is low
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

        <Separator className="bg-border" />

        <div className="space-y-4">
          <h4 className="text-lg font-semibold">System Notifications</h4>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="system-update">System Updates</Label>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Notify about system updates
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
                Notify about system errors
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
            className="pos-button-primary"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
