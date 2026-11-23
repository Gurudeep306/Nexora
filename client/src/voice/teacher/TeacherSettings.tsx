/*
  Settings → Preferences → Virtual teacher: off by default. A catalogue of
  looks (teachers have no names of their own): pick one, give them a name,
  choose how big they are drawn, and say hello.
*/
import { GraduationCap, UserX, Volume2 } from 'lucide-react'
import { Button, Card, CardContent } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { useVoicePrefs, type TeacherSize } from '../prefs'
import { OnDevice } from '../VoiceSettings'
import { introduce } from './intro'
import { setTeacher } from './store'
import { cleanName, TEACHERS, teacherById, teacherPortrait, UNNAMED, type TeacherId } from './teachers'
import './teacher.css'
import '../voice.css'

const SIZES: { id: TeacherSize; label: string }[] = [
  { id: 's', label: 'Small' },
  { id: 'm', label: 'Medium' },
  { id: 'l', label: 'Large' },
]

export function TeacherSettings() {
  const { user } = useAuth()
  const [prefs, setPrefs] = useVoicePrefs(user?.username)
  const chosen = teacherById(prefs.teacher)
  return (
    <Card>
      <CardContent className="grid gap-4 px-5 py-4">
        <div className="min-w-0">
          <p className="mb-0 flex items-center gap-2 text-sm font-semibold text-text-primary">
            <GraduationCap className="size-4 text-text-muted" aria-hidden="true" /> Virtual teacher
          </p>
          <p className="mb-0 text-[12.5px] text-text-muted">
            A 3D teacher who stands beside the page and says the answers with you, in an Indian voice, in English or Hindi. Say “go left”, “sit down”, “turn around” or
            “namaste”. Each teacher is a one-time download of 3–5 MB; it needs a browser that can draw 3D.
          </p>
        </div>
        <fieldset className="tch-pick">
          <legend>Choose a look</legend>
          <label className="tch-opt">
            <input type="radio" name="tch-who" checked={!chosen} onChange={() => setPrefs({ teacher: '' })} />
            <span className="tch-off" aria-hidden="true">
              <UserX className="size-5" />
            </span>
            Off
          </label>
          {TEACHERS.map((t) => (
            <label key={t.id} className="tch-opt">
              <input
                type="radio"
                name="tch-who"
                checked={chosen?.id === t.id}
                onChange={() => {
                  setTeacher({ hidden: false })
                  setPrefs({ teacher: t.id })
                }}
              />
              <img src={teacherPortrait(t.id)} alt="" width={96} height={120} loading="lazy" />
              <span className="tch-look">{prefs.teacherNames[t.id] || t.look}</span>
            </label>
          ))}
        </fieldset>
        {chosen && (
          <div className="vc-consent">
            <NameField key={chosen.id} id={chosen.id} male={chosen.body === 'M'} />
            <fieldset className="vc-field">
              <legend>Size</legend>
              <div className="flex flex-wrap gap-4">
                {SIZES.map((s) => (
                  <label key={s.id}>
                    <input type="radio" name="tch-size" checked={prefs.teacherSize === s.id} onChange={() => setPrefs({ teacherSize: s.id })} /> {s.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => introduce(chosen)}>
                <Volume2 aria-hidden="true" /> Say hello
              </Button>
              {!prefs.speak && <span className="vc-note">Reading answers aloud is off (Voice, above), so {chosen.name} only speaks when you ask.</span>}
            </div>
            <Memory name={chosen.name} />
            <OnDevice who={chosen.name} />
          </div>
        )}
        <p className="mb-0 text-[11.5px] text-text-muted">3D people from the Microsoft Rocketbox Avatar Library (MIT licence), animated with TalkingHead (MIT); voices by Kokoro (Apache licence).</p>
      </CardContent>
    </Card>
  )
}

/** The student names their teacher; saved when they leave the field or press Enter. */
function NameField({ id, male }: { id: TeacherId; male: boolean }) {
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
function Memory({ name }: { name: string }) {
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
          ? `${name} remembers ${facts.join('; ')}. It stays on NexoraGuru, and the name she remembers is never sent to an AI service.`
          : `Nothing yet. As you talk, ${name} remembers your goal, recent topics and what felt hard, so the next session starts where you left off. The name she remembers is never sent to an AI service.`}
      </p>
      {facts.length > 0 && (
        <Button size="sm" variant="ghost" onClick={() => void forget()} loading={busy}>
          Forget all of it
        </Button>
      )}
    </fieldset>
  )
}
