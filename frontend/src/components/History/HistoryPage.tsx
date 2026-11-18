// ============================================================
// frontend/src/components/History/HistoryPage.tsx
// Browse, search, delete, export scan history
// ============================================================

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Search, Trash2, Download, X, ChevronRight,
  Clock, AlertCircle, FileJson, FileText, CheckCircle2
} from 'lucide-react'
import { toast } from 'sonner'
import type { HistoryRecord } from '../../types'

export default function HistoryPage() {
  const navigate = useNavigate()
  const [records, setRecords] = useState<HistoryRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<HistoryRecord | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const PAGE_SIZE = 30

  useEffect(() => {
    if (query) {
      searchRecords(query)
    } else {
      loadPage(0)
    }
  }, [query])

  const loadPage = async (p: number) => {
    setLoading(true)
    try {
      const r = await window.electron.history.getAll(p, PAGE_SIZE)
      const result = r as any
      setRecords(result.records ?? [])
      setTotal(result.total ?? 0)
      setPage(p)
    } catch {
      toast.error('Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  const searchRecords = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const r = await window.electron.history.search(q)
      setRecords(Array.isArray(r) ? r : [])
      setTotal(Array.isArray(r) ? r.length : 0)
    } catch {
      toast.error('Search failed')
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteRecord = async (id: string) => {
    setDeleting(id)
    try {
      await window.electron.history.delete(id)
      setRecords((prev) => prev.filter((r) => r.id !== id))
      if (selected?.id === id) setSelected(null)
      toast.success('Record deleted')
    } catch {
      toast.error('Failed to delete')
    } finally {
      setDeleting(null)
    }
  }

  const clearAll = async () => {
    if (!confirm('Clear all history? This cannot be undone.')) return
    await window.electron.history.clear()
    setRecords([])
    setTotal(0)
    setSelected(null)
    toast.success('History cleared')
  }

  const exportJson = async () => {
    const r = await window.electron.history.exportJson()
    if (r.success) toast.success(`Exported to ${r.path}`)
    else if (r.error !== 'Export cancelled') toast.error(r.error)
  }

  const exportCsv = async () => {
    const r = await window.electron.history.exportCsv()
    if (r.success) toast.success(`Exported to ${r.path}`)
    else if (r.error !== 'Export cancelled') toast.error(r.error)
  }

  const confidenceColor = (c: string) =>
    c === 'high' ? 'text-success' :
    c === 'medium' ? 'text-warning' :
    'text-danger'

  return (
    <div className="flex flex-col h-screen bg-bg-primary overflow-hidden">
      {/* Title bar */}
      <div className="titlebar-drag flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="titlebar-no-drag flex items-center gap-3">
          <button onClick={() => navigate('/')} className="btn btn-ghost p-1.5">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-semibold text-text-primary">Scan History</h1>
          <span className="text-xs text-text-muted bg-bg-secondary px-2 py-0.5 rounded-full">
            {total} records
          </span>
        </div>
        <div className="titlebar-no-drag flex items-center gap-2">
          <button onClick={exportJson} className="btn btn-ghost text-xs gap-1" id="btn-export-json">
            <FileJson className="w-3.5 h-3.5" />
            JSON
          </button>
          <button onClick={exportCsv} className="btn btn-ghost text-xs gap-1" id="btn-export-csv">
            <FileText className="w-3.5 h-3.5" />
            CSV
          </button>
          <button onClick={clearAll} className="btn btn-danger text-xs gap-1" id="btn-clear-history">
            <Trash2 className="w-3.5 h-3.5" />
            Clear all
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* List panel */}
        <div className="w-96 flex flex-col border-r border-border">
          {/* Search */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
              <input
                className="input pl-9 text-xs"
                placeholder="Search questions, answers…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                id="input-history-search"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Records */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-2 p-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-14 rounded-lg shimmer" />
                ))}
              </div>
            ) : records.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
                <Clock className="w-8 h-8 text-text-muted" />
                <p className="text-sm text-text-muted">
                  {query ? 'No results found' : 'No scan history yet'}
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {records.map((r) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`p-3 rounded-lg cursor-pointer transition-all group ${
                      selected?.id === r.id
                        ? 'bg-accent/10 border border-accent/30'
                        : 'hover:bg-bg-secondary border border-transparent'
                    }`}
                    onClick={() => setSelected(r)}
                    id={`history-item-${r.id}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        r.confidence === 'high' ? 'bg-success/20 text-success' :
                        r.confidence === 'medium' ? 'bg-warning/20 text-warning' :
                        'bg-danger/20 text-danger'
                      }`}>
                        {r.correctOption || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-text-primary truncate font-medium">{r.question}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-text-muted">
                            {new Date(r.timestamp).toLocaleDateString()}
                          </span>
                          <span className={`text-xs font-medium ${confidenceColor(r.confidence)}`}>
                            {r.confidence}
                          </span>
                          <span className="text-xs text-text-muted font-mono">
                            {(r.processingMs / 1000).toFixed(1)}s
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteRecord(r.id) }}
                        disabled={deleting === r.id}
                        className="opacity-0 group-hover:opacity-100 btn btn-ghost p-1 w-6 h-6 hover:text-danger transition-opacity"
                        aria-label="Delete record"
                      >
                        {deleting === r.id ? (
                          <div className="w-3 h-3 border border-danger rounded-full border-t-transparent animate-spin" />
                        ) : (
                          <X className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </motion.div>
                ))}

                {/* Pagination */}
                {!query && total > PAGE_SIZE && (
                  <div className="flex items-center justify-center gap-2 py-3">
                    <button
                      disabled={page === 0}
                      onClick={() => loadPage(page - 1)}
                      className="btn btn-ghost text-xs"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-text-muted">
                      Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}
                    </span>
                    <button
                      disabled={(page + 1) * PAGE_SIZE >= total}
                      onClick={() => loadPage(page + 1)}
                      className="btn btn-ghost text-xs"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Detail panel */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="max-w-lg space-y-4"
              >
                <div className="card">
                  <p className="text-xs text-text-muted mb-1">Question</p>
                  <p className="text-sm text-text-primary leading-relaxed selectable">{selected.question}</p>
                </div>

                {/* Options */}
                {Object.keys(selected.options).length > 0 && (
                  <div className="space-y-2">
                    {Object.entries(selected.options).map(([k, v]) => (
                      <div
                        key={k}
                        className={`option-item ${k === selected.correctOption ? 'answer-correct border-success/30 bg-success/5' : ''}`}
                      >
                        <span className={`option-label ${k === selected.correctOption ? 'correct' : ''}`}>{k}</span>
                        <span className={`text-sm flex-1 selectable ${k === selected.correctOption ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>{v}</span>
                        {k === selected.correctOption && <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />}
                      </div>
                    ))}
                  </div>
                )}

                {/* Explanation */}
                {selected.explanation && (
                  <div className="card bg-bg-tertiary border-accent/10">
                    <p className="text-xs text-accent font-medium mb-2">AI Explanation</p>
                    <p className="text-sm text-text-secondary leading-relaxed selectable">{selected.explanation}</p>
                  </div>
                )}

                {/* Meta */}
                <div className="flex flex-wrap gap-3 text-xs text-text-muted">
                  <span>{new Date(selected.timestamp).toLocaleString()}</span>
                  <span className="font-mono">{selected.model}</span>
                  <span>OCR: {Math.round(selected.ocrConfidence)}%</span>
                  <span>{(selected.processingMs / 1000).toFixed(1)}s</span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full gap-3 text-center"
              >
                <ChevronRight className="w-8 h-8 text-text-muted" />
                <p className="text-sm text-text-muted">Select a record to view details</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
