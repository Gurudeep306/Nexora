import { ExternalLink, Link2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { PlatformBadge } from '@/components/shared/PlatformBadge'
import { PLATFORM_HANDLE_KEYS } from './types'

export function PlatformHandles({ settings }: { settings: Record<string, string> }) {
  const entries = PLATFORM_HANDLE_KEYS.map((h) => ({ ...h, handle: settings[h.key] ?? '' }))

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="size-4 text-primary-bright" aria-hidden="true" /> Platform handles
        </CardTitle>
        <CardDescription>Linked accounts used for solved-import and syncing.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2.5">
          {entries.map((e) => (
            <li key={e.key} className="flex items-center justify-between gap-3">
              <PlatformBadge platform={e.label.toLowerCase()} />
              {e.handle ? (
                <a
                  href={e.url(e.handle)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex min-w-0 items-center gap-1.5 font-mono text-xs text-primary-bright transition-colors hover:text-cyan"
                >
                  <span className="truncate">{e.handle}</span>
                  <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                </a>
              ) : (
                <Link
                  to="/settings"
                  className="cursor-pointer text-xs text-foreground-faint transition-colors hover:text-foreground"
                >
                  Link handle
                </Link>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
