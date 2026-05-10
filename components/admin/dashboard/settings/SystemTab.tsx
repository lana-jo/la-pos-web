'use client'

import { Shield } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ReactSelect } from '@/components/ui/react-select'

interface SystemTabProps {
  formData: any;
  handleInputChange: (category: string, key: string, value: any) => void;
  handleSave: (category: string) => Promise<void>;
  isLoading: boolean;
  isSaving: boolean;
}

export function SystemTab({ formData, handleInputChange, handleSave, isLoading, isSaving }: SystemTabProps) {
  return (
    <Card className="pos-modal-content border-none shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          System Settings
        </CardTitle>
        <CardDescription>
          Configure system security and backup settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h4 className="text-lg font-semibold">Security Settings</h4>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="session-timeout">Session Timeout</Label>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Automatically logout after inactivity
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
              <Label htmlFor="timeout-duration">Duration (minutes)</Label>
              <Input 
                id="timeout-duration" 
                type="number"
                value={formData.system?.session_timeout_duration || 30}
                onChange={(e) => handleInputChange('system', 'session_timeout_duration', parseInt(e.target.value))}
                min="5"
                max="480"
                disabled={isLoading}
                className="pos-form-input"
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
                className="pos-form-input"
              />
            </div>
          </div>
        </div>

        <Separator className="bg-border" />

        <div className="space-y-4">
          <h4 className="text-lg font-semibold">Backup Settings</h4>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="auto-backup">Auto Backup</Label>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Enable automatic database backup
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
              value={{ value: formData.system?.backup_frequency || 'daily', label: formData.system?.backup_frequency === 'weekly' ? 'Weekly' : formData.system?.backup_frequency === 'monthly' ? 'Monthly' : 'Daily' }}
              onChange={(option) => handleInputChange('system', 'backup_frequency', option?.value)}
              options={[
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' }
              ]}
              placeholder="Select backup frequency"
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
            className="pos-button-primary"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
