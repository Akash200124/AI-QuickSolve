// ============================================================
// frontend/src/hooks/useSettings.ts
// Loads and saves application settings
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import type { AppSettings } from '../types'
import { toast } from 'sonner'

const DEFAULT_SETTINGS: AppSettings = {
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

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      if (window.electron) {
        const s = await window.electron.settings.get()
        setSettings({ ...DEFAULT_SETTINGS, ...s })
      }
    } catch (err) {
      console.error('Failed to load settings:', err)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = useCallback(async (updates: Partial<AppSettings>) => {
    setSaving(true)
    try {
      const updated = { ...settings, ...updates }
      setSettings(updated)
      if (window.electron) {
        await window.electron.settings.set(updates)
      }
      toast.success('Settings saved')
    } catch (err) {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }, [settings])

  const testApiKey = useCallback(async (key: string, model: string) => {
    if (!window.electron) return { success: false, error: 'Not in desktop' }
    return window.electron.settings.testApiKey(key, model)
  }, [])

  const updateShortcut = useCallback(async (shortcut: string) => {
    if (!window.electron) return { success: false, error: 'Not in desktop' }
    const result = await window.electron.settings.registerShortcut(shortcut)
    if (result.success) {
      setSettings((prev) => ({ ...prev, shortcut }))
      toast.success(`Shortcut updated to ${shortcut}`)
    } else {
      toast.error(`Failed to register shortcut: ${result.error}`)
    }
    return result
  }, [])

  return {
    settings,
    loading,
    saving,
    saveSettings,
    testApiKey,
    updateShortcut,
    reload: loadSettings
  }
}
