// ============================================================
// frontend/src/hooks/useScan.ts
// Manages scan state: status, results, trigger, cancel
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import type { ScanStatus, ScanResult } from '../types'
import { toast } from 'sonner'

export function useScan() {
  const [status, setStatus] = useState<ScanStatus>('idle')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const cleanupRef = useRef<(() => void)[]>([])

  useEffect(() => {
    if (!window.electron) return

    // Listen for status updates from main process
    const unsubStatus = window.electron.scan.onStatus((s) => {
      setStatus(s)
      setIsScanning(s === 'capturing' || s === 'processing-ocr' || s === 'processing-ai')
    })

    // Listen for new results
    const unsubResult = window.electron.scan.onNewResult((r) => {
      setResult(r)
      if (r.error) {
        toast.error(`Scan failed: ${r.error}`)
      } else {
        toast.success('Answer ready!', { duration: 2000 })
      }
    })

    // Listen for shortcut trigger
    const handleShortcutTrigger = () => {
      triggerScan()
    }
    window.addEventListener('scan:triggered', handleShortcutTrigger)

    cleanupRef.current = [unsubStatus, unsubResult]

    return () => {
      cleanupRef.current.forEach((fn) => fn?.())
      window.removeEventListener('scan:triggered', handleShortcutTrigger)
    }
  }, [])

  const triggerScan = useCallback(async () => {
    if (!window.electron) {
      toast.error('Desktop features not available')
      return
    }

    if (isScanning) {
      toast.info('Scan already in progress…')
      return
    }

    try {
      setStatus('capturing')
      setIsScanning(true)
      setResult(null)
      const r = await window.electron.scan.trigger()
      setResult(r)
    } catch (err) {
      toast.error('Scan failed')
      setStatus('error')
    } finally {
      setIsScanning(false)
    }
  }, [isScanning])

  const cancelScan = useCallback(() => {
    if (window.electron) {
      window.electron.scan.cancel()
      setStatus('cancelled')
      setIsScanning(false)
    }
  }, [])

  const clearResult = useCallback(() => {
    setResult(null)
    setStatus('idle')
  }, [])

  return { status, result, isScanning, triggerScan, cancelScan, clearResult }
}
