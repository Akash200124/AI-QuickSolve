// ============================================================
// desktop/preload.ts – Restricted contextBridge API
// Exposes only validated, typed IPC channels to the renderer.
// Node integration is OFF; this is the only bridge.
// ============================================================

import { contextBridge, ipcRenderer } from 'electron'

// ── Type definitions exposed to renderer ─────────────────────
export interface ElectronAPI {
  // Scan operations
  scan: {
    trigger: () => Promise<ScanResult>
    cancel: () => void
    onStatus: (cb: (status: ScanStatus) => void) => () => void
    onNewResult: (cb: (result: ScanResult) => void) => () => void
  }
  // Settings operations
  settings: {
    get: () => Promise<AppSettings>
    set: (settings: Partial<AppSettings>) => Promise<void>
    testApiKey: (key: string, model: string) => Promise<{ success: boolean; error?: string }>
    registerShortcut: (shortcut: string) => Promise<{ success: boolean; error?: string }>
  }
  // History operations
  history: {
    getAll: (page?: number, pageSize?: number) => Promise<HistoryRecord[]>
    search: (query: string) => Promise<HistoryRecord[]>
    delete: (id: string) => Promise<void>
    clear: () => Promise<void>
    exportJson: (ids?: string[]) => Promise<string>
    exportCsv: (ids?: string[]) => Promise<string>
    getStats: () => Promise<UsageStats>
  }
  // Window operations
  window: {
    minimize: () => void
    close: () => void
    toggleFloat: (visible: boolean) => void
    setOpacity: (opacity: number) => void
  }
  // App info
  app: {
    getVersion: () => string
    openExternal: (url: string) => void
    getBackendStatus: () => Promise<BackendStatus>
  }
}

// ── Type aliases (kept here; renderer imports from window.electron) ──
export type ScanStatus =
  | 'idle'
  | 'capturing'
  | 'processing-ocr'
  | 'processing-ai'
  | 'done'
  | 'error'
  | 'cancelled'

export interface ScanResult {
  id: string
  timestamp: string
  question: string
  options: Record<string, string>
  correctOption: string
  correctAnswer: string
  confidence: 'high' | 'medium' | 'low'
  explanation: string
  otherOptions: Record<string, string>
  ocrConfidence: number
  model: string
  processingMs: number
  error?: string
}

export interface AppSettings {
  apiKey: string
  model: string
  shortcut: string
  captureDisplay: number
  ocrLanguage: string
  enableHistory: boolean
  floatOpacity: number
  alwaysOnTop: boolean
  startWithWindows: boolean
  minimizeToTray: boolean
  showConfirmation: boolean
  theme: 'dark' | 'light'
  maxRetries: number
  timeoutSeconds: number
  providerName: string
}

export interface HistoryRecord {
  id: string
  timestamp: string
  question: string
  options: Record<string, string>
  correctOption: string
  correctAnswer: string
  confidence: string
  explanation: string
  model: string
  processingMs: number
  ocrConfidence: number
}

export interface UsageStats {
  totalScans: number
  successfulScans: number
  totalQuestionsProcessed: number
  tokensUsed: number
  avgProcessingMs: number
}

export interface BackendStatus {
  running: boolean
  port: number
  version: string
}

// ── Validate IPC channel whitelist ───────────────────────────
const ALLOWED_CHANNELS = new Set([
  'scan:trigger',
  'scan:cancel',
  'scan:status',
  'scan:result',
  'settings:get',
  'settings:set',
  'settings:test-api',
  'settings:register-shortcut',
  'history:get-all',
  'history:search',
  'history:delete',
  'history:clear',
  'history:export-json',
  'history:export-csv',
  'history:stats',
  'window:minimize',
  'window:close',
  'window:toggle-float',
  'window:set-opacity',
  'app:version',
  'app:open-external',
  'app:backend-status'
])

function safeInvoke(channel: string, ...args: unknown[]): Promise<unknown> {
  if (!ALLOWED_CHANNELS.has(channel)) {
    return Promise.reject(new Error(`Channel not allowed: ${channel}`))
  }
  return ipcRenderer.invoke(channel, ...args)
}

function safeOn(channel: string, cb: (...args: unknown[]) => void): () => void {
  if (!ALLOWED_CHANNELS.has(channel)) {
    throw new Error(`Channel not allowed: ${channel}`)
  }
  const handler = (_: Electron.IpcRendererEvent, ...args: unknown[]) => cb(...args)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

// ── Expose API ────────────────────────────────────────────────
contextBridge.exposeInMainWorld('electron', {
  scan: {
    trigger: () => safeInvoke('scan:trigger'),
    cancel: () => ipcRenderer.send('scan:cancel'),
    onStatus: (cb: (status: ScanStatus) => void) => safeOn('scan:status', cb as any),
    onNewResult: (cb: (result: ScanResult) => void) => safeOn('scan:result', cb as any)
  },
  settings: {
    get: () => safeInvoke('settings:get'),
    set: (s: Partial<AppSettings>) => safeInvoke('settings:set', s),
    testApiKey: (key: string, model: string) => safeInvoke('settings:test-api', key, model),
    registerShortcut: (shortcut: string) => safeInvoke('settings:register-shortcut', shortcut)
  },
  history: {
    getAll: (page?: number, pageSize?: number) => safeInvoke('history:get-all', page, pageSize),
    search: (query: string) => safeInvoke('history:search', query),
    delete: (id: string) => safeInvoke('history:delete', id),
    clear: () => safeInvoke('history:clear'),
    exportJson: (ids?: string[]) => safeInvoke('history:export-json', ids),
    exportCsv: (ids?: string[]) => safeInvoke('history:export-csv', ids),
    getStats: () => safeInvoke('history:stats')
  },
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    close: () => ipcRenderer.send('window:close'),
    toggleFloat: (visible: boolean) => ipcRenderer.send('window:toggle-float', visible),
    setOpacity: (opacity: number) => ipcRenderer.send('window:set-opacity', opacity)
  },
  app: {
    getVersion: () => ipcRenderer.sendSync('app:version'),
    openExternal: (url: string) => {
      if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
        ipcRenderer.send('app:open-external', url)
      }
    },
    getBackendStatus: () => safeInvoke('app:backend-status')
  }
} satisfies ElectronAPI)
