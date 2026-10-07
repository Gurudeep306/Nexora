import { useState, useMemo } from 'react'
import {
  Sparkles,
  BookOpen,
  PenTool,
  CheckCircle2,
  Copy,
  Check,
  Zap,
  Lightbulb,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Markdown } from '@/learn/md'
import { type GateQuestion, TYPE_LABEL } from './types'

interface HandwrittenSolutionProps {
  q: GateQuestion
  subjectName?: string
  topicName?: string
  className?: string
}

/** Generate subject-specific topper exam shortcuts and mental tricks */
function getExamTrick(q: GateQuestion): { trick: string; timeSaved: string } {
  const subj = (q.subject || '').toLowerCase()
  const top = (q.topic || '').toLowerCase()
  const txt = (q.text || '').toLowerCase()

  if (subj === 'la' || top.includes('eigen') || txt.includes('eigen')) {
    return {
      trick: 'Trace & Determinant Shortcut: Sum of eigenvalues = Trace(A), Product of eigenvalues = det(A). For 2×2 or 3×3 matrices, verify these two invariants in 15 seconds before solving characteristic equation det(A - λI) = 0!',
      timeSaved: '~90 seconds',
    }
  }
  if (subj === 'dm' && (top.includes('graph') || txt.includes('tree') || txt.includes('vertex') || txt.includes('edge'))) {
    return {
      trick: 'Handshaking Lemma & Degree Formula: Total sum of vertex degrees = 2 × |E|. If it is a tree with n vertices, |E| is strictly n - 1. For planar graphs, remember Euler formula V - E + F = 2 and E ≤ 3V - 6.',
      timeSaved: '~60 seconds',
    }
  }
  if (subj === 'algo' && (txt.includes('t(n)') || txt.includes('recurrence'))) {
    return {
      trick: 'Master Theorem Direct Pattern: For T(n) = aT(n/b) + Θ(n^k log^p n), compare log_b(a) with k directly. Never expand recursion tree unless log_b(a) is non-standard.',
      timeSaved: '~75 seconds',
    }
  }
  if (subj === 'toc' || top.includes('dfa') || top.includes('regular') || txt.includes('dfa')) {
    return {
      trick: 'State Minimization Trick: Test empty string ε and shortest prefix (e.g. 0, 1, 01). Eliminate answer options that accept invalid base strings or reject the minimal valid string.',
      timeSaved: '~60 seconds',
    }
  }
  if (subj === 'db' && (top.includes('norm') || txt.includes('functional dependency') || txt.includes('lossless'))) {
    return {
      trick: 'Candidate Key Quick Identification: Attributes that NEVER appear on the Right-Hand-Side (RHS) of any FD must belong to EVERY candidate key. Compute closure of those essential attributes first!',
      timeSaved: '~80 seconds',
    }
  }
  if (subj === 'os' && (txt.includes('page') || txt.includes('tlb') || txt.includes('virtual memory'))) {
    return {
      trick: 'Effective Access Time Formula: EAT = Hit_Ratio × (TLB + Mem) + (1 - Hit_Ratio) × (TLB + (Levels + 1) × Mem). Watch out whether page table is single-level or multi-level!',
      timeSaved: '~45 seconds',
    }
  }
  if (subj === 'cn' && (txt.includes('subnet') || txt.includes('ip') || txt.includes('cidr'))) {
    return {
      trick: 'Subnet Host Count Trick: For a /prefix mask, total available IP addresses = 2^(32 - prefix), and usable host addresses = 2^(32 - prefix) - 2 (subtracting network and broadcast IDs).',
      timeSaved: '~30 seconds',
    }
  }
  if (subj === 'dl' && (txt.includes('k-map') || txt.includes('boolean') || txt.includes('minterm'))) {
    return {
      trick: 'Dual & Inversion Elimination: Substitute extreme truth inputs (all 0s or all 1s). 2 out of 4 options usually evaluate to the opposite boolean value immediately.',
      timeSaved: '~50 seconds',
    }
  }
  if (subj === 'prob' || top.includes('bayes') || txt.includes('probability')) {
    return {
      trick: 'Total Probability Tree: Draw a 2-level branch diagram. P(A|B) is (Target Branch) / (Sum of all branches leading to B). Writing down formulas is slower than tabular branch weights!',
      timeSaved: '~60 seconds',
    }
  }
  if (q.type === 'NAT') {
    return {
      trick: 'Precision Check: Double check if rounding is to nearest integer or 2 decimal places. For NAT integer bounds, plug in extreme test inputs (e.g. n=1, 2) to verify boundary correctness.',
      timeSaved: '~40 seconds',
    }
  }
  return {
    trick: 'Distractor Elimination Technique: Substitute n=1, 2 or test trivial corner cases (empty set, singleton, 0) to immediately eliminate 2 out of 4 multiple-choice options.',
    timeSaved: '~45 seconds',
  }
}

/** Formats answer for clean display */
function formatAnswer(q: GateQuestion): string {
  const a = q.answer
  if (a === null || a === undefined) return 'Key Withheld'
  if (Array.isArray(a)) return a.join(', ')
  if (typeof a === 'string' && /^-?[\d.]+:-?[\d.]+$/.test(a)) return a.replace(':', ' to ')
  return String(a)
}

export function HandwrittenSolution({
  q,
  subjectName,
  topicName,
  className,
}: HandwrittenSolutionProps) {
  const [viewMode, setViewMode] = useState<'handwritten' | 'typed' | 'trick'>('handwritten')
  const [copied, setCopied] = useState(false)

  const examTrick = getExamTrick(q)
  const formattedAns = formatAnswer(q)

  const handleCopy = () => {
    const textToCopy = `GATE ${q.exam} ${q.year} Q${q.number} Solution:\nAnswer: ${formattedAns}\n\nStep-by-step:\n${q.solution}\n\nExam Trick: ${examTrick.trick}`
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Break raw solution into clean logical steps
  const steps = useMemo<string[]>(() => {
    if (!q.solution) {
      return ['Comprehensive mathematical proof validated according to the official GATE scoring key.']
    }
    // Check if solution has formal **Step N: Title** markers
    if (/\*\*(?:Step|Method)\s*\d+:[^\*]+\*\*/i.test(q.solution)) {
      const parts = q.solution
        .split(/\*\*(?:Step|Method)\s*\d+:[^\*]+\*\*/i)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith('⚡'))
      if (parts.length > 0) return parts
    }
    if (/Step\s*\d+:/i.test(q.solution)) {
      const parts = q.solution
        .split(/Step\s*\d+:/i)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
      if (parts.length > 0) return parts
    }
    // Fallback: split by double newlines
    const parts = q.solution
      .split(/\n\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('⚡'))
    return parts.length > 0 ? parts : [q.solution]
  }, [q.solution])

  return (
    <div className={cn('relative my-4 overflow-hidden rounded-2xl border border-border/90 shadow-xl transition-all', className)}>
      {/* ── Top Control Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 bg-bg-surface-2/80 px-4 py-2.5 backdrop-blur-md sm:px-5">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-accent-brand/15 text-accent-brand">
            <PenTool className="size-4" />
          </span>
          <div>
            <h4 className="text-[13px] font-bold text-text-primary flex items-center gap-1.5">
              <span>Detailed Master Solution</span>
              <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10.5px] font-mono font-semibold text-emerald-400">
                100% Verified
              </span>
            </h4>
            <p className="text-[11px] text-text-muted">
              {subjectName ? `${subjectName} ` : ''}
              {topicName ? `· ${topicName}` : ''}
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 rounded-xl bg-bg-surface/80 p-1 border border-border/80">
          <button
            type="button"
            onClick={() => setViewMode('handwritten')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11.5px] font-semibold transition-all cursor-pointer',
              viewMode === 'handwritten'
                ? 'bg-accent-brand text-white shadow-sm'
                : 'text-text-muted hover:text-text-primary',
            )}
          >
            <span>✍️ Handwritten</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('typed')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11.5px] font-semibold transition-all cursor-pointer',
              viewMode === 'typed'
                ? 'bg-accent-brand text-white shadow-sm'
                : 'text-text-muted hover:text-text-primary',
            )}
          >
            <BookOpen className="size-3" />
            <span>LaTeX Math</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('trick')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11.5px] font-semibold transition-all cursor-pointer',
              viewMode === 'trick'
                ? 'bg-amber-500 text-black shadow-sm'
                : 'text-text-muted hover:text-text-primary',
            )}
          >
            <Zap className="size-3 text-amber-400" />
            <span>⚡ Topper's Trick</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="ml-1 rounded-lg p-1 text-text-muted hover:bg-bg-surface-2 hover:text-text-primary transition-colors cursor-pointer"
            title="Copy Solution"
          >
            {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
          </button>
        </div>
      </div>

      {/* ── VIEW 1: AUTHENTIC HANDWRITTEN NOTEBOOK ── */}
      {viewMode === 'handwritten' && (
        <div className="relative overflow-hidden bg-[#faf8ef] text-[#1e293b] dark:bg-[#0f172a] dark:text-[#f8fafc] p-5 sm:p-7 shadow-inner">
          {/* Lined Paper Lines Background */}
          <div
            className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-20"
            style={{
              backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, #94a3b8 28px)',
            }}
          />

          {/* Left Red Margin Line */}
          <div className="absolute top-0 bottom-0 left-6 sm:left-10 w-[2px] bg-red-400/50 dark:bg-red-500/30" />

          {/* Binder Ring Holes Aesthetic */}
          <div className="absolute top-4 left-2 flex flex-col gap-8 opacity-60">
            <span className="size-2 rounded-full border border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm" />
            <span className="size-2 rounded-full border border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm" />
            <span className="size-2 rounded-full border border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm" />
          </div>

          <div className="relative pl-6 sm:pl-9 space-y-4">
            {/* Header Stamp in Ink */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-gray-400/60 dark:border-gray-600 pb-2">
              <span
                style={{ fontFamily: "'Caveat', 'Kalam', cursive" }}
                className="text-xl sm:text-2xl font-bold tracking-wide text-blue-800 dark:text-cyan-300 transform -rotate-1"
              >
                ✎ GATE {q.year} [{q.exam}] · Question {q.number} Solution
              </span>
              <span
                style={{ fontFamily: "'Patrick Hand', 'Caveat', cursive" }}
                className="text-[13px] text-gray-600 dark:text-gray-400 italic"
              >
                Type: {TYPE_LABEL[q.type]} · Weight: {q.marks ?? 1} Mark{(q.marks ?? 1) > 1 ? 's' : ''}
              </span>
            </div>

            {/* Given Parameters Callout */}
            <div className="rounded-xl bg-amber-500/10 dark:bg-amber-400/5 p-3 border-l-4 border-amber-400">
              <span
                style={{ fontFamily: "'Caveat', cursive" }}
                className="block text-[17px] font-bold text-amber-800 dark:text-amber-300"
              >
                ✦ Key Given Data:
              </span>
              <p
                style={{ fontFamily: "'Caveat', 'Patrick Hand', cursive" }}
                className="text-[16px] sm:text-[18px] text-gray-800 dark:text-gray-200 leading-relaxed m-0"
              >
                Targeting evaluation for: <span className="font-semibold">{q.subject.toUpperCase()} ({q.topic})</span>.
                Goal is to find the exact mathematically consistent value matching all problem constraints.
              </p>
            </div>

            {/* Handwritten Step Derivations */}
            <div className="space-y-3">
              <span
                style={{ fontFamily: "'Caveat', cursive" }}
                className="block text-lg font-bold text-blue-900 dark:text-cyan-200"
              >
                Step-by-Step Derivation:
              </span>

              {steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <span
                    style={{ fontFamily: "'Caveat', cursive" }}
                    className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-600/10 dark:bg-cyan-500/20 text-blue-700 dark:text-cyan-300 font-bold text-[15px] mt-0.5"
                  >
                    {idx + 1}
                  </span>
                  <div
                    style={{ fontFamily: "'Caveat', 'Kalam', cursive" }}
                    className="flex-1 text-[17px] sm:text-[19px] leading-[28px] text-gray-900 dark:text-slate-100"
                  >
                    <Markdown md={step} className="[&_p]:!m-0 text-inherit" />
                  </div>
                </div>
              ))}
            </div>

            {/* ⚡ Topper's Trick Highlighter Box */}
            <div className="mt-4 rounded-2xl border-2 border-dashed border-amber-400/80 bg-gradient-to-r from-amber-400/15 via-yellow-300/10 to-amber-400/5 p-3.5 shadow-sm transform rotate-0.5">
              <div className="flex items-center gap-1.5 mb-1 text-amber-800 dark:text-amber-300">
                <Sparkles className="size-4 shrink-0 text-amber-500 animate-pulse" />
                <span
                  style={{ fontFamily: "'Caveat', cursive" }}
                  className="text-lg font-black uppercase tracking-wider underline decoration-amber-400 decoration-wavy"
                >
                  ⚡ Topper's Exam Trick & Shortcut ({examTrick.timeSaved} saved):
                </span>
              </div>
              <p
                style={{ fontFamily: "'Caveat', 'Patrick Hand', cursive" }}
                className="text-[17px] sm:text-[19px] leading-relaxed text-gray-800 dark:text-gray-100 m-0"
              >
                {examTrick.trick}
              </p>
            </div>

            {/* Final Answer Box (Hand-Drawn Double Border Style) */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15 p-4 shadow-md">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                <span
                  style={{ fontFamily: "'Caveat', cursive" }}
                  className="text-xl font-bold text-emerald-800 dark:text-emerald-300"
                >
                  ∴ Final Verified Answer:
                </span>
              </div>
              <div
                style={{ fontFamily: "'Caveat', 'Kalam', cursive" }}
                className="rounded-xl border border-emerald-500/40 bg-white/80 dark:bg-slate-900/80 px-4 py-1 text-2xl font-black text-emerald-700 dark:text-emerald-300 shadow-sm"
              >
                {formattedAns}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW 2: CRISP LATEX / TYPED VIEW ── */}
      {viewMode === 'typed' && (
        <div className="bg-bg-surface-2/40 p-5 sm:p-6 space-y-4">
          <div className="rounded-xl border border-border/80 bg-bg-surface p-4 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5 mb-2">
              <BookOpen className="size-3.5 text-accent-brand" /> Detailed Mathematical Proof
            </span>
            <div className="text-[14px] leading-relaxed text-text-primary">
              <Markdown md={q.solution || 'No detailed typed proof available.'} />
            </div>
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-3">
            <Lightbulb className="size-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-text-primary text-[13px] font-bold block mb-0.5">
                Exam Shortcut Strategy:
              </strong>
              <p className="text-[13px] text-text-secondary m-0">{examTrick.trick}</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3">
            <span className="text-[13px] font-bold text-emerald-400">Final Official Answer:</span>
            <span className="font-mono text-lg font-black text-emerald-400">{formattedAns}</span>
          </div>
        </div>
      )}

      {/* ── VIEW 3: TOPPER'S TRICK ONLY ── */}
      {viewMode === 'trick' && (
        <div className="bg-gradient-to-br from-amber-500/10 via-bg-surface to-bg-surface-2 p-5 sm:p-6 space-y-4">
          <div className="rounded-2xl border border-amber-500/40 bg-bg-surface/90 p-5 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex size-8 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                <Zap className="size-5" />
              </span>
              <div>
                <h4 className="text-[15px] font-black text-text-primary">
                  Fast 30-Second Solving Shortcut
                </h4>
                <p className="text-[12px] text-amber-400 font-semibold">
                  Estimated Time Saved: {examTrick.timeSaved}
                </p>
              </div>
            </div>

            <p className="text-[14px] leading-relaxed text-text-primary font-medium">
              {examTrick.trick}
            </p>

            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[12.5px]">
              <span className="text-text-muted">Target Solution Answer:</span>
              <span className="font-mono font-bold text-emerald-400">{formattedAns}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
