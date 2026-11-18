// ============================================================
// desktop/ipc/scanHandlers.ts – IPC handlers for scan workflow
// Orchestrates: capture → OCR → AI → display
// ============================================================

import { ipcMain } from 'electron'
import { net } from 'electron'
import { ScreenCapture } from '../screenCapture'
import type { WindowManager } from '../windowManager'
import { BACKEND_PORT, BACKEND_SECRET } from '../main'
import Store from 'electron-store'
import { v4 as uuidv4 } from 'uuid'

const store = new Store<{ settings: AppSettings; history: HistoryRecord[] }>()
const screenCapture = new ScreenCapture()

interface AppSettings {
  apiKey?: string
  model?: string
  shortcut?: string
  captureDisplay?: number
  enableHistory?: boolean
  providerName?: string
  maxRetries?: number
  timeoutSeconds?: number
}

interface HistoryRecord {
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

type ScanStatus =
  | 'idle'
  | 'capturing'
  | 'processing-ocr'
  | 'processing-ai'
  | 'done'
  | 'error'
  | 'cancelled'

let currentScanAbortController: AbortController | null = null

export function registerScanHandlers(windowManager: WindowManager): void {
  // ── Trigger scan via IPC (from renderer) ─────────────────
  ipcMain.handle('scan:trigger', async () => {
    return await runScan(windowManager)
  })

  // ── Cancel scan ──────────────────────────────────────────
  ipcMain.on('scan:cancel', () => {
    if (currentScanAbortController) {
      currentScanAbortController.abort()
      currentScanAbortController = null
      broadcastStatus(windowManager, 'cancelled')
    }
  })

  // ── Triggered by global shortcut (shortcuts.ts broadcasts 'scan:triggered') ──
  // We listen on the windowManager's broadcast channel and call runScan.
  // The shortcut manager shows the float window first, then emits 'scan:triggered'
  // to all BrowserWindow webContents — here we intercept it at the main-process level
  // by patching the WindowManager broadcast so the main process can also handle it.
  const originalBroadcast = windowManager.broadcast.bind(windowManager)
  windowManager.broadcast = (channel: string, ...args: unknown[]) => {
    originalBroadcast(channel, ...args)
    // When the renderer receives 'scan:triggered', it calls electron.scan.trigger()
    // which routes back to ipcMain.handle('scan:trigger'). But if no renderer is
    // focused (float window is non-focusable), we trigger directly here:
    if (channel === 'scan:triggered') {
      runScan(windowManager).catch((err) => {
        console.error('[ScanHandlers] Error in shortcut-triggered scan:', err)
      })
    }
  }
}

async function runScan(windowManager: WindowManager): Promise<HistoryRecord | { error: string }> {
  const startTime = Date.now()
  currentScanAbortController = new AbortController()
  const { signal } = currentScanAbortController

  try {
    // 1. Show float window, set status
    windowManager.showFloatWindow()
    broadcastStatus(windowManager, 'capturing')

    // 2. Capture screen
    const settings = (store.get('settings') as AppSettings) ?? {}
    const captureResult = await screenCapture.capture({
      displayIndex: settings.captureDisplay ?? 0
    })

    if (signal.aborted) throw new Error('cancelled')

    // 3. Send to Python OCR service
    broadcastStatus(windowManager, 'processing-ocr')
    const ocrResult = await callBackend(
      'POST',
      '/api/ocr/process',
      { image_base64: captureResult.imageBuffer.toString('base64') },
      signal
    )

    if (signal.aborted) throw new Error('cancelled')

    if (ocrResult.error) {
      throw new Error(`OCR failed: ${ocrResult.error}`)
    }

    // 4. Send to Python AI service
    broadcastStatus(windowManager, 'processing-ai')
    const aiResult = await callBackend(
      'POST',
      '/api/ai/answer',
      {
        questions: ocrResult.questions,
        api_key: settings.apiKey ?? '',
        model: settings.model ?? 'gpt-4o-mini',
        max_retries: settings.maxRetries ?? 3,
        timeout_seconds: settings.timeoutSeconds ?? 30
      },
      signal
    )

    if (signal.aborted) throw new Error('cancelled')

    if (aiResult.error) {
      throw new Error(`AI processing failed: ${aiResult.error}`)
    }

    // 5. Build result record
    const scanId = uuidv4()
    const processingMs = Date.now() - startTime
    const question = ocrResult.questions?.[0]
    const aiAnswer = aiResult.answers?.[0]

    const record: HistoryRecord = {
      id: scanId,
      timestamp: new Date().toISOString(),
      question: question?.question ?? 'Unknown question',
      options: question?.options ?? {},
      correctOption: aiAnswer?.correct_option ?? '',
      correctAnswer: aiAnswer?.correct_answer ?? '',
      confidence: aiAnswer?.confidence ?? 'low',
      explanation: aiAnswer?.explanation ?? '',
      model: settings.model ?? 'gpt-4o-mini',
      processingMs,
      ocrConfidence: ocrResult.avg_confidence ?? 0
    }

    // 6. Save to history (if enabled)
    if (settings.enableHistory !== false) {
      const history = (store.get('history') as HistoryRecord[]) ?? []
      history.unshift(record)
      // Keep max 1000 records
      store.set('history', history.slice(0, 1000))
    }

    // 7. Broadcast result to all windows
    broadcastStatus(windowManager, 'done')
    windowManager.broadcast('scan:result', record)

    currentScanAbortController = null
    return record
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    const isCancelled = errorMsg === 'cancelled' || signal.aborted

    broadcastStatus(windowManager, isCancelled ? 'cancelled' : 'error')
    windowManager.broadcast('scan:result', {
      error: isCancelled ? 'Scan cancelled' : errorMsg
    })

    currentScanAbortController = null
    return { error: errorMsg }
  }
}

function broadcastStatus(windowManager: WindowManager, status: ScanStatus): void {
  windowManager.broadcast('scan:status', status)
}

async function callBackend(
  method: 'GET' | 'POST',
  path: string,
  body?: object,
  signal?: AbortSignal
): Promise<any> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('cancelled'))
      return
    }

    const req = net.request({
      method,
      url: `http://127.0.0.1:${BACKEND_PORT}${path}`,
      headers: {
        'Content-Type': 'application/json',
        'X-Secret-Token': BACKEND_SECRET
      }
    })

    let responseData = ''

    req.on('response', (res) => {
      res.on('data', (chunk) => {
        responseData += chunk.toString()
      })
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData))
        } catch {
          reject(new Error(`Invalid JSON response: ${responseData.slice(0, 200)}`))
        }
      })
      res.on('error', reject)
    })

    req.on('error', reject)

    if (signal) {
      signal.addEventListener('abort', () => {
        req.abort()
        reject(new Error('cancelled'))
      })
    }

    if (body) {
      req.write(JSON.stringify(body))
    }

    req.end()
  })
}
