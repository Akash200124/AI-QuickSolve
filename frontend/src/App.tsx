// ============================================================
// frontend/src/App.tsx – Root component with routing
// Detects if running in float window mode via hash
// ============================================================

import React, { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import Dashboard from './components/Dashboard/Dashboard'
import FloatingPanel from './components/FloatingPanel/FloatingPanel'
import SettingsPage from './components/Settings/SettingsPage'
import HistoryPage from './components/History/HistoryPage'

export default function App() {
  const isFloat = window.location.hash === '#/float'

  // If this is the floating window, only render the floating panel
  if (isFloat) {
    return (
      <>
        <FloatingPanel />
        <Toaster
          position="bottom-center"
          theme="dark"
          toastOptions={{
            style: {
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              fontSize: '13px'
            }
          }}
        />
      </>
    )
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          style: {
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            fontSize: '13px'
          }
        }}
      />
    </HashRouter>
  )
}
