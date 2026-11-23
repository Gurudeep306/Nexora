/*
  What the virtual teacher understands (docs/voice/VIRTUAL_TEACHER.md §3), as
  data. teacher/TeacherHost.tsx attaches what each does; these are offered
  only while a teacher is on. Checked with the other site-wide phrases against
  docs/voice/tests/commands.json (tests/voice-actions.test.js).

  Dependency-free and type-strippable.
*/
import type { ActionSpec } from './types'

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
  { id: 'teacher.talk', risk: 'safe', say: { en: ["let's talk", 'lets talk', 'talk to me', 'conversation mode', 'chat with me', 'baat karte hain', 'baat karo', 'mujhse baat karo'], hi: ['बात करते हैं', 'बात करो', 'मुझसे बात करो'] } },
  { id: 'teacher.intro', risk: 'safe', say: { en: ['introduce yourself', 'who are you', 'what is your name', 'your name', 'apna naam batao', 'apne baare mein batao'], hi: ['अपना नाम बताओ', 'अपने बारे में बताओ'] } },
]
