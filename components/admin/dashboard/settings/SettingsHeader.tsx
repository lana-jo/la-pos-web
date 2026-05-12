'use client'

import { Settings, Download, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRef } from 'react'

interface SettingsHeaderProps {
  handleExportSettings: () => Promise<void>;
  handleImportSettings: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  isLoading: boolean;
}

export function SettingsHeader({ handleExportSettings, handleImportSettings, isLoading }: SettingsHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary-brand" />
          PENGATURAN SISTEM
        </h1>
        <p className="text-muted-foreground mt-2">Kelola konfigurasi dan preferensi sistem POS Anda.</p>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={handleExportSettings}
          disabled={isLoading}
          className="border-primary-brand text-primary-brand hover:bg-primary-brand/10"
        >
          <Download className="h-4 w-4 mr-2" />
          Ekspor Pengaturan
        </Button>
        <div className="relative">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportSettings}
            accept=".json"
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="border-primary-brand text-primary-brand hover:bg-primary-brand/10"
          >
            <Upload className="h-4 w-4 mr-2" />
            Impor Pengaturan
          </Button>
        </div>
      </div>
    </div>
  )
}
