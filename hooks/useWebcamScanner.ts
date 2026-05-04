'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Quagga from '@ericblade/quagga2'
import type { QuaggaJSConfigObject } from '@ericblade/quagga2'
import { useBarcodeQueue } from './useBarcodeQueue'

// ─── Constants ────────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 2000

const QUAGGA_BASE: Partial<QuaggaJSConfigObject> = {
    locator:      { patchSize: 'medium', halfSample: true },
    numOfWorkers: 2,
    decoder:      { readers: ['ean_reader', 'ean_8_reader', 'code_128_reader', 'upc_reader'] },
    locate:       true,
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWebcamScanner() {
    const { enqueue } = useBarcodeQueue()

    const [isScanning, setIsScanning] = useState(false)
    const [error, setError]           = useState<string | null>(null)
    const [permission, setPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt')

    const scannerRef    = useRef<HTMLDivElement>(null)
    const lastCode      = useRef<string>('')
    const lastScanTime  = useRef<number>(0)
    const isScanningRef = useRef(false)

    const stopScanner = useCallback(() => {
        if (!isScanningRef.current) return
        Quagga.offDetected()
        Quagga.stop()
        isScanningRef.current = false
        setIsScanning(false)
    }, [])

    const startScanner = useCallback(async () => {
        if (isScanningRef.current) return

        setError(null)
        setIsScanning(true) // Set loading state early

        try {
            // Check permission first before heavy initialization
            const stream = await navigator.mediaDevices.getUserMedia({ video: true })
            stream.getTracks().forEach((t) => t.stop())
            setPermission('granted')
        } catch {
            setError('Camera access denied or not available')
            setPermission('denied')
            setIsScanning(false)
            return
        }

        if (!scannerRef.current) {
            setError('Scanner container not mounted')
            return
        }

        try {
            await Quagga.init({
                locator:      QUAGGA_BASE.locator,
                numOfWorkers: QUAGGA_BASE.numOfWorkers,
                decoder:      QUAGGA_BASE.decoder,
                locate:       QUAGGA_BASE.locate,
                inputStream: {
                    type:        'LiveStream',
                    target:      scannerRef.current,
                    constraints: { width: 640, height: 480, facingMode: 'environment' },
                },
            } as QuaggaJSConfigObject)

            Quagga.onDetected((result) => {
                const code = result.codeResult?.code
                if (!code) return

                const now = Date.now()
                if (code === lastCode.current && now - lastScanTime.current < DEBOUNCE_MS) return

                lastCode.current     = code
                lastScanTime.current = now
                enqueue(code)
            })

            Quagga.start()
            isScanningRef.current = true
            setIsScanning(true)
        } catch (err) {
            console.error('Quagga init error:', err)
            setError('Failed to initialize camera scanner')
        }
    }, [enqueue])

    useEffect(() => () => { stopScanner() }, [stopScanner])

    return { isScanning, error, permission, scannerRef, startScanner, stopScanner }
}