import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Plus } from 'lucide-react'
import { useToast } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { api, ApiError } from '@/lib/api'
import { Chip, Empty, Failed, Panel, Skeleton } from './kit'
import { ago } from './format'

/*
  Admin → Add a problem. The coding problems staff write themselves: a list
  of drafts and published problems, and "New problem", which opens the
  editor (pages/AuthorProblemPage.tsx). A problem goes live only after all
  five solutions pass every test (src/authoring.js).
*/

export type AuthoredSummary = {
  id: number
  status: 'draft' | 'published'
  problemRowid: number | null
  title: string
  tests: number
  verified: boolean
  updatedAt: string
  updatedBy: string
}

export function AuthoredSection() {
  const toast = useToast()
  const navigate = useNavigate()
  const { data, loading, error, refetch } = useApi(() => api.get<{ problems: AuthoredSummary[] }>('/api/authoring'), [])
  const [making, setMaking] = useState(false)

  const make = async () => {
    setMaking(true)
    try {
      const r = await api.post<{ problem: { id: number } }>('/api/authoring', { data: {} })
      navigate(`/admin/problems/${r.problem.id}`)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not start a new problem')
      setMaking(false)
    }
  }

  const newButton = (
    <button type="button" className="ai-btn ai-btn--main" onClick={() => void make()} disabled={making}>
      {making ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />} New problem
    </button>
  )

  if (loading && !data) return <Skeleton className="h-48" />
  if (error) return <Failed message={error} onRetry={() => void refetch()} />
  const problems = data?.problems ?? []

  return (
    <Panel
      title="Your problems"
      description="Write the statement, the tests and a solution in all five languages. It goes live only when every solution passes every test."
      actions={newButton}
    >
      {problems.length === 0 ? (
        <Empty icon="code" title="No problems yet">
          Start one with New problem. Drafts are saved as you type.
        </Empty>
      ) : (
        <ul className="ai-list">
          {problems.map((p) => (
            <li key={p.id} className="ai-row">
              <div className="min-w-0 flex-1 basis-56">
                <button
                  type="button"
                  onClick={() => navigate(`/admin/problems/${p.id}`)}
                  className="cursor-pointer text-left text-[14px] font-medium text-text-primary underline-offset-2 hover:underline"
                >
                  {p.title}
                </button>
                <p className="m-0 mt-0.5 text-[12.5px] text-text-muted">
                  {p.tests} {p.tests === 1 ? 'test' : 'tests'} · changed {ago(p.updatedAt)} by @{p.updatedBy}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {p.status === 'published' ? <Chip tone="success">Published</Chip> : <Chip>Draft</Chip>}
                {p.verified ? <Chip tone="success">All solutions pass</Chip> : <Chip tone="warning">Not checked</Chip>}
                {p.status === 'published' && p.problemRowid && (
                  <a href={`/solve/${p.problemRowid}`} className="ai-btn">
                    Open
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
