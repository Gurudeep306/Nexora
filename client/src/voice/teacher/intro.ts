/* The teacher says who they are and what they can do (Settings → Say hello, or "introduce yourself"). */
import { getVoicePrefs } from '../prefs'
import { speak } from '../speak'
import { teacherMove } from './store'
import { OLD_NAMES, type TeacherInfo } from './teachers'

const HINDI_NAMES: Record<string, string> = { priya: 'प्रिया', kavya: 'काव्या', neha: 'नेहा', ananya: 'अनन्या', arjun: 'अर्जुन', rohan: 'रोहन', dev: 'देव' }

/** The teacher says who they are and what they can do (by the name the student gave; Hindi spelling for the old built-in names). */
export function introduce(t: TeacherInfo) {
  const lang = getVoicePrefs().lang
  teacherMove('wave')
  speak(
    lang === 'hi-IN'
      ? `नमस्ते! मैं ${t.name === OLD_NAMES[t.id] ? HINDI_NAMES[t.id] : t.name} हूँ, ${t.body === 'M' ? 'आपका' : 'आपकी'} टीचर। माइक दबाकर मुझसे कुछ भी पूछिए। आप कह सकते हैं: बाएं जाओ, बैठ जाओ, घूम जाओ।`
      : `Namaste! I'm ${t.name}, your NexoraGuru teacher. Press the mic and ask me anything. You can also say: go left, sit down, or turn around.`,
    lang,
  )
}

