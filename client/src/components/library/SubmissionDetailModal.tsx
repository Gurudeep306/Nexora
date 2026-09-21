import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { Code2, FileQuestion, Timer } from 'lucide-react'
import { Badge, Button, ErrorState, Modal, Skeleton } from '@/components/ui'
import { PlatformBadge, VerdictBadge } from '@/components/shared/PlatformBadge'
import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { monacoLanguage, reconstructCode, type ActivitySubmission, type CodeReplayResponse } from './types'

export function SubmissionDetailModal({
  submission,
  onClose,
}: {
  submission: ActivitySubmission | null
  onClose: () => void
}) {
  const replayApi = useApi<CodeReplayResponse>(
    () => api.get<CodeReplayResponse>(`/api/code-replay/${submission?.id ?? 0}`),
    [submission?.id],
    { skip: !submission },
  )

  const code = useMemo(() => {
    const replay = replayApi.data?.replay
    if (!replayApi.data?.ok || !replay?.events?.length) return null
    return reconstructCode(replay.events)
  }, [replayApi.data])

  if (!submission) return null

  return (
    <Modal
      open={!!submission}
      onClose={onClose}
      size="xl"
      title={
        <span className="flex min-w-0 items-center gap-2">
          <Code2 className="size-4 shrink-0 text-primary-bright" aria-hidden="true" />
          <span className="truncate">Submission #{submission.id}</span>
        </span>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <VerdictBadge verdict={submission.verdict} />
          <PlatformBadge platform={submission.platform} />
          {submission.rating > 0 && (
            <Badge variant="primary" className="font-mono tabular-nums">
              {submission.rating}
            </Badge>
          )}
          {submission.language && (
            <Badge variant="outline" className="font-mono normal-case">
              {submission.language}
            </Badge>
          )}
          <span className="inline-flex items-center gap-1 text-xs text-foreground-dim">
            <Timer className="size-3.5 text-foreground-faint" aria-hidden="true" />
            <span className="font-mono tabular-nums">{submission.exec_time_ms} ms</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{submission.title}</p>
            <p className="mt-0.5 text-xs text-foreground-faint">
              {formatDate(submission.submitted_at)} ·{' '}
              <span className="font-mono tabular-nums">
                {new Date(submission.submitted_at).toLocaleTimeString()}
              </span>
            </p>
          </div>
          <Link
            to={`/problems?q=${encodeURIComponent(submission.title)}`}
            onClick={onClose}
            className="shrink-0"
          >
            <Button variant="outline" size="sm">
              Open problem
            </Button>
          </Link>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">
            Source (reconstructed from code replay)
          </p>
          {replayApi.loading ? (
            <Skeleton className="h-72 w-full" />
          ) : replayApi.error ? (
            <ErrorState message={replayApi.error} onRetry={replayApi.refetch} />
          ) : code && code.trim() ? (
            <div className="overflow-hidden rounded-xl border border-border">
              <Editor
                height="22rem"
                language={monacoLanguage(submission.language)}
                value={code}
                theme="vs-dark"
                options={{
                  readOnly: true,
                  domReadOnly: true,
                  minimap: { enabled: false },
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono','Fira Code',monospace",
                  scrollBeyondLastLine: false,
                  renderLineHighlight: 'none',
                }}
                loading={<Skeleton className="h-72 w-full" />}
              />
            </div>
          ) : (
            <div className="card-neon">
              <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                <FileQuestion className="size-6 text-foreground-faint" aria-hidden="true" />
                <p className="text-sm text-foreground-dim">
                  No source recording for this submission.
                </p>
                <p className="max-w-sm text-xs text-foreground-faint">
                  Replays are only captured for editor sessions with enough activity — older or
                  quick submissions may not have one.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
