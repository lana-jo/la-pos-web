'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { X, Camera, CameraOff } from 'lucide-react'
import { toast } from 'sonner'
import { MobilePermissionHelper, isMobileDevice } from './MobilePermissionHelper'
import { useTheme } from '@/hooks/useTheme'

interface CameraScannerProps {
  isOpen: boolean
  onClose: () => void
  onBarcodeDetected: (barcode: string) => void
}

export function CameraScanner({ isOpen, onClose, onBarcodeDetected }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [showPermissionHelper, setShowPermissionHelper] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const scannerRef = useRef<any>(null)
  const lastScanTime = useRef<number>(0)
  const isMobile = isMobileDevice()
  const { isDark, mounted } = useTheme()

  const stopCamera = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.stop()
      } catch (e) {
        console.log('Scanner already stopped')
      }
      scannerRef.current = null
    }
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    
    setIsScanning(false)
  }

  const startBarcodeScanning = async () => {
    try {
      const Quagga = (await import('@ericblade/quagga2')).default
      
      Quagga.init({
        inputStream: {
          type: "LiveStream",
          target: videoRef.current || undefined,
          constraints: {
            width: 640,
            height: 480,
            facingMode: "environment"
          }
        },
        locator: {
          patchSize: "medium",
          halfSample: true
        },
        numOfWorkers: 2,
        decoder: {
          readers: ["ean_reader", "ean_8_reader", "code_128_reader", "upc_reader", "upc_e_reader"]
        },
        locate: true
      }, function(err: unknown) {
        if (err) {
          console.error('Quagga initialization error:', err)
          setError('Gagal menginisialisasi scanner barcode')
          return
        }
        Quagga.start()
        setIsScanning(true)
      })

      Quagga.onDetected((result: { codeResult?: { code?: string | null } }) => {
        const now = Date.now()
        if (now - lastScanTime.current < 2000) {
          return // Debounce: prevent duplicate scans within 2 seconds
        }
        
        if (result && result.codeResult && result.codeResult.code) {
          const barcode = result.codeResult.code
          lastScanTime.current = now
          
          // Play success sound
          const audio = new Audio('/data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmFgU7k9n1unEiBC13yO/eizEIHWq+8+OWT')
          audio.volume = 0.3
          audio.play().catch(() => {})
          
          onBarcodeDetected(barcode)
          toast.success(`Barcode terdeteksi: ${barcode}`)
        }
      })

      scannerRef.current = Quagga
    } catch (err) {
      console.error('Failed to load Quagga:', err)
      setError('Gagal memuat library scanner barcode')
      toast.error('Gagal memuat scanner')
    }
  }

  const startCamera = async () => {
    try {
      setError(null)
      
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setIsSupported(false)
        throw new Error('Browser tidak mendukung akses kamera. Gunakan browser modern.')
      }
      
      // Check if running on HTTPS (required for camera access)
      if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        throw new Error('Akses kamera memerlukan HTTPS. Pastikan aplikasi berjalan di lingkungan HTTPS.')
      }
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: isMobile ? 'environment' : 'user',
          width: { ideal: isMobile ? 1280 : 640 },
          height: { ideal: isMobile ? 720 : 480 }
        }
      })
      
      setStream(mediaStream)
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
          startBarcodeScanning()
        }
      }
    } catch (err) {
      console.error('Camera access error:', err)
      
      let errorMessage = 'Tidak dapat mengakses kamera. Pastikan izin kamera diaktifkan.'
      let shouldShowHelper = false
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.message.includes('Permission denied')) {
          errorMessage = 'Izin kamera ditolak. Silakan izinkan akses kamera di browser Anda.'
          shouldShowHelper = isMobile // Show helper on mobile for permission issues
        } else if (err.name === 'NotFoundError' || err.message.includes('No camera')) {
          errorMessage = 'Tidak ada kamera yang terdeteksi. Pastikan kamera terhubung.'
        } else if (err.name === 'NotSupportedError' || err.message.includes('not supported')) {
          errorMessage = 'Browser tidak mendukung akses kamera. Gunakan browser modern.'
        } else if (err.name === 'NotReadableError' || err.message.includes('already in use')) {
          errorMessage = 'Kamera sedang digunakan oleh aplikasi lain. Tutup aplikasi lain dan coba lagi.'
        } else if (err.message.includes('HTTPS')) {
          errorMessage = err.message
        } else {
          errorMessage = err.message
        }
      }
      
      setError(errorMessage)
      setShowPermissionHelper(shouldShowHelper)
      toast.error('Gagal mengakses kamera')
    }
  }

  useEffect(() => {
    if (isOpen) {
      if (!isScanning && !stream) {
        // Use a small delay to avoid synchronous setState during effect execution
        const timer = setTimeout(() => {
          startCamera()
        }, 0)
        return () => clearTimeout(timer)
      }
    } else {
      if (stream || scannerRef.current) {
        stopCamera()
      }
    }
  }, [isOpen, isScanning, stream])

  const handleClose = () => {
    stopCamera()
    setShowPermissionHelper(false)
    onClose()
  }

  const handlePermissionRequest = async () => {
    setShowPermissionHelper(false)
    await startCamera()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg border w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scanner Barcode Kamera
          </h3>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Scanner View */}
        <div className="relative bg-black">
          <video
            ref={videoRef}
            className="w-full h-[400px] object-cover"
            autoPlay
            playsInline
            muted
          />
          
          {/* Scanning Overlay */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none">
              <div className={`absolute top-1/2 left-0 right-0 h-0.5 ${isDark ? 'bg-primary' : 'bg-blue-600'} animate-pulse shadow-sm`} />
              <div className={`absolute top-0 bottom-0 left-1/2 w-0.5 ${isDark ? 'bg-primary' : 'bg-blue-600'} animate-pulse shadow-sm`} />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className={`absolute inset-0 ${isDark ? 'bg-black/80' : 'bg-black/70'} flex items-center justify-center`}>
              <div className={`text-center ${isDark ? 'text-white' : 'text-foreground'} p-4 max-w-md ${isDark ? 'bg-card/95' : 'bg-white/95'} rounded-lg border shadow-lg`}>
                <CameraOff className="h-12 w-12 mx-auto mb-4 text-destructive" />
                <p className="text-lg mb-2">Gagal Mengakses Kamera</p>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={startCamera} variant="outline">
                    Coba Lagi
                  </Button>
                  {isMobile && (
                    <Button onClick={() => setShowPermissionHelper(true)} variant="secondary">
                      Bantuan Izin
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {!isScanning && !error && (
            <div className={`absolute inset-0 ${isDark ? 'bg-black/80' : 'bg-black/70'} flex items-center justify-center`}>
              <div className={`text-center ${isDark ? 'text-white' : 'text-foreground'} ${isDark ? 'bg-card/95' : 'bg-white/95'} rounded-lg border shadow-lg p-4`}>
                <Camera className="h-12 w-12 mx-auto mb-4 animate-pulse text-primary" />
                <p className="text-lg">Memulai kamera...</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/50">
          <div className="text-center text-sm text-muted-foreground">
            Arahkan barcode ke kamera untuk scan otomatis
          </div>
          <div className="flex justify-center gap-2 mt-3">
            <Button variant="outline" onClick={handleClose}>
              Tutup
            </Button>
          </div>
        </div>

        {/* Mobile Permission Helper Overlay */}
        {showPermissionHelper && (
          <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-4 z-10">
            <div className="bg-card rounded-lg border max-w-md w-full max-h-[80vh] overflow-y-auto">
              <div className="p-4">
                <MobilePermissionHelper
                  onRequestPermission={handlePermissionRequest}
                  isSupported={isSupported}
                />
                <div className="mt-4 flex justify-end">
                  <Button variant="outline" onClick={() => setShowPermissionHelper(false)}>
                    Tutup Bantuan
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
