'use client'

import { useEffect, useRef } from 'react'
import { useBarcodeQueue } from './useBarcodeQueue'

const MIN_BARCODE_LENGTH   = 3
const SCANNER_KEYSTROKE_MS = 50    // max ms between scanner keystrokes
const SCANNER_TIMEOUT_MS   = 100   // flush buffer if no Enter received

/** Returns true if the event target is a manual input field (not a scanner passthrough) */
function isManualInput(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) {
    return false
  }
  return !(target as HTMLElement).hasAttribute('data-scanner-input')
}

/** Returns true if the key is a single printable character */
function isPrintable(key: string): boolean {
  return key.length === 1
}

export function useUSBScanner() {
  const { enqueue } = useBarcodeQueue()

  const buffer      = useRef<string>('')
  const lastKeyTime = useRef<number>(0)
  const timeout     = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const flush = () => {
      const barcode = buffer.current.trim()
      if (barcode.length > MIN_BARCODE_LENGTH) enqueue(barcode)
      buffer.current = ''
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isManualInput(e.target)) return

      const now = Date.now()
      const elapsed = now - lastKeyTime.current
      lastKeyTime.current = now

      clearTimeout(timeout.current)

      // Enter always terminates — check before timing branches
      if (e.key === 'Enter') { flush(); return }
      if (!isPrintable(e.key)) return

      buffer.current = elapsed < SCANNER_KEYSTROKE_MS
          ? buffer.current + e.key   // rapid → scanner input
          : e.key                    // slow  → manual typing, reset

      // Fallback flush for scanners that don't send Enter
      timeout.current = setTimeout(flush, SCANNER_TIMEOUT_MS)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearTimeout(timeout.current)
    }
  }, [enqueue])
}