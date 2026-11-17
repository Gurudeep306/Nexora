import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Ban, CalendarDays, Flag, Link2, Lock, MapPin, MessageSquare, MoreHorizontal, PenLine, QrCode, VolumeX } from 'lucide-react'
import { Avatar, Button, Card, ConfirmDialog, EmptyState, ErrorState, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, Modal, RankBadge, RankGlyph, Skeleton, useToast } from '@/components/ui'
import { UserBadges } from '@/components/shared/UserBadges'
import { useAuth } from '@/context/AuthContext'
import { useAgentPageContext } from '@/context/AgentContext'
import { api } from '@/lib/api'
import { cn, formatDate } from '@/lib/utils'
import { ActivityHeatmap } from '@/components/profile/ActivityHeatmap'
import { ACCENTS, CoverArt } from '@/components/profile/covers'
import { BadgeCard, LevelBar, Timeline } from '@/components/profile/Showcase'
import { LevelRules } from '@/components/profile/LevelRules'
import { Bridge, Colophon, DifficultyMultiples, Folio, LanguageList, RankSeal, Seal, Shelf, TopicBars } from '@/components/profile/Notebook'
import { calendarSentence, usePersonJsonLd } from '@/components/profile/notebook-data'
import { PortraitMedal } from '@/components/profile/PortraitMedal'
import { useTheme } from '@/context/ThemeContext'
import { PostCard } from '@/components/social/feed/PostCard'
import { FeedEmpty, PostList, usePostList } from '@/components/social/feed/PostList'
import { FollowButton, UserRow } from '@/components/social/feed/People'
import { ReportDialog } from '@/components/social/feed/ReportDialog'
import { RichText } from '@/components/social/feed/RichText'
import { errorText, useSocialPerms } from '@/components/social/feed/lib'
import type { FeedPage, Post, ProfileResponse, Showcase, SocialUser } from '@/components/social/feed/types'
import { postPath } from '@/components/social/feed/types'
import '@/components/social/feed/social.css'
import { isJournalKit } from '@/theme/styles'

const EditProfileSheet = lazy(() => import('@/components/profile/EditProfileSheet'))
const ShareProfileDialog = lazy(() => import('@/components/profile/ShareProfileDialog'))

type TabId = 'overview' | 'posts' | 'replies' | 'media' | 'achievements'

export default function ProfilePage() {
  const { user } = useAuth()
  const me = user?.username ?? ''
  const { username: param } = useParams()
  const username = param ?? me
  const isSelf = username.toLowerCase() === me.toLowerCase()
  useAgentPageContext({ label: isSelf ? 'Your profile' : `Profile · ${username}` })
  const { socialOn } = useSocialPerms()

  const [data, setData] = useState<ProfileResponse | null>(null)
  const [show, setShow] = useState<Showcase | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<TabId>('overview')
  // A public profile page describes a person for search engines (not for private or blocked profiles).
  usePersonJsonLd(data?.profile, !!param && !!data && !data.locked && !show?.locked && !data.relation.blocksMe && data.profile.visibility !== 'followers')

  const load = useCallback(async () => {
    setError(null)
    try {
      const [p, s] = await Promise.all([
        api.get<ProfileResponse>(`/api/profiles/${encodeURIComponent(username)}`),
        api.get<Showcase>(`/api/profiles/${encodeURIComponent(username)}/showcase`).catch(() => ({ locked: true }) as Showcase),
      ])
      setData(p)
      setShow(s)
    } catch (e) {
      setError(errorText(e, 'Profile not found'))
    }
  }, [username])
  useEffect(() => {
    setData(null)
    setShow(null)
    setTab('overview')
    void load()
  }, [load])

  if (error) {
    return (
      <Card className="mx-auto max-w-xl">
        <EmptyState icon="profile" title="This profile doesn't exist" description={error} action={<Link to="/social" className="text-sm text-accent-brand hover:underline">Find people in Community</Link>} />
      </Card>
    )
  }
  if (!data) return <ProfileSkeleton />

  const locked = data.locked || !!show?.locked
  const blocked = data.relation.blocksMe || data.relation.blockedByMe
  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    ...(socialOn
      ? ([
          { id: 'posts', label: 'Posts' },
          { id: 'replies', label: 'Replies' },
          { id: 'media', label: 'Media' },
        ] as const)
      : []),
    { id: 'achievements', label: 'Achievements' },
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <ProfileHero data={data} stats={show?.stats} days={show?.heatmap} isSelf={isSelf} onChanged={load} />

      {blocked ? (
        <Card>
          <EmptyState
            icon="shield"
            title={data.relation.blockedByMe ? `You blocked @${data.profile.username}` : 'This profile is unavailable'}
            description={data.relation.blockedByMe ? 'Unblock them from the ⋯ menu to see their posts again.' : "You can't view this account's posts."}
          />
        </Card>
      ) : locked ? (
        <Card>
          <EmptyState icon="lock" title="These posts are protected" description={`Only approved followers can see @${data.profile.username}'s posts and stats. Send a follow request to ask.`} />
        </Card>
      ) : (
        <>
          <div role="tablist" aria-label="Profile sections" className="sticky top-14 z-20 -mx-4 flex overflow-x-auto border-b border-border bg-bg-app/85 px-4 backdrop-blur-md [scrollbar-width:none] sm:mx-0 sm:px-0">
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn('relative shrink-0 cursor-pointer px-4 py-3 text-sm font-medium transition-colors', tab === t.id ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary')}
              >
                {t.label}
                {tab === t.id && <motion.span layoutId="profile-tab" className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-accent-brand" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
              {tab === 'overview' && show && <Overview show={show} accent={ACCENTS[data.profile.accent]?.color} isSelf={isSelf} onAll={() => setTab('achievements')} />}
              {(tab === 'posts' || tab === 'media') && <UserPosts username={data.profile.username} tab={tab} pinned={show?.pinned} />}
              {tab === 'replies' && <UserReplies username={data.profile.username} />}
              {tab === 'achievements' && show?.achievements && (
                <Folio kicker="The shelf" title={`${show.achievements.filter((a) => a.unlocked_at).length} of ${show.achievements.length} seals earned`}>
                  <div className="pf-shelf">
                    {show.achievements.map((a) => (
                      <Seal key={a.id} a={a} />
                    ))}
                  </div>
                </Folio>
              )}
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-5" aria-busy="true" aria-label="Loading profile">
      <Skeleton className="h-44 w-full rounded-2xl sm:h-56" />
      <div className="flex items-end gap-4 px-4">
        <Skeleton className="-mt-14 size-28 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    </div>
  )
}

function ProfileHero({ data, stats, days, isSelf, onChanged }: { data: ProfileResponse; stats?: Showcase['stats']; days?: Showcase['heatmap']; isSelf: boolean; onChanged: () => void }) {
  const { profile: p, relation } = data
  const toast = useToast()
  const navigate = useNavigate()
  const { socialOn } = useSocialPerms()
  // /u/<you>?edit=1 (Settings → "Edit profile") opens the form straight away.
  const [params, setParams] = useSearchParams()
  const [editing, setEditingState] = useState(() => isSelf && params.get('edit') === '1')
  const setEditing = (open: boolean) => {
    setEditingState(open)
    if (!open && params.has('edit')) {
      const next = new URLSearchParams(params)
      next.delete('edit')
      setParams(next, { replace: true })
    }
  }
  const [sharing, setSharing] = useState(false)
  const [people, setPeople] = useState<null | 'followers' | 'following'>(null)
  const [reporting, setReporting] = useState(false)
  const [confirmBlock, setConfirmBlock] = useState(false)
  const name = p.display_name || p.username
  const accent = ACCENTS[p.accent]?.color ?? ACCENTS.brand.color
  const journal = isJournalKit(useTheme().shown.style)

  const relate = async (kind: 'mute' | 'block', on: boolean) => {
    try {
      if (on) await api.put(`/api/social/${kind}/${encodeURIComponent(p.username)}`)
      else await api.delete(`/api/social/${kind}/${encodeURIComponent(p.username)}`)
      toast.success(`${on ? (kind === 'mute' ? 'Muted' : 'Blocked') : kind === 'mute' ? 'Unmuted' : 'Unblocked'} @${p.username}`)
      onChanged()
    } catch (e) {
      toast.error('Something went wrong', errorText(e))
    }
    setConfirmBlock(false)
  }

  return (
    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="pf-hero card overflow-hidden" aria-label={`${name}'s profile`}>
      <CoverArt cover={p.cover} seed={p.username} accent={p.accent} className="pf-cover h-36 sm:h-52" />
      <div className="pf-hero-body relative px-4 pb-5 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          {journal && stats ? (
            <PortraitMedal handle={p.username} level={stats.level.level} name={stats.level.name} progress={stats.level.xpForNext ? stats.level.xpInLevel / stats.level.xpForNext : 1}>
              <Avatar seed={p.username} avatar={p.avatar} src={p.avatar_url} name={name} size="3xl" ring={false} className="[&_img]:size-[124px]" online={p.status === 'online'} />
            </PortraitMedal>
          ) : (
            <div className="pf-portrait relative -mt-14 sm:-mt-16">
              <div className="pf-portrait-ring ng-ring rounded-full p-[3px]" style={{ '--ng-ring-a': accent, '--ng-ring-b': 'var(--color-state-info)', '--ng-ring-c': 'var(--color-state-success)' } as React.CSSProperties}>
                <div className="rounded-full bg-bg-surface p-[3px]">
                  <Avatar seed={p.username} avatar={p.avatar} src={p.avatar_url} name={name} size="3xl" ring={false} className="[&_img]:size-24 sm:[&_img]:size-28" online={p.status === 'online'} />
                </div>
              </div>
              {stats && <RankGlyph level={stats.level.level} size={38} className="pf-rank-corner absolute -right-1 -bottom-1" />}
            </div>
          )}
          <div className="pf-actions flex flex-wrap items-center gap-2 pt-3">
            {isSelf ? (
              <>
                <Button variant="subtle" size="sm" className="rounded-full" onClick={() => setSharing(true)}>
                  <QrCode /> Share
                </Button>
                <Button size="sm" className="rounded-full" onClick={() => setEditing(true)}>
                  <PenLine /> Edit profile
                </Button>
              </>
            ) : (
              <>
                <Button variant="subtle" size="icon-sm" className="rounded-full" aria-label="Share profile" onClick={() => setSharing(true)}>
                  <QrCode />
                </Button>
                {!relation.blockedByMe && !relation.blocksMe && (
                  <Button variant="subtle" size="icon-sm" className="rounded-full" aria-label={`Message ${name}`} onClick={() => navigate(`/social?tab=messages&peer=${encodeURIComponent(p.username)}`)}>
                    <MessageSquare />
                  </Button>
                )}
                <Menu>
                  <MenuTrigger asChild>
                    <Button variant="subtle" size="icon-sm" className="rounded-full" aria-label="More options">
                      <MoreHorizontal />
                    </Button>
                  </MenuTrigger>
                  <MenuContent>
                    <MenuItem icon={<Link2 />} onSelect={() => void navigator.clipboard?.writeText(`${window.location.origin}/u/${p.username}`).then(() => toast.success('Link copied'))}>
                      Copy profile link
                    </MenuItem>
                    <MenuSeparator />
                    <MenuItem icon={<VolumeX />} onSelect={() => void relate('mute', !relation.muted)}>
                      {relation.muted ? 'Unmute' : 'Mute'} @{p.username}
                    </MenuItem>
                    <MenuItem icon={<Ban />} onSelect={() => (relation.blockedByMe ? void relate('block', false) : setConfirmBlock(true))}>
                      {relation.blockedByMe ? 'Unblock' : 'Block'} @{p.username}
                    </MenuItem>
                    <MenuItem icon={<Flag />} danger onSelect={() => setReporting(true)}>
                      Report profile
                    </MenuItem>
                  </MenuContent>
                </Menu>
                {socialOn && !relation.blockedByMe && !relation.blocksMe && <FollowButton username={p.username} state={relation.following} onChange={onChanged} size="md" />}
              </>
            )}
          </div>
        </div>

        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="pf-name font-display text-2xl font-semibold tracking-tight text-text-primary sm:text-[28px]">{name}</h1>
            <UserBadges username={p.username} role={p.role} verified={p.verified} variant="full" />
          </div>
          {stats && !journal && (
            <div className="pf-seal-line mt-2">
              <RankSeal level={stats.level.level} name={stats.level.name} />
            </div>
          )}
          {stats && journal && <RankBadge level={stats.level.level} size="sm" className="mt-2" />}
          <p className="pf-handle mt-0.5 flex flex-wrap items-center gap-2 text-sm text-text-muted">
            <span>@{p.username}</span>
            {p.pronouns && <span>· {p.pronouns}</span>}
            {relation.followsMe && <span className="rounded-md bg-bg-surface-3 px-1.5 py-0.5 text-[11px] font-medium text-text-secondary">Follows you</span>}
            {p.visibility === 'followers' && (
              <span className="inline-flex items-center gap-1 text-xs">
                <Lock className="size-3" /> Private
              </span>
            )}
          </p>
          {p.bio ? (
            <RichText text={p.bio} className="pf-bio mt-3 max-w-2xl space-y-1 text-[15px] leading-relaxed text-text-primary" />
          ) : (
            isSelf && (
              <button type="button" onClick={() => setEditing(true)} className="pf-bio-empty mt-3 cursor-pointer text-sm text-text-muted italic hover:text-text-primary hover:underline">
                Add a bio — tell people what you're learning.
              </button>
            )
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-text-secondary">
            {p.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4 text-text-muted" /> {p.location}
              </span>
            )}
            {p.website && (
              <a href={p.website} target="_blank" rel="noopener noreferrer nofollow ugc" className="inline-flex items-center gap-1.5 hover:underline" style={{ color: accent }}>
                <Link2 className="size-4" /> {p.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
              </a>
            )}
            {p.links.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer nofollow ugc" className="inline-flex items-center gap-1.5 hover:underline" style={{ color: accent }}>
                {l.label || l.url.replace(/^https?:\/\//, '')}
              </a>
            ))}
            <span className="pf-joined inline-flex items-center gap-1.5">
              <CalendarDays className="size-4 text-text-muted" /> Joined {formatDate(p.created_at)}
            </span>
          </div>
          <div className="pf-counts mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {socialOn && (
              <>
                <button type="button" onClick={() => setPeople('following')} className="cursor-pointer hover:underline" disabled={data.locked}>
                  <strong className="font-semibold text-text-primary tabular-nums">{p.counts.following}</strong> <span className="text-text-secondary">Following</span>
                </button>
                <button type="button" onClick={() => setPeople('followers')} className="cursor-pointer hover:underline" disabled={data.locked}>
                  <strong className="font-semibold text-text-primary tabular-nums">{p.counts.followers}</strong> <span className="text-text-secondary">{p.counts.followers === 1 ? 'Follower' : 'Followers'}</span>
                </button>
                <span>
                  <strong className="font-semibold text-text-primary tabular-nums">{p.counts.posts}</strong> <span className="text-text-secondary">Posts</span>
                </span>
              </>
            )}
            <span>
              <strong className="font-semibold text-text-primary tabular-nums">{p.counts.friends}</strong> <span className="text-text-secondary">Friends</span>
            </span>
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        {editing && <EditProfileSheet open={editing} onClose={() => setEditing(false)} profile={p} onSaved={onChanged} />}
        {sharing && <ShareProfileDialog open={sharing} onClose={() => setSharing(false)} profile={p} stats={stats} days={days} />}
      </Suspense>
      <PeopleModal username={p.username} list={people} onClose={() => setPeople(null)} />
      <ReportDialog open={reporting} onClose={() => setReporting(false)} contentType="profile" contentId={p.username} targetUser={p.username} />
      <ConfirmDialog
        open={confirmBlock}
        onClose={() => setConfirmBlock(false)}
        onConfirm={() => void relate('block', true)}
        title={`Block @${p.username}?`}
        message="They won't be able to see your posts, follow you or interact with you. Any follows between you are removed."
        confirmLabel="Block"
        danger
      />
    </motion.section>
  )
}

function PeopleModal({ username, list, onClose }: { username: string; list: null | 'followers' | 'following'; onClose: () => void }) {
  const [users, setUsers] = useState<(SocialUser & { i_follow?: boolean; bio?: string })[] | null>(null)
  const { me } = useSocialPerms()
  useEffect(() => {
    if (!list) return
    setUsers(null)
    api
      .get<{ users: (SocialUser & { i_follow?: boolean; bio?: string })[] }>(`/api/social/users/${encodeURIComponent(username)}/${list}`)
      .then((r) => setUsers(r.users))
      .catch(() => setUsers([]))
  }, [username, list])
  return (
    <Modal open={!!list} onClose={onClose} title={list === 'followers' ? 'Followers' : 'Following'} size="sm">
      {!users ? (
        <div className="space-y-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : !users.length ? (
        <p className="py-6 text-center text-sm text-text-muted">{list === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}</p>
      ) : (
        <div className="-mx-2">
          {users.map((u) => (
            <UserRow key={u.username} u={u} sub={u.bio || `@${u.username}`} right={u.username !== me ? <FollowButton username={u.username} state={u.i_follow ? 'accepted' : null} /> : undefined} />
          ))}
        </div>
      )}
    </Modal>
  )
}

function Overview({ show, accent, isSelf, onAll }: { show: Showcase; accent?: string; isSelf: boolean; onAll: () => void }) {
  const s = show.stats
  const journal = isJournalKit(useTheme().shown.style)
  const [pinned, setPinned] = useState(show.pinned ?? [])
  useEffect(() => setPinned(show.pinned ?? []), [show.pinned])
  // "Today" for the 30-day sparklines, fixed when the profile loads.
  const [today] = useState(() => {
    const d = new Date()
    d.setUTCHours(0, 0, 0, 0)
    return d
  })
  const sentence = calendarSentence(show.heatmap, s?.streak.best ?? 0)
  return (
    <div className="space-y-8">
      {pinned.length > 0 && (
        <section aria-label="Pinned" className="space-y-3">
          {pinned.map((p, i) =>
            p.type === 'post' ? (
              <PostCard key={`p${p.post.id}`} post={p.post} pinned onChange={(np: Post) => setPinned((cur) => cur.map((x, j) => (j === i ? { type: 'post', post: np } : x)))} onRemove={() => setPinned((cur) => cur.filter((_, j) => j !== i))} />
            ) : (
              <div key={`a${p.achievement.id}`} className="card flex items-center gap-4 p-4">
                <div className="w-28 shrink-0">
                  <BadgeCard a={p.achievement} compact />
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-wider text-text-muted uppercase">Pinned achievement</p>
                  <p className="font-display text-lg font-semibold text-text-primary">{p.achievement.title}</p>
                  <p className="text-sm text-text-secondary">{p.achievement.description}</p>
                </div>
              </div>
            ),
          )}
        </section>
      )}
      {s && (
        <div className="space-y-4">
          <Colophon s={s} days={show.heatmap} today={today} />
          <Card className="pf-level p-4">
            <LevelBar s={s} />
            <LevelRules currentLevel={s.level.level} />
          </Card>
        </div>
      )}
      {show.heatmap && (
        <Folio kicker="Practice calendar" title="A year of work, day by day">
          <ActivityHeatmap days={show.heatmap} accent={journal ? undefined : accent} />
          <p className="pf-calendar-line">{sentence ?? 'Every day you solve a problem or answer a GATE question fills a square.'}</p>
        </Folio>
      )}
      <div className="pf-craft">
        {s && (
          <Folio kicker="Craft" title="Problems by difficulty">
            <DifficultyMultiples d={s.difficulty} />
          </Folio>
        )}
        <Folio kicker="Craft" title="Topics">
          <TopicBars topics={show.topics ?? []} />
        </Folio>
        <Folio kicker="Craft" title="Languages">
          <LanguageList langs={show.languages ?? []} />
        </Folio>
      </div>
      <Shelf achievements={show.achievements ?? []} onAll={onAll} />
      <Bridge linked={show.linked ?? []} isSelf={isSelf} />
      <Folio kicker="Field notes" title="Recent activity">
        <Timeline items={show.timeline ?? []} />
      </Folio>
    </div>
  )
}

function UserPosts({ username, tab, pinned }: { username: string; tab: 'posts' | 'media'; pinned?: Showcase['pinned'] }) {
  const list = usePostList((cursor) => api.get<FeedPage>(`/api/social/users/${encodeURIComponent(username)}/posts`, { query: { tab, cursor } }), [username, tab])
  const pinnedIds = new Set((pinned ?? []).flatMap((p) => (p.type === 'post' ? [p.post.id] : [])))
  return (
    <div className="mx-auto max-w-2xl">
      <PostList
        list={list}
        pinnedIds={pinnedIds}
        empty={<FeedEmpty title={tab === 'media' ? 'No media yet' : 'No posts yet'} description={tab === 'media' ? 'Images and code snippets show up here.' : 'When they post, it shows up here.'} />}
      />
    </div>
  )
}

interface ReplyRow {
  id: number
  post_id: number
  body: string
  created_at: number
  post_body: string
  post_author: string
  like_count: number
}
function UserReplies({ username }: { username: string }) {
  const [rows, setRows] = useState<ReplyRow[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    api
      .get<{ replies: ReplyRow[] }>(`/api/social/users/${encodeURIComponent(username)}/posts`, { query: { tab: 'replies' } })
      .then((r) => setRows(r.replies ?? []))
      .catch((e) => setErr(errorText(e)))
  }, [username])
  if (err) return <ErrorState message={err} />
  if (!rows) return <Skeleton className="mx-auto h-24 max-w-2xl" />
  if (!rows.length) return <Card className="mx-auto max-w-2xl"><FeedEmpty title="No replies yet" description="Comments on posts show up here." /></Card>
  return (
    <ul className="mx-auto max-w-2xl space-y-3">
      {rows.map((r) => (
        <li key={r.id}>
          <Link to={postPath(r.post_id)} className="card block p-4 transition-colors hover:border-border-strong">
            <p className="line-clamp-2 border-l-2 border-border pl-3 text-xs text-text-muted">
              Replying to @{r.post_author}: {r.post_body}
            </p>
            <RichText text={r.body} className="mt-2 space-y-1 text-sm text-text-primary" />
          </Link>
        </li>
      ))}
    </ul>
  )
}
