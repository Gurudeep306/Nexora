import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { CalendarDays, Check, Clock, MessageSquare, ShieldCheck, UserCog, UserPlus, Users } from 'lucide-react'
import { Avatar, Badge, Button, useToast } from '@/components/ui'
import { api, ApiError } from '@/lib/api'
import { useSocket } from '@/lib/socket'
import { formatDate } from '@/lib/utils'
import type { ProfileResponse } from './types'

export function ProfileHero({
  profile,
  viewer,
  onChanged,
}: {
  profile: ProfileResponse
  /** Username of the signed-in player; when it differs from the profile, social actions are shown */
  viewer?: string
  onChanged?: () => void
}) {
  const { user } = profile
  const isSelf = !viewer || viewer === user.username
  const isAdmin = user.role === 'admin'
  const name = user.display_name || user.username

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
      className="card-neon relative overflow-hidden p-5 md:p-6"
    >
      <div
        className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
        <Avatar src={user.avatar_url} name={name} size="xl" online={user.status === 'online'} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              className={`font-display text-xl tracking-wide text-foreground md:text-2xl ${
                isAdmin ? 'glow-text' : ''
              }`}
            >
              {name}
            </h2>
            {isAdmin && (
              <Badge variant="gold">
                <ShieldCheck aria-hidden="true" /> Admin
              </Badge>
            )}
            <Badge variant={user.status === 'online' ? 'success' : 'default'}>
              {user.status === 'online' ? 'Online' : 'Offline'}
            </Badge>
            {user.auth_provider && user.auth_provider !== 'manual' && (
              <Badge variant="info" className="normal-case">
                via {user.auth_provider}
              </Badge>
            )}
          </div>
          <p className="mt-1 font-mono text-xs text-foreground-faint">@{user.username}</p>
          {user.bio ? (
            <p className="mt-2 max-w-xl text-sm text-foreground-dim">{user.bio}</p>
          ) : (
            <p className="mt-2 text-sm text-foreground-faint italic">No bio yet — tell the arena who you are.</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-foreground-faint">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" aria-hidden="true" />
              Joined {formatDate(profile.memberSince)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-3.5" aria-hidden="true" />
              <span className="font-mono text-foreground-dim tabular-nums">{profile.friendCount}</span>{' '}
              {profile.friendCount === 1 ? 'friend' : 'friends'}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {isSelf ? (
            <>
              <Link to="/settings">
                <Button variant="outline" size="sm">
                  <UserCog aria-hidden="true" /> Edit profile
                </Button>
              </Link>
              <Link to="/social">
                <Button variant="subtle" size="sm">
                  <Users aria-hidden="true" /> Community
                </Button>
              </Link>
            </>
          ) : (
            <FriendActions profile={profile} viewer={viewer!} onChanged={onChanged} />
          )}
        </div>
      </div>
    </motion.section>
  )
}

function FriendActions({ profile, viewer, onChanged }: { profile: ProfileResponse; viewer: string; onChanged?: () => void }) {
  const toast = useToast()
  const socket = useSocket()
  const [sending, setSending] = useState(false)
  const target = profile.user.username
  const message = (
    <Link to={`/social?tab=messages&peer=${encodeURIComponent(target)}`}>
      <Button variant="subtle" size="sm">
        <MessageSquare aria-hidden="true" /> Message
      </Button>
    </Link>
  )

  const addFriend = async () => {
    setSending(true)
    try {
      const res = await api.post<{ ok: boolean; error?: string }>('/api/friends/request', { from: viewer, to: target })
      if (res.ok === false) {
        toast.warning('Request not sent', res.error)
      } else {
        socket?.emit('notify-friend-request', { to: target, from: viewer })
        toast.success('Friend request sent', `@${target} will see it in Social.`)
      }
      onChanged?.()
    } catch (err) {
      toast.error('Could not send request', err instanceof ApiError ? err.message : undefined)
    } finally {
      setSending(false)
    }
  }

  switch (profile.friendStatus) {
    case 'friends':
      return (
        <>
          <Badge variant="success" className="h-8 px-3">
            <Check aria-hidden="true" /> Allies
          </Badge>
          {message}
        </>
      )
    case 'pending_sent':
      return (
        <>
          <Button variant="outline" size="sm" disabled>
            <Clock aria-hidden="true" /> Request sent
          </Button>
          {message}
        </>
      )
    case 'pending_received':
      return (
        <>
          <Link to="/social?tab=friends">
            <Button variant="primary" size="sm">
              <UserPlus aria-hidden="true" /> Respond to request
            </Button>
          </Link>
          {message}
        </>
      )
    default:
      return (
        <>
          <Button variant="primary" size="sm" loading={sending} onClick={() => void addFriend()}>
            {!sending && <UserPlus aria-hidden="true" />} Add friend
          </Button>
          {message}
        </>
      )
  }
}
