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
  Clock,
  ArrowRight,
  ArrowLeft,
  Play,
  Pause,
  Copy,
  Check,
  Award,
  BookOpenCheck,
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

  const sanitizeForVoice = (text: string) => {
    return text
      .replace(/```[\s\S]*?```/g, ' [Production code configuration omitted for audio narration] ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\$([^\$]+)\$/g, '$1')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/#{1,6}\s+/g, '')
      .replace(/[*_~>-]/g, ' ')
      .replace(/\|[\s\S]*?\|/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  const handleStartNarration = () => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()

    const cleanDeepContent = sanitizeForVoice(currentChapter.deepContentMarkdown).slice(0, 3000)
    const rawText = `Chapter ${currentChapter.chapterNumber}: ${currentChapter.title}. Unit: ${currentChapter.unitTitle}. Executive Summary: ${currentChapter.summary}. Core Invariants and Axioms: ${currentChapter.coreConcepts.join('. ')}. Architectural Deep Dive: ${cleanDeepContent}. Case Study: ${currentWarStory.company}. ${currentWarStory.incident}. Root cause: ${currentWarStory.rootCause}. Architectural fix: ${currentWarStory.architecturalFix}.`

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
            <span className="flex items-center gap-1.5 font-semibold text-text-primary">
              <Award className="size-3.5" /> Course Mastery Meter
            </span>
            <span className="font-bold text-text-primary">
              {masteredChapters.length} / {ALL_THEORY_CHAPTERS.length} ({masteryPercentage}%)
            </span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-bg-surface-1 ring-1 ring-border/50">
            <div
              className="h-full bg-accent-brand transition-all duration-500 rounded-full"
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

      {/* Main chapter: the site-wide reading design (src/styles/reading.css) */}
      <article className="nx-read nx-lesson mx-auto w-full max-w-[780px] min-w-0 space-y-10 py-2">
        <header className="space-y-3 border-b border-border/70 pb-6">
          <p className="text-[13px] text-text-muted">
            {currentChapter.unitTitle} · Chapter {currentChapter.chapterNumber}
          </p>
          <h1 className="!m-0 !text-[28px] leading-tight font-semibold tracking-tight text-text-primary sm:!text-[34px]">{currentChapter.title}</h1>
          <p className="!m-0 text-[17px] leading-relaxed text-text-secondary">{currentChapter.summary}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-[13px]">
            <button type="button" onClick={handleToggleMastery} aria-pressed={isMastered} className={`inline-flex cursor-pointer items-center gap-1.5 ${isMastered ? 'text-state-success' : 'text-text-secondary hover:text-text-primary'}`}>
              <BookOpenCheck className="size-4" /> {isMastered ? 'Mastered' : 'Mark as mastered'}
            </button>
            <button type="button" onClick={handleCopyNotes} className="inline-flex cursor-pointer items-center gap-1.5 text-text-secondary hover:text-text-primary">
              {copiedNotes ? <Check className="size-4 text-state-success" /> : <Copy className="size-4" />} {copiedNotes ? 'Copied' : 'Copy notes'}
            </button>
            <span className="inline-flex items-center gap-1.5 text-text-secondary">
              <button type="button" onClick={isNarrating ? handleStopNarration : handleStartNarration} className="inline-flex cursor-pointer items-center gap-1.5 hover:text-text-primary" aria-pressed={isNarrating}>
                {isNarrating ? <Pause className="size-4" /> : <Play className="size-4" />} {isNarrating ? 'Pause' : 'Listen'}
              </button>
              <span className="text-text-muted" aria-hidden="true">·</span>
              {[1.0, 1.25, 1.5, 2.0].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  aria-pressed={narrationSpeed === rate}
                  onClick={() => {
                    setNarrationSpeed(rate)
                    if (isNarrating) handleStartNarration()
                  }}
                  className={`cursor-pointer tabular-nums ${narrationSpeed === rate ? 'font-semibold text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
                >
                  {rate}×
                </button>
              ))}
            </span>
          </div>
        </header>

        {currentChapter.coreConcepts.length > 0 && (
          <section>
            <h2 className="!mt-0">Key ideas</h2>
            <ul>
              {currentChapter.coreConcepts.map((concept, i) => (
                <li key={i}>{concept}</li>
              ))}
            </ul>
          </section>
        )}

        <ChapterConceptAnimator unitId={currentChapter.unitId} chapterNumber={currentChapter.chapterNumber} />

        <section>
          <Markdown md={currentChapter.deepContentMarkdown} />
        </section>

        {currentChapter.equationsAndMath && currentChapter.equationsAndMath.length > 0 && (
          <section>
            <h2 className="!mt-0">Formulas</h2>
            <div className="space-y-5">
              {currentChapter.equationsAndMath.map((eq, i) => (
                <div key={i}>
                  <p className="!mb-1 font-semibold text-text-primary">{eq.name}</p>
                  <pre className="!my-1">{eq.formula}</pre>
                  <p className="!mt-1 text-[15px] text-text-secondary">{eq.explanation}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {currentChapter.tradeoffMatrix && currentChapter.tradeoffMatrix.length > 0 && (
          <section>
            <h2 className="!mt-0">Trade-offs</h2>
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Option</th>
                    <th>Pros</th>
                    <th>Cons</th>
                    <th>Best for</th>
                  </tr>
                </thead>
                <tbody>
                  {currentChapter.tradeoffMatrix.map((item, i) => (
                    <tr key={i}>
                      <td className="font-semibold text-text-primary">{item.option}</td>
                      <td>
                        <ul className="!m-0 !pl-4">
                          {item.pros.map((p, idx) => (
                            <li key={idx}>{p}</li>
                          ))}
                        </ul>
                      </td>
                      <td>
                        <ul className="!m-0 !pl-4">
                          {item.cons.map((c, idx) => (
                            <li key={idx}>{c}</li>
                          ))}
                        </ul>
                      </td>
                      <td>{item.bestFor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section>
          <h2 className="!mt-0">From production</h2>
          <aside className="nx-aside" data-tone="danger">
            <span className="nx-aside-label">
              {currentWarStory.company} · {currentWarStory.impactSLA}
            </span>
            <p className="!mt-0 font-semibold text-text-primary">{currentWarStory.incident}</p>
            <p>
              <strong>Root cause.</strong> {currentWarStory.rootCause}
            </p>
            <p>
              <strong>The fix.</strong> {currentWarStory.architecturalFix}
            </p>
          </aside>
        </section>

        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="!mt-0">
              {currentConfig.title} <span className="font-mono text-[0.7em] font-normal text-text-muted">{currentConfig.filename}</span>
            </h2>
            <button type="button" onClick={handleCopyConfig} className="inline-flex cursor-pointer items-center gap-1.5 text-[13px] text-text-secondary hover:text-text-primary">
              {copiedConfig ? <Check className="size-4 text-state-success" /> : <Copy className="size-4" />} {copiedConfig ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="max-h-[340px]">{currentConfig.content}</pre>
          {currentConfig.keyParameters.length > 0 && (
            <dl className="mt-4 space-y-2.5">
              {currentConfig.keyParameters.map((kp, i) => (
                <div key={i}>
                  <dt>
                    <code>{kp.param}</code>
                  </dt>
                  <dd className="!m-0 text-[15px] text-text-secondary">{kp.desc}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        {currentQuiz.length > 0 && (
          <section>
            <h2 className="!mt-0">Check yourself</h2>
            <ol className="nx-steps">
              {currentQuiz.map((quiz, qIdx) => {
                const selectedOpt = quizAnswers[qIdx]
                const hasAnswered = selectedOpt !== undefined
                const isCorrect = selectedOpt === quiz.answerIndex
                return (
                  <li key={qIdx}>
                    <p className="!mb-2 font-medium text-text-primary">{quiz.question}</p>
                    <div className="space-y-1">
                      {quiz.options.map((opt, optIdx) => {
                        const right = hasAnswered && optIdx === quiz.answerIndex
                        const wrong = hasAnswered && selectedOpt === optIdx && !right
                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => {
                              playStepClickSound()
                              setQuizAnswers((prev) => ({ ...prev, [qIdx]: optIdx }))
                            }}
                            className={`flex w-full cursor-pointer items-start gap-2.5 rounded-lg px-3 py-2 text-left text-[15px] transition-colors ${
                              right ? 'bg-state-success/10 text-text-primary' : wrong ? 'bg-state-error/10 text-text-primary' : 'text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary'
                            }`}
                          >
                            <span className="w-4 shrink-0 font-medium text-text-muted">{String.fromCharCode(65 + optIdx)}</span>
                            <span>{opt.replace(/^[A-D]\.\s*/, '')}</span>
                          </button>
                        )
                      })}
                    </div>
                    {hasAnswered && (
                      <aside className="nx-aside !my-3" data-tone={isCorrect ? 'good' : 'danger'}>
                        <span className="nx-aside-label">{isCorrect ? 'Correct' : 'Not quite'}</span>
                        <p className="!m-0">{quiz.staffRationale}</p>
                      </aside>
                    )}
                  </li>
                )
              })}
            </ol>
          </section>
        )}

        {currentChapter.interviewKeypoints.length > 0 && (
          <section>
            <h2 className="!mt-0">Before an interview, can you…</h2>
            <ul className="!list-none !pl-0">
              {currentChapter.interviewKeypoints.map((kp, i) => {
                const isChecked = !!checkedKeypoints[kp]
                return (
                  <li key={i}>
                    <label className="flex cursor-pointer items-start gap-3 py-1">
                      <input type="checkbox" checked={isChecked} onChange={() => toggleKeypoint(kp)} className="mt-1.5 size-4 accent-[var(--color-accent-brand)]" />
                      <span className={isChecked ? 'text-text-muted line-through' : ''}>{kp}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        <nav className="flex items-center justify-between border-t border-border/70 pt-6 text-[14px]" aria-label="Chapters">
          <button type="button" onClick={handlePrevChapter} disabled={currentChapterIndex === 0} className="inline-flex cursor-pointer items-center gap-2 text-text-secondary hover:text-text-primary disabled:cursor-default disabled:opacity-40">
            <ArrowLeft className="size-4" /> Previous
          </button>
          <span className="tabular-nums text-text-muted">
            {currentChapterIndex + 1} / {ALL_THEORY_CHAPTERS.length}
          </span>
          <button type="button" onClick={handleNextChapter} disabled={currentChapterIndex === ALL_THEORY_CHAPTERS.length - 1} className="inline-flex cursor-pointer items-center gap-2 font-medium text-text-primary hover:text-accent-brand disabled:cursor-default disabled:opacity-40">
            Next <ArrowRight className="size-4" />
          </button>
        </nav>
      </article>
    </div>
  )
}
