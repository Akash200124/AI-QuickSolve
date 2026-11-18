// ============================================================
// frontend/src/components/Settings/SettingsPage.tsx
// Full settings panel with 10 sections
// ============================================================

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Eye, EyeOff, Check, Loader2, AlertCircle,
  Keyboard, Monitor, Brain, PanelRight, Shield,
  BarChart3, Info, Zap, RefreshCcw, Bell
} from 'lucide-react'
import { toast } from 'sonner'
import { useSettings } from '../../hooks/useSettings'

const SECTIONS = [
  { id: 'general', label: 'General', icon: Zap },
  { id: 'shortcuts', label: 'Keyboard', icon: Keyboard },
  { id: 'capture', label: 'Screen Capture', icon: Monitor },
  { id: 'ai', label: 'AI Provider', icon: Brain },
  { id: 'panel', label: 'Floating Panel', icon: PanelRight },
  { id: 'privacy', label: 'Privacy', icon: Shield },
  { id: 'about', label: 'About', icon: Info }
]

const MODELS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast, Economical)' },
  { value: 'gpt-4o', label: 'GPT-4o (Most Capable)' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Fastest)' }
]

export default function SettingsPage() {
  const navigate = useNavigate()
  const { settings, loading, saving, saveSettings, testApiKey, updateShortcut } = useSettings()
  const [activeSection, setActiveSection] = useState('general')
  const [showApiKey, setShowApiKey] = useState(false)
  const [localApiKey, setLocalApiKey] = useState(settings.apiKey)
  const [testingApi, setTestingApi] = useState(false)
  const [apiTestResult, setApiTestResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [recordingShortcut, setRecordingShortcut] = useState(false)
  const [localShortcut, setLocalShortcut] = useState(settings.shortcut)

  const handleApiTest = async () => {
    if (!localApiKey) {
      toast.error('Enter an API key first')
      return
    }
    setTestingApi(true)
    setApiTestResult(null)
    const result = await testApiKey(localApiKey, settings.model)
    setApiTestResult(result)
    setTestingApi(false)
  }

  const handleSaveApiKey = () => {
    saveSettings({ apiKey: localApiKey })
  }

  const handleShortcutCapture = (e: React.KeyboardEvent) => {
    if (!recordingShortcut) return
    e.preventDefault()
    const parts: string[] = []
    if (e.altKey) parts.push('Alt')
    if (e.ctrlKey) parts.push('Ctrl')
    if (e.shiftKey) parts.push('Shift')
    if (e.metaKey) parts.push('Super')

    const key = e.key
    if (!['Alt', 'Control', 'Shift', 'Meta'].includes(key)) {
      parts.push(key.length === 1 ? key.toUpperCase() : key)
    }

    if (parts.length >= 2) {
      setLocalShortcut(parts.join('+'))
      setRecordingShortcut(false)
    }
  }

  const handleSaveShortcut = () => {
    updateShortcut(localShortcut)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-bg-primary overflow-hidden">
      {/* Title bar */}
      <div className="titlebar-drag flex items-center px-4 py-3 border-b border-border">
        <div className="titlebar-no-drag flex items-center gap-3">
          <button onClick={() => navigate('/')} className="btn btn-ghost p-1.5">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-semibold text-text-primary">Settings</h1>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className="w-44 border-r border-border py-3 flex-shrink-0">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all ${
                activeSection === id
                  ? 'bg-accent/10 text-accent border-r-2 border-accent'
                  : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
              }`}
              id={`settings-nav-${id}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="max-w-lg space-y-6"
          >
            {/* ── General ─────────────────────────────────── */}
            {activeSection === 'general' && (
              <>
                <SectionHeader title="General" desc="Application behavior and startup preferences" />
                <SettingRow
                  label="Start with Windows"
                  desc="Launch AI QuickSolve when you log in"
                >
                  <Toggle
                    checked={settings.startWithWindows}
                    onChange={(v) => saveSettings({ startWithWindows: v })}
                    id="toggle-start-windows"
                  />
                </SettingRow>
                <SettingRow
                  label="Minimize to tray"
                  desc="Keep running in background when closed"
                >
                  <Toggle
                    checked={settings.minimizeToTray}
                    onChange={(v) => saveSettings({ minimizeToTray: v })}
                    id="toggle-minimize-tray"
                  />
                </SettingRow>
                <SettingRow
                  label="Show confirmation before AI"
                  desc="Review extracted text before sending to AI"
                >
                  <Toggle
                    checked={settings.showConfirmation}
                    onChange={(v) => saveSettings({ showConfirmation: v })}
                    id="toggle-confirmation"
                  />
                </SettingRow>
              </>
            )}

            {/* ── Keyboard ────────────────────────────────── */}
            {activeSection === 'shortcuts' && (
              <>
                <SectionHeader title="Keyboard Shortcuts" desc="Configure global hotkeys" />
                <SettingRow label="Scan shortcut" desc="Global hotkey to trigger a new scan">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div
                        onKeyDown={handleShortcutCapture}
                        tabIndex={0}
                        className={`input flex-1 cursor-pointer text-center font-mono ${
                          recordingShortcut
                            ? 'border-accent bg-accent/10'
                            : ''
                        }`}
                        onClick={() => setRecordingShortcut(true)}
                        onBlur={() => setRecordingShortcut(false)}
                        id="input-shortcut"
                      >
                        {recordingShortcut ? '⌨ Press keys…' : localShortcut || 'Click to set'}
                      </div>
                      <button onClick={handleSaveShortcut} className="btn btn-primary text-xs">
                        Save
                      </button>
                    </div>
                    {recordingShortcut && (
                      <p className="text-xs text-accent">Press your desired key combination…</p>
                    )}
                  </div>
                </SettingRow>
              </>
            )}

            {/* ── Screen Capture ───────────────────────────── */}
            {activeSection === 'capture' && (
              <>
                <SectionHeader title="Screen Capture" desc="Configure what gets captured" />
                <SettingRow label="Display to capture" desc="Which monitor to screenshot">
                  <select
                    className="input"
                    value={settings.captureDisplay}
                    onChange={(e) => saveSettings({ captureDisplay: Number(e.target.value) })}
                    id="select-display"
                  >
                    <option value={0}>Display 1 (Primary)</option>
                    <option value={1}>Display 2</option>
                    <option value={2}>Display 3</option>
                  </select>
                </SettingRow>
                <SettingRow label="OCR Language" desc="Language for text recognition">
                  <select
                    className="input"
                    value={settings.ocrLanguage}
                    onChange={(e) => saveSettings({ ocrLanguage: e.target.value })}
                    id="select-ocr-language"
                  >
                    <option value="eng">English</option>
                    <option value="fra">French</option>
                    <option value="deu">German</option>
                    <option value="spa">Spanish</option>
                    <option value="chi_sim">Chinese (Simplified)</option>
                  </select>
                </SettingRow>
              </>
            )}

            {/* ── AI Provider ─────────────────────────────── */}
            {activeSection === 'ai' && (
              <>
                <SectionHeader title="AI Provider" desc="Configure your AI API credentials" />
                <SettingRow label="OpenAI API Key" desc="Your secret API key (stored securely)">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          className="input pr-10"
                          value={localApiKey}
                          onChange={(e) => setLocalApiKey(e.target.value)}
                          placeholder="sk-..."
                          id="input-api-key"
                        />
                        <button
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                        >
                          {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleApiTest}
                        disabled={testingApi || !localApiKey}
                        className="btn btn-secondary text-xs gap-1.5"
                        id="btn-test-api"
                      >
                        {testingApi ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCcw className="w-3 h-3" />
                        )}
                        Test connection
                      </button>
                      <button onClick={handleSaveApiKey} className="btn btn-primary text-xs" id="btn-save-api-key">
                        Save key
                      </button>
                    </div>
                    {apiTestResult && (
                      <div className={`flex items-center gap-2 text-xs ${
                        apiTestResult.success ? 'text-success' : 'text-danger'
                      }`}>
                        {apiTestResult.success ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5" />
                        )}
                        {apiTestResult.success ? 'Connection successful!' : apiTestResult.error}
                      </div>
                    )}
                  </div>
                </SettingRow>

                <SettingRow label="AI Model" desc="Model used for answering questions">
                  <select
                    className="input"
                    value={settings.model}
                    onChange={(e) => saveSettings({ model: e.target.value })}
                    id="select-model"
                  >
                    {MODELS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </SettingRow>

                <SettingRow label="Max retries" desc="Retry attempts on API failure">
                  <input
                    type="number"
                    className="input w-24"
                    min={1} max={10}
                    value={settings.maxRetries}
                    onChange={(e) => saveSettings({ maxRetries: Number(e.target.value) })}
                    id="input-max-retries"
                  />
                </SettingRow>

                <SettingRow label="Timeout (seconds)" desc="Max time to wait for AI response">
                  <input
                    type="number"
                    className="input w-24"
                    min={5} max={120}
                    value={settings.timeoutSeconds}
                    onChange={(e) => saveSettings({ timeoutSeconds: Number(e.target.value) })}
                    id="input-timeout"
                  />
                </SettingRow>
              </>
            )}

            {/* ── Floating Panel ───────────────────────────── */}
            {activeSection === 'panel' && (
              <>
                <SectionHeader title="Floating Panel" desc="Customize the assistant overlay" />
                <SettingRow label="Always on top" desc="Float panel above all other windows">
                  <Toggle
                    checked={settings.alwaysOnTop}
                    onChange={(v) => saveSettings({ alwaysOnTop: v })}
                    id="toggle-always-on-top"
                  />
                </SettingRow>
                <SettingRow
                  label="Opacity"
                  desc={`Panel transparency: ${Math.round(settings.floatOpacity * 100)}%`}
                >
                  <input
                    type="range"
                    min={0.1} max={1} step={0.05}
                    value={settings.floatOpacity}
                    className="w-32 accent-accent"
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      saveSettings({ floatOpacity: v })
                      window.electron?.window.setOpacity(v)
                    }}
                    id="slider-opacity"
                  />
                </SettingRow>
              </>
            )}

            {/* ── Privacy ─────────────────────────────────── */}
            {activeSection === 'privacy' && (
              <>
                <SectionHeader title="Privacy" desc="Data storage and retention settings" />
                <SettingRow label="Save scan history" desc="Store past scans locally in SQLite">
                  <Toggle
                    checked={settings.enableHistory}
                    onChange={(v) => saveSettings({ enableHistory: v })}
                    id="toggle-history"
                  />
                </SettingRow>
                <div className="bg-bg-secondary rounded-lg p-4 text-xs text-text-secondary space-y-2">
                  <p className="font-medium text-text-primary">Privacy Information</p>
                  <p>• Screenshots are NOT stored on disk by default.</p>
                  <p>• Question text is sent to your chosen AI provider's API.</p>
                  <p>• All data stays on your computer (no cloud sync).</p>
                  <p>• API keys are stored securely using OS encryption.</p>
                  <p>• This app does not implement any form of covert monitoring.</p>
                </div>
              </>
            )}

            {/* ── About ───────────────────────────────────── */}
            {activeSection === 'about' && (
              <>
                <SectionHeader title="About" desc="Application information" />
                <div className="card space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                      <Zap className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <p className="font-semibold text-text-primary">AI QuickSolve</p>
                      <p className="text-xs text-text-muted">
                        Version {window.electron?.app.getVersion() || '1.0.0'}
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-border pt-3 space-y-2 text-sm text-text-secondary">
                    <p>AI-powered MCQ study assistant for Windows</p>
                    <p className="text-xs text-text-muted">
                      Built with Electron, React, Python FastAPI, Tesseract OCR, and OpenAI.
                    </p>
                  </div>
                  <button
                    onClick={() => window.electron?.app.openExternal('https://github.com')}
                    className="btn btn-secondary text-xs w-full"
                  >
                    View Documentation
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

// ── Helpers ─────────────────────────────────────────────────────

function SectionHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-2">
      <h2 className="text-base font-semibold text-text-primary">{title}</h2>
      <p className="text-sm text-text-muted">{desc}</p>
    </div>
  )
}

function SettingRow({
  label, desc, children
}: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-3 border-b border-border last:border-0">
      <div className="flex-1">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {desc && <p className="text-xs text-text-muted mt-0.5">{desc}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function Toggle({ checked, onChange, id }: { checked: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-6 rounded-full transition-colors ${
        checked ? 'bg-accent' : 'bg-bg-tertiary border border-border'
      }`}
    >
      <span
        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow ${
          checked ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  )
}
