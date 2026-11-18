// ============================================================
// desktop/ipc/historyHandlers.ts – History CRUD, search,
// export operations using electron-store
// ============================================================

import { ipcMain, dialog } from 'electron'
import Store from 'electron-store'
import { writeFileSync } from 'fs'
import { join } from 'path'

const store = new Store()

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

export function registerHistoryHandlers(): void {

  // ── Get all history (paginated) ──────────────────────────
  ipcMain.handle('history:get-all', (_, page: number = 0, pageSize: number = 50) => {
    const history = (store.get('history', []) as HistoryRecord[])
    const start = page * pageSize
    return {
      records: history.slice(start, start + pageSize),
      total: history.length,
      page,
      pageSize
    }
  })

  // ── Search history ───────────────────────────────────────
  ipcMain.handle('history:search', (_, query: string) => {
    const history = (store.get('history', []) as HistoryRecord[])
    const q = query.toLowerCase().trim()
    if (!q) return history.slice(0, 50)
    return history
      .filter(
        (r) =>
          r.question.toLowerCase().includes(q) ||
          r.correctAnswer.toLowerCase().includes(q) ||
          r.explanation.toLowerCase().includes(q)
      )
      .slice(0, 100)
  })

  // ── Delete single record ─────────────────────────────────
  ipcMain.handle('history:delete', (_, id: string) => {
    const history = (store.get('history', []) as HistoryRecord[])
    store.set('history', history.filter((r) => r.id !== id))
    return { success: true }
  })

  // ── Clear all history ────────────────────────────────────
  ipcMain.handle('history:clear', () => {
    store.set('history', [])
    return { success: true }
  })

  // ── Export to JSON ───────────────────────────────────────
  ipcMain.handle('history:export-json', async (event, ids?: string[]) => {
    const history = (store.get('history', []) as HistoryRecord[])
    const records = ids ? history.filter((r) => ids.includes(r.id)) : history

    const win = event.sender.getOwnerBrowserWindow()
    const { filePath } = await dialog.showSaveDialog(win!, {
      title: 'Export History as JSON',
      defaultPath: `ai-quicksolve-history-${Date.now()}.json`,
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    })

    if (filePath) {
      writeFileSync(filePath, JSON.stringify(records, null, 2), 'utf-8')
      return { success: true, path: filePath }
    }
    return { success: false, error: 'Export cancelled' }
  })

  // ── Export to CSV ────────────────────────────────────────
  ipcMain.handle('history:export-csv', async (event, ids?: string[]) => {
    const history = (store.get('history', []) as HistoryRecord[])
    const records = ids ? history.filter((r) => ids.includes(r.id)) : history

    const headers = [
      'ID', 'Timestamp', 'Question', 'Options', 'Correct Option',
      'Correct Answer', 'Confidence', 'Explanation', 'Model',
      'Processing Ms', 'OCR Confidence'
    ]

    const escCsv = (s: string) => `"${String(s).replace(/"/g, '""')}"`

    const rows = records.map((r) =>
      [
        escCsv(r.id),
        escCsv(r.timestamp),
        escCsv(r.question),
        escCsv(JSON.stringify(r.options)),
        escCsv(r.correctOption),
        escCsv(r.correctAnswer),
        escCsv(r.confidence),
        escCsv(r.explanation),
        escCsv(r.model),
        r.processingMs,
        r.ocrConfidence
      ].join(',')
    )

    const csv = [headers.join(','), ...rows].join('\n')

    const win = event.sender.getOwnerBrowserWindow()
    const { filePath } = await dialog.showSaveDialog(win!, {
      title: 'Export History as CSV',
      defaultPath: `ai-quicksolve-history-${Date.now()}.csv`,
      filters: [{ name: 'CSV Files', extensions: ['csv'] }]
    })

    if (filePath) {
      writeFileSync(filePath, csv, 'utf-8')
      return { success: true, path: filePath }
    }
    return { success: false, error: 'Export cancelled' }
  })

  // ── Usage statistics ─────────────────────────────────────
  ipcMain.handle('history:stats', () => {
    const history = (store.get('history', []) as HistoryRecord[])
    const successful = history.filter((r) => r.correctOption)
    const totalMs = history.reduce((sum, r) => sum + (r.processingMs ?? 0), 0)

    return {
      totalScans: history.length,
      successfulScans: successful.length,
      totalQuestionsProcessed: history.length,
      tokensUsed: 0, // tracked separately if needed
      avgProcessingMs: history.length > 0 ? Math.round(totalMs / history.length) : 0
    }
  })
}
