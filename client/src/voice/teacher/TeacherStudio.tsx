/*
  The Teacher studio (/teacher): everything about the virtual teacher on one
  page, with the teacher standing large in a preview beside the settings and
  changing as they change (docs/voice/VIRTUAL_TEACHER.md §3.2.10).

  The preview is the real teacher, not a picture: TeacherLayer stands in the
  box this page marks (store.anchor) instead of at the side of the screen,
  so nothing is drawn twice.
*/
import { useEffect, useRef, type ReactNode } from 'react'
import { Hand, HandHeart, MessageCircle, RotateCw, ThumbsUp, UserX, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { Segmented } from '@/components/look/controls'
import { Switch } from '@/components/look/MakeItYours'
import { RATES, useVoicePrefs, type TeacherSize, type TeacherView } from '../prefs'
import { OnDevice } from '../VoiceSettings'
import { OwnVoice } from '../clone/OwnVoice'
import { startTalk } from '../talk'
import { introduce } from './intro'
import { getTeacher, setTeacher, teacherMove, useTeacher } from './store'
import { TEACHERS, teacherById, teacherPortrait, UNNAMED } from './teachers'
import { Memory, NameField, VoicePicker } from './TeacherSettings'
import './teacher.css'
import './studio.css'
import '../voice.css'

const SIZES: { id: TeacherSize; label: string }[] = [
  { id: 's', label: 'Small' },
  { id: 'm', label: 'Medium' },
  { id: 'l', label: 'Large' },
]
const VIEWS: { id: TeacherView; label: string }[] = [
  { id: 'head', label: 'Face' },
  { id: 'upper', label: 'Upper body' },
  { id: 'mid', label: 'To the waist' },
]
const SPEEDS = RATES.map((r) => ({ id: String(r), label: r < 1 ? 'Slower' : r > 1 ? 'Faster' : 'Normal' }))

/** Marks where the teacher stands in the studio, and keeps her there as the page scrolls or resizes. */
function Stage() {
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = box.current
    if (!el) return
    let shown = true
    let raf = 0
    const place = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        // Her drawing is 1.4 times her width (room for a raised hand): she is drawn 72% of the box wide, so it fits.
        const w = Math.round(r.width * 0.72)
        setTeacher({ anchor: { x: Math.round(r.left + (r.width - w) / 2), y: Math.round(r.top), w, shown } })
      })
    }
    const io = new IntersectionObserver(([e]) => {
      shown = e.intersectionRatio > 0.55
      place()
    }, { threshold: [0, 0.55, 1] })
    io.observe(el)
    const ro = new ResizeObserver(place)
    ro.observe(el)
    window.addEventListener('scroll', place, { passive: true, capture: true })
    window.addEventListener('resize', place)
    place()
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
      window.removeEventListener('scroll', place, { capture: true })
      window.removeEventListener('resize', place)
      setTeacher({ anchor: null })
    }
  }, [])
  return <div ref={box} className="ts-stage-box" aria-hidden="true" />
}

function Section({ title, line, children }: { title: string; line?: string; children: ReactNode }) {
  return (
    <section className="ts-section">
      <h2 className="ts-h">{title}</h2>
      {line && <p className="ts-line">{line}</p>}
      {children}
    </section>
  )
}

function Toggle({ title, hint, on, onChange }: { title: string; hint: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="ts-row">
      <div className="min-w-0">
        <p className="ts-row-title">{title}</p>
        <p className="ts-row-hint">{hint}</p>
      </div>
      <Switch on={on} onChange={onChange} label={title} />
    </div>
  )
}

export default function TeacherStudio() {
  const { user } = useAuth()
  const [prefs, setPrefs] = useVoicePrefs(user?.username)
  const st = useTeacher()
  const chosen = teacherById(prefs.teacher)
  const male = chosen?.body === 'M'
  const said = chosen && chosen.name !== UNNAMED ? chosen.name : 'Your teacher'
  const they = male ? 'he' : 'she'
  const ready = st.status === 'ready'

  // In the studio the teacher is always shown, even if hidden on other pages.
  useEffect(() => {
    if (prefs.teacher && getTeacher().hidden) setTeacher({ hidden: false })
  }, [prefs.teacher])

  const tries: { id: string; label: string; icon: ReactNode; run: () => void }[] = chosen
    ? [
        { id: 'hello', label: 'Say hello', icon: <Volume2 aria-hidden="true" />, run: () => introduce(chosen) },
        { id: 'talk', label: 'Talk', icon: <MessageCircle aria-hidden="true" />, run: startTalk },
        { id: 'wave', label: 'Wave', icon: <Hand aria-hidden="true" />, run: () => teacherMove('wave') },
        { id: 'namaste', label: 'Namaste', icon: <HandHeart aria-hidden="true" />, run: () => teacherMove('namaste') },
        { id: 'thumbs', label: 'Thumbs up', icon: <ThumbsUp aria-hidden="true" />, run: () => teacherMove('thumbs') },
        { id: 'turn', label: 'Turn around', icon: <RotateCw aria-hidden="true" />, run: () => teacherMove('turn') },
      ]
    : []

  return (
    <div className="ts-page pb-10">
      <header data-ui="page-header" className="mb-8">
        <p data-ui="eyebrow" className="ed-label">
          Virtual teacher
        </p>
        <h1 data-ui="page-title" className="ed-title mt-2">
          Teacher studio
        </h1>
        <p className="ed-lead mt-2 max-w-2xl">Choose who teaches you, what you call them, how they sound and how they behave. Everything here changes the teacher you see beside every page.</p>
      </header>

      <div className="ts-grid">
        <aside className="ts-preview" aria-label="Preview">
          {chosen ? (
            <>
              <div className="ts-stage">
                <Stage />
                {!ready && st.status !== 'failed' && <p className="ts-stage-note">Getting {said} ready…</p>}
              </div>
              <div className="ts-tries" role="group" aria-label={`Try ${said}`}>
                {tries.map((t) => (
                  <Button key={t.id} size="sm" variant="ghost" onClick={t.run} disabled={!ready && t.id !== 'hello'}>
                    {t.icon}
                    {t.label}
                  </Button>
                ))}
              </div>
              <p className="ts-hint">Say “go left”, “sit down”, “namaste” or ask a doubt with the mic: {they} answers here and beside every page.</p>
            </>
          ) : (
            <div className="ts-empty">
              <UserX className="size-6" aria-hidden="true" />
              <p>No teacher yet. Choose one, and they’ll appear here.</p>
            </div>
          )}
        </aside>

        <div className="ts-settings">
          <Section title="Who teaches you" line="Realistic 3D people. Each is a one-time download of 3–5 MB, and needs a browser that can draw 3D.">
            <fieldset className="tch-pick ts-pick">
              <legend className="sr-only">Choose a teacher</legend>
              <label className="tch-opt">
                <input type="radio" name="tch-who" checked={!chosen} onChange={() => setPrefs({ teacher: '' })} />
                <span className="tch-off" aria-hidden="true">
                  <UserX className="size-5" />
                </span>
                Off
              </label>
              {TEACHERS.map((t) => (
                <label key={t.id} className="tch-opt">
                  <input type="radio" name="tch-who" checked={chosen?.id === t.id} onChange={() => setPrefs({ teacher: t.id })} />
                  <img src={teacherPortrait(t.id)} alt="" width={96} height={120} loading="lazy" />
                  <span className="tch-look">{prefs.teacherNames[t.id] || t.look}</span>
                </label>
              ))}
            </fieldset>
          </Section>

          {chosen && (
            <>
              <Section title="Name">
                <NameField key={chosen.id} id={chosen.id} male={male} />
              </Section>

              <Section title="Voice" line={`How ${said} sounds. English and Hindi; Hindi sentences always use a Hindi voice.`}>
                <div className="ts-row">
                  <div className="min-w-0">
                    <p className="ts-row-title">Speaking speed</p>
                    <p className="ts-row-hint">Slower is easier for new topics; faster for revision.</p>
                  </div>
                  <Segmented label="Speaking speed" size="sm" items={SPEEDS} value={String(RATES.find((r) => Math.abs(r - prefs.rate) < 0.01) ?? 1)} onChange={(v) => setPrefs({ rate: Number(v) })} />
                </div>
                <Toggle title="Read answers aloud" hint={`Off: ${they} only speaks when you ask, and answers in a bubble.`} on={prefs.speak} onChange={(v) => setPrefs({ speak: v })} />
                <VoicePicker male={male} name={chosen.name} />
                <OwnVoice name={said} />
              </Section>

              <Section title="On screen">
                <div className="ts-row">
                  <div className="min-w-0">
                    <p className="ts-row-title">Framing</p>
                    <p className="ts-row-hint">How much of {said} you see.</p>
                  </div>
                  <Segmented label="Framing" size="sm" items={VIEWS} value={prefs.teacherView} onChange={(v) => setPrefs({ teacherView: v as TeacherView })} />
                </div>
                <div className="ts-row">
                  <div className="min-w-0">
                    <p className="ts-row-title">Size beside pages</p>
                    <p className="ts-row-hint">Here {they} is always shown large.</p>
                  </div>
                  <Segmented label="Size beside pages" size="sm" items={SIZES} value={prefs.teacherSize} onChange={(v) => setPrefs({ teacherSize: v as TeacherSize })} />
                </div>
                <Toggle title="Captions" hint={`${said}’s words light up one by one as ${they} says them.`} on={prefs.teacherCaptions} onChange={(v) => setPrefs({ teacherCaptions: v })} />
              </Section>

              <Section title="Behaviour">
                <Toggle title="Hands while talking" hint="A thumbs up for well done, namaste, pointing, natural hand movement." on={prefs.teacherGestures} onChange={(v) => setPrefs({ teacherGestures: v })} />
                <Toggle title="Reacts to your results" hint={`When the judge or a GATE answer comes back, ${they} cheers or encourages you.`} on={prefs.teacherReacts} onChange={(v) => setPrefs({ teacherReacts: v })} />
                <Toggle title="Looks where you point" hint={`Now and then ${they} glances at your mouse or finger, like someone beside you.`} on={prefs.teacherGlance} onChange={(v) => setPrefs({ teacherGlance: v })} />
              </Section>

              <Section title="Memory and privacy">
                <Memory name={said} male={male} />
                <OnDevice who={said} male={male} />
              </Section>
            </>
          )}
          <p className="ts-credits">3D people from the Microsoft Rocketbox Avatar Library (MIT licence), animated with TalkingHead (MIT); voices by Kokoro (Apache licence).</p>
        </div>
      </div>
    </div>
  )
}
