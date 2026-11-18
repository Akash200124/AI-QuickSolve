// ============================================================
// desktop/shortcuts.ts – Global keyboard shortcut management
// Registers/unregisters ALT+F (or user-configured shortcut).
// ============================================================

import { globalShortcut, Notification } from 'electron'
import type { WindowManager } from './windowManager'

export class ShortcutManager {
  private windowManager: WindowManager
  private currentShortcut: string = 'Alt+F'
  private registered: boolean = false
  private scanInProgress: boolean = false
  private scanCooldownMs: number = 1000
  private lastScanTime: number = 0

  constructor(windowManager: WindowManager) {
    this.windowManager = windowManager
  }

  registerDefault(): void {
    this.register(this.currentShortcut)
  }

  register(shortcut: string): { success: boolean; error?: string } {
    // Unregister existing shortcut
    if (this.registered) {
      globalShortcut.unregister(this.currentShortcut)
      this.registered = false
    }

    // Validate shortcut format
    if (!this.isValidShortcut(shortcut)) {
      return { success: false, error: `Invalid shortcut format: ${shortcut}` }
    }

    try {
      const success = globalShortcut.register(shortcut, () => {
        this.onShortcutTriggered()
      })

      if (success) {
        this.currentShortcut = shortcut
        this.registered = true
        console.log(`[Shortcuts] Registered: ${shortcut}`)
        return { success: true }
      } else {
        const error = `Shortcut "${shortcut}" is already registered by another app`
        this.showRegistrationFailedNotification(error)
        return { success: false, error }
      }
    } catch (err) {
      const error = `Failed to register shortcut: ${String(err)}`
      return { success: false, error }
    }
  }

  unregisterAll(): void {
    globalShortcut.unregisterAll()
    this.registered = false
  }

  reregister(): void {
    if (this.currentShortcut) {
      this.register(this.currentShortcut)
    }
  }

  getCurrentShortcut(): string {
    return this.currentShortcut
  }

  setScanInProgress(inProgress: boolean): void {
    this.scanInProgress = inProgress
  }

  private onShortcutTriggered(): void {
    const now = Date.now()
    
    // Rate limiting: ignore if scan recently triggered
    if (now - this.lastScanTime < this.scanCooldownMs) {
      console.log('[Shortcuts] Ignoring rapid duplicate trigger')
      return
    }

    if (this.scanInProgress) {
      console.log('[Shortcuts] Scan already in progress, queueing new scan')
      // Show float window to indicate scanning
      this.windowManager.showFloatWindow()
      return
    }

    this.lastScanTime = now
    console.log('[Shortcuts] ALT+F triggered – starting scan')

    // Show floating window WITHOUT stealing focus
    this.windowManager.showFloatWindow()

    // Broadcast scan trigger to all windows
    this.windowManager.broadcast('scan:triggered')
  }

  private isValidShortcut(shortcut: string): boolean {
    // Must contain at least one modifier and one key
    const modifiers = ['Alt', 'Ctrl', 'Shift', 'Super', 'Command', 'CmdOrCtrl', 'Control']
    const hasModifier = modifiers.some((m) =>
      shortcut.split('+').some((p) => p.trim() === m)
    )
    const parts = shortcut.split('+')
    const hasKey = parts.some((p) => {
      const trimmed = p.trim()
      return !modifiers.includes(trimmed) && trimmed.length > 0
    })
    return hasModifier && hasKey && parts.length >= 2
  }

  private showRegistrationFailedNotification(error: string): void {
    const notification = new Notification({
      title: 'AI QuickSolve – Shortcut Registration Failed',
      body: error,
      silent: false
    })
    notification.show()
  }
}
