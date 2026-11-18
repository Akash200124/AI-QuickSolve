// ============================================================
// desktop/main.ts – Electron main process entry point
// Manages app lifecycle, single-instance lock, Python backend
// child process, and all BrowserWindow instances.
// ============================================================

import {
  app,
  BrowserWindow,
  ipcMain,
  nativeTheme,
  powerMonitor,
  session,
  shell
} from 'electron'
import { join } from 'path'
import { fork, ChildProcess } from 'child_process'
import { existsSync } from 'fs'
import { randomBytes } from 'crypto'
import { WindowManager } from './windowManager'
import { TrayManager } from './tray'
import { ShortcutManager } from './shortcuts'
import { registerScanHandlers } from './ipc/scanHandlers'
import { registerSettingsHandlers } from './ipc/settingsHandlers'
import { registerHistoryHandlers } from './ipc/historyHandlers'

// ── Single-instance lock ──────────────────────────────────────
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
  process.exit(0)
}

// ── Global state ──────────────────────────────────────────────
export let backendProcess: ChildProcess | null = null
export const BACKEND_PORT = 7845
export const BACKEND_SECRET = randomBytes(32).toString('hex')

// ── Electron security hardening ───────────────────────────────
app.enableSandbox()

// ── App ready ─────────────────────────────────────────────────
app.whenReady().then(async () => {
  // Set CSP for all sessions
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' http://127.0.0.1:7845"
        ]
      }
    })
  })

  nativeTheme.themeSource = 'dark'

  // Start Python backend
  await startBackend()

  // Create windows
  const windowManager = new WindowManager()
  const trayManager = new TrayManager(windowManager)
  const shortcutManager = new ShortcutManager(windowManager)

  // Register IPC handlers
  registerScanHandlers(windowManager)
  registerSettingsHandlers(windowManager, shortcutManager)
  registerHistoryHandlers()

  // Create main window
  windowManager.createMainWindow()
  trayManager.create()
  shortcutManager.registerDefault()

  // Handle power events
  powerMonitor.on('suspend', () => {
    shortcutManager.unregisterAll()
  })
  powerMonitor.on('resume', () => {
    shortcutManager.reregister()
  })

  // macOS: re-create window on dock click (not applicable on Windows but safe)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      windowManager.createMainWindow()
    }
  })
})

// ── Second instance: bring main window to front ───────────────
app.on('second-instance', () => {
  const wins = BrowserWindow.getAllWindows()
  if (wins.length > 0) {
    const main = wins[0]
    if (main.isMinimized()) main.restore()
    main.focus()
  }
})

// ── Before quit: clean up ─────────────────────────────────────
app.on('before-quit', () => {
  stopBackend()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    stopBackend()
    app.quit()
  }
})

// ── Python backend management ─────────────────────────────────

function getPythonExecutable(): string {
  // In production, use bundled Python; in development use system Python
  const bundledPython = join(process.resourcesPath, 'python', 'python.exe')
  if (existsSync(bundledPython)) return bundledPython
  return 'python'
}

function getBackendScript(): string {
  const bundled = join(process.resourcesPath, 'backend', 'app', 'main.py')
  if (existsSync(bundled)) return bundled
  return join(__dirname, '..', 'backend', 'app', 'main.py')
}

async function startBackend(): Promise<void> {
  const python = getPythonExecutable()
  const script = getBackendScript()

  console.log(`[Main] Starting Python backend: ${python} ${script}`)

  backendProcess = fork(script, [], {
    execPath: python,
    execArgv: [],
    env: {
      ...process.env,
      BACKEND_PORT: String(BACKEND_PORT),
      BACKEND_SECRET: BACKEND_SECRET,
      PYTHONUNBUFFERED: '1',
      PYTHONDONTWRITEBYTECODE: '1'
    },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc']
  })

  backendProcess.stdout?.on('data', (data) => {
    console.log(`[Backend] ${data.toString().trim()}`)
  })

  backendProcess.stderr?.on('data', (data) => {
    console.error(`[Backend Error] ${data.toString().trim()}`)
  })

  backendProcess.on('exit', (code, signal) => {
    console.log(`[Main] Backend exited with code ${code}, signal ${signal}`)
    backendProcess = null
  })

  // Wait for backend to be ready (poll health endpoint)
  await waitForBackend(10000)
}

async function waitForBackend(timeoutMs: number): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const { net } = await import('electron')
      await new Promise<void>((resolve, reject) => {
        const req = net.request(`http://127.0.0.1:${BACKEND_PORT}/health`)
        req.on('response', () => resolve())
        req.on('error', reject)
        req.end()
      })
      console.log('[Main] Backend is ready')
      return
    } catch {
      await new Promise((r) => setTimeout(r, 300))
    }
  }
  console.warn('[Main] Backend did not become ready within timeout')
}

function stopBackend(): void {
  if (backendProcess) {
    console.log('[Main] Stopping backend...')
    backendProcess.kill('SIGTERM')
    backendProcess = null
  }
}
