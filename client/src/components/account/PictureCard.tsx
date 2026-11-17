import { Link } from 'react-router-dom'
import { ArrowRight, UserRound } from 'lucide-react'
import { Avatar, Card, CardContent } from '@/components/ui'
import { SettingsSection } from './SettingsPrimitives'
import type { ProfileUser } from './types'

/**
 * Settings → Account: your picture now lives in Edit profile (one place for
 * how people see you). This card shows it and opens that form.
 */
export function PictureCard({ user }: { user: ProfileUser }) {
  return (
    <Card>
      <CardContent className="py-5">
        <SettingsSection title="Picture and profile" description="Your photo or avatar, bio, cover and links are all in Edit profile." icon={<UserRound />}>
          <div className="flex flex-wrap items-center gap-4">
            <Avatar seed={user.username} avatar={user.avatar} src={user.avatar_url} name={user.display_name || user.username} size="lg" />
            <Link
              to={`/u/${encodeURIComponent(user.username)}?edit=1`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-text-primary underline decoration-border-strong underline-offset-4 hover:decoration-text-primary"
            >
              Edit profile <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </SettingsSection>
      </CardContent>
    </Card>
  )
}
