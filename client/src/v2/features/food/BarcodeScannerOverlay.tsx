import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { X } from 'lucide-react'

interface BarcodeScannerOverlayProps {
  onScan: (barcode: string) => void
  onClose: () => void
}

export default function BarcodeScannerOverlay({ onScan, onClose }: BarcodeScannerOverlayProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [error, setError] = useState<string | null>(null)
  const scannedRef = useRef(false)

  useEffect(() => {
    let mounted = true

    const start = async () => {
      try {
        const scanner = new Html5Qrcode('v2-barcode-reader', {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
          ],
          verbose: false,
        })
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 280, height: 140 } },
          (decodedText) => {
            if (scannedRef.current) return
            scannedRef.current = true
            scanner.stop().catch(() => {})
            onScan(decodedText)
          },
          () => {}
        )
      } catch (err) {
        if (mounted) setError('Camera access denied. Check Settings > Privacy > Camera.')
      }
    }

    start()

    return () => {
      mounted = false
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [onScan])

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 bg-black/80" style={{ paddingTop: 'max(env(safe-area-inset-top), 56px)', paddingBottom: '12px' }}>
        <p className="text-white text-sm font-semibold">Scan barcode</p>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Scanner viewport */}
      <div className="flex-1 flex items-center justify-center relative">
        <div id="v2-barcode-reader" className="w-full max-w-sm" />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl p-5 text-center max-w-xs">
              <p className="text-sm text-gray-700 mb-3">{error}</p>
              <button onClick={onClose} className="text-sm font-medium text-purple-600">Close</button>
            </div>
          </div>
        )}
      </div>

      {/* Hint */}
      <div className="pb-8 pt-3 text-center bg-black/80" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 32px)' }}>
        <p className="text-white/60 text-xs">Point the camera at a product barcode</p>
      </div>
    </div>
  )
}
