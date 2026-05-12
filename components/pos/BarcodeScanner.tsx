'use client'

import { useState, useRef, useEffect } from 'react'
import { useUSBScanner } from '@/hooks/useUSBScanner'
import { useWebcamScanner } from '@/hooks/useWebcamScanner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Camera, Keyboard, Loader2 } from 'lucide-react'

export function BarcodeScanner() {
  const [scanMode, setScanMode] = useState<'usb' | 'webcam'>('usb')
  const { isScanning: webcamScanning, error: webcamError, scannerRef, startScanner, stopScanner } = useWebcamScanner()
  
  // USB scanner is always active when in USB mode
  useUSBScanner()

  const toggleMode = () => {
    console.log("[POS Scanner] Toggling scan mode from:", scanMode);
    if (scanMode === 'webcam') {
      console.log("[POS Scanner] Switching to USB mode");
      stopScanner()
      setScanMode('usb')
    } else {
      console.log("[POS Scanner] Switching to webcam mode");
      setScanMode('webcam')
    }
  }

  useEffect(() => {
    console.log("[POS Scanner] Scan mode changed to:", scanMode);
    if (scanMode === 'webcam') {
      console.log("[POS Scanner] Starting webcam scanner");
      startScanner()
    }
    return () => {
      if (webcamScanning) {
        console.log("[POS Scanner] Cleaning up webcam scanner");
        stopScanner()
      }
    }
  }, [scanMode, startScanner, stopScanner, webcamScanning])

  return (
    <Card className={`w-full transition-all duration-300 ${scanMode === 'usb' ? 'pos-scanner-active' : 'pos-scanner-ready'}`}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-lg sm:text-xl">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-6 rounded-full ${scanMode === 'usb' ? 'bg-green-600' : 'bg-primary-brand'}`}></div>
            <span className="text-sm sm:text-base font-semibold">Barcode Scanner</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleMode}
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm pos-action-button hover:scale-[1.02]"
          >
            {scanMode === 'usb' ? (
              <>
                <Camera className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Ganti ke Kamera</span>
                <span className="sm:hidden">Kamera</span>
              </>
            ) : (
              <>
                <Keyboard className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Ganti ke USB</span>
                <span className="sm:hidden">USB</span>
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {scanMode === 'usb' ? (
              <Keyboard className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
            ) : (
              <Camera className="h-4 w-4 sm:h-5 sm:w-5 text-primary-brand" />
            )}
            <span className="font-medium text-sm sm:text-base">
              {scanMode === 'usb' ? 'Pemindai USB' : 'Pemindai Kamera'}
            </span>
          </div>
          <Badge 
            variant={scanMode === 'usb' ? 'default' : 'secondary'} 
            className={`text-xs font-semibold ${scanMode === 'usb' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-primary/10 text-primary border-primary/20'}`}
          >
            {scanMode === 'usb' ? 'Aktif' : webcamScanning ? 'Memindai' : 'Siap'}
          </Badge>
        </div>

        {scanMode === 'usb' ? (
          <div className="p-3 sm:p-4 pos-payment-success rounded-md border-2 border-green-200">
            <div className="flex items-center gap-2">
              <Keyboard className="h-5 w-5 text-green-600" />
              <p className="text-xs sm:text-sm font-medium text-green-800">
                Pemindai USB aktif. Pindai kode bar menggunakan perangkat pemindai USB Anda.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div
              ref={scannerRef}
              className="relative w-full h-48 sm:h-64 bg-gradient-to-br from-background to-muted rounded-md overflow-hidden border-2 border-border"
            >
              {webcamScanning ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="text-white text-center">
                    <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mx-auto mb-2 text-primary-brand" />
                    <p className="text-xs sm:text-sm font-medium">Menginisialisasi kamera...</p>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="text-white text-center">
                    <Camera className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-75 text-primary-brand" />
                    <p className="text-xs sm:text-sm opacity-90 font-medium">Pratinjau kamera</p>
                  </div>
                </div>
              )}
            </div>
            
            {webcamError && (
              <div className="p-2 sm:p-3 bg-red-50 border-2 border-red-200 rounded-md">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-red-600" />
                  <p className="text-xs sm:text-sm font-medium text-red-800">{webcamError}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
