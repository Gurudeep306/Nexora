/* The teacher says who they are and what they can do (Settings → Say hello, or "introduce yourself"). */
import { getVoicePrefs } from '../prefs'
import { speak } from '../speak'
import { teacherMove } from './store'
import type { TeacherInfo } from './teachers'

const HINDI_NAMES: Record<string, string> = { maya: 'माया', elena: 'एलेना', kai: 'काई', victor: 'विक्टर' }

/** The teacher says who they are and what they can do. */
export function introduce(t: TeacherInfo) {
  const lang = getVoicePrefs().lang
  teacherMove('wave')
  speak(
    lang === 'hi-IN'
      ? `नमस्ते! मैं ${HINDI_NAMES[t.id] ?? t.name} हूँ, आपकी टीचर। माइक दबाकर मुझसे कुछ भी पूछिए। आप कह सकते हैं: बाएं जाओ, बैठ जाओ, घूम जाओ।`
      : `Hi, I'm ${t.name}, your NexoraGuru teacher. Press the mic and ask me anything. You can also say: go left, sit down, or turn around.`,
    lang,
  )
}

