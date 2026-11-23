/*
  Settings → Preferences → Virtual teacher: off by default. Choose one of the
  four teachers and how big they are drawn, and say hello.
*/
import { GraduationCap, UserX, Volume2 } from 'lucide-react'
import { Button, Card, CardContent } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { useVoicePrefs, type TeacherSize } from '../prefs'
import { introduce } from './intro'
import { setTeacher } from './store'
import { TEACHERS, teacherById, teacherPortrait } from './teachers'
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
          <legend>Teacher</legend>
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
              {t.name}
            </label>
          ))}
        </fieldset>
        {chosen && (
          <div className="vc-consent">
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
          </div>
        )}
        <p className="mb-0 text-[11.5px] text-text-muted">3D people from the Microsoft Rocketbox Avatar Library (MIT licence), animated with TalkingHead (MIT); voices by Kokoro (Apache licence).</p>
      </CardContent>
    </Card>
  )
}
