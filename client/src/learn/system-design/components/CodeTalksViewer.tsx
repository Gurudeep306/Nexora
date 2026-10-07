import React, { useState, useEffect } from 'react'
import type { SystemDesignModel, AnimationStep } from '../types'
import { FileCode, Check, Copy, Zap, Terminal } from 'lucide-react'

interface CodeTalksViewerProps {
  system: SystemDesignModel
  currentStep: AnimationStep
}

export const CodeTalksViewer: React.FC<CodeTalksViewerProps> = ({ system, currentStep }) => {
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0)
  const [copied, setCopied] = useState<boolean>(false)

  // Automatically switch tab if current step references a specific file
  useEffect(() => {
    if (currentStep?.codeRef?.file) {
      const targetIdx = system.codeFiles.findIndex((f) => f.name === currentStep.codeRef.file)
      if (targetIdx !== -1) {
        setActiveFileIndex(targetIdx)
      }
    }
  }, [currentStep, system.codeFiles])

  const activeFile = system.codeFiles[activeFileIndex] || system.codeFiles[0]

  const handleCopy = () => {
    if (!activeFile) return
    navigator.clipboard.writeText(activeFile.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Parse highlighted line range (e.g. "28-36")
  let startHighlight = -1
  let endHighlight = -1
  if (currentStep?.codeRef?.file === activeFile?.name && currentStep?.codeRef?.lineHighlight) {
    const parts = currentStep.codeRef.lineHighlight.split('-').map(Number)
    if (parts.length === 2) {
      startHighlight = parts[0]
      endHighlight = parts[1]
    } else if (parts.length === 1) {
      startHighlight = parts[0]
      endHighlight = parts[0]
    }
  }

  const codeLines = activeFile ? activeFile.code.split('\n') : []

  return (
    <div className="flex flex-col rounded-2xl bg-bg-surface-2 ring-1 ring-border overflow-hidden">
      {/* Code Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-bg-surface-3/70 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Terminal className="size-4 text-accent-brand" />
          <span className="text-[12px] font-bold tracking-wider text-text-primary uppercase">
            Code Interlock: How Services Talk
          </span>
        </div>

        {/* File Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {system.codeFiles.map((file, idx) => {
            const isStepTarget = currentStep?.codeRef?.file === file.name
            const isActive = activeFileIndex === idx

            return (
              <button
                key={file.name}
                onClick={() => setActiveFileIndex(idx)}
                className={`relative flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11.5px] font-mono transition ${
                  isActive
                    ? 'bg-bg-surface-1 font-semibold text-text-primary shadow-sm ring-1 ring-border'
                    : 'text-text-muted hover:bg-bg-surface-2 hover:text-text-primary'
                }`}
              >
                <FileCode className="size-3.5" />
                <span>{file.name}</span>
                {isStepTarget && (
                  <span className="flex size-1.5 rounded-full bg-accent-brand animate-ping" />
                )}
              </button>
            )
          })}

          <button
            onClick={handleCopy}
            title="Copy code"
            className="ml-2 flex size-7 items-center justify-center rounded-lg bg-bg-surface-1 text-text-muted transition hover:bg-bg-surface-3 hover:text-text-primary"
          >
            {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
          </button>
        </div>
      </div>

      {/* Synchronized Callout Card for Active Step */}
      {currentStep?.codeRef && (
        <div className="border-b border-border bg-accent-brand/5 p-3.5 sm:px-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent-brand text-bg-base">
              <Zap className="size-3 fill-current" />
            </div>
            <div className="space-y-0.5 text-[12px]">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-text-primary">
                  Executing: <code className="font-mono text-accent-brand">{currentStep.codeRef.funcName}()</code>
                </span>
                <span className="rounded bg-bg-surface-1 px-1.5 py-0.2 font-mono text-[10px] text-text-muted">
                  Lines {currentStep.codeRef.lineHighlight}
                </span>
              </div>
              <p className="text-text-secondary leading-relaxed">
                {currentStep.codeRef.codeExplanation}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Code Body with Line Numbering & Dynamic Range Highlighting */}
      <div className="max-h-[380px] overflow-auto bg-[#0d1117] p-4 font-mono text-[12px] leading-relaxed select-text">
        <pre className="relative">
          {codeLines.map((line, idx) => {
            const lineNum = idx + 1
            const isHighlighted = lineNum >= startHighlight && lineNum <= endHighlight

            return (
              <div
                key={idx}
                className={`flex items-start transition-colors duration-200 ${
                  isHighlighted ? 'bg-accent-brand/15 -mx-4 px-4' : 'hover:bg-white/[0.02]'
                }`}
              >
                {/* Line Number */}
                <span
                  className={`inline-block w-8 shrink-0 select-none text-right pr-3 font-mono text-[11px] ${
                    isHighlighted ? 'text-accent-brand font-bold' : 'text-neutral-600'
                  }`}
                >
                  {lineNum}
                </span>

                {/* Code Line */}
                <span
                  className={`flex-1 overflow-x-auto whitespace-pre ${
                    isHighlighted ? 'text-sky-200 font-medium' : 'text-neutral-300'
                  }`}
                >
                  {line}
                </span>
              </div>
            )
          })}
        </pre>
      </div>

      {/* Role explanation footer */}
      <div className="flex items-center justify-between border-t border-border bg-bg-surface-1 px-4 py-2 text-[11px] text-text-muted">
        <span>Component: {activeFile?.role}</span>
        <span className="uppercase font-mono font-bold text-[10px] text-accent-brand">
          {activeFile?.language}
        </span>
      </div>
    </div>
  )
}
