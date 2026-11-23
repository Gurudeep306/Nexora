/*
  The virtual teachers: realistic 3D people from the Microsoft Rocketbox
  Avatar Library (MIT licence, client/public/teachers/README.md), converted
  for TalkingHead by scripts/teacher/convert-rocketbox.py.

  Dependency-free and type-strippable.
*/
export type TeacherBody = 'F' | 'M'

export type TeacherId = 'priya' | 'kavya' | 'neha' | 'ananya' | 'arjun' | 'rohan' | 'dev'

export interface TeacherInfo {
  id: TeacherId
  name: string
  /** TalkingHead's body type: sets how the idle stance and hands move. */
  body: TeacherBody
  /** Download size, rounded, so a student on data knows. */
  mb: number
  /** Their own voice on our voice server (Kokoro's Indian voices, src/voice/tts.js). */
  voice: 'hf_alpha' | 'hf_beta' | 'hm_omega' | 'hm_psi'
}

/* Rocketbox people chosen and toned to look Indian (warmer skin, brown eyes:
   scripts/teacher/tint-skin.py), each with an Indian voice. */
export const TEACHERS: TeacherInfo[] = [
  { id: 'priya', name: 'Priya', body: 'F', mb: 4.9, voice: 'hf_alpha' },
  { id: 'kavya', name: 'Kavya', body: 'F', mb: 5.1, voice: 'hf_beta' },
  { id: 'neha', name: 'Neha', body: 'F', mb: 5.3, voice: 'hf_alpha' },
  { id: 'ananya', name: 'Ananya', body: 'F', mb: 5.3, voice: 'hf_beta' },
  { id: 'arjun', name: 'Arjun', body: 'M', mb: 3.0, voice: 'hm_omega' },
  { id: 'rohan', name: 'Rohan', body: 'M', mb: 3.2, voice: 'hm_psi' },
  { id: 'dev', name: 'Dev', body: 'M', mb: 5.0, voice: 'hm_omega' },
]

/** Teachers from before (2026-11) and who took their place. */
export const RENAMED: Record<string, TeacherId> = { maya: 'ananya', elena: 'kavya', kai: 'arjun', victor: 'dev' }

export function teacherById(id: string): TeacherInfo | null {
  return TEACHERS.find((t) => t.id === id) ?? null
}

export const teacherModel = (id: string) => `/teachers/${id}.glb`
export const teacherPortrait = (id: string) => `/teachers/${id}.jpg`
