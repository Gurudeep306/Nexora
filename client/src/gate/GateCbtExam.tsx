import { useState, useEffect, useRef } from 'react'
import {
  Clock,
  Calculator as CalcIcon,
  FileText,
  HelpCircle,
  AlertCircle,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Send,
  X,
  User,
  Maximize,
  Minimize,
  ZoomIn,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Markdown } from '@/learn/md'
import { api } from '@/lib/api'
import { GateCalculator } from './GateCalculator'
import { GateAiReport, type ExamEvaluation, type AiDiagnostic } from './GateAiReport'
import type { GateQuestion, GatePaper } from './types'

export type QuestionStatus =
  | 'not-visited'
  | 'not-answered'
  | 'answered'
  | 'marked-for-review'
  | 'answered-marked';

export interface CbtPaperData {
  paper: GatePaper
  sections: Array<{ id: string; title: string; count: number; marks: number }>
  totalQuestions: number
  totalMarks: number
  durationMinutes: number
  questions: GateQuestion[]
}

export function GateCbtExam({
  paperId,
  onExit,
}: {
  paperId: string
  onExit: () => void
}) {
  const [data, setData] = useState<CbtPaperData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Exam state
  const [currentIndex, setCurrentIndex] = useState(0)
  const [activeSectionId, setActiveSectionId] = useState<string>('ga')
  const [responses, setResponses] = useState<Record<string, any>>({})
  const [statusMap, setStatusMap] = useState<Record<string, QuestionStatus>>({})
  const [timeRemaining, setTimeRemaining] = useState(180 * 60) // 180 mins
  const [timeSpent, setTimeSpent] = useState<Record<string, number>>({})

  // Modals & Panels
  const [showCalc, setShowCalc] = useState(false)
  const [showQuestionPaper, setShowQuestionPaper] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [zoomFigure, setZoomFigure] = useState<string | null>(null)

  // Sync fullscreen state with browser
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (e) {
      console.warn('Fullscreen request failed:', e)
    }
  }

  // Post-submission Evaluation
  const [evalResult, setEvalResult] = useState<ExamEvaluation | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<AiDiagnostic | null>(null)

  // Track time spent per question
  const currentQIdRef = useRef<string | null>(null)

  // Fetch paper data
  useEffect(() => {
    let unmounted = false
    setLoading(true)
    api
      .get<CbtPaperData>(`/api/gate/paper/${paperId}`)
      .then((res) => {
        if (unmounted) return
        setData(res)
        // Initialize status: Q0 is 'not-answered', all others are 'not-visited'
        const initialStatus: Record<string, QuestionStatus> = {}
        res.questions.forEach((q, idx) => {
          initialStatus[q.id] = idx === 0 ? 'not-answered' : 'not-visited'
        })
        setStatusMap(initialStatus)
        setLoading(false)
      })
      .catch((err) => {
        if (unmounted) return
        setError(err.message || 'Failed to load paper.')
        setLoading(false)
      })
    return () => {
      unmounted = true
    }
  }, [paperId])

  // Timer countdown
  useEffect(() => {
    if (loading || evalResult) return
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          handleSubmitExam()
          return 0
        }
        return prev - 1
      })

      // Track time spent on current question
      if (currentQIdRef.current) {
        const qId = currentQIdRef.current
        setTimeSpent((ts) => ({ ...ts, [qId]: (ts[qId] || 0) + 1 }))
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [loading, evalResult])

  const questions = data?.questions || []
  const currentQuestion = questions[currentIndex]
  if (currentQuestion) {
    currentQIdRef.current = currentQuestion.id
  }

  // Format seconds into HH:MM:SS
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // Handle jumping to question index
  const jumpToQuestion = (index: number) => {
    if (index < 0 || index >= questions.length) return
    const targetQ = questions[index]
    setCurrentIndex(index)
    if (targetQ.section === 'ga') setActiveSectionId('ga')
    else setActiveSectionId('subject')

    // Mark as not-answered if it was not-visited
    setStatusMap((prev) => {
      if (prev[targetQ.id] === 'not-visited') {
        return { ...prev, [targetQ.id]: 'not-answered' }
      }
      return prev
    })
  }

  // Save response & advance
  const handleSaveAndNext = () => {
    if (!currentQuestion) return
    const curVal = responses[currentQuestion.id]
    const hasAnswer = curVal !== undefined && curVal !== null && curVal !== '' && !(Array.isArray(curVal) && curVal.length === 0)

    setStatusMap((prev) => ({
      ...prev,
      [currentQuestion.id]: hasAnswer ? 'answered' : 'not-answered',
    }))

    if (currentIndex < questions.length - 1) {
      jumpToQuestion(currentIndex + 1)
    }
  }

  // Mark for review & advance
  const handleMarkForReviewAndNext = () => {
    if (!currentQuestion) return
    const curVal = responses[currentQuestion.id]
    const hasAnswer = curVal !== undefined && curVal !== null && curVal !== '' && !(Array.isArray(curVal) && curVal.length === 0)

    setStatusMap((prev) => ({
      ...prev,
      [currentQuestion.id]: hasAnswer ? 'answered-marked' : 'marked-for-review',
    }))

    if (currentIndex < questions.length - 1) {
      jumpToQuestion(currentIndex + 1)
    }
  }

  // Clear current question response
  const handleClearResponse = () => {
    if (!currentQuestion) return
    setResponses((prev) => {
      const next = { ...prev }
      delete next[currentQuestion.id]
      return next
    })
    setStatusMap((prev) => ({
      ...prev,
      [currentQuestion.id]: 'not-answered',
    }))
  }

  // Handle option selection
  const handleSelectOption = (optLabel: string) => {
    if (!currentQuestion) return
    if (currentQuestion.type === 'MSQ') {
      const currentList: string[] = Array.isArray(responses[currentQuestion.id]) ? responses[currentQuestion.id] : []
      const nextList = currentList.includes(optLabel)
        ? currentList.filter((x) => x !== optLabel)
        : [...currentList, optLabel]
      setResponses((prev) => ({ ...prev, [currentQuestion.id]: nextList }))
    } else {
      setResponses((prev) => ({ ...prev, [currentQuestion.id]: optLabel }))
    }
  }

  // Submit and evaluate exam
  const handleSubmitExam = async () => {
    setShowSubmitModal(false)
    setIsSubmitting(true)
    try {
      const evalRes = await api.post<ExamEvaluation>('/api/gate/evaluate', {
        paperId,
        responses,
        timeSpent,
      })
      setEvalResult(evalRes)

      // Get AI Attempt Diagnostic
      try {
        const diagRes = await api.post<{ ok: true; analysis: AiDiagnostic }>('/api/gate/ai-analysis', {
          evalResult: evalRes,
        })
        setAiAnalysis(diagRes.analysis)
      } catch {
        // Fallback without AI diagnostic if endpoint fails
      }
    } catch (err: any) {
      alert(`Submission error: ${err.message || 'Could not evaluate paper.'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Count palette states
  const counts = {
    answered: 0,
    notAnswered: 0,
    notVisited: 0,
    markedForReview: 0,
    answeredMarked: 0,
  }

  questions.forEach((q) => {
    const s = statusMap[q.id] || 'not-visited'
    if (s === 'answered') counts.answered++
    else if (s === 'not-answered') counts.notAnswered++
    else if (s === 'not-visited') counts.notVisited++
    else if (s === 'marked-for-review') counts.markedForReview++
    else if (s === 'answered-marked') counts.answeredMarked++
  })

  // Retake exam reset
  const handleRetake = () => {
    setEvalResult(null)
    setAiAnalysis(null)
    setResponses({})
    setTimeRemaining(180 * 60)
    setTimeSpent({})
    setCurrentIndex(0)
    const initialStatus: Record<string, QuestionStatus> = {}
    questions.forEach((q, idx) => {
      initialStatus[q.id] = idx === 0 ? 'not-answered' : 'not-visited'
    })
    setStatusMap(initialStatus)
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-3 font-sans">
        <div className="size-9 animate-spin rounded-full border-3 border-accent-brand border-t-transparent" />
        <p className="text-[14px] font-semibold text-text-muted">Loading Official GATE Examination Environment...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center font-sans">
        <AlertCircle className="mx-auto size-10 text-state-error" />
        <h3 className="mt-3 text-lg font-bold text-text-primary">Failed to Initialize Exam</h3>
        <p className="mt-1 text-sm text-text-muted">{error}</p>
        <button type="button" onClick={onExit} className="btn-primary mt-4">
          Return to Question Bank
        </button>
      </div>
    )
  }

  // Post-Exam Report Mode
  if (evalResult) {
    const questionsMap = new Map<string, GateQuestion>()
    questions.forEach((q) => questionsMap.set(q.id, q))

    return (
      <GateAiReport
        evalResult={evalResult}
        aiAnalysis={aiAnalysis}
        questionsMap={questionsMap}
        onRetake={handleRetake}
        onBackToBank={onExit}
      />
    )
  }

  const currentVal = currentQuestion ? responses[currentQuestion.id] : undefined
  const isTimerUrgent = timeRemaining < 10 * 60 // under 10 mins

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#0f131a] text-gray-200 select-none font-sans overflow-hidden">
      {/* ── Top TCS iON Header Bar ── */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-[#161b24] px-3 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onExit}
            className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[12px] font-semibold text-gray-200 hover:bg-white/15 hover:text-white transition-all cursor-pointer shadow-sm"
            title="Exit Exam and return to Question Paper List"
          >
            <ChevronLeft className="size-4 text-accent-brand" />
            <span className="hidden xs:inline">Paper List</span>
          </button>

          <span className="hidden sm:inline rounded bg-accent-brand/20 px-2 py-0.5 text-[11px] font-mono font-bold tracking-wider text-accent-brand uppercase">
            TCS iON CBT SIMULATOR
          </span>
          <h2 className="hidden text-[14px] font-bold text-white md:inline truncate max-w-xs lg:max-w-md">
            {data.paper.exam} {data.paper.year} {data.paper.set ? `Set ${data.paper.set}` : ''}
          </h2>
        </div>

        {/* Utilities: Calculator, Question Paper, Instructions, Fullscreen, Timer */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[12px] font-semibold text-gray-200 hover:bg-white/10 cursor-pointer transition-colors"
            title={isFullscreen ? 'Exit Fullscreen Mode (Esc)' : 'Enter Fullscreen Exam Mode'}
          >
            {isFullscreen ? <Minimize className="size-4 text-accent-brand" /> : <Maximize className="size-4 text-accent-brand" />}
            <span className="hidden lg:inline">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCalc(true)}
            className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[12px] font-semibold text-gray-200 hover:bg-white/10 cursor-pointer transition-colors"
            title="Open GATE Virtual Scientific Calculator"
          >
            <CalcIcon className="size-4 text-emerald-400" />
            <span className="hidden sm:inline">Calculator</span>
          </button>

          <button
            type="button"
            onClick={() => setShowQuestionPaper(true)}
            className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[12px] font-semibold text-gray-200 hover:bg-white/10 cursor-pointer transition-colors"
            title="View Complete Question Paper"
          >
            <FileText className="size-4 text-blue-400" />
            <span className="hidden sm:inline">Question Paper</span>
          </button>

          <button
            type="button"
            onClick={() => setShowInstructions(true)}
            className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[12px] font-semibold text-gray-200 hover:bg-white/10 cursor-pointer transition-colors"
            title="Exam Guidelines & Instructions"
          >
            <HelpCircle className="size-4 text-amber-400" />
            <span className="hidden sm:inline">Instructions</span>
          </button>

          {/* Countdown Clock */}
          <div
            className={cn(
              'flex items-center gap-2 rounded-xl border px-2.5 sm:px-3 py-1 font-mono text-[13px] sm:text-[14px] font-bold shadow-sm',
              isTimerUrgent
                ? 'border-red-500/50 bg-red-500/15 text-red-400 animate-pulse'
                : 'border-white/15 bg-[#0f131a] text-emerald-400',
            )}
          >
            <Clock className="size-4 shrink-0" />
            <span>{formatTime(timeRemaining)}</span>
          </div>

          <button
            type="button"
            onClick={onExit}
            className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white cursor-pointer"
            title="Exit Exam to Paper List"
          >
            <X className="size-5" />
          </button>
        </div>
      </header>

      {/* ── Subheader Candidate Info & Section Switcher ── */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-white/10 bg-[#12161f] px-3 sm:px-6">
        {/* Sections Tabs */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 hidden sm:inline">Sections:</span>
          {data.sections.map((sec) => {
            const isActive = activeSectionId === sec.id
            const secQuestions = questions.filter((q) => (sec.id === 'ga' ? q.section === 'ga' : q.section !== 'ga'))
            const secAnswered = secQuestions.filter(
              (q) => statusMap[q.id] === 'answered' || statusMap[q.id] === 'answered-marked',
            ).length

            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => {
                  setActiveSectionId(sec.id)
                  const firstSecQIdx = questions.findIndex((q) =>
                    sec.id === 'ga' ? q.section === 'ga' : q.section !== 'ga',
                  )
                  if (firstSecQIdx !== -1) jumpToQuestion(firstSecQIdx)
                }}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-1 text-[12.5px] font-bold transition-all cursor-pointer border',
                  isActive
                    ? 'border-accent-brand bg-accent-brand/20 text-accent-brand shadow-sm'
                    : 'border-transparent text-gray-400 hover:bg-white/5 hover:text-gray-200',
                )}
              >
                <span>{sec.title}</span>
                <span className="rounded bg-white/10 px-1.5 py-0.2 font-mono text-[11px] text-gray-300">
                  {secAnswered}/{sec.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Candidate Badge */}
        <div className="flex items-center gap-2 text-[12px] text-gray-300 font-medium">
          <div className="flex size-7 items-center justify-center rounded-full bg-white/10 text-gray-300">
            <User className="size-4" />
          </div>
          <span className="hidden sm:inline">Gurudeep (Candidate)</span>
        </div>
      </div>

      {/* ── Main Exam Body: Question Canvas & Right Palette ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: Question Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#0f131a] overflow-hidden">
          {currentQuestion && (
            <>
              {/* Question Banner */}
              <div className="flex items-center justify-between border-b border-white/10 bg-[#161b24] px-4 py-2 text-[12px]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-[13px]">
                    {currentQuestion.section === 'ga' ? 'General Aptitude ' : 'Core Subject '}Q{currentQuestion.number}
                  </span>
                  <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-gray-300">
                    Type: {currentQuestion.type}
                  </span>
                </div>
                <div className="flex items-center gap-3 font-mono text-gray-300">
                  <span className="text-emerald-400">+{currentQuestion.marks} Mark{currentQuestion.marks === 1 ? '' : 's'}</span>
                  <span className="text-red-400">
                    {currentQuestion.type === 'MCQ' ? `-${(currentQuestion.marks! / 3).toFixed(2)} Mark` : '0 Negative'}
                  </span>
                </div>
              </div>

              {/* Question Statement & Interactive Answer Controls */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-[14.5px] leading-relaxed">
                <Markdown md={currentQuestion.text} className="text-gray-200 leading-relaxed font-sans" />

                {/* Diagrams if present */}
                {currentQuestion.figures.map((f) => (
                  <figure key={f.f} className="my-3 max-w-lg">
                    <div
                      onClick={() => setZoomFigure(`/gate-fig/${f.f}`)}
                      className="group relative cursor-zoom-in rounded-xl border border-white/20 bg-white p-3 shadow-md inline-block max-w-full transition-transform hover:scale-[1.01]"
                      title="Click to view full enlarged diagram"
                    >
                      <img
                        src={`/gate-fig/${f.f}`}
                        alt={f.alt}
                        className="max-h-72 w-auto rounded object-contain"
                      />
                      <div className="absolute top-2 right-2 rounded-lg bg-black/75 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 flex items-center gap-1 text-[11px] font-mono">
                        <ZoomIn className="size-3.5" />
                        <span>Enlarge</span>
                      </div>
                    </div>
                    {f.alt && <figcaption className="mt-1.5 text-[12px] text-gray-400 font-sans leading-relaxed">{f.alt}</figcaption>}
                  </figure>
                ))}

                {/* Response Input Selection */}
                {currentQuestion.type === 'NAT' ? (
                  /* Numerical Answer Type Input */
                  <div className="mt-4 rounded-xl border border-white/10 bg-[#161b24] p-4 max-w-md space-y-3">
                    <label className="text-[12px] font-bold uppercase tracking-wider text-gray-400">
                      Virtual Numerical Input (NAT):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={currentVal ?? ''}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9.-]/g, '')
                          setResponses((prev) => ({ ...prev, [currentQuestion.id]: v }))
                        }}
                        placeholder="Enter numerical answer"
                        className="w-full rounded-lg border border-white/15 bg-[#0f131a] px-3 py-2 font-mono text-[16px] text-white outline-none focus:border-accent-brand"
                      />
                    </div>

                    {/* Virtual Keypad for NAT */}
                    <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-white/10 font-mono font-bold text-[13px]">
                      {['7', '8', '9', '⌫', '4', '5', '6', 'C', '1', '2', '3', '-', '0', '.'].map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            if (key === '⌫') {
                              const s = String(currentVal ?? '')
                              setResponses((prev) => ({ ...prev, [currentQuestion.id]: s.slice(0, -1) }))
                            } else if (key === 'C') {
                              setResponses((prev) => ({ ...prev, [currentQuestion.id]: '' }))
                            } else {
                              const s = String(currentVal ?? '')
                              setResponses((prev) => ({ ...prev, [currentQuestion.id]: s + key }))
                            }
                          }}
                          className={cn(
                            'rounded-lg py-2 border transition-colors',
                            key === 'C' || key === '⌫'
                              ? 'bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30'
                              : 'bg-white/5 border-white/10 text-white hover:bg-white/10',
                          )}
                        >
                          {key}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* MCQ or MSQ Options */
                  <div className="mt-4 space-y-2 max-w-2xl">
                    {currentQuestion.options.map((opt) => {
                      const isSelected =
                        currentQuestion.type === 'MSQ'
                          ? Array.isArray(currentVal) && currentVal.includes(opt.l)
                          : currentVal === opt.l

                      return (
                        <button
                          key={opt.l}
                          type="button"
                          onClick={() => handleSelectOption(opt.l)}
                          className={cn(
                            'flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all cursor-pointer',
                            isSelected
                              ? 'border-accent-brand bg-accent-brand/20 text-white shadow-sm'
                              : 'border-white/10 bg-[#161b24] text-gray-300 hover:border-white/20 hover:bg-[#1a202c]',
                          )}
                        >
                          <span
                            className={cn(
                              'flex size-6 shrink-0 items-center justify-center font-mono text-[12px] font-bold',
                              currentQuestion.type === 'MSQ' ? 'rounded-md' : 'rounded-full',
                              isSelected ? 'bg-accent-brand text-white' : 'border border-white/20 text-gray-400',
                            )}
                          >
                            {opt.l}
                          </span>
                          <span className="min-w-0 flex-1 font-sans text-[14px]">
                            <Markdown md={opt.t} className="[&_p]:!m-0" />
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Bottom Action Controls Bar */}
              <footer className="flex h-14 shrink-0 items-center justify-between border-t border-white/10 bg-[#161b24] px-4 sm:px-6">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleMarkForReviewAndNext}
                    className="flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-500/15 px-3 py-1.5 text-[12.5px] font-bold text-purple-300 hover:bg-purple-500/25"
                  >
                    <Bookmark className="size-3.5" />
                    <span className="hidden sm:inline">Mark for Review & Next</span>
                    <span className="sm:hidden">Review</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearResponse}
                    className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-[12.5px] font-bold text-gray-300 hover:bg-white/10"
                  >
                    Clear Response
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => jumpToQuestion(currentIndex - 1)}
                    disabled={currentIndex === 0}
                    className="rounded-lg border border-white/15 bg-white/5 p-1.5 text-gray-300 hover:bg-white/10 disabled:opacity-30"
                    title="Previous Question"
                  >
                    <ChevronLeft className="size-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveAndNext}
                    className="btn-primary flex items-center gap-1.5 !px-4 !py-1.5 !text-[13px] font-bold"
                  >
                    <span>Save & Next</span>
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </footer>
            </>
          )}
        </main>

        {/* Right: TCS iON Question Palette */}
        <aside className="w-72 sm:w-80 shrink-0 flex flex-col border-l border-white/10 bg-[#12161f] overflow-hidden">
          {/* Legend Counts */}
          <div className="border-b border-white/10 p-3 space-y-1.5 text-[11px] font-medium text-gray-300">
            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-sm bg-emerald-600 font-bold text-white text-[10px]">
                  {counts.answered}
                </span>
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-sm bg-red-600 font-bold text-white text-[10px]">
                  {counts.notAnswered}
                </span>
                <span>Not Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-sm bg-purple-600 font-bold text-white text-[10px]">
                  {counts.markedForReview}
                </span>
                <span>Marked Review</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-sm bg-purple-600 font-bold text-white text-[10px] relative">
                  {counts.answeredMarked}
                  <span className="absolute -bottom-0.5 -right-0.5 size-1.5 rounded-full bg-emerald-400" />
                </span>
                <span>Ans & Marked*</span>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <span className="flex size-5 items-center justify-center rounded-sm border border-white/20 bg-white/5 font-bold text-gray-400 text-[10px]">
                  {counts.notVisited}
                </span>
                <span>Not Visited</span>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 pt-1 italic">
              *Ans & Marked will be considered for evaluation in GATE.
            </p>
          </div>

          {/* Palette Questions Grid */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Question Palette:
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {questions.map((q, idx) => {
                const s = statusMap[q.id] || 'not-visited'
                const isCurrent = idx === currentIndex

                let badgeClass = 'bg-white/5 text-gray-300 border border-white/15'
                if (s === 'answered') badgeClass = 'bg-emerald-600 text-white font-bold border-emerald-500'
                else if (s === 'not-answered') badgeClass = 'bg-red-600 text-white font-bold border-red-500'
                else if (s === 'marked-for-review') badgeClass = 'bg-purple-600 text-white font-bold border-purple-500'
                else if (s === 'answered-marked') badgeClass = 'bg-purple-600 text-white font-bold border-emerald-400 ring-1 ring-emerald-400'

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => jumpToQuestion(idx)}
                    className={cn(
                      'relative flex h-8 items-center justify-center rounded-lg font-mono text-[12px] transition-all cursor-pointer',
                      badgeClass,
                      isCurrent && 'ring-2 ring-white ring-offset-1 ring-offset-[#12161f]',
                    )}
                  >
                    {idx + 1}
                    {s === 'answered-marked' && (
                      <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-emerald-400" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Submit Button */}
          <div className="border-t border-white/10 p-3 bg-[#161b24]">
            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-[13px] font-bold text-white shadow-lg shadow-emerald-900/30 hover:bg-emerald-500 transition-colors cursor-pointer"
            >
              <Send className="size-4" /> Submit Examination
            </button>
          </div>
        </aside>
      </div>

      {/* ── Virtual Calculator Modal ── */}
      <GateCalculator isOpen={showCalc} onClose={() => setShowCalc(false)} />

      {/* ── Question Paper Full View Modal ── */}
      {showQuestionPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="flex h-[85vh] w-full max-w-4xl flex-col rounded-2xl border border-white/15 bg-[#161b24] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <h3 className="text-[15px] font-bold text-white">Full Question Paper View</h3>
              <button
                type="button"
                onClick={() => setShowQuestionPaper(false)}
                className="rounded p-1 text-gray-400 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {questions.map((q, i) => (
                <div key={q.id} className="rounded-xl border border-white/10 bg-[#0f131a] p-4 space-y-2">
                  <div className="flex items-center justify-between font-mono text-[12px] text-gray-400">
                    <span className="font-bold text-white">Q{i + 1} ({q.section.toUpperCase()})</span>
                    <span>{q.type} · {q.marks} Marks</span>
                  </div>
                  <Markdown md={q.text} className="text-gray-300 text-[13.5px]" />
                  {q.options.map((opt) => (
                    <div key={opt.l} className="flex gap-2 text-[13px] text-gray-400">
                      <span className="font-bold font-mono">({opt.l})</span>
                      <span>{opt.t}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Instructions Modal ── */}
      {showInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="flex h-[80vh] w-full max-w-2xl flex-col rounded-2xl border border-white/15 bg-[#161b24] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <h3 className="text-[15px] font-bold text-white">Official Examination Guidelines</h3>
              <button
                type="button"
                onClick={() => setShowInstructions(false)}
                className="rounded p-1 text-gray-400 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-[13.5px] leading-relaxed text-gray-300">
              <h4 className="font-bold text-white">Structure of Examination</h4>
              <p>1. The examination is 180 minutes in duration and contains 65 questions carrying a maximum of 100 marks.</p>
              <p>2. Section 1 contains 10 General Aptitude questions (Q1–Q5 carry 1 mark each, Q6–Q10 carry 2 marks each).</p>
              <p>3. Section 2 contains 55 technical questions (25 carry 1 mark each, 30 carry 2 marks each).</p>

              <h4 className="font-bold text-white pt-2 border-t border-white/10">Marking Scheme & Negative Penalties</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>MCQ (Multiple Choice Questions):</strong> For 1-mark questions, 1/3 mark will be deducted for a wrong answer. For 2-mark questions, 2/3 mark will be deducted.</li>
                <li><strong>MSQ (Multiple Select Questions):</strong> There is NO negative marking and NO partial credit. Marks are awarded only when all correct choices and no wrong choices are selected.</li>
                <li><strong>NAT (Numerical Answer Type):</strong> There is NO negative marking for numerical questions.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ── Submit Confirmation Modal ── */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#161b24] p-5 shadow-2xl space-y-4">
            <h3 className="text-[16px] font-bold text-white">Final Exam Submission Summary</h3>

            {/* Summary Tally */}
            <div className="rounded-xl border border-white/10 bg-[#0f131a] p-3 text-[13px] space-y-2">
              <div className="flex justify-between items-center text-emerald-400">
                <span>Answered (for evaluation):</span>
                <span className="font-bold font-mono text-[14px]">{counts.answered + counts.answeredMarked}</span>
              </div>
              <div className="flex justify-between items-center text-red-400">
                <span>Not Answered:</span>
                <span className="font-bold font-mono">{counts.notAnswered}</span>
              </div>
              <div className="flex justify-between items-center text-purple-400">
                <span>Marked for Review:</span>
                <span className="font-bold font-mono">{counts.markedForReview}</span>
              </div>
              <div className="flex justify-between items-center text-gray-400">
                <span>Not Visited:</span>
                <span className="font-bold font-mono">{counts.notVisited}</span>
              </div>
            </div>

            <p className="text-[12.5px] text-gray-300">
              Are you sure you want to end your examination? You will receive an instant official score breakdown along with complete AI attempt analysis.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-[12.5px] font-bold text-gray-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitExam}
                disabled={isSubmitting}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-[12.5px] font-bold text-white hover:bg-emerald-500 shadow-md transition-all cursor-pointer"
              >
                {isSubmitting ? 'Evaluating...' : 'Yes, Submit Exam'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── High-Resolution Diagram Zoom Lightbox Modal ── */}
      {zoomFigure && (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in"
          onClick={() => setZoomFigure(null)}
        >
          <div
            className="relative max-w-4xl max-h-[92vh] overflow-auto rounded-2xl bg-white p-4 sm:p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-200">
              <span className="text-[13px] font-bold text-gray-800">
                GATE Diagram Viewer · Crisp Schematic View
              </span>
              <button
                type="button"
                onClick={() => setZoomFigure(null)}
                className="rounded-lg bg-gray-100 p-1.5 text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors cursor-pointer"
                title="Close diagram"
              >
                <X className="size-5" />
              </button>
            </div>
            <img
              src={zoomFigure}
              alt="Enlarged GATE Schematic"
              className="max-h-[75vh] w-auto mx-auto object-contain rounded"
            />
          </div>
        </div>
      )}
    </div>
  )
}
