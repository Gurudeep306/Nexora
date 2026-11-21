/*
  The room screen: a slim top bar, the stage, a side panel (chat, people,
  tablet, settings) and the control bar. Keyboard: M mic, V camera, H hand,
  C chat, P people (when not typing).
*/
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import {
  Circle,
  Code2,
  Wrench,
  Hand,
  LayoutGrid,
  Link2,
  Lock,
  LockOpen,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  MoreHorizontal,
  PenLine,
  PhoneOff,
  Settings,
  Smile,
  Tablet,
  UserPlus,
  Users,
  Video,
  VideoOff,
  Volume2,
  WifiOff,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button, Modal, Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger, Popover, PopoverContent, PopoverTrigger, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { REACTIONS } from '../api'
import type { LiveSession, LiveState } from '../session'
import { canShareScreen } from '../devices'
import { Stage, type Layout } from './Stage'
import { ChatPanel, PeoplePanel, SettingsPanel, TabletPanel } from './Panels'
import { InvitePanel } from './Invite'
import { PollCard, QuestionPanel, TimerPill, ToolsPanel } from './Tools'
import { Board, type BoardHandle } from './Board'
import { LogoMark } from '@/components/brand/Logo'
import { listDevices } from '../devices'
import { ChevronUp } from 'lucide-react'

// The shared code pad brings Monaco: loaded only when someone opens it.
const CodePad = lazy(() => import('./CodePad'))

type Panel = 'chat' | 'people' | 'invite' | 'question' | 'tools' | 'tablet' | 'settings' | null

/** Every remote mic, playing (hidden). */
function AudioSinks({ session, s }: { session: LiveSession; s: LiveState }) {
  const items = Object.entries(s.media).flatMap(([peerId, m]) => (m.mic ? [{ peerId, track: m.mic }] : []))
  return (
    <div hidden>
      {items.map((i) => (
        <AudioSink key={`${i.peerId}:${i.track.id}`} session={session} peerId={i.peerId} speaker={session.prefs.speaker} />
      ))}
    </div>
  )
}
function AudioSink({ session, peerId, speaker }: { session: LiveSession; peerId: string; speaker: string }) {
  const ref = useRef<HTMLAudioElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    session.attach(peerId, 'mic', el)
    return () => session.detach(peerId, 'mic', el)
  }, [session, peerId])
  useEffect(() => {
    const el = ref.current as (HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> }) | null
    if (el?.setSinkId) void el.setSinkId(speaker || '').catch(() => {})
  }, [speaker])
  return <audio ref={ref} autoPlay />
}

/** The little arrow on the mic and camera buttons: pick a device, and the main options. */
function DeviceMenu({ session, kind }: { session: LiveSession; kind: 'mic' | 'cam' }) {
  const [list, setList] = useState<MediaDeviceInfo[]>([])
  const [, force] = useState(0)
  const p = session.prefs
  return (
    <Menu onOpenChange={(o) => o && void listDevices().then((d) => setList(kind === 'mic' ? d.mics : d.cams))}>
      <MenuTrigger asChild>
        <button type="button" className="lv-caret" aria-label={kind === 'mic' ? 'Microphone options' : 'Camera options'}>
          <ChevronUp className="size-3.5" aria-hidden="true" />
        </button>
      </MenuTrigger>
      <MenuContent align="start" side="top">
        <MenuLabel>{kind === 'mic' ? 'Microphone' : 'Camera'}</MenuLabel>
        {[{ deviceId: '', label: 'System default' } as MediaDeviceInfo, ...list].map((d) => (
          <MenuItem key={d.deviceId || 'default'} onSelect={() => void session.setDevice(kind, d.deviceId).then(() => force((n) => n + 1))}>
            {(d.label || (kind === 'mic' ? 'Microphone' : 'Camera')) + ((p[kind] || '') === d.deviceId ? ' ✓' : '')}
          </MenuItem>
        ))}
        <MenuSeparator />
        {kind === 'mic' ? (
          <MenuItem onSelect={() => void session.setNoise(!p.noise).then(() => force((n) => n + 1))}>{p.noise ? 'Background noise: reduced ✓' : 'Reduce background noise'}</MenuItem>
        ) : (
          <MenuItem onSelect={() => (session.setMirror(!p.mirror), force((n) => n + 1))}>{p.mirror ? 'Mirror my video ✓' : 'Mirror my video'}</MenuItem>
        )}
      </MenuContent>
    </Menu>
  )
}

function Elapsed({ since }: { since: number | null }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  if (!since) return null
  const sec = Math.max(0, Math.floor((now - since) / 1000))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const ss = String(sec % 60).padStart(2, '0')
  return <span className="lv-elapsed">{h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`}</span>
}

/** Record this room (this tab, with everyone's sound) to a file on this device. */
function useRecorder(session: LiveSession, s: LiveState) {
  const rec = useRef<{ mr: MediaRecorder; parts: Blob[]; stop: () => void } | null>(null)
  const [on, setOn] = useState(false)
  const toast = useToast()
  const start = async () => {
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 24 }, audio: true, ...({ preferCurrentTab: true, selfBrowserSurface: 'include' } as object) } as DisplayMediaStreamOptions)
      const ac = new AudioContext()
      const dest = ac.createMediaStreamDestination()
      const add = (t: MediaStreamTrack | null | undefined) => {
        if (t) ac.createMediaStreamSource(new MediaStream([t])).connect(dest)
      }
      add(s.micTrack)
      for (const m of Object.values(s.media)) add(m.mic)
      for (const t of display.getAudioTracks()) add(t)
      const stream = new MediaStream([...display.getVideoTracks(), ...dest.stream.getAudioTracks()])
      const type = ['video/webm;codecs=vp9,opus', 'video/webm', 'video/mp4'].find((t) => MediaRecorder.isTypeSupported(t)) || ''
      const mr = new MediaRecorder(stream, type ? { mimeType: type, videoBitsPerSecond: 2_500_000 } : undefined)
      const parts: Blob[] = []
      mr.ondataavailable = (e) => e.data.size && parts.push(e.data)
      const stop = () => {
        if (mr.state !== 'inactive') mr.stop()
        display.getTracks().forEach((t) => t.stop())
        void ac.close()
      }
      mr.onstop = () => {
        const blob = new Blob(parts, { type: mr.mimeType || 'video/webm' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `${(s.room?.title || 'room').replace(/[^\w-]+/g, '-')}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`
        a.click()
        setTimeout(() => URL.revokeObjectURL(a.href), 60_000)
        setOn(false)
        session.setRecording(false)
        rec.current = null
        toast.success('Recording saved', 'It is in your downloads.')
      }
      display.getVideoTracks()[0].addEventListener('ended', stop)
      mr.start(1000)
      rec.current = { mr, parts, stop }
      setOn(true)
      session.setRecording(true)
    } catch {
      /* cancelled */
    }
  }
  return { on, start, stop: () => rec.current?.stop() }
}

export function Room({ session, s, onLeft }: { session: LiveSession; s: LiveState; onLeft: () => void }) {
  const [panel, setPanel] = useState<Panel>(null)
  const [layout, setLayout] = useState<Layout>('auto')
  const [pinned, setPinned] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [board, setBoard] = useState<'open' | 'hidden' | null>(null)
  const [codeOn, setCodeOn] = useState(false)
  const boardRef = useRef<BoardHandle>(null)
  const toast = useToast()
  const recorder = useRecorder(session, s)
  const host = session.isHost()
  const voice = s.room?.mode === 'voice'
  const myHand = s.self ? s.hands[s.self.peerId] !== undefined : false
  const people = new Set([s.self?.username, ...Object.values(s.peers).map((p) => p.username)].filter(Boolean)).size
  const sharing = s.screens.some((x) => x.kind === 'screen')
  const boardOn = s.screens.some((x) => x.id === 'board')

  const toggle = useCallback((p: Exclude<Panel, null>) => setPanel((cur) => (cur === p ? null : p)), [])

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.metaKey || e.ctrlKey || e.altKey || t.closest('input, textarea, select, [contenteditable], .monaco-editor, .lv-board-canvas')) return
      const k = e.key.toLowerCase()
      if (k === 'm') session.setMic(!s.mic)
      else if (k === 'v' && !voice) void session.setCam(!s.cam)
      else if (k === 'h') session.hand(!myHand)
      else if (k === 'c') toggle('chat')
      else if (k === 'p') toggle('people')
      else if (k === 'i') toggle('invite')
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [session, s.mic, s.cam, myHand, voice, toggle])

  const startBoard = async () => {
    setBoard('open')
    // The canvas mounts first; then its stream is shared.
    requestAnimationFrame(() => {
      const t = boardRef.current?.track()
      if (t) void session.addScreen({ id: 'board', label: 'Whiteboard', kind: 'board', track: t })
    })
  }
  const stopBoard = () => {
    void session.stopScreen('board')
    setBoard(null)
  }

  // "Invite friends" on the waiting card opens the Invite panel.
  useEffect(() => {
    const open = () => setPanel('invite')
    window.addEventListener('lv:invite', open)
    return () => window.removeEventListener('lv:invite', open)
  }, [])
  const copyLink = () => void navigator.clipboard?.writeText(`${window.location.origin}/live/${session.code}`).then(() => toast.success('Link copied', 'Anyone signed in with the link can ask to join.'))
  const leave = () => {
    session.leave()
    onLeft()
  }

  return (
    <div className={cn('lv-room', panel && 'has-panel')}>
      <header className="lv-top">
        <div className="lv-top-title">
          <Link to="/live" className="lv-top-mark" aria-label="NexoraGuru Live" title="Back to Live (the room keeps going)">
            <LogoMark size={26} />
          </Link>
          <div className="min-w-0">
            {/* One line: the site's headings balance-wrap, which a room's top bar has no room for. */}
            <h1 className="lv-title" style={{ textWrap: 'nowrap' }}>
              {s.room?.title}
              {s.room?.locked && <Lock className="ml-1.5 inline size-3.5 align-[-1px] text-text-muted" aria-label="Locked" />}
            </h1>
            <p className="lv-top-sub">
              <span className="lv-dot-live" aria-hidden="true" />
              <span>{s.room?.isCall ? 'Call' : voice ? 'Voice room' : 'Study room'}</span>
              <span aria-hidden="true">·</span>
              <span>
                {people} {people === 1 ? 'person' : 'people'}
              </span>
              <span aria-hidden="true" className="max-sm:hidden">
                ·
              </span>
              <Elapsed since={s.joinedAt} />
            </p>
          </div>
        </div>
        <div className="lv-top-meta">
          <TimerPill session={session} s={s} />
          {Object.keys(s.recording).length > 0 && (
            <span className="lv-rec" role="status">
              <Circle className="size-2.5 fill-current" aria-hidden="true" /> Recording
            </span>
          )}
          {s.room?.about && (
            <Link to={`/gate/practice?ids=${encodeURIComponent(s.room.about.target)}`} target="_blank" className="lv-about">
              {s.room.about.title}
            </Link>
          )}
          <button type="button" className="lv-chip-btn lv-code-chip" onClick={() => setPanel('invite')} title="Invite people or share the link (I)" aria-label="Invite people (I)">
            <UserPlus className="size-3.5" aria-hidden="true" /> Invite
          </button>
        </div>
      </header>

      {(s.phase === 'reconnecting' || s.media_status === 'reconnecting') && (
        <div className="lv-banner is-warn" role="status">
          <WifiOff className="size-4" aria-hidden="true" /> Connection lost. Reconnecting…
        </div>
      )}
      {s.audioBlocked && (
        <button type="button" className="lv-banner is-action" onClick={() => session.startAudio()}>
          <Volume2 className="size-4" aria-hidden="true" /> Tap to turn on sound
        </button>
      )}
      {s.mutedTalking && (
        <div className="lv-banner is-hint" role="status">
          <MicOff className="size-4" aria-hidden="true" /> You are muted.
          <button type="button" className="lv-banner-act" onClick={() => session.setMic(true)}>
            Unmute (M)
          </button>
          <button type="button" className="lv-banner-x" onClick={() => session.dismissMutedHint()} aria-label="Close">
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      <main className="lv-body">
        <div className={cn('lv-stage-wrap', s.poll && 'has-poll')}>
          <div className="lv-stage-box">
            <Stage session={session} s={s} layout={layout} pinned={pinned} onPin={setPinned} />
          </div>
          {board && (
            <div className={cn('lv-board-sheet', board === 'hidden' && 'is-hidden')} aria-hidden={board === 'hidden'}>
              <div className="lv-board-head">
                <p className="m-0 text-[13px] text-text-secondary">Everyone sees this whiteboard.</p>
                <div className="flex gap-2">
                  <button type="button" className="lv-chip-btn" onClick={() => setBoard('hidden')}>
                    Hide for me
                  </button>
                  <button type="button" className="lv-chip-btn is-danger" onClick={stopBoard}>
                    Stop whiteboard
                  </button>
                </div>
              </div>
              <Board ref={boardRef} />
            </div>
          )}
          {codeOn && (
            <div className="lv-board-sheet lv-code-sheet">
              <div className="lv-board-head">
                <p className="m-0 text-[13px] text-text-secondary">Shared code pad: everyone in the room can type.</p>
                <button type="button" className="lv-chip-btn" onClick={() => setCodeOn(false)}>
                  Close for me
                </button>
              </div>
              <Suspense fallback={<p className="lv-hint">Opening the editor…</p>}>
                <CodePad session={session} lang={s.codeLang} />
              </Suspense>
            </div>
          )}
          <PollCard session={session} s={s} />
          <div className="lv-reactions" aria-hidden="true">
            {s.reactions.map((r) => (
              <span key={r.key} className="lv-reaction" style={{ ['--x' as string]: `${(r.key * 37) % 60}%` }}>
                <span className="lv-reaction-emoji">{r.emoji}</span>
                <span className="lv-reaction-name">{r.peerId === s.self?.peerId ? 'You' : s.peers[r.peerId]?.name}</span>
              </span>
            ))}
          </div>
          <div className="lv-notices" aria-live="polite">
            {s.notices.map((n) => (
              <p key={n.id} className={cn('lv-notice', n.tone && `is-${n.tone}`)}>
                {n.text}
              </p>
            ))}
          </div>
        </div>

        {panel && (
          <aside className="lv-panel" aria-label={panel}>
            <div className="lv-panel-head">
              <div className="lv-tabs" role="tablist" aria-label="Panel">
                {(
                  [
                    ['chat', 'Chat', s.unread],
                    ['people', 'People', host ? s.waiting.length : 0],
                    ['invite', 'Invite', 0],
                    ...(s.room?.about ? ([['question', 'Question', 0]] as const) : []),
                    ['tools', 'Tools', s.codeNew ? 1 : 0],
                    ...(panel === 'tablet' ? ([['tablet', 'Tablet', 0]] as const) : []),
                    ['settings', 'Settings', 0],
                  ] as const
                ).map(([id, label, n]) => (
                  <button key={id} type="button" role="tab" aria-selected={panel === id} className={cn('lv-tab', panel === id && 'is-on')} onClick={() => setPanel(id)}>
                    {label}
                    {n > 0 && panel !== id && <span className="lv-tab-n">{n}</span>}
                  </button>
                ))}
              </div>
              <button type="button" className="lv-round" onClick={() => setPanel(null)} aria-label="Close panel">
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            {panel === 'chat' && <ChatPanel session={session} s={s} />}
            {panel === 'people' && <PeoplePanel session={session} s={s} />}
            {panel === 'invite' && <InvitePanel session={session} s={s} />}
            {panel === 'tablet' && <TabletPanel session={session} s={s} />}
            {panel === 'question' && s.room?.about && <QuestionPanel id={s.room.about.target} />}
            {panel === 'tools' && (
              <ToolsPanel
                session={session}
                s={s}
                onCode={() => setCodeOn(true)}
                onBoard={() => (boardOn ? setBoard('open') : void startBoard())}
                onTablet={() => setPanel('tablet')}
              />
            )}
            {panel === 'settings' && <SettingsPanel session={session} s={s} />}
          </aside>
        )}
      </main>

      <section className="lv-controls" aria-label="Room controls">
        <div className="lv-ctrl-left max-lg:hidden">
          <span className="lv-people-n">
            <Users className="size-4" aria-hidden="true" /> {people}
          </span>
        </div>
        <div className="lv-ctrl-center lv-island" role="toolbar" aria-label="Controls">
          <span className="lv-split">
          <button type="button" className={cn('lv-ctrl', !s.mic && 'is-off')} onClick={() => session.setMic(!s.mic)} aria-pressed={s.mic} aria-label={s.mic ? 'Mute (M)' : 'Unmute (M)'} title={s.mic ? 'Mute (M)' : 'Unmute (M)'}>
            {s.mic ? <Mic className="size-5" aria-hidden="true" /> : <MicOff className="size-5" aria-hidden="true" />}
            <span className="lv-ctrl-label">{s.mic ? 'Mute' : 'Unmute'}</span>
          </button>
          <DeviceMenu session={session} kind="mic" />
          </span>
          {!voice && (
            <span className="lv-split">
            <button type="button" className={cn('lv-ctrl', !s.cam && 'is-off')} onClick={() => void session.setCam(!s.cam)} aria-pressed={s.cam} aria-label={s.cam ? 'Stop video (V)' : 'Start video (V)'} title={s.cam ? 'Stop video (V)' : 'Start video (V)'}>
              {s.cam ? <Video className="size-5" aria-hidden="true" /> : <VideoOff className="size-5" aria-hidden="true" />}
              <span className="lv-ctrl-label">{s.cam ? 'Stop video' : 'Start video'}</span>
            </button>
            <DeviceMenu session={session} kind="cam" />
            </span>
          )}
          <Menu>
            <MenuTrigger asChild>
              <button type="button" className={cn('lv-ctrl max-sm:hidden', (sharing || boardOn) && 'is-on')} aria-label="Share">
                <MonitorUp className="size-5" aria-hidden="true" />
                <span className="lv-ctrl-label">Share</span>
              </button>
            </MenuTrigger>
            <MenuContent align="center" side="top">
              <MenuLabel>Share with everyone</MenuLabel>
              {canShareScreen() && (
                <MenuItem icon={<MonitorUp />} onSelect={() => void session.shareScreen()}>
                  {sharing ? 'Share another screen' : 'Share a screen or window'}
                </MenuItem>
              )}
              <MenuItem icon={<PenLine />} onSelect={() => (boardOn ? setBoard('open') : void startBoard())}>
                {boardOn ? 'Open the whiteboard' : 'Whiteboard'}
              </MenuItem>
              <MenuItem icon={<Tablet />} onSelect={() => setPanel('tablet')}>
                From a tablet (QR)
              </MenuItem>
              <MenuItem icon={<Code2 />} onSelect={() => setCodeOn(true)}>
                Shared code pad
              </MenuItem>
              {s.screens.filter((x) => x.kind === 'screen').length > 0 && <MenuSeparator />}
              {s.screens
                .filter((x) => x.kind === 'screen')
                .map((x) => (
                  <MenuItem key={x.id} danger onSelect={() => void session.stopScreen(x.id)}>
                    Stop sharing {x.label.toLowerCase()}
                  </MenuItem>
                ))}
            </MenuContent>
          </Menu>
          <button type="button" className={cn('lv-ctrl', myHand && 'is-on')} onClick={() => session.hand(!myHand)} aria-pressed={myHand} aria-label={myHand ? 'Lower hand (H)' : 'Raise hand (H)'} title={myHand ? 'Lower hand (H)' : 'Raise hand (H)'}>
            <Hand className="size-5" aria-hidden="true" />
            <span className="lv-ctrl-label">{myHand ? 'Lower' : 'Raise'}</span>
          </button>
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="lv-ctrl max-sm:hidden" aria-label="Send a reaction">
                <Smile className="size-5" aria-hidden="true" />
                <span className="lv-ctrl-label">React</span>
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" className="lv-react-pop">
              {REACTIONS.map((e) => (
                <button key={e} type="button" className="lv-react-btn" onClick={() => session.react(e)} aria-label={`React ${e}`}>
                  {e}
                </button>
              ))}
            </PopoverContent>
          </Popover>
          <button type="button" className={cn('lv-ctrl', panel === 'chat' && 'is-on')} onClick={() => toggle('chat')} aria-pressed={panel === 'chat'} aria-label={`Chat (C)${s.unread ? `, ${s.unread} new` : ''}`} title="Chat (C)">
            <MessageSquare className="size-5" aria-hidden="true" />
            {s.unread > 0 && panel !== 'chat' && <span className="lv-badge">{s.unread > 99 ? '99+' : s.unread}</span>}
            <span className="lv-ctrl-label">Chat</span>
          </button>
          <button type="button" className={cn('lv-ctrl max-sm:hidden', panel === 'people' && 'is-on')} onClick={() => toggle('people')} aria-pressed={panel === 'people'} aria-label={`People (P)${s.waiting.length ? `, ${s.waiting.length} waiting` : ''}`} title="People (P)">
            <Users className="size-5" aria-hidden="true" />
            {host && s.waiting.length > 0 && <span className="lv-badge">{s.waiting.length}</span>}
            <span className="lv-ctrl-label">People</span>
          </button>
          <Menu>
            <MenuTrigger asChild>
              <button type="button" className="lv-ctrl" aria-label="More">
                <MoreHorizontal className="size-5" aria-hidden="true" />
                {host && s.waiting.length > 0 && <span className="lv-badge sm:hidden">{s.waiting.length}</span>}
                <span className="lv-ctrl-label">More</span>
              </button>
            </MenuTrigger>
            <MenuContent align="end" side="top">
              <div className="sm:hidden">
                <MenuItem icon={<Users />} onSelect={() => setPanel('people')}>
                  People{s.waiting.length && host ? ` · ${s.waiting.length} waiting` : ''}
                </MenuItem>
                {canShareScreen() && (
                  <MenuItem icon={<MonitorUp />} onSelect={() => void session.shareScreen()}>
                    Share a screen
                  </MenuItem>
                )}
                <MenuItem icon={<PenLine />} onSelect={() => (boardOn ? setBoard('open') : void startBoard())}>
                  Whiteboard
                </MenuItem>
                <MenuItem icon={<Tablet />} onSelect={() => setPanel('tablet')}>
                  Teach from a tablet
                </MenuItem>
                <MenuItem icon={<Code2 />} onSelect={() => setCodeOn(true)}>
                  Shared code pad
                </MenuItem>
                <MenuItem icon={<Wrench />} onSelect={() => setPanel('tools')}>
                  Polls and timer
                </MenuItem>
                <MenuLabel>React</MenuLabel>
                <div className="flex flex-wrap gap-1 px-2 pb-1">
                  {REACTIONS.map((e) => (
                    <button key={e} type="button" className="lv-react-btn" onClick={() => session.react(e)} aria-label={`React ${e}`}>
                      {e}
                    </button>
                  ))}
                </div>
                <MenuSeparator />
              </div>
              <MenuLabel>Layout</MenuLabel>
              {(['auto', 'gallery', 'speaker'] as const).map((l) => (
                <MenuItem key={l} icon={<LayoutGrid />} onSelect={() => setLayout(l)}>
                  {{ auto: 'Auto', gallery: 'Gallery', speaker: 'Speaker' }[l]}
                  {layout === l ? ' ✓' : ''}
                </MenuItem>
              ))}
              <MenuSeparator />
              {typeof MediaRecorder !== 'undefined' && canShareScreen() && (
                <MenuItem icon={<Circle />} onSelect={() => (recorder.on ? recorder.stop() : void recorder.start())}>
                  {recorder.on ? 'Stop recording' : 'Record to this device'}
                </MenuItem>
              )}
              <MenuItem icon={<Link2 />} onSelect={copyLink}>
                Copy the room link
              </MenuItem>
              <MenuItem icon={<Settings />} onSelect={() => setPanel('settings')}>
                Settings
              </MenuItem>
              {host && (
                <>
                  <MenuSeparator />
                  <MenuLabel>Host</MenuLabel>
                  <MenuItem icon={s.room?.locked ? <LockOpen /> : <Lock />} onSelect={() => session.lock(!s.room?.locked)}>
                    {s.room?.locked ? 'Unlock the room' : 'Lock the room'}
                  </MenuItem>
                  <MenuItem icon={<MicOff />} onSelect={() => session.muteOther('*')}>
                    Mute everyone
                  </MenuItem>
                  <MenuItem icon={<Hand />} onSelect={() => session.lowerHands()}>
                    Lower all hands
                  </MenuItem>
                </>
              )}
            </MenuContent>
          </Menu>
          <button type="button" className="lv-ctrl is-leave" onClick={() => (s.self?.role === 'host' ? setLeaving(true) : leave())} aria-label="Leave the room" title="Leave">
            <PhoneOff className="size-5" aria-hidden="true" />
            <span className="lv-ctrl-label">Leave</span>
          </button>
        </div>
        <div className="lv-ctrl-right max-lg:hidden">
          {s.transport === 'mesh' && <span className="lv-hint">Small room</span>}
        </div>
      </section>

      <AudioSinks session={session} s={s} />

      <Modal open={leaving} onClose={() => setLeaving(false)} title="Leave the room?" description="Leave and let the others carry on, or end the room for everyone." size="sm">
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => setLeaving(false)}>
            Stay
          </Button>
          <Button variant="outline" onClick={leave}>
            Just leave
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              session.endForAll()
              leave()
            }}
          >
            End for everyone
          </Button>
        </div>
      </Modal>
    </div>
  )
}
