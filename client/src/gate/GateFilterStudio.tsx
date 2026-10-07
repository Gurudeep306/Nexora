import { useState, useMemo } from 'react'
import {
  Search,
  SlidersHorizontal,
  RotateCcw,
  Layers,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Cpu,
  Brain,
  Terminal,
  Sigma,
  Binary,
  LayoutGrid,
  Columns2,
  Square,
  X,
  ArrowUpDown,
  Filter,
  Image as ImageIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { GateCustomSelect, type SelectOption } from './GateCustomSelect'
import { type GateMeta, type GateList, TYPE_LABEL, type QType } from './types'

export type ViewMode = 'focus' | 'split' | 'grid'

interface GateFilterStudioProps {
  searchInput: string
  setSearchInput: (v: string) => void
  sort: string
  setSort: (v: string) => void
  viewMode: ViewMode
  setViewMode: (m: ViewMode) => void
  exam: string[]
  toggleExam: (e: string) => void
  setExam: (e: string[]) => void
  year: string[]
  toggleYear: (y: string) => void
  setYear: (y: string[]) => void
  subject: string[]
  toggleSubject: (s: string) => void
  setSubject?: (s: string[]) => void
  topic: string[]
  toggleTopic: (t: string) => void
  type: string[]
  toggleType: (t: string) => void
  marks: string[]
  toggleMarks: (m: string) => void
  hasFigure: string
  setFigureFilter: (f: string) => void
  clearAll: () => void
  meta?: GateMeta | null
  list?: GateList | null
  total?: number
}

const DOMAIN_GROUPS = [
  {
    id: 'math',
    title: 'Math & Foundations',
    icon: Sigma,
    subjects: [
      { id: 'dm', label: 'Discrete Math' },
      { id: 'la', label: 'Linear Algebra' },
      { id: 'calc', label: 'Calculus' },
      { id: 'prob', label: 'Probability & Stats' },
    ],
  },
  {
    id: 'algo',
    title: 'Algorithms & Coding',
    icon: Terminal,
    subjects: [
      { id: 'algo', label: 'Algorithms' },
      { id: 'pds', label: 'Data Structures' },
      { id: 'pdsa', label: 'DS & Algorithms' },
    ],
  },
  {
    id: 'systems',
    title: 'Computer Systems',
    icon: Cpu,
    subjects: [
      { id: 'os', label: 'Operating Systems' },
      { id: 'cn', label: 'Computer Networks' },
      { id: 'db', label: 'Database Systems' },
      { id: 'coa', label: 'Computer Architecture' },
      { id: 'dl', label: 'Digital Logic' },
    ],
  },
  {
    id: 'ai',
    title: 'AI, ML & Data Science',
    icon: Brain,
    subjects: [
      { id: 'ml', label: 'Machine Learning' },
      { id: 'ai', label: 'Artificial Intelligence' },
      { id: 'dbw', label: 'Data Warehousing' },
    ],
  },
  {
    id: 'theory',
    title: 'Theory & Compilers',
    icon: Binary,
    subjects: [
      { id: 'toc', label: 'Theory of Computation' },
      { id: 'cd', label: 'Compiler Design' },
    ],
  },
  {
    id: 'aptitude',
    title: 'General Aptitude',
    icon: Sparkles,
    subjects: [{ id: 'ga', label: 'General Aptitude' }],
  },
]

const SORT_OPTIONS: SelectOption[] = [
  { value: 'year-desc', label: 'Newest First (2026 → 1991)', badge: 'Latest' },
  { value: 'year-asc', label: 'Oldest First (1991 → 2026)' },
  { value: 'marks-desc', label: 'Highest Weight (2M → 1M)', badge: '2 Marks' },
  { value: 'marks-asc', label: 'Lowest Weight (1M → 2M)' },
  { value: 'subject-asc', label: 'Subject (A to Z)' },
]

export function GateFilterStudio({
  searchInput,
  setSearchInput,
  sort,
  setSort,
  viewMode,
  setViewMode,
  exam,
  toggleExam,
  setExam,
  year,
  toggleYear,
  setYear,
  subject,
  toggleSubject,
  topic,
  toggleTopic,
  type,
  toggleType,
  marks,
  toggleMarks,
  hasFigure,
  setFigureFilter,
  clearAll,
  meta,
  list,
}: GateFilterStudioProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'subject' | 'year' | 'specs'>('subject')

  // Collect all available years
  const allYears = useMemo(() => {
    const set = new Set((meta?.papers ?? []).map((p) => p.year))
    return [...set].sort((a, b) => b - a)
  }, [meta])

  // Collect topics for active subjects
  const activeSubjectTopics = useMemo(() => {
    if (subject.length === 0 || !meta?.subjects) return []
    const combined: { key: string; label: string; subjId: string }[] = []

    for (const subjId of subject) {
      const cseObj = meta.subjects.CSE?.[subjId]
      const daObj = meta.subjects.DA?.[subjId]
      const topicMap = { ...(cseObj?.topics || {}), ...(daObj?.topics || {}) }
      for (const [tKey, tName] of Object.entries(topicMap)) {
        combined.push({ key: `${subjId}/${tKey}`, label: tName, subjId })
      }
    }
    return combined
  }, [subject, meta])

  const selectEra = (startYear: number, endYear: number) => {
    const eraYears = allYears
      .filter((y) => y >= startYear && y <= endYear)
      .map(String)
    const isSelected =
      eraYears.length > 0 &&
      eraYears.length === year.length &&
      eraYears.every((y) => year.includes(y))
    if (isSelected) setYear([])
    else setYear(eraYears)
  }

  const activeCount =
    exam.length +
    year.length +
    subject.length +
    topic.length +
    type.length +
    marks.length +
    (hasFigure ? 1 : 0) +
    (searchInput ? 1 : 0)

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-bg-surface-2/40 p-4 sm:p-5 shadow-xl backdrop-blur-xl transition-all space-y-4">
      {/* ── Level 1: Primary Command Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search Input Box */}
        <div className="group relative flex min-w-[260px] flex-1 items-center gap-2.5 rounded-2xl border border-border/90 bg-bg-surface/80 px-3.5 py-2 shadow-inner backdrop-blur-md transition-all focus-within:border-accent-brand focus-within:ring-2 focus-within:ring-accent-brand/20">
          <Search className="size-4 text-text-muted transition-colors group-focus-within:text-accent-brand shrink-0" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder='Search 4,100+ questions (e.g. "DFA", "QuickSort", "Eigenvalues", "Paging")'
            className="w-full bg-transparent text-[13.5px] text-text-primary outline-none placeholder:text-text-muted"
            spellCheck={false}
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="text-text-muted hover:text-text-primary cursor-pointer transition-colors"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* View Mode Switcher (Deck / Split / Grid) */}
        <div className="flex items-center gap-1 rounded-2xl border border-border/80 bg-bg-surface/80 p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setViewMode('focus')}
            title="Focus Deck Mode (1 Question at a time with Question Strip)"
            className={cn(
              'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-bold transition-all cursor-pointer',
              viewMode === 'focus'
                ? 'bg-accent-brand text-white shadow-sm'
                : 'text-text-muted hover:text-text-primary',
            )}
          >
            <Square className="size-3.5" />
            <span className="hidden md:inline">Focus Deck</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('split')}
            title="Split Workspace Mode (Question Queue on left, Active studio on right)"
            className={cn(
              'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-bold transition-all cursor-pointer',
              viewMode === 'split'
                ? 'bg-accent-brand text-white shadow-sm'
                : 'text-text-muted hover:text-text-primary',
            )}
          >
            <Columns2 className="size-3.5" />
            <span className="hidden md:inline">Split Studio</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('grid')}
            title="Bento Grid Mode (Compact Modular Cards)"
            className={cn(
              'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-bold transition-all cursor-pointer',
              viewMode === 'grid'
                ? 'bg-accent-brand text-white shadow-sm'
                : 'text-text-muted hover:text-text-primary',
            )}
          >
            <LayoutGrid className="size-3.5" />
            <span className="hidden md:inline">Bento Grid</span>
          </button>
        </div>

        {/* Custom Sort Dropdown */}
        <GateCustomSelect
          value={sort}
          onChange={setSort}
          options={SORT_OPTIONS}
          label="Sort"
          icon={<ArrowUpDown className="size-3.5" />}
          align="right"
        />

        {/* Filter Drawer Toggle */}
        <button
          type="button"
          onClick={() => setDrawerOpen((prev) => !prev)}
          className={cn(
            'flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-[13px] font-bold transition-all cursor-pointer shadow-sm',
            drawerOpen || activeCount > 0
              ? 'border-accent-brand bg-accent-brand/15 text-accent-brand'
              : 'border-border/80 bg-bg-surface/80 text-text-primary hover:border-accent-brand/50',
          )}
        >
          <SlidersHorizontal className="size-4" />
          <span>Filters</span>
          {activeCount > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-accent-brand text-[10.5px] font-mono text-white">
              {activeCount}
            </span>
          )}
          {drawerOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </button>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="flex items-center gap-1 text-[12px] font-semibold text-text-muted hover:text-red-400 cursor-pointer transition-colors"
          >
            <RotateCcw className="size-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* ── Level 2: Quick Exam Stream Switcher ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold tracking-wider text-text-muted uppercase mr-1">
            Stream:
          </span>
          <button
            type="button"
            onClick={() => setExam([])}
            className={cn(
              'rounded-xl px-3 py-1 text-[12px] font-bold transition-all cursor-pointer border',
              exam.length === 0
                ? 'border-accent-brand bg-accent-brand text-white shadow-sm'
                : 'border-border/70 bg-bg-surface text-text-muted hover:text-text-primary',
            )}
          >
            ⚡ All Exams
          </button>

          <button
            type="button"
            onClick={() => setExam(['CSE'])}
            className={cn(
              'rounded-xl px-3 py-1 text-[12px] font-bold transition-all cursor-pointer border',
              exam.length === 1 && exam[0] === 'CSE'
                ? 'border-blue-500 bg-blue-600 text-white shadow-sm'
                : 'border-border/70 bg-bg-surface text-text-muted hover:text-text-primary',
            )}
          >
            💻 GATE CSE
          </button>

          <button
            type="button"
            onClick={() => setExam(['DA'])}
            className={cn(
              'rounded-xl px-3 py-1 text-[12px] font-bold transition-all cursor-pointer border',
              exam.length === 1 && exam[0] === 'DA'
                ? 'border-purple-500 bg-purple-600 text-white shadow-sm'
                : 'border-border/70 bg-bg-surface text-text-muted hover:text-text-primary',
            )}
          >
            🤖 GATE DA (Data Science & AI)
          </button>
        </div>

        {/* Quick Marks & Diagram Fast Filters */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => toggleMarks('2')}
            className={cn(
              'rounded-xl px-2.5 py-1 text-[11.5px] font-semibold border transition-all cursor-pointer',
              marks.includes('2')
                ? 'border-accent-brand bg-accent-brand/20 text-accent-brand'
                : 'border-border/60 bg-bg-surface/60 text-text-muted hover:text-text-primary',
            )}
          >
            🎯 2-Mark High Scorers
          </button>

          <button
            type="button"
            onClick={() => setFigureFilter(hasFigure === 'yes' ? '' : 'yes')}
            className={cn(
              'rounded-xl px-2.5 py-1 text-[11.5px] font-semibold border transition-all cursor-pointer flex items-center gap-1',
              hasFigure === 'yes'
                ? 'border-accent-brand bg-accent-brand/20 text-accent-brand'
                : 'border-border/60 bg-bg-surface/60 text-text-muted hover:text-text-primary',
            )}
          >
            <ImageIcon className="size-3" />
            <span>With Diagrams</span>
          </button>
        </div>
      </div>

      {/* ── Level 3: Expandable Deep Filter Console ── */}
      {drawerOpen && (
        <div className="animate-in fade-in-0 duration-200 border-t border-border/80 pt-4 space-y-4">
          {/* Sub-tab selection */}
          <div className="flex items-center gap-2 border-b border-border/60 pb-2.5 text-[12.5px] font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('subject')}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition-all cursor-pointer',
                activeTab === 'subject'
                  ? 'bg-accent-brand text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary',
              )}
            >
              <Layers className="size-3.5" />
              <span>Subjects & Topics</span>
              {subject.length > 0 && (
                <span className="rounded-full bg-white/20 px-1.5 text-[10px]">{subject.length}</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('year')}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition-all cursor-pointer',
                activeTab === 'year'
                  ? 'bg-accent-brand text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary',
              )}
            >
              <Calendar className="size-3.5" />
              <span>Year & Eras</span>
              {year.length > 0 && (
                <span className="rounded-full bg-white/20 px-1.5 text-[10px]">{year.length}</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('specs')}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition-all cursor-pointer',
                activeTab === 'specs'
                  ? 'bg-accent-brand text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary',
              )}
            >
              <Filter className="size-3.5" />
              <span>Question Specs</span>
              {type.length + marks.length > 0 && (
                <span className="rounded-full bg-white/20 px-1.5 text-[10px]">
                  {type.length + marks.length}
                </span>
              )}
            </button>
          </div>

          {/* TAB 1: SUBJECT & TOPICS */}
          {activeTab === 'subject' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {DOMAIN_GROUPS.map((group) => {
                  const Icon = group.icon
                  return (
                    <div
                      key={group.id}
                      className="rounded-2xl border border-border/80 bg-bg-surface/70 p-3.5 shadow-sm space-y-2.5"
                    >
                      <div className="flex items-center gap-2 text-text-primary font-bold text-[12.5px]">
                        <span className="flex size-6 items-center justify-center rounded-lg bg-accent-brand/15 text-accent-brand">
                          <Icon className="size-3.5" />
                        </span>
                        <span>{group.title}</span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {group.subjects.map((s) => {
                          const isSelected = subject.includes(s.id)
                          const count =
                            (list?.facets?.subject?.[s.id] ??
                              meta?.counts?.bySubject?.[`CSE:${s.id}`] ??
                              meta?.counts?.bySubject?.[`DA:${s.id}`]) ||
                            0

                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => toggleSubject(s.id)}
                              className={cn(
                                'flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11.5px] font-semibold border transition-all cursor-pointer',
                                isSelected
                                  ? 'border-accent-brand bg-accent-brand text-white shadow-xs'
                                  : 'border-border/70 bg-bg-surface-2/60 text-text-secondary hover:border-accent-brand/50 hover:text-text-primary',
                              )}
                            >
                              <span>{s.label}</span>
                              {count > 0 && (
                                <span
                                  className={cn(
                                    'rounded-md px-1 text-[10px] font-mono',
                                    isSelected ? 'bg-white/20 text-white' : 'text-text-muted',
                                  )}
                                >
                                  {count}
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Inline Topic Cloud if subjects selected */}
              {activeSubjectTopics.length > 0 && (
                <div className="rounded-2xl border border-accent-brand/30 bg-accent-brand/5 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-accent-brand uppercase tracking-wider">
                      Target Subtopics for Selected Subjects:
                    </span>
                    {topic.length > 0 && (
                      <button
                        type="button"
                        onClick={() => topic.forEach((t) => toggleTopic(t))}
                        className="text-[11px] text-text-muted hover:text-red-400"
                      >
                        Clear Topics ({topic.length})
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {activeSubjectTopics.map((t) => {
                      const isSelected = topic.includes(t.key)
                      return (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => toggleTopic(t.key)}
                          className={cn(
                            'rounded-xl px-2.5 py-1 text-[11px] font-medium border transition-all cursor-pointer',
                            isSelected
                              ? 'border-accent-brand bg-accent-brand text-white shadow-xs'
                              : 'border-border/80 bg-bg-surface text-text-secondary hover:text-text-primary',
                          )}
                        >
                          {t.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: YEAR & ERAS */}
          {activeTab === 'year' && (
            <div className="space-y-3">
              {/* Quick Eras */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted mr-1">
                  Eras:
                </span>
                <button
                  type="button"
                  onClick={() => selectEra(2024, 2026)}
                  className="rounded-xl border border-border/80 bg-bg-surface px-3 py-1 text-[11.5px] font-bold text-text-primary hover:border-accent-brand cursor-pointer"
                >
                  ⚡ 2024–2026 Latest Era
                </button>
                <button
                  type="button"
                  onClick={() => selectEra(2018, 2023)}
                  className="rounded-xl border border-border/80 bg-bg-surface px-3 py-1 text-[11.5px] font-bold text-text-primary hover:border-accent-brand cursor-pointer"
                >
                  ⭐ 2018–2023 Modern
                </button>
                <button
                  type="button"
                  onClick={() => selectEra(2010, 2017)}
                  className="rounded-xl border border-border/80 bg-bg-surface px-3 py-1 text-[11.5px] font-bold text-text-primary hover:border-accent-brand cursor-pointer"
                >
                  🏛️ 2010–2017 Classic
                </button>
                <button
                  type="button"
                  onClick={() => selectEra(1991, 2009)}
                  className="rounded-xl border border-border/80 bg-bg-surface px-3 py-1 text-[11.5px] font-bold text-text-primary hover:border-accent-brand cursor-pointer"
                >
                  📜 1991–2009 Archive
                </button>
              </div>

              {/* All Years Pills */}
              <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto pr-1">
                {allYears.map((y) => {
                  const str = String(y)
                  const isSelected = year.includes(str)
                  return (
                    <button
                      key={y}
                      type="button"
                      onClick={() => toggleYear(str)}
                      className={cn(
                        'rounded-xl px-2.5 py-1 font-mono text-[11.5px] font-semibold border transition-all cursor-pointer',
                        isSelected
                          ? 'border-accent-brand bg-accent-brand text-white shadow-xs'
                          : 'border-border/70 bg-bg-surface text-text-muted hover:text-text-primary',
                      )}
                    >
                      {y}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 3: QUESTION SPECS */}
          {activeTab === 'specs' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                  Question Format / Type
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(['MCQ', 'MSQ', 'NAT', 'FILL', 'MATCH'] as QType[]).map((t) => {
                    const isSelected = type.includes(t)
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleType(t)}
                        className={cn(
                          'rounded-xl px-3 py-1.5 text-[12px] font-bold border transition-all cursor-pointer',
                          isSelected
                            ? 'border-accent-brand bg-accent-brand text-white shadow-xs'
                            : 'border-border/70 bg-bg-surface text-text-muted hover:text-text-primary',
                        )}
                      >
                        {TYPE_LABEL[t] || t} ({t})
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                  Marks Weightage
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: '1', label: '1 Mark Fundamental' },
                    { id: '2', label: '2 Marks Deep Thinking' },
                  ].map((m) => {
                    const isSelected = marks.includes(m.id)
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleMarks(m.id)}
                        className={cn(
                          'rounded-xl px-3 py-1.5 text-[12px] font-bold border transition-all cursor-pointer',
                          isSelected
                            ? 'border-accent-brand bg-accent-brand text-white shadow-xs'
                            : 'border-border/70 bg-bg-surface text-text-muted hover:text-text-primary',
                        )}
                      >
                        {m.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Active Filters HUD Row ── */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-2.5 text-[11.5px]">
          <span className="font-bold text-text-muted uppercase tracking-wider mr-1">Active:</span>

          {exam.map((e) => (
            <span
              key={e}
              onClick={() => toggleExam(e)}
              className="inline-flex items-center gap-1 rounded-lg bg-accent-brand/15 px-2 py-0.5 font-semibold text-accent-brand cursor-pointer hover:bg-accent-brand/25"
            >
              Exam: {e} <X className="size-3" />
            </span>
          ))}

          {subject.map((s) => (
            <span
              key={s}
              onClick={() => toggleSubject(s)}
              className="inline-flex items-center gap-1 rounded-lg bg-accent-brand/15 px-2 py-0.5 font-semibold text-accent-brand cursor-pointer hover:bg-accent-brand/25"
            >
              Subj: {s.toUpperCase()} <X className="size-3" />
            </span>
          ))}

          {year.length > 0 && year.length <= 4 && (
            year.map((y) => (
              <span
                key={y}
                onClick={() => toggleYear(y)}
                className="inline-flex items-center gap-1 rounded-lg bg-accent-brand/15 px-2 py-0.5 font-semibold text-accent-brand cursor-pointer hover:bg-accent-brand/25"
              >
                {y} <X className="size-3" />
              </span>
            ))
          )}

          {year.length > 4 && (
            <span
              onClick={() => setYear([])}
              className="inline-flex items-center gap-1 rounded-lg bg-accent-brand/15 px-2 py-0.5 font-semibold text-accent-brand cursor-pointer hover:bg-accent-brand/25"
            >
              {year.length} Years Selected <X className="size-3" />
            </span>
          )}

          {type.map((t) => (
            <span
              key={t}
              onClick={() => toggleType(t)}
              className="inline-flex items-center gap-1 rounded-lg bg-accent-brand/15 px-2 py-0.5 font-semibold text-accent-brand cursor-pointer hover:bg-accent-brand/25"
            >
              {t} <X className="size-3" />
            </span>
          ))}

          {marks.map((m) => (
            <span
              key={m}
              onClick={() => toggleMarks(m)}
              className="inline-flex items-center gap-1 rounded-lg bg-accent-brand/15 px-2 py-0.5 font-semibold text-accent-brand cursor-pointer hover:bg-accent-brand/25"
            >
              {m}M <X className="size-3" />
            </span>
          ))}

          {hasFigure && (
            <span
              onClick={() => setFigureFilter('')}
              className="inline-flex items-center gap-1 rounded-lg bg-accent-brand/15 px-2 py-0.5 font-semibold text-accent-brand cursor-pointer hover:bg-accent-brand/25"
            >
              With Diagrams <X className="size-3" />
            </span>
          )}

          <button
            type="button"
            onClick={clearAll}
            className="ml-auto text-[11px] font-bold text-text-muted hover:text-red-400 cursor-pointer"
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  )
}
