'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff } from 'lucide-react'
import type { CashierFormData } from '@/types/cashier'

interface CashierFormFieldsProps {
  formData: CashierFormData
  onChange: (data: CashierFormData) => void
  isSubmitting: boolean
  idPrefix?: string
  showPassword: boolean
  onTogglePassword: () => void
  showPin: boolean
  onTogglePin: () => void
  isEditing?: boolean
}

export function CashierFormFields({
  formData,
  onChange,
  isSubmitting,
  idPrefix = '',
  showPassword,
  onTogglePassword,
  showPin,
  onTogglePin,
  isEditing = false,
}: CashierFormFieldsProps) {
  const fieldId = (key: string) => `${idPrefix}${key}`

  const updateField = <K extends keyof CashierFormData>(
    field: K,
    value: CashierFormData[K]
  ) => {
    onChange({ ...formData, [field]: value })
  }

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label htmlFor={fieldId('full_name')}>
          Nama Lengkap <span className="text-red-500">*</span>
        </Label>
        <Input
          id={fieldId('full_name')}
          value={formData.full_name}
          onChange={(e) => updateField('full_name', e.target.value)}
          placeholder="Masukkan nama lengkap kasir"
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={fieldId('email')}>
          Email <span className="text-red-500">*</span>
        </Label>
        <Input
          id={fieldId('email')}
          type="email"
          value={formData.email}
          onChange={(e) => updateField('email', e.target.value)}
          placeholder="kasir@example.com"
          disabled={isSubmitting || isEditing}
          className={formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) ? 'border-red-300' : ''}
        />
        {formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && (
          <p className="text-xs text-red-600">
            Format email tidak valid
          </p>
        )}
        {isEditing && (
          <p className="text-xs text-muted-foreground">
            Email tidak dapat diubah. Hubungi admin sistem untuk perubahan email.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={fieldId('password')}>
          Password {isEditing ? '(Biarkan kosong jika tidak ingin mengubah)' : <span className="text-red-500">*</span>}
        </Label>
        <div className="relative">
          <Input
            id={fieldId('password')}
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={(e) => updateField('password', e.target.value)}
            placeholder={isEditing ? '••••••••' : 'Masukkan password'}
            disabled={isSubmitting}
            className={formData.password && formData.password.length < 6 ? 'border-red-300' : 'pr-10'}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={onTogglePassword}
            disabled={isSubmitting}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
        {formData.password && formData.password.length < 6 && (
          <p className="text-xs text-red-600">
            Password minimal 6 karakter
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={fieldId('pin')}>
          PIN {isEditing ? '(Biarkan kosong jika tidak ingin mengubah)' : <span className="text-red-500">*</span>}
        </Label>
        <div className="relative">
          <Input
            id={fieldId('pin')}
            type={showPin ? 'text' : 'password'}
            value={formData.pin}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 4)
              updateField('pin', value)
            }}
            placeholder={isEditing ? '••••' : 'Masukkan 4 digit PIN'}
            maxLength={4}
            disabled={isSubmitting}
            className={formData.pin && formData.pin.length < 4 ? 'border-red-300' : 'pr-10'}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={onTogglePin}
            disabled={isSubmitting}
          >
            {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
        {formData.pin && formData.pin.length < 4 && (
          <p className="text-xs text-red-600">
            PIN harus 4 digit angka
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          PIN 4 digit untuk verifikasi aksi sensitif di terminal POS
        </p>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <input
          type="checkbox"
          id={fieldId('is_active')}
          checked={formData.is_active}
          onChange={(e) => updateField('is_active', e.target.checked)}
          disabled={isSubmitting}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
        />
        <Label htmlFor={fieldId('is_active')} className="cursor-pointer select-none">
          Akun Aktif
        </Label>
      </div>
    </div>
  )
}
