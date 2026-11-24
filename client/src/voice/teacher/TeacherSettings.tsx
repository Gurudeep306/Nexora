/*
  Settings → Preferences → Virtual teacher: a short card that opens the
  Teacher studio (/teacher, TeacherStudio.tsx), plus the parts the studio is
  built from: the name field, the voice catalogue and what the teacher
  remembers.
*/
import { GraduationCap, Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button, buttonVariants, Card, CardContent } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { useVoicePrefs } from '../prefs'
import { KOKORO_MB, loadKokoro, previewVoice } from '../speak'
import { pickVoice, VOICES } from '../voices'
import { cleanName, teacherById, teacherPortrait, UNNAMED, type TeacherId } from './teachers'
import './teacher.css'
import '../voice.css'

export function TeacherSettings() {
  const { user } = useAuth()
  const [prefs, setPrefs] = useVoicePrefs(user?.username)
  const chosen = teacherById(prefs.teacher)
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-4 px-5 py-4">
        {chosen ? (
          <img className="tch-card-face" src={teacherPortrait(chosen.id)} alt="" width={48} height={60} />
        ) : (
          <span className="tch-card-face tch-off" aria-hidden="true">
            <GraduationCap className="size-5" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="mb-0 text-sm font-semibold text-text-primary">Virtual teacher</p>
          <p className="mb-0 text-[12.5px] text-text-muted">
            {chosen
              ? `${chosen.name === UNNAMED ? 'Your teacher' : chosen.name} is on. Choose the look, name, voice, speed and how ${chosen.body === 'M' ? 'he' : 'she'} behaves in the Teacher studio.`
              : 'A 3D teacher who stands beside the page, listens and answers aloud. Off for now.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {chosen && (
            <Button size="sm" variant="ghost" onClick={() => setPrefs({ teacher: '' })}>
              Turn off
            </Button>
          )}
          <Link to="/teacher" className={buttonVariants({ size: 'sm', variant: chosen ? 'secondary' : 'primary' })}>
            {chosen ? 'Open Teacher studio' : 'Choose a teacher'}
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

/** The teacher's voice: a catalogue of on-device voices, each with a play button. */
export function VoicePicker({ male, name }: { male: boolean; name: string }) {
  const { user } = useAuth()
  const [prefs, setPrefs] = useVoicePrefs(user?.username)
  const [get, setGet] = useState<{ phase: 'idle' | 'loading' | 'failed'; p: number }>({ phase: 'idle', p: 0 })
  const [playing, setPlaying] = useState('')
  const current = pickVoice(prefs.kokoroVoice, male, 'a')
  const hi = prefs.lang === 'hi-IN'
  const sample = (v: (typeof VOICES)[number]) => (hi && v.hindi ? `नमस्ते, मैं ${name} हूँ। चलो, आज साथ में पढ़ते हैं।` : `Hi, I'm ${name}. Shall we study together today?`)
  const getVoices = async () => {
    setGet({ phase: 'loading', p: 0 })
    try {
      await loadKokoro((p) => setGet({ phase: 'loading', p }))
      setPrefs({ kokoro: true, engine: prefs.engine === 'device' || prefs.engine === 'auto' ? 'kokoro' : prefs.engine })
      setGet({ phase: 'idle', p: 1 })
    } catch {
      setGet({ phase: 'failed', p: 0 })
    }
  }
  const play = async (id: string, text: string) => {
    setPlaying(id)
    try {
      await previewVoice(id, text, hi && VOICES.find((v) => v.id === id)?.hindi ? 'hi-IN' : 'en-IN')
    } finally {
      setPlaying('')
    }
  }
  return (
    <fieldset className="vc-field">
      <legend>{name === UNNAMED ? 'Voice' : `${name}’s voice`}</legend>
      {!prefs.kokoro ? (
        <div className="grid gap-2">
          <p className="vc-note">
            Natural voices that run on this device: free and private, after a one-time download of about {KOKORO_MB} MB (Wi-Fi is best). Without them {male ? 'he' : 'she'} uses the
            device’s own voice.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => void getVoices()} loading={get.phase === 'loading'}>
              Get natural voices
            </Button>
            <span className="vc-note" aria-live="polite">
              {get.phase === 'loading' ? `Downloading… ${Math.round(get.p * 100)}%` : get.phase === 'failed' ? 'The download didn’t finish. Try again on Wi-Fi.' : ''}
            </span>
          </div>
        </div>
      ) : (
        <ul className="tch-voices">
          {VOICES.filter((v) => v.gender === (male ? 'M' : 'F')).map((v) => (
            <li key={v.id}>
              <label>
                <input type="radio" name="tch-voice" checked={current === v.id} onChange={() => setPrefs({ kokoroVoice: v.id })} />
                <span>
                  <strong>{v.name}</strong> · {v.sounds}
                  {v.grade === 'A' ? ' · clearest' : ''}
                </span>
              </label>
              <button type="button" className="tch-play" onClick={() => void play(v.id, sample(v))} disabled={!!playing} aria-label={`${playing === v.id ? 'Playing' : 'Play'} ${v.name}`}>
                <Play className="size-3.5" aria-hidden="true" />
                {playing === v.id ? 'Playing' : 'Play'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  )
}

/** The student names their teacher; saved when they leave the field or press Enter. */
export function NameField({ id, male }: { id: TeacherId; male: boolean }) {
  const { user } = useAuth()
  const [prefs, setPrefs] = useVoicePrefs(user?.username)
  const saved = prefs.teacherNames[id] ?? ''
  const [draft, setDraft] = useState(saved)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!saved) input.current?.focus()
  }, [saved])
  const save = () => {
    const n = cleanName(draft)
    setDraft(n)
    if (n !== saved) setPrefs({ teacherNames: { ...prefs.teacherNames, [id]: n } })
  }
  return (
    <div className="vc-field">
      <label htmlFor="tch-name" className="tch-name-label">
        What will you call {male ? 'him' : 'her'}?
      </label>
      <input
        ref={input}
        id="tch-name"
        className="tch-name-input"
        value={draft}
        maxLength={20}
        autoComplete="off"
        placeholder="Type a name"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === 'Enter' && save()}
      />
      <p className="vc-note">{saved ? `${male ? 'He' : 'She'} answers to “${saved}”.` : `Until you name ${male ? 'him' : 'her'}, ${male ? 'he' : 'she'} is just “${UNNAMED}”.`}</p>
    </div>
  )
}

interface Remembered {
  name: string
  goal: string
  topics: string[]
  hard: string[]
  turns: number
}

/** What the teacher remembers about you (src/voice/memory.js), and a way to erase it. */
export function Memory({ name, male = false }: { name: string; male?: boolean }) {
  const [mem, setMem] = useState<Remembered | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let live = true
    api
      .get<{ memory: Remembered }>('/api/voice/teacher/memory')
      .then((r) => live && setMem(r.memory))
      .catch(() => live && setMem(null))
    return () => {
      live = false
    }
  }, [])
  const forget = async () => {
    setBusy(true)
    try {
      await api.delete('/api/voice/teacher/memory')
      setMem({ name: '', goal: '', topics: [], hard: [], turns: 0 })
    } finally {
      setBusy(false)
    }
  }
  const facts = mem ? [mem.name && `your name, ${mem.name}`, mem.goal && `your goal: ${mem.goal}`, mem.topics.length > 0 && `recent topics: ${mem.topics.slice(0, 4).join(', ')}`, mem.hard.length > 0 && `what felt hard: ${mem.hard.slice(0, 3).join(', ')}`].filter(Boolean) : []
  return (
    <fieldset className="vc-field">
      <legend>What {name} remembers</legend>
      <p className="vc-note">
        {facts.length
          ? `${name} remembers ${facts.join('; ')}. It stays on NexoraGuru, and the name ${male ? 'he' : 'she'} remembers is never sent to an AI service.`
          : `Nothing yet. As you talk, ${name} remembers your goal, recent topics and what felt hard, so the next session starts where you left off. The name ${male ? 'he' : 'she'} remembers is never sent to an AI service.`}
      </p>
      {facts.length > 0 && (
        <Button size="sm" variant="ghost" onClick={() => void forget()} loading={busy}>
          Forget all of it
        </Button>
      )}
    </fieldset>
  )
}
