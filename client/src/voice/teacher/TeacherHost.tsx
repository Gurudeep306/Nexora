/*
  The virtual teacher's place in the app shell. Always mounted, but tiny: it
  reads the student's choice (Settings → Virtual teacher, off by default),
  offers the teacher's voice commands while one is on, and loads the 3D layer
  (three.js, TalkingHead and the model) only then. Never shown in the exam
  console.
*/
import { lazy, Suspense, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useVoiceActions } from '../actions/useVoiceAction'
import { TEACHER_SPECS } from '../actions/teacherSpecs'
import type { ActionSpec, VoiceAction } from '../actions/types'
import { useVoicePrefs } from '../prefs'
import { introduce } from './intro'
import { setTeacher, teacherMove, useTeacher } from './store'
import { teacherById, teacherPortrait } from './teachers'
import './teacher.css'

const TeacherLayer = lazy(() => import('./TeacherLayer'))

export function TeacherHost() {
  // The top bar's mic keeps the prefs in step with the account; here we only read them.
  const [prefs] = useVoicePrefs(null)
  const st = useTeacher()
  const { pathname } = useLocation()
  const teacher = teacherById(prefs.teacher)
  const allowed = !!teacher && !pathname.startsWith('/gate/cbt')

  const actions = useMemo<VoiceAction[]>(() => {
    if (!teacher) return []
    const spec = (id: string): ActionSpec => TEACHER_SPECS.find((s) => s.id === id)!
    const n = teacher.name
    const a = (id: string, title: string, run: () => void): VoiceAction => ({ ...spec(id), title, group: 'Teacher', icon: 'profile', run })
    return [
      a('teacher.left', `${n}: go left`, () => setTeacher({ side: 'left', hidden: false })),
      a('teacher.right', `${n}: go right`, () => setTeacher({ side: 'right', hidden: false })),
      a('teacher.centre', `${n}: come to the middle`, () => setTeacher({ side: 'centre', hidden: false })),
      a('teacher.turn', `${n}: turn around`, () => teacherMove('turn')),
      a('teacher.sit', `${n}: sit down`, () => setTeacher({ sitting: true })),
      a('teacher.stand', `${n}: stand up`, () => setTeacher({ sitting: false })),
      a('teacher.wave', `${n}: wave`, () => teacherMove('wave')),
      a('teacher.namaste', `${n}: namaste`, () => teacherMove('namaste')),
      a('teacher.thumbs', `${n}: thumbs up`, () => teacherMove('thumbs')),
      a('teacher.point', `${n}: point`, () => teacherMove('point')),
      a('teacher.hide', `Hide ${n}`, () => setTeacher({ hidden: true })),
      a('teacher.show', `Show ${n}`, () => setTeacher({ hidden: false })),
      a('teacher.intro', `${n}: introduce yourself`, () => {
        setTeacher({ hidden: false })
        introduce(teacher)
      }),
    ]
  }, [teacher])
  useVoiceActions(allowed ? actions : [])

  if (!teacher || !allowed) return null
  if (st.hidden) {
    return (
      <button type="button" className="tch-peek" data-side={st.side === 'left' ? 'left' : 'right'} onClick={() => setTeacher({ hidden: false })}>
        <img src={teacherPortrait(teacher.id)} alt="" width={32} height={40} />
        <span>Show {teacher.name}</span>
      </button>
    )
  }
  return (
    <Suspense fallback={null}>
      <TeacherLayer teacher={teacher} size={prefs.teacherSize} />
    </Suspense>
  )
}
