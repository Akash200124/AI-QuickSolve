// ============================================================
// frontend/src/components/AnswerCard/AnswerCard.tsx
// Displays AI answer with correct option, explanation, copy
// ============================================================

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle2, Copy, Check, RefreshCcw, ChevronDown,
  ChevronUp, Sparkles, AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'
import type { ScanResult } from '../../types'

interface Props {
  result: ScanResult
  onRescan?: () => void
  compact?: boolean
}

export default function AnswerCard({ result, onRescan, compact = false }: Props) {
  const [copied, setCopied] = useState(false)
  const [showFullExplanation, setShowFullExplanation] = useState(!compact)

  const copyAnswer = async () => {
    const text = `Answer: ${result.correctOption}. ${result.correctAnswer}\n\nExplanation: ${result.explanation}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const confidenceBadge = {
    high: 'confidence-high',
    medium: 'confidence-medium',
    low: 'confidence-low'
  }[result.confidence] ?? 'confidence-low'

  const truncatedExplanation =
    result.explanation.length > 200 && !showFullExplanation
      ? result.explanation.slice(0, 200) + '…'
      : result.explanation

  return (
    <div className="card border-success/20 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center">
            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
          </div>
          <span className="text-sm font-semibold text-text-primary">AI Answer</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${confidenceBadge}`}>
            {result.confidence} confidence
          </span>
        </div>
      </div>

      {/* Question (compact) */}
      {!compact && (
        <div className="bg-bg-tertiary rounded-lg p-3">
          <p className="text-xs text-text-muted mb-1">Question</p>
          <p className="text-sm text-text-primary leading-relaxed selectable">{result.question}</p>
        </div>
      )}

      {/* Options */}
      {Object.keys(result.options).length > 0 && (
        <div className="space-y-2">
          {Object.entries(result.options).map(([label, text]) => {
            const isCorrect = label === result.correctOption
            return (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Object.keys(result.options).indexOf(label) * 0.05 }}
                className={`option-item ${isCorrect ? 'answer-correct border-success/30 bg-success/5' : ''}`}
              >
                <span className={`option-label ${isCorrect ? 'correct' : ''}`}>{label}</span>
                <span className={`text-sm flex-1 selectable ${isCorrect ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                  {text}
                </span>
                {isCorrect && (
                  <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                )}
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Correct answer summary */}
      <div className="bg-success/5 border border-success/20 rounded-lg p-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-success flex items-center justify-center font-bold text-white text-sm flex-shrink-0">
          {result.correctOption}
        </div>
        <div>
          <p className="text-xs text-success/80 font-medium">Correct Answer</p>
          <p className="text-sm text-text-primary font-semibold selectable">{result.correctAnswer}</p>
        </div>
      </div>

      {/* Explanation */}
      {result.explanation && (
        <div className="bg-bg-tertiary rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span className="text-xs font-medium text-accent">AI Explanation</span>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed selectable">
            {truncatedExplanation}
          </p>
          {result.explanation.length > 200 && (
            <button
              onClick={() => setShowFullExplanation(!showFullExplanation)}
              className="btn btn-ghost text-xs mt-2 p-0 h-auto text-accent"
            >
              {showFullExplanation ? (
                <><ChevronUp className="w-3 h-3" /> Show less</>
              ) : (
                <><ChevronDown className="w-3 h-3" /> Show full explanation</>
              )}
            </button>
          )}
        </div>
      )}

      {/* Other options explanation */}
      {!compact && Object.keys(result.otherOptions ?? {}).length > 0 && showFullExplanation && (
        <details className="group">
          <summary className="text-xs text-text-muted cursor-pointer hover:text-text-secondary transition-colors list-none flex items-center gap-1">
            <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
            Why other options are wrong
          </summary>
          <div className="mt-2 space-y-1 pl-3 border-l border-border">
            {Object.entries(result.otherOptions).map(([label, reason]) => (
              <div key={label} className="flex gap-2">
                <span className="text-xs font-medium text-text-muted w-4">{label}.</span>
                <p className="text-xs text-text-muted selectable">{reason}</p>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Meta info */}
      <div className="flex items-center justify-between pt-1 border-t border-border">
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span>OCR: {Math.round(result.ocrConfidence)}%</span>
          <span>{(result.processingMs / 1000).toFixed(1)}s</span>
          <span className="font-mono">{result.model}</span>
        </div>
        <div className="flex items-center gap-2">
          {onRescan && (
            <button onClick={onRescan} className="btn btn-ghost text-xs gap-1" id="btn-rescan">
              <RefreshCcw className="w-3 h-3" />
              Rescan
            </button>
          )}
          <button onClick={copyAnswer} className="btn btn-secondary text-xs gap-1" id="btn-copy-answer">
            {copied ? (
              <><Check className="w-3 h-3 text-success" /> Copied</>
            ) : (
              <><Copy className="w-3 h-3" /> Copy</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
