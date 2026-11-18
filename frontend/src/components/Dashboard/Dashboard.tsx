// ============================================================
// frontend/src/components/Dashboard/Dashboard.tsx
// Main application window – stats, recent scans, status
// ============================================================

import React, { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Zap, Settings, History, Keyboard, Activity,
  CheckCircle, AlertCircle, Clock, Cpu, ChevronRight,
  Scan, BarChart3, X, Minus
} from 'lucide-react'
import { toast } from 'sonner'
import { useScan } from '../../hooks/useScan'
import { useSettings } from '../../hooks/useSettings'
import type { UsageStats, HistoryRecord, BackendStatus } from '../../types'
import AnswerCard from '../AnswerCard/AnswerCard'

const FADE_UP = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: 'easeOut' }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { status, result, isScanning, triggerScan, cancelScan } = useScan()
  const { settings } = useSettings()
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [recentScans, setRecentScans] = useState<HistoryRecord[]>([])
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null)
  const [appVersion, setAppVersion] = useState('')

  useEffect(() => {
    loadData()
    // Listen for navigate events from main process
    window.electron?.app.getVersion && setAppVersion(window.electron.app.getVersion())
  }, [])

  // Listen for navigate commands from tray
  useEffect(() => {
    const handler = (_: Event, route: string) => {
      navigate(route)
    }
    // @ts-ignore
    window.addEventListener('navigate', handler)
    // @ts-ignore
    return () => window.removeEventListener('navigate', handler)
  }, [navigate])

  // Reload data when scan completes
  useEffect(() => {
    if (status === 'done') {
      loadRecentScans()
      loadStats()
    }
  }, [status])

  const loadData = async () => {
    await Promise.all([loadStats(), loadRecentScans(), loadBackendStatus()])
  }

  const loadStats = async () => {
    if (!window.electron) return
    try {
      const s = await window.electron.history.getStats()
      setStats(s)
    } catch {}
  }

  const loadRecentScans = async () => {
    if (!window.electron) return
    try {
      const r = await window.electron.history.getAll(0, 5)
      setRecentScans((r as any).records ?? [])
    } catch {}
  }

  const loadBackendStatus = async () => {
    if (!window.electron) return
    try {
      const s = await window.electron.app.getBackendStatus()
      setBackendStatus(s)
    } catch {}
  }

  const handleMinimize = () => window.electron?.window.minimize()
  const handleClose = () => window.electron?.window.close()

  const statusLabel = {
    idle: 'Ready',
    capturing: 'Capturing screen…',
    'processing-ocr': 'Extracting text…',
    'processing-ai': 'Analyzing with AI…',
    done: 'Answer ready',
    error: 'Error occurred',
    cancelled: 'Cancelled'
  }[status]

  const statusColor = {
    idle: 'text-text-secondary',
    capturing: 'text-accent',
    'processing-ocr': 'text-accent',
    'processing-ai': 'text-accent',
    done: 'text-success',
    error: 'text-danger',
    cancelled: 'text-warning'
  }[status] ?? 'text-text-secondary'

  return (
    <div className="flex flex-col h-screen bg-bg-primary overflow-hidden">
      {/* ── Title bar ─────────────────────────────────────────── */}
      <div className="titlebar-drag flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="titlebar-no-drag flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-accent" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-text-primary">AI QuickSolve</h1>
            <p className="text-xs text-text-muted">v{appVersion || '1.0.0'}</p>
          </div>
        </div>

        <div className="titlebar-no-drag flex items-center gap-1">
          <button onClick={handleMinimize} className="btn btn-ghost w-8 h-8 p-0 rounded-full" aria-label="Minimize">
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleClose} className="btn btn-ghost w-8 h-8 p-0 rounded-full hover:bg-danger/20 hover:text-danger" aria-label="Close">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ─────────────────────────────────────────── */}
        <nav className="w-14 flex flex-col items-center py-4 border-r border-border gap-2">
          {[
            { icon: Zap, label: 'Dashboard', path: '/', active: true },
            { icon: History, label: 'History', path: '/history', active: false },
            { icon: Settings, label: 'Settings', path: '/settings', active: false }
          ].map(({ icon: Icon, label, path, active }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                active
                  ? 'bg-accent/20 text-accent'
                  : 'text-text-muted hover:bg-bg-secondary hover:text-text-primary'
              }`}
              data-tooltip={label}
              aria-label={label}
            >
              <Icon className="w-4.5 h-4.5" size={18} />
            </button>
          ))}
        </nav>

        {/* ── Main content ────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Scan trigger card */}
          <motion.div {...FADE_UP} className="card border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-text-primary">Screen Scanner</h2>
                <p className={`text-sm mt-0.5 ${statusColor}`}>{statusLabel}</p>
              </div>
              <div className="flex items-center gap-2">
                {isScanning ? (
                  <button onClick={cancelScan} className="btn btn-secondary text-xs">
                    Cancel
                  </button>
                ) : (
                  <button onClick={triggerScan} className="btn btn-primary gap-2" id="btn-scan-now">
                    <Scan className="w-4 h-4" />
                    Scan Now
                  </button>
                )}
              </div>
            </div>

            {/* Shortcut hint */}
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Keyboard className="w-3.5 h-3.5" />
              <span>Press </span>
              <kbd className="px-2 py-0.5 bg-bg-tertiary border border-border rounded text-text-secondary font-mono text-xs">
                {settings.shortcut || 'Alt+F'}
              </kbd>
              <span>anywhere to scan</span>
            </div>

            {/* Progress bar during scan */}
            {isScanning && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 progress-bar"
              >
                <div
                  className="progress-fill"
                  style={{
                    width:
                      status === 'capturing' ? '20%' :
                      status === 'processing-ocr' ? '55%' :
                      status === 'processing-ai' ? '85%' : '100%',
                    transition: 'width 0.5s ease'
                  }}
                />
              </motion.div>
            )}
          </motion.div>

          {/* Answer card (latest result) */}
          <AnimatePresence>
            {result && !result.error && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                <AnswerCard result={result} onRescan={triggerScan} />
              </motion.div>
            )}
            {result?.error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="card border-danger/30 bg-danger/5"
              >
                <div className="flex items-center gap-2 text-danger">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Scan Error</span>
                </div>
                <p className="text-sm text-text-secondary mt-2">{result.error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats row */}
          <motion.div {...FADE_UP} className="grid grid-cols-3 gap-3">
            {[
              {
                label: 'Total Scans',
                value: stats?.totalScans ?? 0,
                icon: BarChart3,
                color: 'text-accent'
              },
              {
                label: 'Success Rate',
                value: stats
                  ? `${Math.round((stats.successfulScans / Math.max(stats.totalScans, 1)) * 100)}%`
                  : '—',
                icon: CheckCircle,
                color: 'text-success'
              },
              {
                label: 'Avg. Time',
                value: stats
                  ? `${(stats.avgProcessingMs / 1000).toFixed(1)}s`
                  : '—',
                icon: Clock,
                color: 'text-warning'
              }
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="card">
                <div className={`flex items-center gap-2 ${color} mb-1`}>
                  <Icon className="w-4 h-4" />
                  <span className="text-xs text-text-muted">{label}</span>
                </div>
                <p className="text-xl font-bold text-text-primary">{String(value)}</p>
              </div>
            ))}
          </motion.div>

          {/* Backend + API status */}
          <motion.div {...FADE_UP} className="card">
            <h3 className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              System Status
            </h3>
            <div className="space-y-2">
              <StatusRow
                label="AI Backend"
                ok={backendStatus?.running ?? false}
                detail={backendStatus?.running ? `Running on port ${backendStatus.port}` : 'Not running'}
              />
              <StatusRow
                label="API Key"
                ok={Boolean(settings.apiKey)}
                detail={settings.apiKey ? `${settings.model}` : 'Not configured'}
              />
              <StatusRow
                label="Shortcut"
                ok={true}
                detail={settings.shortcut || 'Alt+F'}
              />
            </div>
          </motion.div>

          {/* Recent scans */}
          {recentScans.length > 0 && (
            <motion.div {...FADE_UP} className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-text-secondary flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Recent Scans
                </h3>
                <button
                  onClick={() => navigate('/history')}
                  className="btn btn-ghost text-xs text-accent"
                >
                  View all <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-2">
                {recentScans.map((scan) => (
                  <RecentScanRow key={scan.id} scan={scan} />
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusRow({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        <span className={`status-dot ${ok ? 'active' : 'error'}`} />
        <span className="text-sm text-text-secondary">{label}</span>
      </div>
      <span className="text-xs text-text-muted">{detail}</span>
    </div>
  )
}

function RecentScanRow({ scan }: { scan: HistoryRecord }) {
  const time = new Date(scan.timestamp).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit'
  })
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-bg-secondary transition-colors">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
        scan.confidence === 'high' ? 'bg-success/20 text-success' :
        scan.confidence === 'medium' ? 'bg-warning/20 text-warning' :
        'bg-danger/20 text-danger'
      }`}>
        {scan.correctOption || '?'}
      </div>
      <p className="text-xs text-text-secondary truncate flex-1">{scan.question}</p>
      <span className="text-xs text-text-muted flex-shrink-0">{time}</span>
    </div>
  )
}
