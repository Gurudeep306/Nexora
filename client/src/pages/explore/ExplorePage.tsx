/*
  /explore — everything NexoraGuru can do on one page, grouped, with one
  plain line each, where it lives, and a way straight there. Many features
  live inside other pages (the mic, Dry run, Mirror Run, handwritten
  solutions…); this is where people find them.
*/
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Icon } from '@/components/icon/Icon'
import type { IconOrBrand } from '@/components/icon/names'
import { SearchInput } from '@/components/ui'
import { openAssistantEvent } from '@/context/AgentContext'
import { FEATURE_GROUPS, type Feature } from './features'
import './explore.css'

const openMic = () => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM', key: 'm', altKey: true }))

export default function ExplorePage() {
  const [q, setQ] = useState('')
  useEffect(() => {
    document.title = 'Explore · NexoraGuru'
  }, [])
  const groups = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return FEATURE_GROUPS
    return FEATURE_GROUPS.map((g) => ({ ...g, items: g.items.filter((f) => `${f.name} ${f.what} ${f.where} ${f.tags ?? ''} ${g.title}`.toLowerCase().includes(t)) })).filter((g) => g.items.length)
  }, [q])
  const count = FEATURE_GROUPS.reduce((n, g) => n + g.items.length, 0)

  return (
    <div className="xp">
      <header className="xp-head">
        <h1 className="xp-title">Explore</h1>
        <p className="xp-line">Everything NexoraGuru can do — {count} features, each one click away.</p>
        <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a feature: voice, dry run, lecture, notes…" aria-label="Find a feature" />
      </header>
      <nav className="xp-jump" aria-label="Groups">
        {FEATURE_GROUPS.map((g) => (
          <a key={g.id} href={`#${g.id}`} className="xp-jump-link">
            {g.title}
          </a>
        ))}
      </nav>
      {groups.length === 0 && <p className="xp-empty">Nothing matches “{q}”. Try “voice”, “tests” or “live”.</p>}
      {groups.map((g) => (
        <section key={g.id} id={g.id} className="xp-group" aria-labelledby={`xp-${g.id}`}>
          <div className="xp-group-head">
            <h2 id={`xp-${g.id}`} className="xp-group-title">
              {g.title}
            </h2>
            <p className="xp-group-line">{g.line}</p>
          </div>
          <ul className="xp-grid">
            {g.items.map((f) => (
              <li key={f.id}>
                <Card f={f} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function Card({ f }: { f: Feature }) {
  const body = (
    <>
      <span className="xp-icon" aria-hidden="true">
        <Icon name={f.icon as IconOrBrand} className="size-[18px]" />
      </span>
      <span className="xp-text">
        <span className="xp-name">{f.name}</span>
        <span className="xp-what">{f.what}</span>
        <span className="xp-where">{f.where}</span>
      </span>
      <ArrowRight className="xp-go size-4" aria-hidden="true" />
    </>
  )
  if (f.action === 'voice')
    return (
      <button type="button" className="xp-card" onClick={openMic}>
        {body}
      </button>
    )
  if (!f.to)
    return (
      <button type="button" className="xp-card" onClick={() => openAssistantEvent()}>
        {body}
      </button>
    )
  return (
    <Link to={f.to} className="xp-card">
      {body}
    </Link>
  )
}
