/*
  The Action Graph: one list of everything the site can do, shared by the ⌘K
  palette, the shortcut sheet, voice commands and (later) the Guru tutor's
  tool calls and WebMCP. See docs/voice/BLUEPRINT.md §4.1.

  Keep this module dependency-free and type-strippable (node tests import it).
*/

/**
 * How careful a voice command must be before acting:
 * - safe: do it at once, outline the target briefly (scroll, open, play)
 * - reversible: do it; "undo" or a second command changes it (choose an option)
 * - irreversible: needs a spoken and a visible confirmation (submit a test)
 */
export type Risk = 'safe' | 'reversible' | 'irreversible'

/** Spoken phrases. `{name}` marks a slot filled from `args[name]`. */
export interface Phrases {
  /** English and Hinglish written in Roman letters. */
  en: string[]
  /** Hindi in Devanagari, or Hinglish phrasings worth listing separately. */
  hi?: string[]
}

export type Args = Record<string, string>

export interface VoiceAction {
  /** Stable, dotted id: 'nav.open', 'viz.pause', 'gate.answer.choose'. */
  id: string
  /** Label shown in the palette and shortcut sheet. */
  title: string
  /** Short hint shown on the right in the palette. */
  hint?: string
  /** Palette group. Defaults to 'Actions'. */
  group?: string
  /** Icon name for the palette (see components/icon). */
  icon?: string
  say: Phrases
  /** Allowed values for each slot. A value may carry spoken aliases: 'B|bee|बी'. */
  args?: Record<string, string[]>
  risk: Risk
  /** Keyboard shortcut to show (the page still handles the key itself). */
  keys?: string[]
  /** Hide from the palette (voice-only actions such as "scroll down"). */
  palette?: boolean
  /**
   * For a value no list can hold (a number answer): read it from the whole
   * utterance. Returning args wins over phrase matching.
   */
  parse?: (utterance: string) => Args | null
  /** Only offered while this returns true. */
  when?: () => boolean
  run: (args: Args) => unknown
}

/** The data part of an action, without functions: what tests and the matcher need. */
export type ActionSpec = Pick<VoiceAction, 'id' | 'say' | 'args' | 'risk' | 'parse'>
