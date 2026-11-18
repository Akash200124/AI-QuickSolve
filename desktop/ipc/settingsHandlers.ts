// ============================================================
// desktop/ipc/settingsHandlers.ts – Settings read/write, 
// API key test, shortcut registration
// ============================================================

import { ipcMain, app, shell } from 'electron'
import Store from 'electron-store'
import type { WindowManager } from '../windowManager'
import type { ShortcutManager } from '../shortcuts'
import { net } from 'electron'
import { BACKEND_PORT, BACKEND_SECRET } from '../main'

const store = new Store()

const DEFAULT_SETTINGS = {
  apiKey: '',
  model: 'gpt-4o-mini',
  shortcut: 'Alt+F',
  captureDisplay: 0,
  ocrLanguage: 'eng',
  enableHistory: true,
  floatOpacity: 0.95,
  alwaysOnTop: true,
  startWithWindows: false,
  minimizeToTray: true,
  showConfirmation: false,
  theme: 'dark',
  maxRetries: 3,
  timeoutSeconds: 30,
  providerName: 'openai'
}

export function registerSettingsHandlers(
  windowManager: WindowManager,
  shortcutManager: ShortcutManager
): void {

  // ── Get all settings ─────────────────────────────────────
  ipcMain.handle('settings:get', () => {
    const saved = store.get('settings', {}) as Record<string, unknown>
    return { ...DEFAULT_SETTINGS, ...saved }
  })

  // ── Set settings ─────────────────────────────────────────
  ipcMain.handle('settings:set', async (_, partial: Record<string, unknown>) => {
    const current = (store.get('settings', {}) as Record<string, unknown>)
    const updated = { ...current, ...partial }
    store.set('settings', updated)

    // Apply side effects
    if ('alwaysOnTop' in partial) {
      const floatWin = windowManager.getFloatWindow()
      floatWin?.setAlwaysOnTop(Boolean(partial.alwaysOnTop), 'screen-saver')
    }

    if ('floatOpacity' in partial) {
      windowManager.setFloatWindowOpacity(Number(partial.floatOpacity))
    }

    if ('startWithWindows' in partial) {
      app.setLoginItemSettings({
        openAtLogin: Boolean(partial.startWithWindows),
        path: app.getPath('exe')
      })
    }

    return { success: true }
  })

  // ── Test API key ─────────────────────────────────────────
  ipcMain.handle('settings:test-api', async (_, apiKey: string, model: string) => {
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      const req = net.request({
        method: 'POST',
        url: `http://127.0.0.1:${BACKEND_PORT}/api/ai/test`,
        headers: {
          'Content-Type': 'application/json',
          'X-Secret-Token': BACKEND_SECRET
        }
      })

      let data = ''
      req.on('response', (res) => {
        res.on('data', (chunk) => { data += chunk.toString() })
        res.on('end', () => {
          try {
            const result = JSON.parse(data)
            resolve({ success: result.success, error: result.error })
          } catch {
            resolve({ success: false, error: 'Invalid response from backend' })
          }
        })
      })

      req.on('error', (err) => {
        resolve({ success: false, error: `Backend unreachable: ${err.message}` })
      })

      req.write(JSON.stringify({ api_key: apiKey, model }))
      req.end()
    })
  })

  // ── Register new shortcut ────────────────────────────────
  ipcMain.handle('settings:register-shortcut', async (_, shortcut: string) => {
    const result = shortcutManager.register(shortcut)
    if (result.success) {
      const current = (store.get('settings', {}) as Record<string, unknown>)
      store.set('settings', { ...current, shortcut })
    }
    return result
  })

  // ── App version ──────────────────────────────────────────
  ipcMain.on('app:version', (event) => {
    event.returnValue = app.getVersion()
  })

  // ── Open external URL ────────────────────────────────────
  ipcMain.on('app:open-external', (_, url: string) => {
    if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
      shell.openExternal(url)
    }
  })

  // ── Backend status ───────────────────────────────────────
  ipcMain.handle('app:backend-status', () => {
    return new Promise<{ running: boolean; port: number; version: string }>((resolve) => {
      const req = net.request({
        method: 'GET',
        url: `http://127.0.0.1:${BACKEND_PORT}/health`,
        headers: { 'X-Secret-Token': BACKEND_SECRET }
      })
      let data = ''
      req.on('response', (res) => {
        res.on('data', (c) => { data += c.toString() })
        res.on('end', () => {
          try {
            const r = JSON.parse(data)
            resolve({ running: true, port: BACKEND_PORT, version: r.version ?? '1.0.0' })
          } catch {
            resolve({ running: true, port: BACKEND_PORT, version: '1.0.0' })
          }
        })
      })
      req.on('error', () => {
        resolve({ running: false, port: BACKEND_PORT, version: '' })
      })
      req.end()
    })
  })

  // ── Window controls ──────────────────────────────────────
  ipcMain.on('window:minimize', (event) => {
    const win = event.sender.getOwnerBrowserWindow()
    win?.minimize()
  })

  ipcMain.on('window:close', (event) => {
    const win = event.sender.getOwnerBrowserWindow()
    win?.hide()
  })

  ipcMain.on('window:toggle-float', (_, visible: boolean) => {
    if (visible) {
      windowManager.showFloatWindow()
    } else {
      windowManager.hideFloatWindow()
    }
  })

  ipcMain.on('window:set-opacity', (_, opacity: number) => {
    windowManager.setFloatWindowOpacity(opacity)
  })

  // ── Navigate to route ────────────────────────────────────
  ipcMain.on('navigate', (_, route: string) => {
    windowManager.sendToMain('navigate', route)
  })
}
