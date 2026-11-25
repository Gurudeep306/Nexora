/*
  Everything NexoraGuru can do, in one list (the Explore page). Each entry
  says in one line what it does and where it lives, and links straight there.
  Keep it true: only features that exist, at the address they really have.
*/
export interface Feature {
  id: string
  name: string
  what: string
  where: string
  to: string
  icon: string
  /** Search words beyond the name. */
  tags?: string
  /** Opens the voice mic instead of a page. */
  action?: 'voice'
}

export interface FeatureGroup {
  id: string
  title: string
  line: string
  items: Feature[]
}

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    id: 'learn',
    title: 'Learn',
    line: 'Courses where every idea is animated step by step.',
    items: [
      { id: 'dsa', name: 'DSA course', what: 'Chapters with animations, proofs and problems with editorials in five languages.', where: 'Learn → Data Structures & Algorithms', to: '/learn/dsa', icon: 'learn', tags: 'arrays graphs trees dp' },
      { id: 'subjects', name: 'CS subjects', what: 'Lessons for every subject, with a skill tree, a plan and a leaderboard.', where: 'Learn → pick a subject', to: '/learn', icon: 'book' },
      { id: 'ai-courses', name: 'AI courses', what: 'From school maths to how big models are built.', where: 'Learn → AI courses', to: '/learn/ai-courses', icon: 'brain' },
      { id: 'mirror', name: 'Mirror Run', what: 'Say your approach; it runs beside the lesson’s animation and shows the first step that differs.', where: 'Under any lesson animation', to: '/learn/dsa', icon: 'route', tags: 'voice pseudocode approach' },
      { id: 'listen', name: 'Listen to a lesson', what: 'Lessons read aloud, the spoken word underlined as it goes.', where: 'Any notes or lesson page → Listen', to: '/learn', icon: 'monitor', tags: 'read aloud audio' },
      { id: 'highlights', name: 'Highlights and notes', what: 'Highlight lines in a lesson and write notes beside them.', where: 'Select text in a lesson', to: '/gate/notebook', icon: 'bookmark' },
      { id: 'videos', name: 'Video explanations', what: 'Record or watch short explanations beside each topic and question — camera, screen, whiteboard or iPad.', where: 'The “Explain” mark beside lesson headings', to: '/learn', icon: 'image', tags: 'record explain' },
      { id: 'nexus', name: 'Nexus', what: 'A map of 60+ subjects; mastery grows as you finish lessons and solve.', where: 'Nexus', to: '/nexus', icon: 'nexus' },
    ],
  },
  {
    id: 'code',
    title: 'Practice and code',
    line: 'Problems from every judge, checked in 30+ languages.',
    items: [
      { id: 'problems', name: 'Problems', what: 'Codeforces, CodeChef, AtCoder, LeetCode, SPOJ and more, with filters and sets.', where: 'Problems', to: '/problems', icon: 'problems' },
      { id: 'ai-tests', name: 'AI tests (10+ per problem)', what: 'Made automatically when a problem opens: the examples, corner cases and checked AI tests.', where: 'Solve page → Tests', to: '/problems', icon: 'sparkles', tags: 'testcases generate' },
      { id: 'benchmark', name: 'The benchmark', what: 'A fixed set of 10–12 trusted tests decides “solved”; passing some earns that share.', where: 'Solve page → Submit', to: '/problems', icon: 'target' },
      { id: 'dryrun', name: 'Dry run', what: 'Watch your own code run step by step, with every variable — and an AI that explains any step.', where: 'Solve page → Dry run (Alt+D)', to: '/problems', icon: 'activity', tags: 'trace debug step' },
      { id: 'howitruns', name: 'How it runs', what: 'Your code read, checked, turned into real machine instructions and run.', where: 'Solve page → How it runs', to: '/problems', icon: 'terminal', tags: 'compiler assembly' },
      { id: 'build', name: 'Build mode', what: '“Translate to Python” any time; other changes after Accepted, checked on the examples.', where: 'Solve page → the mic', to: '/problems', icon: 'wand', tags: 'voice translate' },
      { id: 'explainback', name: 'Explain it back', what: 'Explain your accepted solution; a pass counts towards your Nexus mastery.', where: 'Solve page → after Accepted', to: '/problems', icon: 'medal' },
      { id: 'contests', name: 'Contests', what: 'Upcoming contests from every judge, and your own hosted contests.', where: 'Contests', to: '/contests', icon: 'contests' },
      { id: 'workshop', name: 'Workshop', what: 'Write your own problems with tests, and share them.', where: 'Workshop', to: '/workshop', icon: 'workshop' },
      { id: 'analytics', name: 'Analytics', what: 'Your progress, ratings, weak topics and streaks.', where: 'Analytics', to: '/analytics', icon: 'analytics' },
    ],
  },
  {
    id: 'gate',
    title: 'GATE CSE',
    line: 'Past papers with verified solutions, notes and a real exam console.',
    items: [
      { id: 'gate-practice', name: 'Practice past papers', what: 'Every PYQ with a verified solution and figures.', where: 'GATE → Practice', to: '/gate/practice', icon: 'gate' },
      { id: 'gate-notes', name: 'GATE notes', what: 'Subject notes with animations and live labs.', where: 'GATE → Notes', to: '/gate/notes', icon: 'book' },
      { id: 'gate-tests', name: 'Timed tests', what: 'Mock papers in an exam console like the real one — even answer by voice.', where: 'GATE → Tests', to: '/gate/tests', icon: 'timer', tags: 'cbt mock exam' },
      { id: 'gate-review', name: 'Review queue', what: 'Spaced repetition brings back what you are about to forget.', where: 'GATE → Review', to: '/gate/review', icon: 'clock' },
      { id: 'gate-daily', name: 'Daily question', what: 'One question a day to keep the streak.', where: 'GATE → Daily', to: '/gate/daily', icon: 'calendar' },
      { id: 'handwritten', name: 'Handwritten solutions', what: 'Write on a tablet or snap your paper with a phone — no sign-in on the device.', where: 'Under any GATE practice question', to: '/gate/practice', icon: 'image', tags: 'tablet phone paper' },
      { id: 'gate-plan', name: 'Study planner', what: 'A week-by-week plan from your exam date and weak spots.', where: 'GATE → Planner', to: '/gate/planner', icon: 'route' },
    ],
  },
  {
    id: 'together',
    title: 'Together',
    line: 'Study with friends, live or in chat.',
    items: [
      { id: 'messages', name: 'Messages', what: 'Chats and groups; share problems, code and questions. Alerts like a phone, even with the site closed.', where: 'The chat icon in the top bar, or Community → Messages', to: '/social?tab=messages', icon: 'messages', tags: 'chat dm notifications' },
      { id: 'live-room', name: 'Study rooms and calls', what: 'Video or voice, several screens, a whiteboard, polls, a shared timer and code pad.', where: 'Live → Start a room', to: '/live', icon: 'live', tags: 'video call zoom' },
      { id: 'lecture', name: 'Live lectures', what: 'You teach — from your tablet’s board — and many watch, chat and raise a hand.', where: 'Live → Start a room or lecture → Live lecture', to: '/live', icon: 'users', tags: 'broadcast stream teach' },
      { id: 'invite', name: 'Invite to a call', what: 'Friends online get a ring; others get the link. Share by WhatsApp, Telegram or QR.', where: 'In a room → Invite', to: '/live', icon: 'user-plus' },
      { id: 'community', name: 'Community', what: 'Posts, friends, solve rooms and the leaderboard.', where: 'Community', to: '/social', icon: 'social' },
    ],
  },
  {
    id: 'ai',
    title: 'AI and voice',
    line: 'Talk to the site in English, Hindi or Hinglish.',
    items: [
      { id: 'voice', name: 'Voice commands', what: '“Notes kholo”, “dark mode”, “run” — the site does it. Alt+M opens the mic anywhere.', where: 'The mic in the top bar', to: '', icon: 'sparkles', action: 'voice', tags: 'mic speak hindi' },
      { id: 'scene', name: 'Talk to animations', what: '“Swap pe ruko”, “why did i become 4”, “what if sorted” — answers come from the real steps.', where: 'With an animation on screen, press the mic', to: '/learn/dsa', icon: 'activity' },
      { id: 'guru', name: 'Guru, the tutor', what: 'Ask a doubt aloud: hints that climb step by step, never the answer before you try.', where: 'Press the mic and ask', to: '', icon: 'bot', action: 'voice', tags: 'doubt hint' },
      { id: 'guru-device', name: 'Guru on your device', what: 'Download Guru once and it answers on your own laptop: private, free, quick on a weak connection. Needs a browser that can use the graphics chip.', where: 'Settings → Voice → Guru on this device', to: '/settings', icon: 'bot', tags: 'offline private download local model' },
      { id: 'assistant', name: 'AI assistant', what: 'Ask about anything on the page you are on.', where: 'The sparkle button (⌘J)', to: '', icon: 'sparkles' },
    ],
  },
  {
    id: 'you',
    title: 'Make it yours',
    line: 'Your look, your Dock, your profile.',
    items: [
      { id: 'themes', name: 'Twelve themes', what: 'Himalaya, Sakura, Kerala and more — plus your own accent, fonts and text size.', where: 'Appearance', to: '/theme', icon: 'palette' },
      { id: 'dock', name: 'Your Dock', what: 'Choose what is in it, where it sits and how big it is.', where: 'Dock → … → Customize Dock', to: '/settings', icon: 'sliders' },
      { id: 'profile', name: 'Profile and achievements', what: 'Your levels, badges, solved problems and a shareable card.', where: 'Profile', to: '/profile', icon: 'profile' },
      { id: 'bookmarks', name: 'Bookmarks and submissions', what: 'Everything you saved and every solution you sent.', where: 'Bookmarks', to: '/bookmarks', icon: 'bookmarks' },
    ],
  },
]
