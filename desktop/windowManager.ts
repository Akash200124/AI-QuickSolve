// ============================================================
// desktop/windowManager.ts – Creates and manages BrowserWindows
// Two windows: main dashboard + floating assistant panel.
// ============================================================

import { BrowserWindow, screen, ipcMain } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

export class WindowManager {
  private mainWindow: BrowserWindow | null = null
  private floatWindow: BrowserWindow | null = null
  private readonly preloadPath: string

  constructor() {
    this.preloadPath = join(__dirname, 'preload.js')
  }

  // ── Main Dashboard Window ──────────────────────────────────

  createMainWindow(): BrowserWindow {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.focus()
      return this.mainWindow
    }

    const { width, height } = screen.getPrimaryDisplay().workAreaSize

    this.mainWindow = new BrowserWindow({
      width: 1100,
      height: 720,
      minWidth: 900,
      minHeight: 600,
      x: Math.round((width - 1100) / 2),
      y: Math.round((height - 720) / 2),
      frame: false,
      transparent: false,
      backgroundColor: '#111318',
      titleBarStyle: 'hidden',
      show: false,
      icon: join(__dirname, '..', 'resources', 'icons', 'icon.ico'),
      webPreferences: {
        preload: this.preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        experimentalFeatures: false
      }
    })

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show()
    })

    // Handle close → minimize to tray (if setting enabled)
    this.mainWindow.on('close', (e) => {
      // Actual quit is handled by tray menu; close button minimizes to tray
      e.preventDefault()
      this.mainWindow?.hide()
    })

    this.loadURL(this.mainWindow, '/')
    return this.mainWindow
  }

  showMainWindow(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      this.createMainWindow()
      return
    }
    if (this.mainWindow.isMinimized()) this.mainWindow.restore()
    this.mainWindow.show()
    this.mainWindow.focus()
  }

  // ── Floating Panel Window ──────────────────────────────────

  createFloatWindow(): BrowserWindow {
    if (this.floatWindow && !this.floatWindow.isDestroyed()) {
      return this.floatWindow
    }

    const { width } = screen.getPrimaryDisplay().workAreaSize

    this.floatWindow = new BrowserWindow({
      width: 420,
      height: 580,
      minWidth: 320,
      minHeight: 300,
      maxWidth: 600,
      x: width - 450,
      y: 60,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: true,
      movable: true,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      // focusable false by default; toggled when user interacts
      focusable: false,
      show: false,
      icon: join(__dirname, '..', 'resources', 'icons', 'icon.ico'),
      webPreferences: {
        preload: this.preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true
      }
    })

    this.floatWindow.setAlwaysOnTop(true, 'screen-saver')

    this.floatWindow.on('close', (e) => {
      e.preventDefault()
      this.floatWindow?.hide()
    })

    this.loadURL(this.floatWindow, '/float')
    return this.floatWindow
  }

  showFloatWindow(): void {
    if (!this.floatWindow || this.floatWindow.isDestroyed()) {
      this.createFloatWindow()
    }
    this.floatWindow?.show()
  }

  hideFloatWindow(): void {
    if (this.floatWindow && !this.floatWindow.isDestroyed()) {
      this.floatWindow.hide()
    }
  }

  setFloatWindowFocusable(focusable: boolean): void {
    if (this.floatWindow && !this.floatWindow.isDestroyed()) {
      this.floatWindow.setFocusable(focusable)
      if (focusable) this.floatWindow.focus()
    }
  }

  setFloatWindowOpacity(opacity: number): void {
    const clamped = Math.max(0.1, Math.min(1, opacity))
    if (this.floatWindow && !this.floatWindow.isDestroyed()) {
      this.floatWindow.setOpacity(clamped)
    }
  }

  // ── Broadcast to all windows ───────────────────────────────

  broadcast(channel: string, ...args: unknown[]): void {
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, ...args)
      }
    })
  }

  sendToFloat(channel: string, ...args: unknown[]): void {
    if (this.floatWindow && !this.floatWindow.isDestroyed()) {
      this.floatWindow.webContents.send(channel, ...args)
    }
  }

  sendToMain(channel: string, ...args: unknown[]): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, ...args)
    }
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow
  }

  getFloatWindow(): BrowserWindow | null {
    return this.floatWindow
  }

  // ── Load URL helper (dev vs prod) ─────────────────────────

  private loadURL(win: BrowserWindow, path: string): void {
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      win.loadURL(process.env['ELECTRON_RENDERER_URL'] + path)
    } else {
      win.loadFile(join(__dirname, '..', 'dist', 'index.html'), {
        hash: path
      })
    }
  }
}
