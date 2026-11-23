/*
  What the virtual teacher understands (docs/voice/VIRTUAL_TEACHER.md §3), as
  data. teacher/TeacherHost.tsx attaches what each does; these are offered
  only while a teacher is on. Checked with the other site-wide phrases against
  docs/voice/tests/commands.json (tests/voice-actions.test.js).

  Dependency-free and type-strippable.
*/
import type { ActionSpec, Args } from './types'

/* The guide (T2): what to point at or press is any name on the page, read from the whole sentence.
   Strict whole-sentence shapes only, so a question never turns into a click. */
const T = String.raw`(?:the\s+)?(.{2,60}?)(?:\s+(?:button|link|tab|section|option))?`
const POINT_EN = new RegExp(String.raw`^(?:please\s+)?(?:point|ishara)\s+(?:at|to|out|towards?)\s+${T}\s*$`, 'i')
const POINT_HI = new RegExp(String.raw`^${T}\s+(?:kahan|kaha|kidhar)\s+hai\s*\??$|^${T}\s+(?:pe|par|ki taraf)\s+(?:point|ishara)\s+karo\s*$`, 'i')
const POINT_DEV = /^(.{2,40}?)\s+(?:कहाँ|कहां|किधर)\s+है\s*\??$/
const CLICK_EN = new RegExp(String.raw`^(?:please\s+)?(?:click|press|tap)(?:\s+on)?\s+${T}\s*$`, 'i')
const CLICK_HI = new RegExp(String.raw`^${T}\s+(?:dabao|daba do|dabaiye|(?:pe|par)\s+click\s+karo|click\s+karo)\s*$`, 'i')
const CLICK_DEV = /^(.{2,40}?)\s+(?:दबाओ|दबा दो|पर क्लिक करो)\s*$/
const LINE = /^(?:please\s+)?(?:point\s+(?:at|to)|highlight|show(?:\s+me)?)\s+line\s+(?:number\s+)?(\d{1,5})\s*$|^line\s+(?:number\s+)?(\d{1,5})\s+(?:(?:pe|par)\s+point\s+karo|ki\s+taraf\s+ishara\s+karo|highlight\s+karo)\s*$/i

function first(u: string, res: RegExp[]): string | null {
  const t = u.trim().replace(/[.!?।]+$/, '')
  for (const re of res) {
    const m = t.match(re)
    const v = m?.slice(1).find(Boolean)
    if (v && !/^line\s+\d/i.test(v)) return v.trim()
  }
  return null
}

/** "point at the Run button", "Settings kahan hai" → { target: 'Run' }. */
export function parsePoint(u: string): Args | null {
  const v = first(u, [POINT_EN, POINT_HI, POINT_DEV])
  return v ? { target: v } : null
}
/** "click Run", "press the submit button", "Run dabao" → { target: 'Run' }. */
export function parseClick(u: string): Args | null {
  const v = first(u, [CLICK_EN, CLICK_HI, CLICK_DEV])
  return v ? { target: v } : null
}
/** "point at line 12", "line 12 pe point karo" → { line: '12' }. */
export function parseLine(u: string): Args | null {
  const m = u.trim().replace(/[.!?।]+$/, '').match(LINE)
  const n = m?.[1] ?? m?.[2]
  return n ? { line: n } : null
}

export const TEACHER_SPECS: ActionSpec[] = [
  { id: 'teacher.left', risk: 'safe', say: { en: ['go left', 'move left', 'go to the left', 'left side go', 'left go', 'shift left', 'baayen go', 'left side mein go'], hi: ['बाएं जाओ', 'बायें जाओ', 'लेफ्ट जाओ'] } },
  { id: 'teacher.right', risk: 'safe', say: { en: ['go right', 'move right', 'go to the right', 'right side go', 'right go', 'shift right', 'daayen go', 'right side mein go'], hi: ['दाएं जाओ', 'दायें जाओ', 'राइट जाओ'] } },
  { id: 'teacher.centre', risk: 'safe', say: { en: ['come here', 'come to the middle', 'come to the centre', 'come to the center', 'go to the middle', 'beech mein aao', 'idhar aao', 'yahan aao', 'paas aao'], hi: ['इधर आओ', 'यहाँ आओ', 'बीच में आओ'] } },
  { id: 'teacher.turn', risk: 'safe', say: { en: ['turn around', 'turn round', 'spin around', 'do a spin', 'ghoom', 'ghoomo', 'ghoom jaiye', 'ek chakkar lagao'], hi: ['घूम जाओ', 'घूमो'] } },
  { id: 'teacher.sit', risk: 'safe', say: { en: ['sit down', 'sit', 'take a seat', 'have a seat', 'baith', 'baitho', 'baith go', 'baith jaiye'], hi: ['बैठ जाओ', 'बैठो', 'बैठ जाइए'] } },
  { id: 'teacher.stand', risk: 'safe', say: { en: ['stand up', 'stand', 'get up', 'khade ho', 'khade ho go', 'khada ho', 'uth go', 'utho'], hi: ['खड़े हो जाओ', 'उठो', 'खड़े हो'] } },
  { id: 'teacher.wave', risk: 'safe', say: { en: ['wave', 'wave your hand', 'wave at me', 'say hi', 'say hello', 'haath hilao'], hi: ['हाथ हिलाओ'] } },
  { id: 'teacher.namaste', risk: 'safe', say: { en: ['namaste', 'say namaste', 'namaskar'], hi: ['नमस्ते', 'नमस्ते करो', 'नमस्कार'] } },
  { id: 'teacher.thumbs', risk: 'safe', say: { en: ['thumbs up', 'give me a thumbs up', 'well done'], hi: ['थम्स अप'] } },
  { id: 'teacher.point', risk: 'safe', say: { en: ['point up', 'point', 'point with your finger', 'ungli dikhao'], hi: ['उंगली दिखाओ'] } },
  { id: 'teacher.hide', risk: 'reversible', say: { en: ['hide the teacher', 'hide teacher', 'hide yourself', 'teacher hide', 'go away', 'teacher hatao', 'chhup go'], hi: ['टीचर हटाओ', 'छुप जाओ'] } },
  { id: 'teacher.show', risk: 'safe', say: { en: ['show the teacher', 'show teacher', 'teacher show', 'teacher dikhao', 'come out', 'bahar aao'], hi: ['टीचर दिखाओ', 'बाहर आओ'] } },
  { id: 'teacher.point.line', risk: 'safe', parse: parseLine, say: { en: [] } },
  { id: 'teacher.point.at', risk: 'safe', parse: parsePoint, say: { en: [] } },
  { id: 'teacher.click', risk: 'reversible', parse: parseClick, say: { en: [] } },
  {
    id: 'teacher.side',
    risk: 'safe',
    args: { side: ['right|daayen|dayen|दाएं|दायें', 'left|baayen|bayen|बाएं|बायें'] },
    say: { en: ['what is on your {side}', 'whats on your {side}', 'what do you see on your {side}', 'tumhare {side} mein kya hai', 'aapke {side} mein kya hai', '{side} side mein kya hai'], hi: ['तुम्हारे {side} में क्या है'] },
  },
  { id: 'teacher.tour', risk: 'safe', say: { en: ['give me a tour', 'page tour', 'tour of this page', 'explain this page', 'what is this page', 'show me around', 'is page ke baare mein batao', 'yeh page kya hai', 'page samjhao'], hi: ['इस पेज के बारे में बताओ', 'यह पेज क्या है'] } },
  { id: 'teacher.talk', risk: 'safe', say: { en: ["let's talk", 'lets talk', 'talk to me', 'conversation mode', 'chat with me', 'baat karte hain', 'baat karo', 'mujhse baat karo'], hi: ['बात करते हैं', 'बात करो', 'मुझसे बात करो'] } },
  { id: 'teacher.intro', risk: 'safe', say: { en: ['introduce yourself', 'who are you', 'what is your name', 'your name', 'apna naam batao', 'apne baare mein batao'], hi: ['अपना नाम बताओ', 'अपने बारे में बताओ'] } },
]
