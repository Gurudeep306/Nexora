/*
  All of my video explanations (GATE → Notebook → Videos): where each one
  lives, how it is doing, and how much of my video space is used.
*/
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Lock, ThumbsUp, Video } from 'lucide-react'
import { Skeleton } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { EmptyHint, Panel } from '@/gate/insights/ui'
import { explainApi, fmtTime, mediaUrl, type ExplainVideo } from './api'
import { Viewer } from './ExplainVideos'
import './explain.css'

export function MyVideos() {
  const mine = useApi(() => explainApi.mine(), [], { cacheKey: 'explain:mine' })
  const [open, setOpen] = useState<ExplainVideo | null>(null)
  const list = mine.data?.videos ?? []
  const used = mine.data?.used ?? 0
  const limit = mine.data?.limit ?? 1
  const set = (fn: (l: ExplainVideo[]) => ExplainVideo[]) => mine.setData((d) => (d ? { ...d, videos: fn(d.videos) } : d))
  return (
    <Panel title="Videos" icon="play" subtitle={`${list.length} ${list.length === 1 ? 'explanation' : 'explanations'} you recorded · ${(used / 1024 / 1024).toFixed(0)} MB of ${(limit / 1024 / 1024 / 1024).toFixed(0)} GB used`}>
      {mine.loading && !mine.data ? (
        <Skeleton className="h-48 w-full rounded-lg" />
      ) : !list.length ? (
        <EmptyHint icon="play" title="No videos yet">
          Under any practice question or notes lesson, choose “Record one” to explain it with your screen, a whiteboard or your camera.
        </EmptyHint>
      ) : (
        <ul className="ex-grid">
          {list.map((v) => (
            <li key={v.id}>
              <button type="button" className="ex-card" onClick={() => setOpen(v)}>
                <span className="ex-thumb">
                  {v.poster ? <img src={mediaUrl(v.poster)} alt="" loading="lazy" /> : <Video className="size-6" aria-hidden="true" />}
                  <span className="ex-dur">{fmtTime((v.trimEndMs ?? v.durationMs) - v.trimStartMs)}</span>
                  {(v.visibility === 'private' || v.status === 'hidden') && (
                    <span className="ex-flag">
                      <Lock className="size-3" aria-hidden="true" /> {v.status === 'hidden' ? 'Hidden after reports' : 'Only you'}
                    </span>
                  )}
                </span>
                <span className="ex-card-body">
                  <span className="ex-card-title">{v.title}</span>
                  <span className="ex-card-meta">
                    <span className="inline-flex items-center gap-1">
                      <ThumbsUp className="size-3" aria-hidden="true" /> {v.votes}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Eye className="size-3" aria-hidden="true" /> {v.views}
                    </span>
                  </span>
                </span>
              </button>
              {v.about && (
                <Link to={v.about.link} className="ed-link mt-1.5 block truncate text-[12.5px]">
                  {v.about.title}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
      {open && (
        <Viewer
          v={open}
          onClose={() => setOpen(null)}
          onChange={(v) => {
            set((l) => l.map((x) => (x.id === v.id ? { ...x, ...v } : x)))
            setOpen((o) => (o ? { ...o, ...v } : o))
          }}
          onRemoved={(id) => {
            set((l) => l.filter((x) => x.id !== id))
            setOpen(null)
          }}
        />
      )}
    </Panel>
  )
}
