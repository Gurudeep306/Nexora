/*
  The virtual teachers: realistic 3D people from the Microsoft Rocketbox
  Avatar Library (MIT licence, client/public/teachers/README.md), converted
  for TalkingHead by scripts/teacher/convert-rocketbox.py.

  Dependency-free and type-strippable.
*/
export type TeacherBody = 'F' | 'M'

export interface TeacherInfo {
  id: 'maya' | 'elena' | 'kai' | 'victor'
  name: string
  /** TalkingHead's body type: sets how the idle stance and hands move. */
  body: TeacherBody
  /** Download size, rounded, so a student on data knows. */
  mb: number
}

export const TEACHERS: TeacherInfo[] = [
  { id: 'maya', name: 'Maya', body: 'F', mb: 5.3 },
  { id: 'elena', name: 'Elena', body: 'F', mb: 4.1 },
  { id: 'kai', name: 'Kai', body: 'M', mb: 4.2 },
  { id: 'victor', name: 'Victor', body: 'M', mb: 2.9 },
]

export function teacherById(id: string): TeacherInfo | null {
  return TEACHERS.find((t) => t.id === id) ?? null
}

export const teacherModel = (id: string) => `/teachers/${id}.glb`
export const teacherPortrait = (id: string) => `/teachers/${id}.jpg`
