'use client'

import { useRef, useCallback, useEffect } from 'react'
import { toast } from 'sonner'

export function useAdminBarcodeScanner(onBarcodeScanned: (barcode: string) => void) {
  const scannerBuffer = useRef<string>('')
  const scannerTimeout = useRef<NodeJS.Timeout | null>(null)
  const lastScanTime = useRef<number>(0)

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Skip if typing in an input field (except our barcode field)
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      if (!target.hasAttribute('data-scanner-input')) {
        return
      }
    }

    const key = event.key
    
    // Handle Enter key to complete barcode scan
    if (key === 'Enter') {
      if (scannerBuffer.current.length > 3) {
        const barcode = scannerBuffer.current.trim()
        scannerBuffer.current = ''
        
        // Debounce: prevent duplicate scans within 2 seconds
        const now = Date.now()
        if (now - lastScanTime.current < 2000) {
          return
        }
        lastScanTime.current = now
        
        onBarcodeScanned(barcode)
      }
      return
    }

    // Handle regular character input
    if (key.length === 1) {
      scannerBuffer.current += key
      
      // Clear buffer after 100ms of inactivity (fallback for scanners without Enter)
      if (scannerTimeout.current) {
        clearTimeout(scannerTimeout.current)
      }
      scannerTimeout.current = setTimeout(() => {
        if (scannerBuffer.current.length > 3) {
          const barcode = scannerBuffer.current.trim()
          scannerBuffer.current = ''
          
          const now = Date.now()
          if (now - lastScanTime.current < 2000) {
            return
          }
          lastScanTime.current = now
          
          onBarcodeScanned(barcode)
        } else {
          scannerBuffer.current = ''
        }
      }, 100)
    }
  }, [onBarcodeScanned])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (scannerTimeout.current) {
        clearTimeout(scannerTimeout.current)
      }
    }
  }, [handleKeyDown])

  return {
    clearBuffer: useCallback(() => {
      scannerBuffer.current = ''
      if (scannerTimeout.current) {
        clearTimeout(scannerTimeout.current)
      }
    }, [])
  }
}
