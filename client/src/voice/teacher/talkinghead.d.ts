/* The parts of TalkingHead (MIT, @met4citizen/talkinghead) the teacher uses. The package ships no types. */
declare module '@met4citizen/talkinghead' {
  export interface TalkingHeadOptions {
    ttsEndpoint?: string
    lipsyncModules?: string[]
    lipsyncLang?: string
    cameraView?: 'full' | 'mid' | 'upper' | 'head'
    cameraRotateEnable?: boolean
    cameraZoomEnable?: boolean
    cameraPanEnable?: boolean
    modelFPS?: number
    modelPixelRatio?: number
    avatarIdleEyeContact?: number
    avatarIdleHeadMove?: number
    avatarSpeakingEyeContact?: number
    avatarSpeakingHeadMove?: number
    lightAmbientIntensity?: number
    lightDirectIntensity?: number
  }
  export interface Lipsync {
    preProcessText(s: string): string
    wordsToVisemes(w: string): unknown
  }
  export class TalkingHead {
    constructor(node: HTMLElement, opt?: TalkingHeadOptions)
    audioCtx: AudioContext
    armature: { rotation: { y: number } } | null
    lipsync: Record<string, Lipsync>
    showAvatar(
      avatar: { url: string; body: 'F' | 'M'; avatarMood?: string; lipsyncLang?: string },
      onprogress?: (e: ProgressEvent) => void,
    ): Promise<void>
    speakAudio(
      r: { audio: AudioBuffer; words: string[]; wtimes: number[]; wdurations: number[] },
      opt?: { lipsyncLang?: string },
    ): void
    stopSpeaking(): void
    playGesture(name: string, dur?: number, mirror?: boolean, ms?: number): void
    stopGesture(ms?: number): void
    playPose(name: string, onprogress?: null, dur?: number): Promise<void>
    stopPose(): void
    setView(view: 'full' | 'mid' | 'upper' | 'head', opt?: Record<string, number>): void
    setMood(mood: string): void
    makeEyeContact(ms: number): void
    lookAtCamera(ms: number): void
    start(): void
    stop(): void
    dispose(): void
  }
}
declare module '@met4citizen/talkinghead/modules/lipsync-en.mjs' {
  import type { Lipsync } from '@met4citizen/talkinghead'
  export class LipsyncEn implements Lipsync {
    preProcessText(s: string): string
    wordsToVisemes(w: string): unknown
  }
}
