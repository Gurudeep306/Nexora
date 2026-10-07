import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowDownWideNarrow,
  Binary,
  Brain,
  Calendar,
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
import { TYPE_LABEL, paperLabel, type GateList, type GateMeta, type QType } from '@/gate/types'

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
  {
    id: 'legacy',
    title: 'Hardware & Legacy Systems',
    icon: Binary,
    subjects: ['legacy'],
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
  const [filterTab, setFilterTab] = useState<'subject' | 'year' | 'more'>('subject')
  const [topicSearch, setTopicSearch] = useState('')
  const page = Math.max(1, Number(params.get('page') ?? 1))

  const [exam, toggleExam, setExam] = useListParam('exam')
  const [paper, togglePaper, setPaper] = useListParam('paper')
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
    paper: paper.join(','),
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
    [q, exam.join(), paper.join(), year.join(), subject.join(), topic.join(), type.join(), marks.join(), section.join(), hasFigure, sort, page],
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

  // Topics corresponding strictly to selected subjects
  const availableTopics = useMemo(() => {
    if (subject.length === 0) return []
    const targetBlocks = subjectBlocks.filter((s) => subject.includes(s.id))

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

  const topicLabel = useCallback((t: string) => {
    if (t.includes('/')) {
      const [sId, tKey] = t.split('/')
      return allSubjectMap.get(sId)?.topics[tKey] || t
    }
    for (const s of subjectBlocks) {
      if (s.topics[t]) return s.topics[t]
    }
    return t
  }, [allSubjectMap, subjectBlocks])

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

  // Era helper functions with toggle capability
  const selectEra = (startYear: number, endYear: number) => {
    const eraYears = years.filter((y) => {
      const yr = Number(y.id)
      return yr >= startYear && yr <= endYear
    }).map((y) => y.id)
    const isEraSelected = eraYears.length > 0 && eraYears.length === year.length && eraYears.every((y) => year.includes(y))
    if (isEraSelected) {
      setYear([])
    } else {
      setYear(eraYears)
    }
  }

  // Active filters count
  const activeCount =
    exam.length +
    paper.length +
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
              if (exam.length === 1 && exam[0] === 'DA') {
                setExam([])
              } else {
                setExam(['DA'])
                setSubject([])
              }
            }}
            className={cn('gate-preset-chip', exam.length === 1 && exam[0] === 'DA' && 'gate-preset-chip-on')}
          >
            🤖 Data Science & AI (DA)
          </button>

          <button
            type="button"
            onClick={() => {
              if (exam.length === 1 && exam[0] === 'CSE') {
                setExam([])
              } else {
                setExam(['CSE'])
              }
            }}
            className={cn('gate-preset-chip', exam.length === 1 && exam[0] === 'CSE' && 'gate-preset-chip-on')}
          >
            💻 Computer Science (CSE)
          </button>

          <button
            type="button"
            onClick={() => {
              if (marks.length === 1 && marks[0] === '2') {
                setMarks([])
              } else {
                setMarks(['2'])
              }
            }}
            className={cn('gate-preset-chip', marks.length === 1 && marks[0] === '2' && 'gate-preset-chip-on')}
          >
            🎯 2-Mark High Scorers
          </button>

          <button
            type="button"
            onClick={() => {
              if (subject.length === 2 && subject.includes('ml') && subject.includes('ai')) {
                setSubject([])
              } else {
                setSubject(['ml', 'ai'])
              }
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
              if (subject.length === 2 && subject.includes('dm') && subject.includes('la')) {
                setSubject([])
              } else {
                setSubject(['dm', 'la'])
              }
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
              if (subject.length === 2 && subject.includes('os') && subject.includes('cn')) {
                setSubject([])
              } else {
                setSubject(['os', 'cn'])
              }
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
              if (subject.includes('algo') && subject.includes('pds')) {
                setSubject([])
              } else {
                setSubject(['algo', 'pds', 'pdsa'])
              }
            }}
            className={cn(
              'gate-preset-chip',
              subject.includes('algo') && subject.includes('pds') && 'gate-preset-chip-on',
            )}
          >
            ⚡ Algorithms & Data Structures
          </button>

          <button
            type="button"
            onClick={() => {
              if (type.length === 1 && type[0] === 'NAT') {
                setType([])
              } else {
                setType(['NAT'])
              }
            }}
            className={cn('gate-preset-chip', type.length === 1 && type[0] === 'NAT' && 'gate-preset-chip-on')}
          >
            🔢 Numerical (NAT)
          </button>

          <button
            type="button"
            onClick={() => {
              if (type.length === 1 && type[0] === 'MSQ') {
                setType([])
              } else {
                setType(['MSQ'])
              }
            }}
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

            {paper.map((p) => {
              const pObj = meta.data?.papers?.find((item) => item.id === p)
              const label = pObj ? paperLabel(pObj) : p
              return (
                <button key={p} type="button" onClick={() => togglePaper(p)} className="gate-active-badge">
                  Paper: {label} <X className="size-3" />
                </button>
              )
            })}

            {subject.map((s) => (
              <button key={s} type="button" onClick={() => toggleSubject(s)} className="gate-active-badge">
                Subject: {subjectName(s)} <X className="size-3" />
              </button>
            ))}

            {topic.map((t) => {
              const label = topicLabel(t)
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

        {/* ── Mode-Based Filter Panel ── */}
        {showFilters && (
          <div className="mt-4 space-y-4 border-t border-border pt-4">
            {/* Filter Navigation Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-border pb-3 text-[12px] sm:text-[13px] font-bold">
              <button
                type="button"
                onClick={() => setFilterTab('subject')}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-3.5 py-2 transition-all cursor-pointer border',
                  filterTab === 'subject'
                    ? 'border-accent-brand bg-accent-brand/15 text-accent-brand shadow-sm'
                    : 'border-transparent text-text-muted hover:bg-bg-surface-2 hover:text-text-primary',
                )}
              >
                <Layers className="size-4" />
                <span>Browse by Subject & Topics</span>
                {subject.length > 0 && (
                  <span className="gate-pill-n !bg-accent-brand !text-white">{subject.length}</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('year')}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-3.5 py-2 transition-all cursor-pointer border',
                  filterTab === 'year'
                    ? 'border-accent-brand bg-accent-brand/15 text-accent-brand shadow-sm'
                    : 'border-transparent text-text-muted hover:bg-bg-surface-2 hover:text-text-primary',
                )}
              >
                <Calendar className="size-4" />
                <span>Browse by Year & Papers</span>
                {(year.length > 0 || paper.length > 0) && (
                  <span className="gate-pill-n !bg-accent-brand !text-white">{year.length + paper.length}</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('more')}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-3.5 py-2 transition-all cursor-pointer border',
                  filterTab === 'more'
                    ? 'border-accent-brand bg-accent-brand/15 text-accent-brand shadow-sm'
                    : 'border-transparent text-text-muted hover:bg-bg-surface-2 hover:text-text-primary',
                )}
              >
                <SlidersHorizontal className="size-4" />
                <span>Question Type & Marks</span>
                {(type.length > 0 || marks.length > 0 || hasFigure || exam.length > 0) && (
                  <span className="gate-pill-n !bg-accent-brand !text-white">
                    {type.length + marks.length + (hasFigure ? 1 : 0) + exam.length}
                  </span>
                )}
              </button>
            </div>

            {/* TAB 1: SUBJECT & TOPICS HIERARCHY */}
            {filterTab === 'subject' && (
              <div className="space-y-4 animate-fade-in">
                {/* 1. Subjects Grid grouped by domain */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold tracking-wider text-text-muted uppercase flex items-center gap-1.5">
                      <Layers className="size-3.5 text-accent-brand" /> 1. Select a Subject
                    </span>
                    {subject.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSubject([])
                          setTopic([])
                        }}
                        className="text-[11px] font-semibold text-accent-brand hover:underline cursor-pointer"
                      >
                        Clear Selected Subjects ({subject.length})
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {DOMAIN_GROUPS.map((grp) => {
                      const GrpIcon = grp.icon
                      const grpSubjects = subjectBlocks.filter((s) => grp.subjects.includes(s.id))
                      if (!grpSubjects.length) return null

                      const allInGrp = grpSubjects.map((s) => s.id)
                      const allActive = allInGrp.every((id) => subject.includes(id))

                      return (
                        <div key={grp.id} className="gate-domain-box space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-[12px] font-bold text-text-primary">
                              <GrpIcon className="size-3.5 text-accent-brand shrink-0" />
                              <span>{grp.title}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (allActive) {
                                  setSubject(subject.filter((id) => !allInGrp.includes(id)))
                                } else {
                                  setSubject([...new Set([...subject, ...allInGrp])])
                                }
                              }}
                              className="text-[10px] font-semibold text-text-muted hover:text-accent-brand transition-colors cursor-pointer"
                            >
                              {allActive ? 'Deselect All' : 'Select All'}
                            </button>
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

                {/* 2. Subtopics Shelf (Appears strictly when subject is selected) */}
                {subject.length > 0 ? (
                  <div className="rounded-2xl border border-accent-brand/35 bg-accent-brand/5 p-4 space-y-3 animate-fade-in shadow-inner">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-accent-brand/20 pb-2.5">
                      <div className="flex flex-wrap items-center gap-2 text-[12.5px] font-bold text-text-primary">
                        <Binary className="size-4 text-accent-brand" />
                        <span>2. Subtopics of</span>
                        <span className="text-accent-brand">
                          {subject.map((s) => subjectName(s)).join(', ')}
                        </span>
                        <span className="text-[11px] font-mono text-text-muted">({filteredTopics.length} topics)</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 rounded-lg bg-bg-surface px-2.5 py-1 border border-border text-[12px]">
                          <Search className="size-3 text-text-muted" />
                          <input
                            value={topicSearch}
                            onChange={(e) => setTopicSearch(e.target.value)}
                            placeholder="Filter subtopics..."
                            className="w-28 sm:w-36 bg-transparent outline-none text-text-primary text-[11.5px] placeholder:text-text-muted"
                          />
                          {topicSearch && (
                            <button type="button" onClick={() => setTopicSearch('')} className="text-text-muted hover:text-text-primary">
                              <X className="size-3" />
                            </button>
                          )}
                        </div>
                        {topic.length > 0 && (
                          <button type="button" onClick={() => setTopic([])} className="text-[11px] font-semibold text-accent-brand hover:underline">
                            Clear Topics ({topic.length})
                          </button>
                        )}
                      </div>
                    </div>

                    {filteredTopics.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 p-1 max-h-52 overflow-y-auto">
                        {filteredTopics.map((t) => {
                          const on = topic.includes(t.id) || topic.includes(t.key)
                          const count = list.data?.facets?.topic?.[t.id] ?? list.data?.facets?.topic?.[t.key]
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => toggleTopic(t.id)}
                              className={cn('gate-pill text-[12px] py-1 px-3 font-medium', on && 'gate-pill-on')}
                            >
                              {subject.length > 1 && (
                                <span className="text-text-muted text-[10px] uppercase font-mono mr-1">{t.subjId}:</span>
                              )}
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
                ) : (
                  <div className="rounded-xl border border-dashed border-border/80 bg-bg-surface-2/30 p-4 text-center text-[12.5px] text-text-muted">
                    💡 <strong className="text-text-primary">Select any subject above</strong> (such as Discrete Mathematics, Algorithms, or Operating Systems) to reveal its subtopics and filter specifically by topic.
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: YEAR-WISE & OFFICIAL PAPERS */}
            {filterTab === 'year' && (
              <div className="space-y-4 animate-fade-in">
                {/* 1. Era Quick Picker & Timeline */}
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-bold tracking-wider text-text-muted uppercase">
                      Select Examination Year (1991–2026)
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="text-text-muted">Era Presets:</span>
                      {[
                        { label: '2024–2026 (Latest)', start: 2024, end: 2026 },
                        { label: '2020–2023', start: 2020, end: 2023 },
                        { label: '2014–2019', start: 2014, end: 2019 },
                        { label: '2000–2013', start: 2000, end: 2013 },
                        { label: '1990s', start: 1991, end: 1999 },
                      ].map((era) => {
                        const eraYrs = years.filter((y) => Number(y.id) >= era.start && Number(y.id) <= era.end).map((y) => y.id)
                        const on = eraYrs.length > 0 && eraYrs.length === year.length && eraYrs.every((y) => year.includes(y))
                        return (
                          <button
                            key={era.label}
                            type="button"
                            onClick={() => selectEra(era.start, era.end)}
                            className={cn('gate-chip hover:text-accent-brand cursor-pointer', on && 'gate-preset-chip-on !text-accent-brand')}
                          >
                            {era.label}
                          </button>
                        )
                      })}
                      {year.length > 0 && (
                        <button type="button" onClick={() => setYear([])} className="text-accent-brand hover:underline font-semibold ml-1 cursor-pointer">
                          Clear Years ({year.length})
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 rounded-xl bg-bg-surface-2/40 border border-border/60">
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

                {/* 2. Official Paper Cards for Selected Year or Search */}
                <div className="space-y-2.5 pt-2 border-t border-border">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-bold tracking-wider text-text-muted uppercase">
                      Official Master Papers {year.length > 0 ? `(${year.join(', ')})` : ''}
                    </span>
                    {paper.length > 0 && (
                      <button type="button" onClick={() => setPaper([])} className="text-[11px] font-semibold text-accent-brand hover:underline cursor-pointer">
                        Clear Paper ({paper.length})
                      </button>
                    )}
                  </div>

                  {/* Fast 1-click Paper Selection Chips */}
                  <div className="flex flex-wrap gap-2">
                    {(meta.data?.papers ?? [])
                      .filter((p) => year.length === 0 || year.includes(String(p.year)))
                      .map((p) => {
                        const on = paper.includes(p.id)
                        const count = list.data?.facets?.paper?.[p.id]
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => togglePaper(p.id)}
                            className={cn(
                              'flex items-center gap-2 rounded-xl px-3 py-1.5 text-[12px] font-semibold border transition-all cursor-pointer',
                              on
                                ? 'border-accent-brand bg-accent-brand/15 text-accent-brand shadow-sm'
                                : 'border-border bg-bg-surface-2/60 text-text-secondary hover:border-accent-brand/40 hover:text-text-primary',
                            )}
                          >
                            <span>{p.exam} {p.year} {p.set ? `Set ${p.set}` : ''}</span>
                            <span className="rounded bg-black/10 dark:bg-white/10 px-1.5 py-0.2 font-mono text-[10.5px]">
                              {count != null ? count : `${p.count} Qs`}
                            </span>
                          </button>
                        )
                      })}
                  </div>

                  {/* Complete Official Paper Dropdown */}
                  <div className="pt-1">
                    <select
                      value={paper[0] ?? ''}
                      onChange={(e) => setPaper(e.target.value ? [e.target.value] : [])}
                      className="rounded-xl bg-bg-surface-2 px-3 py-2 text-[12.5px] font-semibold text-text-primary border border-border outline-none cursor-pointer w-full max-w-lg"
                    >
                      <option value="">All Official Papers ({meta.data?.papers?.length ?? 0} papers from 1991 to 2026)</option>
                      {(meta.data?.papers ?? []).map((p) => {
                        const count = list.data?.facets?.paper?.[p.id]
                        return (
                          <option key={p.id} value={p.id}>
                            {paperLabel(p)} ({count != null ? `${count} matching` : `${p.count} Qs`})
                          </option>
                        )
                      })}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: FORMAT, MARKS & STREAM */}
            {filterTab === 'more' && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Stream */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold tracking-wider text-text-muted uppercase">Exam Stream</span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setExam([])}
                        className={cn('gate-pill font-semibold', exam.length === 0 && 'gate-pill-on')}
                      >
                        All
                      </button>
                      {exams.map((e) => {
                        const on = exam.includes(e.id)
                        const count = list.data?.facets?.exam?.[e.id]
                        return (
                          <button
                            key={e.id}
                            type="button"
                            onClick={() => toggleExam(e.id)}
                            className={cn('gate-pill font-semibold', on && 'gate-pill-on')}
                          >
                            <span>{e.id}</span>
                            {count != null && <span className="gate-pill-n">{count}</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Question Type */}
                  <div className="space-y-2">
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
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold tracking-wider text-text-muted uppercase">Marks</span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: '1', label: '1 Mark' },
                        { id: '2', label: '2 Marks' },
                        { id: '5', label: '5 Marks' },
                      ].map((m) => {
                        const on = marks.includes(m.id)
                        const count = list.data?.facets?.marks?.[m.id]
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => toggleMarks(m.id)}
                            className={cn('gate-pill font-semibold text-[11.5px]', on && 'gate-pill-on')}
                          >
                            <span>{m.label}</span>
                            {count != null && <span className="gate-pill-n">{count}</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Diagrams & Visuals */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold tracking-wider text-text-muted uppercase">Diagrams & Figures</span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setFigureFilter('')}
                        className={cn('gate-pill text-[11.5px]', !hasFigure && 'gate-pill-on')}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setFigureFilter('yes')}
                        className={cn('gate-pill text-[11.5px]', hasFigure === 'yes' && 'gate-pill-on')}
                      >
                        <ImageIcon className="size-3" />
                        <span>Has Diagram</span>
                        {list.data?.facets?.hasFigure?.yes != null && (
                          <span className="gate-pill-n">{list.data.facets.hasFigure.yes}</span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFigureFilter('no')}
                        className={cn('gate-pill text-[11.5px]', hasFigure === 'no' && 'gate-pill-on')}
                      >
                        <span>Text Only</span>
                        {list.data?.facets?.hasFigure?.no != null && (
                          <span className="gate-pill-n">{list.data.facets.hasFigure.no}</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
        <div className="card p-8 text-center space-y-4">
          <EmptyState
            icon={<SearchX className="size-8" />}
            title="No questions match your current filters"
            description="Try broadening your subject/topic filters, selecting a different exam paper or year, or clearing the search keyword."
          />
          {activeCount > 0 && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={clearAll}
                className="btn-primary inline-flex items-center gap-2 !py-2.5 !px-5 text-[13px] font-bold shadow-md cursor-pointer"
              >
                <RotateCcw className="size-4" /> Reset All Filters ({activeCount})
              </button>
            </div>
          )}
        </div>
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
