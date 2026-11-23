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
  /** What the student calls this teacher: they name them (Settings → Virtual teacher); 'Teacher' until they do. */
  name: string
  /** How the teacher looks, for the catalogue (they have no names of their own). */
  look: string
  /** TalkingHead's body type: sets how the idle stance and hands move. */
  body: TeacherBody
  /** Download size, rounded, so a student on data knows. */
  mb: number
  /** Their own voice on our voice server (Kokoro's Indian voices, src/voice/tts.js). */
  voice: 'hf_alpha' | 'hf_beta' | 'hm_omega' | 'hm_psi'
}

/* Rocketbox people chosen and toned to look Indian (warmer skin, brown eyes:
   scripts/teacher/tint-skin.py), each with an Indian voice. */
const LOOKS: Omit<TeacherInfo, 'name'>[] = [
  { id: 'priya', look: 'Brown sweater, curly hair in a bun', body: 'F', mb: 4.9, voice: 'hf_alpha' },
  { id: 'kavya', look: 'Grey top, long open hair', body: 'F', mb: 5.1, voice: 'hf_beta' },
  { id: 'neha', look: 'Pink blazer, short hair', body: 'F', mb: 5.3, voice: 'hf_alpha' },
  { id: 'ananya', look: 'Black suit, short dark hair', body: 'F', mb: 5.3, voice: 'hf_beta' },
  { id: 'arjun', look: 'Dark suit and tie', body: 'M', mb: 3.0, voice: 'hm_omega' },
  { id: 'rohan', look: 'Blue hoodie and cap', body: 'M', mb: 3.2, voice: 'hm_psi' },
  { id: 'dev', look: 'White jacket, short beard', body: 'M', mb: 5.0, voice: 'hm_omega' },
]

/** What a teacher is called before the student names them. */
export const UNNAMED = 'Teacher'

/** The names teachers had before students named them (2026-11): kept for anyone who chose one then. */
export const OLD_NAMES: Record<TeacherId, string> = { priya: 'Priya', kavya: 'Kavya', neha: 'Neha', ananya: 'Ananya', arjun: 'Arjun', rohan: 'Rohan', dev: 'Dev' }

/** A name as a student typed it, made safe: letters (any script), spaces, ' and -, at most 20 characters. */
export function cleanName(v: unknown): string {
  return String(v ?? '')
    .replace(/[^\p{L}\p{M}' -]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20)
    .trim()
}

let names: Partial<Record<TeacherId, string>> = {}
/** The names this student gave (prefs.ts calls this whenever they change). */
export function setTeacherNames(n: Partial<Record<TeacherId, string>>) {
  names = n
}

const named = (t: Omit<TeacherInfo, 'name'>): TeacherInfo => ({ ...t, name: names[t.id] || UNNAMED })

/** Rocketbox people chosen and toned to look Indian (warmer skin, brown eyes: scripts/teacher/tint-skin.py), each with an Indian voice. */
export const TEACHERS: readonly Omit<TeacherInfo, 'name'>[] = LOOKS

/** Teachers from before (2026-11) and who took their place. */
export const RENAMED: Record<string, TeacherId> = { maya: 'ananya', elena: 'kavya', kai: 'arjun', victor: 'dev' }

export function teacherById(id: string): TeacherInfo | null {
  const t = LOOKS.find((x) => x.id === id)
  return t ? named(t) : null
}

export const teacherModel = (id: string) => `/teachers/${id}.glb`
export const teacherPortrait = (id: string) => `/teachers/${id}.jpg`
