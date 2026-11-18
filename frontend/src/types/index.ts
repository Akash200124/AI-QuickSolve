// ============================================================
// frontend/src/types/index.ts – Shared TypeScript types
// ============================================================

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

export interface HistoryListResponse {
  records: HistoryRecord[]
  total: number
  page: number
  pageSize: number
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

// Electron API types (matches preload.ts)
export interface ElectronAPI {
  scan: {
    trigger: () => Promise<ScanResult>
    cancel: () => void
    onStatus: (cb: (status: ScanStatus) => void) => () => void
    onNewResult: (cb: (result: ScanResult) => void) => () => void
  }
  settings: {
    get: () => Promise<AppSettings>
    set: (settings: Partial<AppSettings>) => Promise<void>
    testApiKey: (key: string, model: string) => Promise<{ success: boolean; error?: string }>
    registerShortcut: (shortcut: string) => Promise<{ success: boolean; error?: string }>
  }
  history: {
    getAll: (page?: number, pageSize?: number) => Promise<HistoryListResponse>
    search: (query: string) => Promise<HistoryRecord[]>
    delete: (id: string) => Promise<void>
    clear: () => Promise<void>
    exportJson: (ids?: string[]) => Promise<{ success: boolean; path?: string; error?: string }>
    exportCsv: (ids?: string[]) => Promise<{ success: boolean; path?: string; error?: string }>
    getStats: () => Promise<UsageStats>
  }
  window: {
    minimize: () => void
    close: () => void
    toggleFloat: (visible: boolean) => void
    setOpacity: (opacity: number) => void
  }
  app: {
    getVersion: () => string
    openExternal: (url: string) => void
    getBackendStatus: () => Promise<BackendStatus>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
  }
}
