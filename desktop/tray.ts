// ============================================================
// desktop/tray.ts – System tray icon and context menu
// ============================================================

import { Tray, Menu, nativeImage, app } from 'electron'
import { join } from 'path'
import type { WindowManager } from './windowManager'

export class TrayManager {
  private tray: Tray | null = null
  private windowManager: WindowManager

  constructor(windowManager: WindowManager) {
    this.windowManager = windowManager
  }

  create(): void {
    const iconPath = join(__dirname, '..', 'resources', 'icons', 'tray.png')
    const icon = nativeImage.createFromPath(iconPath)
    
    // Fallback: create a simple 16x16 icon programmatically if file doesn't exist
    const trayIcon = icon.isEmpty() ? nativeImage.createEmpty() : icon.resize({ width: 16, height: 16 })
    
    this.tray = new Tray(trayIcon)
    this.tray.setToolTip('AI QuickSolve – Press ALT+F to scan')

    this.updateMenu('idle')

    this.tray.on('click', () => {
      this.windowManager.showMainWindow()
    })

    this.tray.on('double-click', () => {
      this.windowManager.showMainWindow()
    })
  }

  updateMenu(status: 'idle' | 'scanning' | 'error'): void {
    if (!this.tray) return

    const statusLabel =
      status === 'scanning'
        ? '● Scanning…'
        : status === 'error'
        ? '⚠ Error'
        : '● Ready (ALT+F to scan)'

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'AI QuickSolve',
        icon: nativeImage.createFromPath(
          join(__dirname, '..', 'resources', 'icons', 'tray.png')
        ).resize({ width: 16, height: 16 }),
        enabled: false
      },
      { type: 'separator' },
      {
        label: statusLabel,
        enabled: false
      },
      { type: 'separator' },
      {
        label: 'Open Dashboard',
        click: () => this.windowManager.showMainWindow()
      },
      {
        label: 'Scan Now (ALT+F)',
        click: () => {
          // Trigger a scan programmatically
          const { ipcMain } = require('electron')
          // Emit scan trigger event
          this.windowManager.broadcast('scan:trigger-from-tray')
        }
      },
      { type: 'separator' },
      {
        label: 'Settings',
        click: () => {
          this.windowManager.showMainWindow()
          this.windowManager.sendToMain('navigate', '/settings')
        }
      },
      { type: 'separator' },
      {
        label: 'Quit AI QuickSolve',
        click: () => {
          app.exit(0)
        }
      }
    ])

    this.tray.setContextMenu(contextMenu)
  }

  setStatus(status: 'idle' | 'scanning' | 'error'): void {
    this.updateMenu(status)
    const tooltip =
      status === 'scanning'
        ? 'AI QuickSolve – Scanning…'
        : status === 'error'
        ? 'AI QuickSolve – Error occurred'
        : 'AI QuickSolve – Ready (ALT+F to scan)'
    this.tray?.setToolTip(tooltip)
  }

  destroy(): void {
    this.tray?.destroy()
    this.tray = null
  }
}
