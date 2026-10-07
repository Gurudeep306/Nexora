import React, { useState } from 'react'
import { THEORY_UNITS, ALL_THEORY_CHAPTERS } from '../data/theoryNotesData'
import { ChapterConceptAnimator } from './ConceptAnimators'
import {
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowLeft,
  Cpu,
  Sparkles,
} from 'lucide-react'

export const SystemNotesReader: React.FC = () => {
  const [selectedUnitId, setSelectedUnitId] = useState<string>('all')
  const [selectedChapterId, setSelectedChapterId] = useState<string>('ch-01')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [checkedKeypoints, setCheckedKeypoints] = useState<Record<string, boolean>>({})

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

  const handlePrevChapter = () => {
    if (currentChapterIndex > 0) {
      setSelectedChapterId(ALL_THEORY_CHAPTERS[currentChapterIndex - 1].id)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleNextChapter = () => {
    if (currentChapterIndex < ALL_THEORY_CHAPTERS.length - 1) {
      setSelectedChapterId(ALL_THEORY_CHAPTERS[currentChapterIndex + 1].id)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const toggleKeypoint = (kp: string) => {
    setCheckedKeypoints((prev) => ({ ...prev, [kp]: !prev[kp] }))
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      {/* Sidebar Table of Contents */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search 56 chapters & equations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl bg-bg-surface-2 pl-9 pr-3 py-2 text-[13px] text-text-primary ring-1 ring-border placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-brand"
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
        <div className="max-h-[700px] overflow-y-auto space-y-1.5 pr-1">
          {filteredChapters.map((chap) => {
            const isSelected = chap.id === currentChapter.id
            return (
              <button
                key={chap.id}
                onClick={() => setSelectedChapterId(chap.id)}
                className={`w-full text-left rounded-xl p-3 transition-all ${
                  isSelected
                    ? 'bg-accent-brand/10 ring-1 ring-accent-brand/40 text-text-primary'
                    : 'bg-bg-surface-2/60 hover:bg-bg-surface-3 text-text-secondary hover:text-text-primary'
                }`}
              >
                <div className="flex items-center justify-between text-[10.5px] font-mono text-text-muted mb-1">
                  <span>Chapter {chap.chapterNumber}</span>
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
      <div className="space-y-6 rounded-2xl bg-bg-surface-2 p-6 sm:p-8 ring-1 ring-border">
        {/* Chapter Header */}
        <div className="border-b border-border pb-6 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[11px] font-bold text-accent-brand uppercase tracking-wider">
              {currentChapter.unitTitle} · Chapter {currentChapter.chapterNumber} of 56
            </span>
            <div className="flex items-center gap-3 text-[12px] font-mono text-text-muted">
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" /> {currentChapter.readingTimeMin} min read
              </span>
            </div>
          </div>

          <h1 className="!text-[24px] sm:!text-[28px] font-bold tracking-tight text-text-primary">
            {currentChapter.title}
          </h1>

          <p className="text-[14px] leading-relaxed text-text-secondary">{currentChapter.summary}</p>
        </div>

        {/* Core Concepts Highlights Card */}
        <div className="rounded-xl bg-bg-surface-3/60 p-4 sm:p-5 ring-1 ring-border">
          <h3 className="mb-3 flex items-center gap-2 text-[13px] font-bold tracking-wider text-text-primary uppercase">
            <Sparkles className="size-4 text-accent-brand" /> Core Foundational Axioms
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
        <div className="prose prose-invert max-w-none text-[14px] leading-relaxed text-text-secondary space-y-4">
          <div className="whitespace-pre-line leading-relaxed font-sans">{currentChapter.deepContentMarkdown}</div>
        </div>

        {/* Equations & Math Formulas Box */}
        {currentChapter.equationsAndMath && currentChapter.equationsAndMath.length > 0 && (
          <div className="rounded-xl bg-[#0a0e14] p-5 ring-1 ring-border space-y-3">
            <h3 className="flex items-center gap-2 text-[12px] font-mono font-bold tracking-wider text-sky-400 uppercase">
              <Cpu className="size-4" /> Mathematical Derivations & Invariants
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
            <h3 className="text-[13px] font-bold tracking-wider text-text-primary uppercase">
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

        {/* Interview Keypoints Checklist */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-[13px] font-bold text-emerald-400 uppercase tracking-wider">
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
                    isChecked ? 'bg-emerald-500/10 line-through text-text-muted' : 'hover:bg-bg-surface-3 text-text-primary'
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
