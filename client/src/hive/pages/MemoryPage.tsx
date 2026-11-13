import { useCallback, useEffect, useState } from 'react'
import { Bot, Pin, PinOff, Plus, Trash2, Brain } from 'lucide-react'
import { Button, Input, Textarea, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { hiveApi } from '../api'
import { projectColor } from '../projectColor'
import { useHive } from '../store'
import type { MemoryItem } from '../types'
import { PageTitle, UserDot, timeAgo } from '../ui'

export default function MemoryPage() {
  const { boot, project, memoryVersion } = useHive()
  const toast = useToast()
  const [projectId, setProjectId] = useState<string | null>(project?.id ?? boot?.projects[0]?.id ?? null)
  const [items, setItems] = useState<MemoryItem[] | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const load = useCallback(() => {
    if (!projectId) return
    hiveApi
      .memory(projectId)
      .then((r) => setItems(r.memory))
      .catch(() => setItems([]))
  }, [projectId])
  useEffect(() => {
    load()
  }, [load, memoryVersion])
  if (!boot) return null

  const add = async () => {
    if (!projectId) return
    setBusy(true)
    try {
      await hiveApi.addMemory(projectId, { title, body, pinned: true })
      setTitle('')
      setBody('')
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[820px] px-8 pb-20 pt-10">
      <PageTitle icon={<Brain />} title="Memory" sub="What every agent on a project knows before it starts — whichever provider it runs on. Agents add to it as they learn; pin what matters most." />
      <div className="mb-8 flex flex-wrap gap-1 rounded-xl bg-text-primary/[0.04] p-1">
        {boot.projects.map((p) => (
          <button key={p.id} type="button" onClick={() => setProjectId(p.id)} className={cn('flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px]', projectId === p.id ? 'bg-bg-surface text-text-primary shadow-sm' : 'text-text-muted')}>
            <span className="hive-hex size-2.5" style={{ background: projectColor(p.color) }} />
            {p.name}
          </button>
        ))}
      </div>
      {!projectId ? (
        <p className="text-[14px] text-text-muted">Create a project first.</p>
      ) : (
        <>
          <div className="hive-composer mb-10 rounded-2xl p-4">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title — e.g. Error format" className="mb-2 border-0 bg-transparent px-0 text-[15px] font-medium shadow-none focus-visible:ring-0" maxLength={120} />
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="The fact every agent should know — e.g. “APIs answer errors as { error: string } with a 4xx status.”" rows={2} className="resize-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" maxLength={1500} />
            <div className="flex justify-end">
              <Button size="sm" onClick={add} loading={busy} disabled={!title.trim() || !body.trim()}>
                <Plus /> Remember
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {items === null && <div className="hive-shimmer h-24 rounded-2xl" />}
            {items?.length === 0 && <p className="text-[14px] text-text-muted">Nothing yet. Agents add notes here with the remember tool when Shared memory is on.</p>}
            {items?.map((m) => {
              const agent = m.author.startsWith('agent:')
              return (
                <div key={m.id} className="hive-card group flex gap-4 p-4">
                  {agent ? (
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-brand/12 text-accent-brand">
                      <Bot className="size-4" />
                    </span>
                  ) : (
                    <UserDot username={m.author.replace(/^@/, '')} size={8} />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-medium text-text-primary">{m.title}</span>
                      {!!m.pinned && <Pin className="size-3.5 text-accent-brand" />}
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap text-[13.5px] leading-relaxed text-text-secondary">{m.body}</p>
                    <p className="mt-1.5 text-[12px] text-text-muted">
                      {agent ? m.author.replace('agent:', '') : m.author} · {timeAgo(m.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button size="icon-sm" variant="ghost" onClick={() => hiveApi.updateMemory(m.id, { pinned: !m.pinned }).then(load)} aria-label={m.pinned ? 'Unpin' : 'Pin'}>
                      {m.pinned ? <PinOff /> : <Pin />}
                    </Button>
                    <Button size="icon-sm" variant="ghost" onClick={() => hiveApi.deleteMemory(m.id).then(load)} aria-label="Forget">
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
