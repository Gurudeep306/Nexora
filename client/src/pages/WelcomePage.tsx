import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { BookOpen, Code2, Compass, GraduationCap } from 'lucide-react'
import { Avatar, Input, Textarea, useToast } from '@/components/ui'
import { LogoMark } from '@/components/brand/Logo'
import { AvatarChooser, type Picture } from '@/components/account/AvatarChooser'
import { useAuth } from '@/context/AuthContext'
import { api, ApiError } from '@/lib/api'
import { formatAvatar, resolveAvatarId } from '@/lib/avatar'
import { cn } from '@/lib/utils'
import { loadUiFont } from '@/theme/fontLoaders'
import '@/components/auth/welcome.css'

/*
  "Make it yours": the short, optional step right after an account is made
  (AuthPage sends new accounts here, password and GitHub/Google alike). A
  picture, a name, a line about you, and what brought you here, which also
  decides where "Continue" goes. Everything can be skipped and changed later
  in Edit profile. Saved with the same calls Edit profile uses.
*/

type Focus = 'gate' | 'dsa' | 'cp' | 'explore'

const FOCUS: { id: Focus; title: string; text: string; to: string | null; Icon: typeof GraduationCap }[] = [
  { id: 'gate', title: 'GATE CSE', text: 'Past papers, notes, timed tests.', to: '/gate', Icon: GraduationCap },
  { id: 'dsa', title: 'Data structures and algorithms', text: 'The animated course, chapter by chapter.', to: '/learn/dsa', Icon: BookOpen },
  { id: 'cp', title: 'Competitive programming', text: 'Codeforces, AtCoder, LeetCode and more, judged here.', to: '/problems', Icon: Code2 },
  { id: 'explore', title: 'Just looking around', text: 'Start at the hub.', to: null, Icon: Compass },
]

const EASE = [0.22, 1, 0.36, 1] as const

export default function WelcomePage() {
  const { user, refresh } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const next = (location.state as { next?: string } | null)?.next || '/hub'
  const username = user?.username ?? ''

  const [pic, setPic] = useState<Picture>(() => ({ avatar: resolveAvatarId(user?.avatar, username), photo: typeof user?.avatar_url === 'string' && user.avatar_url ? user.avatar_url : null }))
  const [name, setName] = useState(() => (user?.display_name && user.display_name !== username ? String(user.display_name) : ''))
  const [pronouns, setPronouns] = useState('')
  const [bio, setBio] = useState('')
  const [focus, setFocus] = useState<Focus | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void loadUiFont('newsreader')
  }, [])

  // Where to go next: a page you were on before signing up wins; otherwise
  // the place that matches what you picked.
  const goTo = (f: Focus | null) => (next !== '/hub' ? next : (FOCUS.find((x) => x.id === f)?.to ?? '/hub'))

  const skip = () => navigate(next, { replace: true })

  const save = async () => {
    setSaving(true)
    try {
      await api.put('/api/profiles/me', {
        avatar: formatAvatar(pic.avatar),
        avatar_url: pic.photo ?? '',
        ...(name.trim() ? { display_name: name.trim() } : {}),
        ...(pronouns.trim() ? { pronouns: pronouns.trim() } : {}),
        ...(bio.trim() ? { bio: bio.trim() } : {}),
      })
      if (focus) await api.post('/api/settings', { focus })
      await refresh()
      toast.success('All set', 'Change any of it later in Edit profile.')
      navigate(goTo(focus), { replace: true })
    } catch (e) {
      toast.error('Could not save', e instanceof ApiError ? e.message : 'Try again.')
    } finally {
      setSaving(false)
    }
  }

  const shownName = name.trim() || username
  const picked = FOCUS.find((f) => f.id === focus)

  return (
    <MotionConfig reducedMotion="user">
      <div className="wl ed">
        <header className="wl-top">
          <span className="flex items-center gap-2.5">
            <LogoMark size={22} />
            <span className="ed-wordmark text-text-primary">NexoraGuru</span>
          </span>
          <button type="button" className="ed-link wl-skip" onClick={skip}>
            Skip for now
          </button>
        </header>

        <main className="wl-main">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="wl-head">
            <p className="ed-label ed-muted">Your account is ready · optional</p>
            <h1 className="ed-title">Make it yours</h1>
            <p className="ed-lead">A picture and a line about you help people find you in Messages and contests. All of this is optional, and you can change it later in Edit profile.</p>
          </motion.div>

          <div className="wl-grid">
            <form
              className="wl-form"
              onSubmit={(e) => {
                e.preventDefault()
                void save()
              }}
            >
              <section className="wl-part" aria-labelledby="wl-pic">
                <h2 id="wl-pic" className="wl-part-title">
                  <span className="wl-num" aria-hidden="true">I</span> Your picture
                </h2>
                <AvatarChooser username={username} value={pic} onChange={setPic} onBusy={setUploading} />
              </section>

              <section className="wl-part" aria-labelledby="wl-about">
                <h2 id="wl-about" className="wl-part-title">
                  <span className="wl-num" aria-hidden="true">II</span> About you
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="wl-field">Display name</span>
                    <Input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder={username} autoComplete="name" />
                  </label>
                  <label className="block">
                    <span className="wl-field">Pronouns</span>
                    <Input value={pronouns} maxLength={24} onChange={(e) => setPronouns(e.target.value)} placeholder="she/her, they/them…" />
                  </label>
                </div>
                <label className="mt-4 block">
                  <span className="wl-field">
                    A line about you <span className="ed-muted font-normal">{bio.length}/280</span>
                  </span>
                  <Textarea value={bio} maxLength={280} rows={3} onChange={(e) => setBio(e.target.value)} placeholder="Second-year CSE at…, preparing for GATE 2027" />
                </label>
              </section>

              <section className="wl-part" aria-labelledby="wl-focus">
                <h2 id="wl-focus" className="wl-part-title">
                  <span className="wl-num" aria-hidden="true">III</span> What brings you here?
                </h2>
                <div className="wl-focus" role="radiogroup" aria-labelledby="wl-focus">
                  {FOCUS.map(({ id, title, text, Icon }) => (
                    <button key={id} type="button" role="radio" aria-checked={focus === id} onClick={() => setFocus(focus === id ? null : id)} className={cn('wl-choice', focus === id && 'is-on')}>
                      <Icon className="wl-choice-icon" aria-hidden="true" />
                      <span>
                        <span className="wl-choice-title">{title}</span>
                        <span className="wl-choice-text">{text}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <div className="wl-actions">
                <button type="button" className="ed-btn ed-btn-outline" onClick={skip}>
                  Skip for now
                </button>
                <button type="submit" className="ed-btn ed-btn-clay" disabled={saving || uploading}>
                  {saving ? 'Saving…' : 'Save and continue'}
                </button>
              </div>
            </form>

            {/* The card other people will see: a page from a field journal. */}
            <aside className="wl-card ed-card" aria-label="How others see you">
              <p className="ed-label ed-muted">How others see you</p>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={pic.photo ?? pic.avatar} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.25, ease: EASE }} className="wl-card-pic">
                  <Avatar seed={username} avatar={formatAvatar(pic.avatar)} src={pic.photo} name={shownName} size="3xl" ring={false} />
                </motion.div>
              </AnimatePresence>
              <p className="wl-card-name">{shownName}</p>
              <p className="wl-card-handle">
                @{username}
                {pronouns.trim() && <span> · {pronouns.trim()}</span>}
              </p>
              <p className={cn('wl-card-bio', !bio.trim() && 'is-empty')}>{bio.trim() || 'Your line about you shows here.'}</p>
              {picked && (
                <p className="wl-card-focus">
                  <picked.Icon className="size-4" aria-hidden="true" /> Here for {picked.id === 'explore' ? 'a look around' : picked.title}
                </p>
              )}
            </aside>
          </div>

          <p className="wl-foot ed-muted">
            Everything here is in <Link to={`/u/${encodeURIComponent(username)}?edit=1`} className="ed-link">Edit profile</Link> too.
          </p>
        </main>
      </div>
    </MotionConfig>
  )
}
