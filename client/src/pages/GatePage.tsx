import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowDownWideNarrow,
  Binary,
  Brain,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Cpu,
  Layers,
  Play,
  RotateCcw,
  Search,
  SearchX,
  Sigma,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  X,
  Image as ImageIcon,
} from 'lucide-react'
import { EmptyState, ErrorState, LoadingBlock, PageHeader } from '@/components/ui'
import { api } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { cn } from '@/lib/utils'
import { QuestionView } from '@/gate/QuestionView'
import { TYPE_LABEL, type GateList, type GateMeta, type QType } from '@/gate/types'

const PAGE_SIZE = 25
const TYPES: QType[] = ['MCQ', 'MSQ', 'NAT', 'FILL', 'MATCH', 'DESC', 'TF']

/** Multi-select pill groups keep their value in the URL as a comma list. */
function useListParam(key: string) {
  const [params, setParams] = useSearchParams()
  const value = useMemo(
    () => (params.get(key) ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    [params, key],
  )
  const toggle = useCallback(
    (v: string) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          const cur = (next.get(key) ?? '').split(',').filter(Boolean)
          const after = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]
          if (after.length) next.set(key, after.join(','))
          else next.delete(key)
          next.delete('page')
          return next
        },
        { replace: true },
      )
    },
    [key, setParams],
  )
  const setDirect = useCallback(
    (vals: string[]) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (vals.length) next.set(key, vals.join(','))
          else next.delete(key)
          next.delete('page')
          return next
        },
        { replace: true },
      )
    },
    [key, setParams],
  )
  return [value, toggle, setDirect] as const
}

const DOMAIN_GROUPS = [
  {
    id: 'math',
    title: 'Mathematics & Foundations',
    icon: Sigma,
    subjects: ['dm', 'la', 'calc', 'prob'],
  },
  {
    id: 'systems',
    title: 'Core Computer Systems',
    icon: Cpu,
    subjects: ['os', 'cn', 'db', 'dbw', 'coa', 'dl'],
  },
  {
    id: 'theory',
    title: 'Algorithms & Computation',
    icon: Terminal,
    subjects: ['algo', 'pds', 'pdsa', 'toc', 'cd'],
  },
  {
    id: 'ai',
    title: 'AI, Machine Learning & Data',
    icon: Brain,
    subjects: ['ml', 'ai'],
  },
  {
    id: 'aptitude',
    title: 'General Aptitude',
    icon: Sparkles,
    subjects: ['ga'],
  },
]

export default function GatePage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const sort = params.get('sort') ?? 'year-desc'
  const hasFigure = params.get('hasFigure') ?? ''

  const [search, setSearch] = useState({ input: q, from: q })
  if (search.from !== q) setSearch({ input: q, from: q })
  const searchInput = search.input
  const setSearchInput = (v: string) => setSearch({ input: v, from: q })

  const [showFilters, setShowFilters] = useState(true)
  const [topicSearch, setTopicSearch] = useState('')
  const page = Math.max(1, Number(params.get('page') ?? 1))

  const [exam, toggleExam, setExam] = useListParam('exam')
  const [year, toggleYear, setYear] = useListParam('year')
  const [subject, toggleSubject, setSubject] = useListParam('subject')
  const [topic, toggleTopic, setTopic] = useListParam('topic')
  const [type, toggleType, setType] = useListParam('type')
  const [marks, toggleMarks, setMarks] = useListParam('marks')
  const [section] = useListParam('section')

  useEffect(() => {
    if (searchInput === q) return
    const t = setTimeout(() => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (searchInput) next.set('q', searchInput)
          else next.delete('q')
          next.delete('page')
          return next
        },
        { replace: true },
      )
    }, 280)
    return () => clearTimeout(t)
  }, [searchInput, q, setParams])

  const meta = useApi<GateMeta>(() => api.get<GateMeta>('/api/gate/meta'), [])

  const query = {
    q,
    exam: exam.join(','),
    year: year.join(','),
    subject: subject.join(','),
    topic: topic.join(','),
    type: type.join(','),
    marks: marks.join(','),
    section: section.join(','),
    hasFigure,
    sort,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  }

  const list = useApi<GateList>(
    () => api.get<GateList>('/api/gate/questions', { query }),
    [q, exam.join(), year.join(), subject.join(), topic.join(), type.join(), marks.join(), section.join(), hasFigure, sort, page],
  )

  const setPage = (p: number) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (p > 1) next.set('page', String(p))
        else next.delete('page')
        return next
      },
      { replace: false },
    )
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const setSortOrder = (newSort: string) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('sort', newSort)
        next.delete('page')
        return next
      },
      { replace: true },
    )
  }

  const setFigureFilter = (fig: string) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (fig) next.set('hasFigure', fig)
        else next.delete('hasFigure')
        next.delete('page')
        return next
      },
      { replace: true },
    )
  }

  const clearAll = () => {
    setSearchInput('')
    setParams(new URLSearchParams(), { replace: true })
  }

  // All subject blocks (combining CSE and DA)
  const allSubjectMap = useMemo(() => {
    const map = new Map<string, { id: string; label: string; topics: Record<string, string> }>()
    if (!meta.data?.subjects) return map

    // CSE subjects
    for (const [id, s] of Object.entries(meta.data.subjects.CSE || {})) {
      map.set(id, { id, label: s.name, topics: s.topics })
    }
    // DA subjects
    for (const [id, s] of Object.entries(meta.data.subjects.DA || {})) {
      if (map.has(id)) {
        const existing = map.get(id)!
        map.set(id, {
          id,
          label: existing.label,
          topics: { ...existing.topics, ...s.topics },
        })
      } else {
        map.set(id, { id, label: s.name, topics: s.topics })
      }
    }
    return map
  }, [meta.data])

  const subjectBlocks = useMemo(() => Array.from(allSubjectMap.values()), [allSubjectMap])

  // Topics corresponding to selected subjects, or all topics if no subject is picked
  const availableTopics = useMemo(() => {
    const targetBlocks = subject.length > 0
      ? subjectBlocks.filter((s) => subject.includes(s.id))
      : subjectBlocks

    const list: { id: string; subjId: string; label: string; key: string }[] = []
    for (const s of targetBlocks) {
      for (const [t, name] of Object.entries(s.topics)) {
        list.push({
          id: `${s.id}/${t}`,
          subjId: s.id,
          label: name,
          key: t,
        })
      }
    }
    return list
  }, [subjectBlocks, subject])

  const filteredTopics = useMemo(() => {
    if (!topicSearch.trim()) return availableTopics
    const lower = topicSearch.toLowerCase()
    return availableTopics.filter((t) => t.label.toLowerCase().includes(lower) || t.id.toLowerCase().includes(lower))
  }, [availableTopics, topicSearch])

  const exams = useMemo(() => {
    const set = new Set((meta.data?.papers ?? []).map((p) => p.exam))
    return [...set].map((e) => ({ id: e, label: `GATE ${e}` }))
  }, [meta.data])

  const years = useMemo(() => {
    const set = new Set((meta.data?.papers ?? []).map((p) => p.year))
    return [...set].sort((a, b) => b - a).map((y) => ({ id: String(y), label: String(y) }))
  }, [meta.data])

  // Era helper functions
  const selectEra = (startYear: number, endYear: number) => {
    const eraYears = years.filter((y) => {
      const yr = Number(y.id)
      return yr >= startYear && yr <= endYear
    }).map((y) => y.id)
    setYear(eraYears)
  }

  // Active filters count
  const activeCount =
    exam.length +
    year.length +
    subject.length +
    topic.length +
    type.length +
    marks.length +
    section.length +
    (hasFigure ? 1 : 0) +
    (q ? 1 : 0)

  const subjectName = (s: string) => allSubjectMap.get(s)?.label ?? s
  const topicName = (s: string, t: string) => allSubjectMap.get(s)?.topics[t]

  const total = list.data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <PageHeader
        title="GATE Question Bank"
        subtitle={
          meta.data
            ? `${meta.data.total.toLocaleString()} questions from ${meta.data.papers.length} official papers (1991–2026) across CSE, IT & DA. Complete with option keys, worked solutions, and instant topic filtering.`
            : 'Past-year questions from every GATE CSE, IT and DA paper.'
        }
      />

      {/* ── Official GATE CBT Exam Mode Launch Banner ── */}
      <div className="card relative overflow-hidden border-accent-brand/40 bg-gradient-to-r from-accent-brand/15 via-bg-surface-2/60 to-bg-surface p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
              Real Exam Simulator
            </span>
            <span className="rounded-lg bg-accent-brand/20 px-2.5 py-0.5 text-[11px] font-bold text-accent-brand uppercase tracking-wider">
              Official TCS iON CBT Mode
            </span>
          </div>
          <h3 className="text-lg font-black text-text-primary">
            Attempt Real 3-Hour GATE Papers in Authentic CBT Mode
          </h3>
          <p className="text-[13px] text-text-muted max-w-xl">
            Experience real GATE exam pressure: 180-min timer, 5-state question palette, official virtual scientific calculator, and instant post-exam AI attempt analysis with Predicted All India Rank.
          </p>
        </div>

        <Link
          to="/gate/cbt"
          className="btn-primary inline-flex items-center gap-2 !px-5 !py-2.5 !text-[13.5px] font-bold shadow-lg shadow-accent-brand/25 transition-all hover:scale-105 cursor-pointer"
        >
          <Play className="size-4" /> Launch CBT Exam Mode
        </Link>
      </div>

      {/* ── Quick Curated Presets Bar ── */}
      <div className="overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-text-muted uppercase shrink-0">
            <Sparkles className="size-3.5 text-accent-brand" /> Presets
          </span>

          <button
            type="button"
            onClick={() => selectEra(2024, 2026)}
            className={cn(
              'gate-preset-chip',
              year.length === 3 && ['2024', '2025', '2026'].every((y) => year.includes(y)) && 'gate-preset-chip-on',
            )}
          >
            ⚡ Latest Era (2024–2026)
          </button>

          <button
            type="button"
            onClick={() => {
              setExam(['DA'])
              setSubject([])
            }}
            className={cn('gate-preset-chip', exam.length === 1 && exam[0] === 'DA' && 'gate-preset-chip-on')}
          >
            🤖 Data Science & AI (DA)
          </button>

          <button
            type="button"
            onClick={() => {
              setExam(['CSE'])
            }}
            className={cn('gate-preset-chip', exam.length === 1 && exam[0] === 'CSE' && 'gate-preset-chip-on')}
          >
            💻 Computer Science (CSE)
          </button>

          <button
            type="button"
            onClick={() => setMarks(['2'])}
            className={cn('gate-preset-chip', marks.length === 1 && marks[0] === '2' && 'gate-preset-chip-on')}
          >
            🎯 2-Mark High Scorers
          </button>

          <button
            type="button"
            onClick={() => {
              setSubject(['ml', 'ai'])
            }}
            className={cn(
              'gate-preset-chip',
              subject.length === 2 && subject.includes('ml') && subject.includes('ai') && 'gate-preset-chip-on',
            )}
          >
            🧠 Machine Learning & AI
          </button>

          <button
            type="button"
            onClick={() => {
              setSubject(['dm', 'la'])
            }}
            className={cn(
              'gate-preset-chip',
              subject.length === 2 && subject.includes('dm') && subject.includes('la') && 'gate-preset-chip-on',
            )}
          >
            🧮 Discrete Math & Linear Algebra
          </button>

          <button
            type="button"
            onClick={() => {
              setSubject(['os', 'cn'])
            }}
            className={cn(
              'gate-preset-chip',
              subject.length === 2 && subject.includes('os') && subject.includes('cn') && 'gate-preset-chip-on',
            )}
          >
            ⚙️ Operating Systems & Networks
          </button>

          <button
            type="button"
            onClick={() => {
              setSubject(['algo', 'pds'])
            }}
            className={cn(
              'gate-preset-chip',
              subject.length === 2 && subject.includes('algo') && subject.includes('pds') && 'gate-preset-chip-on',
            )}
          >
            ⚡ Algorithms & Data Structures
          </button>

          <button
            type="button"
            onClick={() => setType(['NAT'])}
            className={cn('gate-preset-chip', type.length === 1 && type[0] === 'NAT' && 'gate-preset-chip-on')}
          >
            🔢 Numerical (NAT)
          </button>

          <button
            type="button"
            onClick={() => setType(['MSQ'])}
            className={cn('gate-preset-chip', type.length === 1 && type[0] === 'MSQ' && 'gate-preset-chip-on')}
          >
            🔘 Multiple Select (MSQ)
          </button>

          <button
            type="button"
            onClick={() => setFigureFilter(hasFigure === 'yes' ? '' : 'yes')}
            className={cn('gate-preset-chip', hasFigure === 'yes' && 'gate-preset-chip-on')}
          >
            <ImageIcon className="size-3.5" /> With Diagrams
          </button>
        </div>
      </div>

      {/* ── Main Search & Filter Control Bar ── */}
      <div className="card gate-filter-panel p-3.5 sm:p-5">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="gate-search flex min-w-[240px] flex-1 items-center gap-2.5 rounded-xl px-3.5 shadow-sm">
            <Search className="size-4 shrink-0 text-text-muted" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder='Search by keyword, math equation, concept (e.g. "QuickSort", "PCA", "LR(1)", "eigenvalue")'
              className="min-w-0 flex-1 bg-transparent py-2.5 text-[14px] text-text-primary outline-none placeholder:text-text-muted"
              spellCheck={false}
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                aria-label="Clear search"
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 rounded-xl bg-bg-surface-2 px-3 py-1.5 border border-border">
            <ArrowDownWideNarrow className="size-4 text-text-muted" />
            <span className="text-[12px] font-medium text-text-muted hidden sm:inline">Sort:</span>
            <select
              value={sort}
              onChange={(e) => setSortOrder(e.target.value)}
              className="bg-transparent text-[13px] font-semibold text-text-primary outline-none cursor-pointer"
            >
              <option value="year-desc">Year: Newest (2026 → 1991)</option>
              <option value="year-asc">Year: Oldest (1991 → 2026)</option>
              <option value="marks-desc">Marks: High to Low (2 → 1)</option>
              <option value="marks-asc">Marks: Low to High (1 → 2)</option>
              <option value="subject-asc">Subject (A to Z)</option>
            </select>
          </div>

          {/* Filter Panel Toggle */}
          <button
            type="button"
            onClick={() => setShowFilters((s) => !s)}
            aria-expanded={showFilters}
            className={cn(
              'btn-secondary inline-flex items-center gap-2 !py-2 !px-3.5 !text-[13px] font-semibold transition-all',
              showFilters && '!border-accent-brand !bg-accent-brand/10',
            )}
          >
            <SlidersHorizontal className="size-4 text-accent-brand" />
            <span>Filters</span>
            {activeCount > 0 && <span className="gate-pill-n !bg-accent-brand !text-white">{activeCount}</span>}
            {showFilters ? <ChevronUp className="size-3.5 ml-0.5 text-text-muted" /> : <ChevronDown className="size-3.5 ml-0.5 text-text-muted" />}
          </button>

          {activeCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="btn-ghost inline-flex items-center gap-1.5 !py-2 !text-[12.5px] text-text-muted hover:text-red-500"
            >
              <RotateCcw className="size-3.5" /> Reset
            </button>
          )}
        </div>

        {/* ── Active Filters Chips Row ── */}
        {activeCount > 0 && (
          <div className="mt-3.5 flex flex-wrap items-center gap-1.5 pt-3 border-t border-border">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mr-1">Active:</span>

            {exam.map((e) => (
              <button key={e} type="button" onClick={() => toggleExam(e)} className="gate-active-badge">
                Exam: {e} <X className="size-3" />
              </button>
            ))}

            {subject.map((s) => (
              <button key={s} type="button" onClick={() => toggleSubject(s)} className="gate-active-badge">
                Subject: {subjectName(s)} <X className="size-3" />
              </button>
            ))}

            {topic.map((t) => {
              const label = availableTopics.find((at) => at.id === t)?.label ?? t
              return (
                <button key={t} type="button" onClick={() => toggleTopic(t)} className="gate-active-badge">
                  Topic: {label} <X className="size-3" />
                </button>
              )
            })}

            {year.length > 0 && year.length <= 5 && year.map((y) => (
              <button key={y} type="button" onClick={() => toggleYear(y)} className="gate-active-badge">
                Year: {y} <X className="size-3" />
              </button>
            ))}

            {year.length > 5 && (
              <button type="button" onClick={() => setYear([])} className="gate-active-badge">
                {year.length} Years Selected <X className="size-3" />
              </button>
            )}

            {type.map((t) => (
              <button key={t} type="button" onClick={() => toggleType(t)} className="gate-active-badge">
                Type: {TYPE_LABEL[t as QType] || t} <X className="size-3" />
              </button>
            ))}

            {marks.map((m) => (
              <button key={m} type="button" onClick={() => toggleMarks(m)} className="gate-active-badge">
                Marks: {m}M <X className="size-3" />
              </button>
            ))}

            {hasFigure && (
              <button type="button" onClick={() => setFigureFilter('')} className="gate-active-badge">
                {hasFigure === 'yes' ? 'Has Diagrams' : 'Text Only'} <X className="size-3" />
              </button>
            )}

            {q && (
              <button type="button" onClick={() => setSearchInput('')} className="gate-active-badge">
                Search: "{q}" <X className="size-3" />
              </button>
            )}
          </div>
        )}

        {/* ── Collapsible Deep Filters ── */}
        {showFilters && (
          <div className="mt-4 space-y-5 border-t border-border pt-4">
            {/* 1. Exam & Stream */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-20 shrink-0 text-[11px] font-bold tracking-wide text-text-muted uppercase">Exam Stream</span>
              <div className="flex flex-wrap gap-1.5">
                {exams.map((e) => {
                  const on = exam.includes(e.id)
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => toggleExam(e.id)}
                      className={cn('gate-pill font-semibold', on && 'gate-pill-on')}
                    >
                      {e.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 2. Categorized Subjects by Domain */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider text-text-muted uppercase flex items-center gap-1.5">
                  <Layers className="size-3.5 text-accent-brand" /> Subjects by Domain
                </span>
                {subject.length > 0 && (
                  <button type="button" onClick={() => setSubject([])} className="text-[11px] font-medium text-accent-brand hover:underline">
                    Clear Subjects ({subject.length})
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {DOMAIN_GROUPS.map((grp) => {
                  const GrpIcon = grp.icon
                  const grpSubjects = subjectBlocks.filter((s) => grp.subjects.includes(s.id))
                  if (!grpSubjects.length) return null

                  return (
                    <div key={grp.id} className="gate-domain-box space-y-2">
                      <div className="flex items-center gap-1.5 text-[12px] font-bold text-text-primary">
                        <GrpIcon className="size-3.5 text-accent-brand shrink-0" />
                        <span>{grp.title}</span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {grpSubjects.map((s) => {
                          const on = subject.includes(s.id)
                          const count = list.data?.facets?.subject?.[s.id]
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => toggleSubject(s.id)}
                              className={cn('gate-pill text-[11.5px]', on && 'gate-pill-on')}
                            >
                              <span>{s.label}</span>
                              {count != null && <span className="gate-pill-n">{count}</span>}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 3. Deep Topic Explorer */}
            <div className="space-y-2.5 pt-2 border-t border-border">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold tracking-wider text-text-muted uppercase flex items-center gap-1.5">
                  <Binary className="size-3.5 text-accent-brand" /> Topics Explorer
                  {subject.length > 0 && <span className="text-text-muted lowercase font-normal">(filtered by selected subjects)</span>}
                </span>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 rounded-lg bg-bg-surface-2 px-2.5 py-1 border border-border text-[12px]">
                    <Search className="size-3 text-text-muted" />
                    <input
                      value={topicSearch}
                      onChange={(e) => setTopicSearch(e.target.value)}
                      placeholder="Filter topics..."
                      className="w-28 sm:w-36 bg-transparent outline-none text-text-primary text-[11.5px] placeholder:text-text-muted"
                    />
                    {topicSearch && (
                      <button type="button" onClick={() => setTopicSearch('')} className="text-text-muted hover:text-text-primary">
                        <X className="size-3" />
                      </button>
                    )}
                  </div>
                  {topic.length > 0 && (
                    <button type="button" onClick={() => setTopic([])} className="text-[11px] font-medium text-accent-brand hover:underline">
                      Clear Topics ({topic.length})
                    </button>
                  )}
                </div>
              </div>

              {filteredTopics.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1 rounded-xl bg-bg-surface-2/40 border border-border/60">
                  {filteredTopics.map((t) => {
                    const on = topic.includes(t.id) || topic.includes(t.key)
                    const count = list.data?.facets?.topic?.[t.id] ?? list.data?.facets?.topic?.[t.key]
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTopic(t.id)}
                        className={cn('gate-pill text-[11.5px]', on && 'gate-pill-on')}
                      >
                        <span className="text-text-muted text-[10px] uppercase font-mono mr-0.5">{t.subjId}:</span>
                        <span>{t.label}</span>
                        {count != null && <span className="gate-pill-n">{count}</span>}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="text-[12px] text-text-muted italic py-1">No topics match "{topicSearch}".</p>
              )}
            </div>

            {/* 4. Years & Era Quick Select */}
            <div className="space-y-2.5 pt-2 border-t border-border">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold tracking-wider text-text-muted uppercase">Years & Examination Era</span>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="text-text-muted">Quick Era:</span>
                  <button type="button" onClick={() => selectEra(2024, 2026)} className="gate-chip hover:text-accent-brand cursor-pointer">
                    2024–2026
                  </button>
                  <button type="button" onClick={() => selectEra(2020, 2023)} className="gate-chip hover:text-accent-brand cursor-pointer">
                    2020–2023
                  </button>
                  <button type="button" onClick={() => selectEra(2014, 2019)} className="gate-chip hover:text-accent-brand cursor-pointer">
                    2014–2019
                  </button>
                  <button type="button" onClick={() => selectEra(2000, 2013)} className="gate-chip hover:text-accent-brand cursor-pointer">
                    2000–2013
                  </button>
                  <button type="button" onClick={() => selectEra(1991, 1999)} className="gate-chip hover:text-accent-brand cursor-pointer">
                    1990s
                  </button>
                  {year.length > 0 && (
                    <button type="button" onClick={() => setYear([])} className="text-accent-brand hover:underline font-semibold ml-1">
                      Clear ({year.length})
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 rounded-xl bg-bg-surface-2/30 border border-border/40">
                {years.map((y) => {
                  const on = year.includes(y.id)
                  const count = list.data?.facets?.year?.[y.id]
                  return (
                    <button
                      key={y.id}
                      type="button"
                      onClick={() => toggleYear(y.id)}
                      className={cn('gate-pill font-mono text-[11.5px]', on && 'gate-pill-on')}
                    >
                      <span>{y.label}</span>
                      {count != null && <span className="gate-pill-n">{count}</span>}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 5. Format, Marks & Characteristics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border">
              {/* Question Type */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold tracking-wider text-text-muted uppercase">Question Type</span>
                <div className="flex flex-wrap gap-1.5">
                  {TYPES.map((t) => {
                    const on = type.includes(t)
                    const count = list.data?.facets?.type?.[t]
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleType(t)}
                        title={TYPE_LABEL[t]}
                        className={cn('gate-pill text-[11.5px]', on && 'gate-pill-on')}
                      >
                        <span>{t}</span>
                        {count != null && <span className="gate-pill-n">{count}</span>}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Marks Weightage */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold tracking-wider text-text-muted uppercase">Marks Weightage</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: '1', label: '1 Mark' },
                    { id: '2', label: '2 Marks' },
                    { id: '5', label: '5 Marks (Legacy)' },
                  ].map((m) => {
                    const on = marks.includes(m.id)
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleMarks(m.id)}
                        className={cn('gate-pill font-semibold text-[11.5px]', on && 'gate-pill-on')}
                      >
                        {m.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Diagrams & Visuals */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold tracking-wider text-text-muted uppercase">Diagrams & Figures</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFigureFilter('')}
                    className={cn('gate-pill text-[11.5px]', !hasFigure && 'gate-pill-on')}
                  >
                    All Questions
                  </button>
                  <button
                    type="button"
                    onClick={() => setFigureFilter('yes')}
                    className={cn('gate-pill text-[11.5px]', hasFigure === 'yes' && 'gate-pill-on')}
                  >
                    <ImageIcon className="size-3" /> Has Diagram
                  </button>
                  <button
                    type="button"
                    onClick={() => setFigureFilter('no')}
                    className={cn('gate-pill text-[11.5px]', hasFigure === 'no' && 'gate-pill-on')}
                  >
                    Text Only
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Results List ── */}
      {meta.error && <ErrorState message={meta.error} />}
      {list.loading && !list.data ? (
        <LoadingBlock rows={6} />
      ) : list.error ? (
        <ErrorState message={list.error} />
      ) : total === 0 ? (
        <EmptyState
          icon={<SearchX className="size-8" />}
          title="No questions match"
          description="Try broadening your subject/topic filters, adjusting the year range, or clearing the search terms."
        />
      ) : (
        <>
          <div className="flex items-center justify-between mb-3 text-[13px] text-text-muted">
            <p>
              Showing <span className="font-semibold text-text-primary">{((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)}</span> of <span className="font-semibold text-text-primary">{total.toLocaleString()}</span> questions
              {pages > 1 && <> · Page {page} of {pages}</>}
            </p>
            {activeCount > 0 && (
              <button type="button" onClick={clearAll} className="text-accent-brand hover:underline font-medium text-[12.5px]">
                Reset All Filters
              </button>
            )}
          </div>

          <div className="space-y-4">
            {list.data!.questions.map((x) => (
              <QuestionView
                key={x.id}
                q={x}
                subjectName={subjectName(x.subject)}
                topicName={topicName(x.subject, x.topic)}
              />
            ))}
          </div>

          {pages > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="btn-secondary inline-flex items-center gap-1 !py-2 !px-3.5 !text-[13px] font-semibold disabled:opacity-40"
              >
                <ChevronLeft className="size-4" /> Previous
              </button>
              <div className="flex items-center gap-1 font-mono text-[12.5px] text-text-muted px-2">
                <span className="font-bold text-text-primary">{page}</span>
                <span>/</span>
                <span>{pages}</span>
              </div>
              <button
                type="button"
                disabled={page >= pages}
                onClick={() => setPage(page + 1)}
                className="btn-secondary inline-flex items-center gap-1 !py-2 !px-3.5 !text-[13px] font-semibold disabled:opacity-40"
              >
                Next <ChevronRight className="size-4" />
              </button>
            </nav>
          )}
        </>
      )}

      {meta.data && (
        <p className="mt-10 text-center text-[12px] text-text-muted">
          Database contains {meta.data.total.toLocaleString()} verified questions across {meta.data.papers.length} official papers (1991–2026).
        </p>
      )}
    </div>
  )
}
