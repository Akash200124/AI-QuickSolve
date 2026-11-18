// ============================================================
// frontend/src/components/QuestionCard/QuestionCard.tsx
// Displays extracted question and options before AI submission
// (Used in confirmation mode — when showConfirmation is true)
// ============================================================

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Edit3, Send, X, CheckSquare } from 'lucide-react'
import type { ScanResult } from '../../types'

interface ParsedQuestion {
  question: string
  options: Record<string, string>
  question_type?: string
  is_complete?: boolean
  warning?: string
}

interface Props {
  question: ParsedQuestion
  ocrConfidence: number
  onConfirm: (q: ParsedQuestion) => void
  onCancel: () => void
}

export default function QuestionCard({ question, ocrConfidence, onConfirm, onCancel }: Props) {
  const [edited, setEdited] = useState<ParsedQuestion>({ ...question })
  const [editMode, setEditMode] = useState(ocrConfidence < 60)

  const updateOption = (label: string, value: string) => {
    setEdited((prev) => ({
      ...prev,
      options: { ...prev.options, [label]: value }
    }))
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card border-warning/30 bg-warning/5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-warning" />
          <span className="text-sm font-semibold text-text-primary">Confirm Extracted Question</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            ocrConfidence >= 80 ? 'confidence-high' :
            ocrConfidence >= 60 ? 'confidence-medium' :
            'confidence-low'
          }`}>
            OCR {Math.round(ocrConfidence)}%
          </span>
          {ocrConfidence < 70 && (
            <span className="text-xs text-warning">Low confidence — please verify</span>
          )}
        </div>
      </div>

      {/* Question text */}
      <div>
        <label className="text-xs text-text-muted mb-1 block">Question</label>
        {editMode ? (
          <textarea
            className="input text-sm resize-none"
            rows={3}
            value={edited.question}
            onChange={(e) => setEdited((p) => ({ ...p, question: e.target.value }))}
          />
        ) : (
          <p className="text-sm text-text-primary p-3 bg-bg-tertiary rounded-lg selectable">
            {edited.question}
          </p>
        )}
      </div>

      {/* Options */}
      {Object.keys(edited.options).length > 0 && (
        <div className="space-y-2">
          <label className="text-xs text-text-muted block">Options</label>
          {Object.entries(edited.options).map(([label, text]) => (
            <div key={label} className="flex items-center gap-2">
              <span className="option-label">{label}</span>
              {editMode ? (
                <input
                  className="input text-sm"
                  value={text}
                  onChange={(e) => updateOption(label, e.target.value)}
                />
              ) : (
                <span className="text-sm text-text-secondary flex-1 p-2 bg-bg-tertiary rounded-lg selectable">
                  {text}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Warning */}
      {!edited.is_complete && (
        <p className="text-xs text-warning">
          ⚠ Question may be incomplete. Please verify before submitting.
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <button
          onClick={() => setEditMode(!editMode)}
          className="btn btn-ghost text-xs gap-1"
        >
          <Edit3 className="w-3 h-3" />
          {editMode ? 'Preview' : 'Edit'}
        </button>
        <div className="flex-1" />
        <button onClick={onCancel} className="btn btn-ghost text-xs gap-1">
          <X className="w-3 h-3" />
          Cancel
        </button>
        <button
          onClick={() => onConfirm(edited)}
          className="btn btn-primary text-xs gap-1"
          disabled={!edited.question.trim()}
          id="btn-confirm-question"
        >
          <Send className="w-3 h-3" />
          Submit to AI
        </button>
      </div>
    </motion.div>
  )
}
