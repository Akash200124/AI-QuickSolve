// ============================================================
// frontend/src/components/FloatingPanel/FloatingPanel.tsx
// Compact always-on-top floating assistant panel
// ============================================================

import React, { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, Minus, X, Scan, Loader2, AlertCircle,
  RefreshCcw, Settings, GripHorizontal
} from 'lucide-react'
import { useScan } from '../../hooks/useScan'
import { useSettings } from '../../hooks/useSettings'
import AnswerCard from '../AnswerCard/AnswerCard'

export default function FloatingPanel() {
  const { status, result, isScanning, triggerScan, cancelScan } = useScan()
  const { settings } = useSettings()
  const [minimized, setMinimized] = useState(false)

  const handleClose = () => window.electron?.window.close()
  const handleMinimize = () => setMinimized(!minimized)
  const openSettings = () => {
    window.electron?.window.toggleFloat(false)
  }

  const statusConfig = {
    idle: { label: 'Ready', color: '#94A3B8', dot: 'idle' },
    capturing: { label: 'Capturing screen…', color: '#7C5CFC', dot: 'scanning' },
    'processing-ocr': { label: 'Reading text…', color: '#7C5CFC', dot: 'scanning' },
    'processing-ai': { label: 'AI analyzing…', color: '#7C5CFC', dot: 'scanning' },
    done: { label: 'Answer ready', color: '#22C55E', dot: 'active' },
    error: { label: 'Error', color: '#EF4444', dot: 'error' },
    cancelled: { label: 'Cancelled', color: '#F59E0B', dot: 'idle' }
  }[status] ?? { label: 'Ready', color: '#94A3B8', dot: 'idle' }

  return (
    <div className="w-full h-full flex flex-col glass-panel rounded-2xl overflow-hidden">
      {/* ── Header ─────────────────────────────────────────── */}
      <div
        className="titlebar-drag flex items-center justify-between px-3 py-2.5 border-b border-border/50 flex-shrink-0"
        style={{ cursor: 'grab' }}
      >
        <div className="titlebar-no-drag flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-accent/20 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-accent" />
          </div>
          <span className="text-xs font-semibold text-text-primary">AI QuickSolve</span>
          <div className="flex items-center gap-1.5">
            <span className={`status-dot ${statusConfig.dot}`} />
            <span className="text-xs" style={{ color: statusConfig.color }}>
              {statusConfig.label}
            </span>
          </div>
        </div>

        <div className="titlebar-no-drag flex items-center gap-1">
          <button
            onClick={handleMinimize}
            className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/10 transition-colors"
            aria-label="Minimize panel"
          >
            <Minus className="w-3 h-3 text-text-muted" />
          </button>
          <button
            onClick={handleClose}
            className="w-5 h-5 rounded flex items-center justify-center hover:bg-danger/30 hover:text-danger transition-colors"
            aria-label="Close panel"
          >
            <X className="w-3 h-3 text-text-muted" />
          </button>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────── */}
      <AnimatePresence>
        {!minimized && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-y-auto p-3 space-y-3"
          >
            {/* Loading state */}
            {isScanning && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-8 gap-3"
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-2 border-accent/20 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-accent animate-spin" />
                  </div>
                  <div className="absolute inset-0 rounded-full border-2 border-accent/40 animate-ping" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-text-primary">{statusConfig.label}</p>
                  <p className="text-xs text-text-muted mt-1">Please wait…</p>
                </div>
                <button onClick={cancelScan} className="btn btn-secondary text-xs">
                  Cancel
                </button>
              </motion.div>
            )}

            {/* Error state */}
            {!isScanning && result?.error && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-3 py-6"
              >
                <AlertCircle className="w-8 h-8 text-danger" />
                <div className="text-center">
                  <p className="text-sm font-medium text-danger">Scan failed</p>
                  <p className="text-xs text-text-muted mt-1 max-w-[200px] text-center">{result.error}</p>
                </div>
                <button onClick={triggerScan} className="btn btn-secondary text-xs">
                  Try again
                </button>
              </motion.div>
            )}

            {/* Result */}
            {!isScanning && result && !result.error && (
              <AnswerCard result={result} onRescan={triggerScan} compact />
            )}

            {/* Idle state */}
            {!isScanning && !result && (
              <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Scan className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">Ready to scan</p>
                  <p className="text-xs text-text-muted mt-1">
                    Press <kbd className="px-1.5 py-0.5 bg-bg-tertiary border border-border rounded text-text-secondary font-mono text-xs">
                      {settings.shortcut || 'Alt+F'}
                    </kbd> to capture
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Footer ─────────────────────────────────────────── */}
      <div className="titlebar-no-drag flex items-center justify-between px-3 py-2 border-t border-border/50 flex-shrink-0">
        <button
          onClick={triggerScan}
          disabled={isScanning}
          className="btn btn-primary text-xs py-1.5 px-3 gap-1.5"
          id="btn-float-scan"
        >
          {isScanning ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Scan className="w-3 h-3" />
          )}
          {isScanning ? 'Scanning…' : 'Scan'}
        </button>

        <button
          onClick={openSettings}
          className="btn btn-ghost text-xs gap-1"
          aria-label="Open settings"
        >
          <Settings className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}
