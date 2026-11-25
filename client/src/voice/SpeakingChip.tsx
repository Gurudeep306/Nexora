/*
  While the site speaks, a small chip says which voice it is and offers Stop.
  Natural and Kokoro voices are labelled "AI voice" (India's IT rules on
  synthetic audio, docs/voice/STEP1_EARS_DESIGN.md §S8); the text is always on
  screen as well, so nothing depends on hearing it.
*/
import { Square, Volume2 } from 'lucide-react'
import { stopSpeaking, useSpeaking } from './speak'
import { useTeacher } from './teacher/store'

export function SpeakingChip() {
  const s = useSpeaking()
  const t = useTeacher()
  // A teacher on screen shows the same label and Stop in its speech bubble.
  if (!s.on || (t.status === 'ready' && !t.hidden)) return null
  const ai = s.engine === 'natural' || s.engine === 'kokoro'
  return (
    <div className="vc-speaking" role="status">
      <Volume2 className="size-3.5" aria-hidden="true" />
      <span>
        {ai ? <strong>AI voice</strong> : null}
        {ai ? ` · ${s.name}` : s.name}
      </span>
      <button type="button" onClick={stopSpeaking} aria-label="Stop speaking">
        <Square className="size-3" aria-hidden="true" /> Stop
      </button>
    </div>
  )
}
