'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, Smartphone, Settings, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { useTheme } from '@/hooks/useTheme'

interface MobilePermissionHelperProps {
  onRequestPermission: () => Promise<void>
  isSupported: boolean
}

export function MobilePermissionHelper({ onRequestPermission, isSupported }: MobilePermissionHelperProps) {
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown')
  const [isChecking, setIsChecking] = useState(false)
  const { isDark } = useTheme()

  useEffect(() => {
    checkPermissionStatus()
  }, [])

  const checkPermissionStatus = async () => {
    if (!navigator.permissions || !navigator.permissions.query) {
      setPermissionState('unknown')
      return
    }

    try {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName })
      setPermissionState(result.state as 'granted' | 'denied' | 'prompt')
      
      result.addEventListener('change', () => {
        setPermissionState(result.state as 'granted' | 'denied' | 'prompt')
      })
    } catch (error) {
      setPermissionState('unknown')
    }
  }

  const handleRequestPermission = async () => {
    if (!isSupported) {
      toast.error('Browser tidak mendukung akses kamera')
      return
    }

    setIsChecking(true)
    try {
      await onRequestPermission()
      await checkPermissionStatus()
    } catch (error) {
      console.error('Permission request failed:', error)
    } finally {
      setIsChecking(false)
    }
  }

  const getPermissionMessage = () => {
    switch (permissionState) {
      case 'granted':
        return '✅ Izin kamera telah diberikan'
      case 'denied':
        return '❌ Izin kamera ditolak. Silakan ubah di pengaturan browser.'
      case 'prompt':
        return '📱 Siap memberikan izin kamera'
      case 'unknown':
        return '❓ Status izin tidak diketahui'
      default:
        return ''
    }
  }

  const getInstructions = () => {
    if (permissionState === 'denied') {
      return (
        <div className="space-y-3">
          <p className="text-sm text-destructive font-medium">
            Izin kamera ditolak. Ikuti langkah berikut:
          </p>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-primary">1.</span>
              <div>
                <p className="font-medium">Chrome Android:</p>
                <p className="text-sm text-muted-foreground">⋮ Menu → Settings → Site Settings → Camera → Izinkan situs ini</p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <span className="text-primary">2.</span>
              <div>
                <p className="font-medium">Safari iOS:</p>
                <p className="text-sm text-muted-foreground">Settings → Safari → Camera → Allow</p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <span className="text-primary">3.</span>
              <div>
                <p className="font-medium">Firefox Mobile:</p>
                <p className="text-sm text-muted-foreground">⋮ Menu → Settings → Site Permissions → Camera → Izinkan</p>
              </div>
            </div>
          </div>
          
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline" 
            size="sm"
            className="w-full mt-3"
          >
            Refresh Halaman
          </Button>
        </div>
      )
    }

    return null
  }

  if (!isSupported) {
    return (
      <div className={`${isDark ? 'bg-muted/50' : 'bg-gray-50'} border border-border rounded-lg p-4`}>
        <div className="flex items-center gap-3 mb-3">
          <Smartphone className={`h-5 w-5 ${isDark ? 'text-foreground/60' : 'text-gray-600'}`} />
          <h3 className="font-medium text-foreground">Browser Tidak Didukung</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Browser Anda tidak mendukung akses kamera. Gunakan browser modern seperti Chrome, Firefox, atau Safari.
        </p>
      </div>
    )
  }

  return (
    <div className={`${isDark ? 'bg-muted/50' : 'bg-gray-50'} border border-border rounded-lg p-4`}>
      <div className="flex items-center gap-3 mb-3">
        <Camera className="h-5 w-5 text-primary" />
        <h3 className="font-medium text-foreground">Izin Kamera Diperlukan</h3>
      </div>
      
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Scanner barcode memerlukan akses kamera untuk membaca kode produk.
        </p>
        
        <div className={`${isDark ? 'bg-card' : 'bg-white'} rounded p-3 text-center border shadow-sm`}>
          <p className="text-sm font-medium">{getPermissionMessage()}</p>
        </div>
        
        {permissionState === 'prompt' && (
          <Button 
            onClick={handleRequestPermission} 
            disabled={isChecking}
            className="w-full"
          >
            {isChecking ? 'Meminta Izin...' : '📱 Izinkan Kamera'}
          </Button>
        )}
        
        {permissionState === 'granted' && (
          <div className="text-center">
            <Button 
              onClick={onRequestPermission} 
              className="w-full"
            >
              📷 Mulai Scanner
            </Button>
          </div>
        )}
        
        {getInstructions()}
        
        <div className="text-xs text-muted-foreground space-y-1">
          <p>💡 <strong className="text-foreground">Tips:</strong> Pastikan kamera tidak digunakan aplikasi lain</p>
          <p>🔒 <strong className="text-foreground">Keamanan:</strong> Kamera hanya aktif saat scanner dibuka</p>
        </div>
      </div>
    </div>
  )
}

// Utility function untuk mobile detection
export const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

// Utility function untuk mobile browser detection
export const getMobileBrowser = () => {
  const ua = navigator.userAgent
  
  if (/CriOS/i.test(ua)) return 'Chrome iOS'
  if (/FxiOS/i.test(ua)) return 'Firefox iOS'
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Safari'
  if (/Chrome/i.test(ua)) return 'Chrome'
  if (/Firefox/i.test(ua)) return 'Firefox'
  
  return 'Unknown'
}

// Utility function untuk mendapatkan instruksi spesifik browser
export const getBrowserInstructions = () => {
  const browser = getMobileBrowser()
  
  switch (browser) {
    case 'Chrome iOS':
      return {
        name: 'Chrome iOS',
        steps: [
          'Tap ⋮ menu di Chrome',
          'Pilih Settings',
          'Tap Site Settings',
          'Tap Camera',
          'Izinkan situs ini'
        ]
      }
    
    case 'Safari':
      return {
        name: 'Safari iOS',
        steps: [
          'Buka Settings app',
          'Scroll ke Safari',
          'Tap Camera',
          'Pilih Allow'
        ]
      }
    
    case 'Chrome':
      return {
        name: 'Chrome Android',
        steps: [
          'Tap ⋮ menu di Chrome',
          'Pilih Settings',
          'Tap Site Settings',
          'Tap Camera',
          'Izinkan situs ini'
        ]
      }
    
    case 'Firefox':
      return {
        name: 'Firefox Mobile',
        steps: [
          'Tap ⋮ menu di Firefox',
          'Pilih Settings',
          'Tap Site Permissions',
          'Tap Camera',
          'Izinkan situs ini'
        ]
      }
    
    default:
      return {
        name: 'Browser',
        steps: [
          'Buka browser settings',
          'Cari permissions atau site settings',
          'Cari camera permissions',
          'Izinkan situs ini'
        ]
      }
  }
}
