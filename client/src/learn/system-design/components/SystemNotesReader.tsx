import React, { useState, useRef, useEffect } from 'react'
import { THEORY_UNITS, ALL_THEORY_CHAPTERS } from '../data/theoryNotesData'
import {
  UNIT_WAR_STORIES,
  UNIT_PRODUCTION_CONFIGS,
  UNIT_STAFF_QUIZZES,
  type UnitWarStory,
  type UnitProductionConfig,
  type StaffQuizQuestion,
} from '../data/theoryEnrichmentData'
import { ChapterConceptAnimator } from './ConceptAnimators'
import { Markdown } from '@/learn/md'
import { playStepClickSound, playSuccessChimeSound } from '../utils/audioEffects'
import {
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowLeft,
  Cpu,
  Sparkles,
  Play,
  Pause,
  Copy,
  Check,
  Flame,
  Award,
  BookOpenCheck,
  HelpCircle,
  FileCode2,
} from 'lucide-react'

export const SystemNotesReader: React.FC = () => {
  const [selectedUnitId, setSelectedUnitId] = useState<string>('all')
  const [selectedChapterId, setSelectedChapterId] = useState<string>('ch-01')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [checkedKeypoints, setCheckedKeypoints] = useState<Record<string, boolean>>({})

  // Audio Narration State
  const [isNarrating, setIsNarrating] = useState<boolean>(false)
  const [narrationSpeed, setNarrationSpeed] = useState<number>(1.0)
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Quiz State
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({})

  // Mastery Tracking (localStorage)
  const [masteredChapters, setMasteredChapters] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('nexora_mastered_chapters') || '[]')
    } catch {
      return []
    }
  })

  const [copiedConfig, setCopiedConfig] = useState<boolean>(false)
  const [copiedNotes, setCopiedNotes] = useState<boolean>(false)

  // Filter chapters
  const filteredChapters = ALL_THEORY_CHAPTERS.filter((chap) => {
    const matchesUnit = selectedUnitId === 'all' || chap.unitId === selectedUnitId
    const matchesSearch =
      searchQuery === '' ||
      chap.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chap.summary.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesUnit && matchesSearch
  })

  const currentChapter =
    ALL_THEORY_CHAPTERS.find((c) => c.id === selectedChapterId) || ALL_THEORY_CHAPTERS[0]
  const currentChapterIndex = ALL_THEORY_CHAPTERS.findIndex((c) => c.id === currentChapter.id)

  // Fetch War Story, Config, and Quiz for the active unit
  const fallbackStory = UNIT_WAR_STORIES[currentChapter.unitId] || UNIT_WAR_STORIES['unit-1']
  const currentWarStory: UnitWarStory = currentChapter.warStory
    ? {
        company: currentChapter.warStory.company,
        incident: currentChapter.warStory.incident,
        rootCause: currentChapter.warStory.lessonsLearned,
        architecturalFix: currentChapter.warStory.lessonsLearned,
        impactSLA: fallbackStory.impactSLA,
      }
    : fallbackStory

  const currentConfig: UnitProductionConfig =
    (currentChapter.productionConfigSnippet
      ? {
          title: currentChapter.productionConfigSnippet.title,
          filename: 'production.conf',
          language: currentChapter.productionConfigSnippet.language,
          content: currentChapter.productionConfigSnippet.content,
          keyParameters: [],
        }
      : null) ||
    UNIT_PRODUCTION_CONFIGS[currentChapter.unitId] ||
    UNIT_PRODUCTION_CONFIGS['unit-1']

  const currentQuiz: StaffQuizQuestion[] =
    (currentChapter.staffQuiz
      ? currentChapter.staffQuiz.map((q) => ({
          question: q.question,
          options: q.options,
          answerIndex: q.answerIndex,
          staffRationale: q.explanation,
        }))
      : null) ||
    UNIT_STAFF_QUIZZES[currentChapter.unitId] ||
    UNIT_STAFF_QUIZZES['unit-1']

  // Clean up audio on chapter change
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setIsNarrating(false)
    setQuizAnswers({})
  }, [selectedChapterId])

  const handleStartNarration = () => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()

    const rawText = `${currentChapter.title}. ${currentChapter.summary}. Foundational Axioms: ${currentChapter.coreConcepts.join(
      '. '
    )}. Deep Dive Overview: ${currentChapter.deepContentMarkdown.slice(0, 1000).replace(/[#*`_]/g, '')}`

    const utterance = new SpeechSynthesisUtterance(rawText)
    utterance.rate = narrationSpeed
    utterance.onend = () => setIsNarrating(false)
    utterance.onerror = () => setIsNarrating(false)
    synthRef.current = utterance
    window.speechSynthesis.speak(utterance)
    setIsNarrating(true)
  }

  const handleStopNarration = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setIsNarrating(false)
  }

  const handleToggleMastery = () => {
    playSuccessChimeSound()
    setMasteredChapters((prev) => {
      const isAlready = prev.includes(currentChapter.id)
      const next = isAlready
        ? prev.filter((id) => id !== currentChapter.id)
        : [...prev, currentChapter.id]
      localStorage.setItem('nexora_mastered_chapters', JSON.stringify(next))
      return next
    })
  }

  const handleCopyNotes = () => {
    const markdownExport = `# ${currentChapter.title}
Unit: ${currentChapter.unitTitle} (Chapter ${currentChapter.chapterNumber} of 56)

## Summary
${currentChapter.summary}

## Core Axioms
${currentChapter.coreConcepts.map((c) => `- ${c}`).join('\n')}

## Deep Engineering Content
${currentChapter.deepContentMarkdown}

## Production Case Study: ${currentWarStory.company}
Incident: ${currentWarStory.incident}
Root Cause: ${currentWarStory.rootCause}
Architectural Fix: ${currentWarStory.architecturalFix}
`
    navigator.clipboard.writeText(markdownExport)
    setCopiedNotes(true)
    setTimeout(() => setCopiedNotes(false), 2000)
  }

  const handleCopyConfig = () => {
    navigator.clipboard.writeText(currentConfig.content)
    setCopiedConfig(true)
    setTimeout(() => setCopiedConfig(false), 2000)
  }

  const handlePrevChapter = () => {
    if (currentChapterIndex > 0) {
      playStepClickSound()
      setSelectedChapterId(ALL_THEORY_CHAPTERS[currentChapterIndex - 1].id)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleNextChapter = () => {
    if (currentChapterIndex < ALL_THEORY_CHAPTERS.length - 1) {
      playStepClickSound()
      setSelectedChapterId(ALL_THEORY_CHAPTERS[currentChapterIndex + 1].id)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const toggleKeypoint = (kp: string) => {
    playStepClickSound()
    setCheckedKeypoints((prev) => ({ ...prev, [kp]: !prev[kp] }))
  }

  const isMastered = masteredChapters.includes(currentChapter.id)
  const masteryPercentage = Math.round((masteredChapters.length / ALL_THEORY_CHAPTERS.length) * 100)

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      {/* Sidebar Table of Contents */}
      <div className="space-y-4">
        {/* Course Mastery Tracker Card */}
        <div className="rounded-2xl bg-bg-surface-2 p-4 ring-1 ring-border shadow-lg space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="flex items-center gap-1.5 font-bold text-accent-brand uppercase">
              <Award className="size-3.5" /> Course Mastery Meter
            </span>
            <span className="font-bold text-text-primary">
              {masteredChapters.length} / {ALL_THEORY_CHAPTERS.length} ({masteryPercentage}%)
            </span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-bg-surface-1 ring-1 ring-border/50">
            <div
              className="h-full bg-gradient-to-r from-accent-brand via-sky-400 to-emerald-400 transition-all duration-500 rounded-full"
              style={{ width: `${masteryPercentage}%` }}
            />
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search 56 chapters, RFCs, formulas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl bg-bg-surface-2 pl-9 pr-3 py-2 text-[12.5px] text-text-primary ring-1 ring-border placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-brand font-mono"
          />
        </div>

        {/* Unit Selector Filter */}
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setSelectedUnitId('all')}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
              selectedUnitId === 'all'
                ? 'bg-accent-brand text-bg-base font-bold'
                : 'bg-bg-surface-2 text-text-muted hover:text-text-primary'
            }`}
          >
            All Units (56)
          </button>
          {THEORY_UNITS.map((u, i) => (
            <button
              key={u.id}
              onClick={() => setSelectedUnitId(u.id)}
              className={`rounded-lg px-2 py-1 text-[11px] font-medium transition ${
                selectedUnitId === u.id
                  ? 'bg-accent-brand text-bg-base font-bold'
                  : 'bg-bg-surface-2 text-text-muted hover:text-text-primary'
              }`}
            >
              U{i + 1} ({u.chapterCount})
            </button>
          ))}
        </div>

        {/* Chapter List */}
        <div className="max-h-[720px] overflow-y-auto space-y-1.5 pr-1">
          {filteredChapters.map((chap) => {
            const isSelected = chap.id === currentChapter.id
            const isChapMastered = masteredChapters.includes(chap.id)

            return (
              <button
                key={chap.id}
                onClick={() => {
                  playStepClickSound()
                  setSelectedChapterId(chap.id)
                }}
                className={`w-full text-left rounded-xl p-3 transition-all ${
                  isSelected
                    ? 'bg-accent-brand/10 ring-1 ring-accent-brand/40 text-text-primary shadow-md'
                    : 'bg-bg-surface-2/60 hover:bg-bg-surface-3 text-text-secondary hover:text-text-primary'
                }`}
              >
                <div className="flex items-center justify-between text-[10.5px] font-mono text-text-muted mb-1">
                  <span className="flex items-center gap-1">
                    {isChapMastered && <Check className="size-3 text-emerald-400 font-bold" />}
                    Chapter {chap.chapterNumber}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" /> {chap.readingTimeMin}m
                  </span>
                </div>
                <p className="text-[12.5px] font-semibold leading-snug line-clamp-2">{chap.title}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Chapter Reader Content */}
      <div className="space-y-7 rounded-2xl bg-bg-surface-2 p-6 sm:p-8 ring-1 ring-border shadow-2xl">
        {/* Chapter Header */}
        <div className="border-b border-border pb-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[11px] font-bold text-accent-brand uppercase tracking-wider">
              {currentChapter.unitTitle} · Chapter {currentChapter.chapterNumber} of 56
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleMastery}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-mono font-bold transition ring-1 ${
                  isMastered
                    ? 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/40'
                    : 'bg-bg-surface-1 text-text-muted hover:text-text-primary ring-border'
                }`}
              >
                <BookOpenCheck className="size-3.5" />
                {isMastered ? 'Mastered ✓' : 'Mark as Mastered'}
              </button>

              <button
                onClick={handleCopyNotes}
                className="flex items-center gap-1.5 rounded-lg bg-bg-surface-1 px-3 py-1.5 text-[11.5px] font-mono font-bold text-text-muted hover:text-text-primary ring-1 ring-border transition"
              >
                {copiedNotes ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                {copiedNotes ? 'Copied' : 'Export Notes'}
              </button>
            </div>
          </div>

          <h1 className="!text-[24px] sm:!text-[30px] font-extrabold tracking-tight text-text-primary font-mono">
            {currentChapter.title}
          </h1>

          <p className="text-[14px] leading-relaxed text-text-secondary">{currentChapter.summary}</p>

          {/* AUDIO WALKTHROUGH NARRATOR BAR */}
          <div className="rounded-xl bg-gradient-to-r from-bg-surface-1 via-bg-surface-3 to-bg-surface-1 p-3.5 ring-1 ring-border flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={isNarrating ? handleStopNarration : handleStartNarration}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-[12px] font-mono font-bold transition shadow-sm ${
                  isNarrating
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-accent-brand text-bg-base hover:opacity-90'
                }`}
              >
                {isNarrating ? <Pause className="size-3.5 fill-current" /> : <Play className="size-3.5 fill-current" />}
                {isNarrating ? 'Pause Audio Lecture' : '🎧 Listen to Chapter'}
              </button>

              {isNarrating && (
                <div className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-[11px] font-mono text-emerald-400">Synthesizing audio...</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-mono">
              <span className="text-text-muted mr-1">Speed:</span>
              {[1.0, 1.25, 1.5, 2.0].map((rate) => (
                <button
                  key={rate}
                  onClick={() => {
                    setNarrationSpeed(rate)
                    if (isNarrating) handleStartNarration()
                  }}
                  className={`px-2 py-0.5 rounded font-bold ${
                    narrationSpeed === rate
                      ? 'bg-sky-400 text-black'
                      : 'bg-bg-surface-2 text-text-muted hover:text-text-primary ring-1 ring-border'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Core Concepts Highlights Card */}
        <div className="rounded-xl bg-bg-surface-3/60 p-4 sm:p-5 ring-1 ring-border">
          <h3 className="mb-3 flex items-center gap-2 text-[13px] font-bold tracking-wider text-text-primary uppercase font-mono">
            <Sparkles className="size-4 text-accent-brand" /> Core Foundational Axioms & Invariants
          </h3>
          <ul className="space-y-2 text-[13px] text-text-secondary">
            {currentChapter.coreConcepts.map((concept, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="mt-1 flex size-1.5 shrink-0 rounded-full bg-accent-brand" />
                <span className="leading-relaxed">{concept}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Interactive Concept Simulator Widget */}
        <ChapterConceptAnimator
          unitId={currentChapter.unitId}
          chapterNumber={currentChapter.chapterNumber}
        />

        {/* In-Depth Markdown Content */}
        <div className="rounded-2xl bg-bg-surface-1/80 p-6 sm:p-8 ring-1 ring-border/80 shadow-lg">
          <div className="flex items-center gap-2 mb-4 text-[11px] font-mono font-bold uppercase tracking-wider text-accent-brand">
            <Sparkles className="size-3.5" /> Comprehensive Engineering Deep-Dive
          </div>
          <Markdown md={currentChapter.deepContentMarkdown} className="leading-relaxed text-text-secondary text-[14px]" />
        </div>

        {/* Equations & Math Formulas Box */}
        {currentChapter.equationsAndMath && currentChapter.equationsAndMath.length > 0 && (
          <div className="rounded-xl bg-[#0a0e14] p-5 ring-1 ring-border space-y-3">
            <h3 className="flex items-center gap-2 text-[12px] font-mono font-bold tracking-wider text-sky-400 uppercase">
              <Cpu className="size-4" /> Mathematical Derivations & Formal Proofs
            </h3>
            {currentChapter.equationsAndMath.map((eq, i) => (
              <div key={i} className="rounded-lg bg-bg-surface-1 p-3.5 ring-1 ring-border space-y-1.5 font-mono">
                <span className="text-[11px] font-semibold text-text-primary">{eq.name}:</span>
                <div className="rounded bg-black/40 p-2 text-center text-[13px] font-bold text-accent-brand overflow-x-auto">
                  {eq.formula}
                </div>
                <p className="text-[11.5px] text-text-muted">{eq.explanation}</p>
              </div>
            ))}
          </div>
        )}

        {/* Trade-Off Matrix Table */}
        {currentChapter.tradeoffMatrix && currentChapter.tradeoffMatrix.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-[13px] font-bold tracking-wider text-text-primary uppercase font-mono">
              Architectural Trade-Off Analysis
            </h3>
            <div className="overflow-x-auto rounded-xl ring-1 ring-border">
              <table className="w-full text-left text-[12.5px] border-collapse">
                <thead className="bg-bg-surface-3 text-[11px] font-mono uppercase text-text-muted">
                  <tr>
                    <th className="p-3">Option</th>
                    <th className="p-3">Pros</th>
                    <th className="p-3">Cons</th>
                    <th className="p-3">Best Used For</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-bg-surface-1">
                  {currentChapter.tradeoffMatrix.map((item, i) => (
                    <tr key={i} className="hover:bg-bg-surface-2/40">
                      <td className="p-3 font-semibold text-text-primary font-mono">{item.option}</td>
                      <td className="p-3 text-emerald-400">
                        <ul className="list-disc pl-4 space-y-0.5">
                          {item.pros.map((p, idx) => (
                            <li key={idx}>{p}</li>
                          ))}
                        </ul>
                      </td>
                      <td className="p-3 text-rose-400">
                        <ul className="list-disc pl-4 space-y-0.5">
                          {item.cons.map((c, idx) => (
                            <li key={idx}>{c}</li>
                          ))}
                        </ul>
                      </td>
                      <td className="p-3 text-text-secondary">{item.bestFor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECTION: REAL-WORLD FAANG OUTAGE CASE STUDY / WAR STORY */}
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-500/20 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/40">
                <Flame className="size-4" />
              </span>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400 block">
                  FAANG Production Post-Mortem & War Story
                </span>
                <h4 className="text-[15px] font-bold text-text-primary font-mono">
                  {currentWarStory.company}: {currentWarStory.incident}
                </h4>
              </div>
            </div>
            <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[10.5px] font-mono text-rose-300 font-bold">
              {currentWarStory.impactSLA}
            </span>
          </div>

          <div className="space-y-3 text-[13px] leading-relaxed">
            <div>
              <span className="font-mono text-[11px] font-bold text-text-primary uppercase tracking-wider block mb-1">
                Root Cause Analysis (RCA):
              </span>
              <p className="text-text-secondary font-sans">{currentWarStory.rootCause}</p>
            </div>

            <div className="rounded-xl bg-black/40 p-4 ring-1 ring-rose-500/20 border-l-4 border-rose-500">
              <span className="font-mono text-[11px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                Staff+ Architectural Solution & Golden Prevention Invariant:
              </span>
              <p className="text-text-primary font-sans">{currentWarStory.architecturalFix}</p>
            </div>
          </div>
        </div>

        {/* SECTION: BATTLE-HARDENED PRODUCTION CONFIGURATION */}
        <div className="rounded-2xl bg-[#0a0e14] p-6 ring-1 ring-border space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <FileCode2 className="size-4 text-sky-400" />
              <div>
                <span className="text-[10.5px] font-mono text-text-muted block">
                  Battle-Hardened Production Configuration
                </span>
                <span className="text-[13.5px] font-bold text-text-primary font-mono">
                  {currentConfig.title} ({currentConfig.filename})
                </span>
              </div>
            </div>

            <button
              onClick={handleCopyConfig}
              className="flex items-center gap-1.5 rounded-lg bg-bg-surface-1 px-3 py-1.5 text-[11px] font-mono font-bold text-sky-400 hover:text-sky-300 ring-1 ring-sky-500/30 transition shadow-sm"
            >
              {copiedConfig ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
              {copiedConfig ? 'Copied' : 'Copy Config'}
            </button>
          </div>

          <div className="rounded-xl bg-black/80 p-4 ring-1 ring-border overflow-x-auto text-[12px] font-mono text-emerald-300 leading-relaxed max-h-[300px]">
            <pre className="whitespace-pre">{currentConfig.content}</pre>
          </div>

          {currentConfig.keyParameters.length > 0 && (
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-mono font-bold text-sky-400 uppercase tracking-wider block">
                Critical Parameter Engineering Rationale:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {currentConfig.keyParameters.map((kp, i) => (
                  <div key={i} className="rounded-lg bg-bg-surface-1 p-2.5 ring-1 ring-border text-[11px] font-mono space-y-1">
                    <span className="font-bold text-accent-brand block">{kp.param}</span>
                    <p className="text-text-muted font-sans text-[11.5px] leading-relaxed">{kp.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SECTION: STAFF+ LEVEL INTERVIEW DEFENSE QUIZ */}
        <div className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-6 space-y-5 shadow-xl">
          <div className="flex items-center gap-2 border-b border-sky-500/20 pb-3">
            <HelpCircle className="size-5 text-sky-400" />
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-400 block">
                Staff+ System Design Defense Quiz
              </span>
              <h4 className="text-[15px] font-bold text-text-primary font-mono">
                Architectural Trade-Off & Invariant Testing ({currentQuiz.length} Questions)
              </h4>
            </div>
          </div>

          <div className="space-y-6">
            {currentQuiz.map((quiz, qIdx) => {
              const selectedOpt = quizAnswers[qIdx]
              const hasAnswered = selectedOpt !== undefined
              const isCorrect = selectedOpt === quiz.answerIndex

              return (
                <div key={qIdx} className="rounded-xl bg-bg-surface-1 p-4 ring-1 ring-border space-y-3">
                  <div className="font-mono text-[13px] font-bold text-text-primary">
                    <span className="text-sky-400 mr-2">Q{qIdx + 1}:</span>
                    {quiz.question}
                  </div>

                  <div className="space-y-2">
                    {quiz.options.map((opt, optIdx) => {
                      const isOptionSelected = selectedOpt === optIdx
                      const isOptionCorrect = optIdx === quiz.answerIndex

                      let btnStyle = 'bg-bg-surface-2 text-text-secondary hover:bg-bg-surface-3 ring-border'
                      if (hasAnswered) {
                        if (isOptionCorrect) {
                          btnStyle = 'bg-emerald-500/20 text-emerald-300 ring-2 ring-emerald-500'
                        } else if (isOptionSelected) {
                          btnStyle = 'bg-rose-500/20 text-rose-300 ring-2 ring-rose-500'
                        }
                      }

                      return (
                        <button
                          key={optIdx}
                          onClick={() => {
                            playStepClickSound()
                            setQuizAnswers((prev) => ({ ...prev, [qIdx]: optIdx }))
                          }}
                          className={`w-full text-left rounded-lg p-3 text-[12px] font-mono transition ring-1 flex items-start gap-2.5 ${btnStyle}`}
                        >
                          <span className="font-bold shrink-0">{String.fromCharCode(65 + optIdx)}.</span>
                          <span className="leading-relaxed">{opt.replace(/^[A-D]\.\s*/, '')}</span>
                        </button>
                      )
                    })}
                  </div>

                  {hasAnswered && (
                    <div
                      className={`rounded-lg p-3.5 text-[12px] space-y-1 font-sans leading-relaxed ring-1 ${
                        isCorrect
                          ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-300 ring-rose-500/30'
                      }`}
                    >
                      <div className="font-mono text-[11px] font-bold uppercase tracking-wider">
                        {isCorrect ? '✓ Correct Architectural Rationale' : '✗ Incorrect Assumption'}
                      </div>
                      <p className="text-text-secondary">{quiz.staffRationale}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Interview Keypoints Checklist */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-[13px] font-bold text-emerald-400 uppercase tracking-wider font-mono">
              <CheckCircle2 className="size-4" /> Interview Ready Checklist
            </h3>
            <span className="text-[11px] font-mono text-text-muted">Click to mark mastery</span>
          </div>

          <div className="space-y-2">
            {currentChapter.interviewKeypoints.map((kp, i) => {
              const isChecked = !!checkedKeypoints[kp]
              return (
                <div
                  key={i}
                  onClick={() => toggleKeypoint(kp)}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg p-2.5 transition ${
                    isChecked
                      ? 'bg-emerald-500/10 line-through text-text-muted'
                      : 'hover:bg-bg-surface-3 text-text-primary'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="mt-0.5 size-4 rounded accent-emerald-500"
                  />
                  <span className="text-[12.5px] leading-relaxed">{kp}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom Pagination */}
        <div className="flex items-center justify-between border-t border-border pt-6">
          <button
            onClick={handlePrevChapter}
            disabled={currentChapterIndex === 0}
            className="flex items-center gap-2 rounded-xl bg-bg-surface-3 px-4 py-2 text-[12.5px] font-medium text-text-secondary hover:text-text-primary disabled:opacity-40"
          >
            <ArrowLeft className="size-4" /> Previous Chapter
          </button>

          <span className="font-mono text-[12px] text-text-muted">
            {currentChapterIndex + 1} / {ALL_THEORY_CHAPTERS.length}
          </span>

          <button
            onClick={handleNextChapter}
            disabled={currentChapterIndex === ALL_THEORY_CHAPTERS.length - 1}
            className="flex items-center gap-2 rounded-xl bg-accent-brand px-4 py-2 text-[12.5px] font-semibold text-bg-base hover:opacity-90 disabled:opacity-40"
          >
            Next Chapter <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
