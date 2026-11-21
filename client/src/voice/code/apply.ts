/*
  Code by voice, lane C: carry out a parsed edit in the Monaco editor. Every
  change is one undo step ("undo" takes it back) and is outlined briefly so
  the student sees exactly what changed. No AI.
*/
import type { editor as MonacoEditor } from 'monaco-editor'
import type { CodeCommand } from './parse'
import type { CodeHandle } from './active'
import { opensBlock, renameInCode, sayLine, snippet, summarize } from './gen'

export type CodeResult = { say: string } | { error: string }

type Ed = MonacoEditor.IStandaloneCodeEditor

const FLASH_MS = 1400

function flash(ed: Ed, from: number, to = from) {
  const deco = ed.createDecorationsCollection([
    { range: { startLineNumber: from, startColumn: 1, endLineNumber: to, endColumn: 1 }, options: { isWholeLine: true, className: 'vc-code-flash' } },
  ])
  setTimeout(() => deco.clear(), FLASH_MS)
}

function unit(ed: Ed): string {
  const o = ed.getModel()?.getOptions()
  return o?.insertSpaces === false ? '\t' : ' '.repeat(o?.tabSize ?? 4)
}

function lineOk(model: MonacoEditor.ITextModel, n: number | undefined, cur: number): number | string {
  const line = n ?? cur
  const max = model.getLineCount()
  return line >= 1 && line <= max ? line : `There ${max === 1 ? 'is only 1 line' : `are only ${max} lines`}.`
}

function edit(ed: Ed, edits: MonacoEditor.IIdentifiedSingleEditOperation[]) {
  ed.pushUndoStop()
  ed.executeEdits('voice', edits)
  ed.pushUndoStop()
}

export function applyCode(cmd: CodeCommand, h: CodeHandle): CodeResult {
  const ed = h.editor()
  const model = ed?.getModel()
  if (!ed || !model) return { error: 'The editor isn’t ready yet.' }
  const lang = h.language()
  const cur = ed.getPosition()?.lineNumber ?? 1

  switch (cmd.verb) {
    case 'goto': {
      const line = 'line' in cmd ? cmd.line : cmd.where === 'top' ? 1 : model.getLineCount()
      const ok = lineOk(model, line, cur)
      if (typeof ok === 'string') return { error: ok }
      ed.revealLineInCenter(ok)
      ed.setPosition({ lineNumber: ok, column: model.getLineMaxColumn(ok) })
      ed.focus()
      flash(ed, ok)
      return { say: `Line ${ok}.` }
    }
    case 'read': {
      const ok = lineOk(model, cmd.line, cur)
      if (typeof ok === 'string') return { error: ok }
      ed.revealLineInCenter(ok)
      flash(ed, ok)
      const words = sayLine(model.getLineContent(ok))
      return { say: words ? `Line ${ok}: ${words}` : `Line ${ok} is empty.` }
    }
    case 'summary':
      return { say: summarize(model.getValue(), lang) }
    case 'rename': {
      const r = renameInCode(model.getValue(), cmd.from, cmd.to, lang)
      if (r.clash) return { error: `${cmd.to} is already used in this code, so I left ${cmd.from} as it is.` }
      if (!r.count) return { error: `I couldn’t find ${cmd.from} in the code.` }
      const pos = ed.getPosition()
      edit(ed, [{ range: model.getFullModelRange(), text: r.text }])
      if (pos) ed.setPosition(pos)
      return { say: `Renamed ${cmd.from} to ${cmd.to} in ${r.count} ${r.count === 1 ? 'place' : 'places'}. Say “undo” to take it back.` }
    }
    case 'insert': {
      const { verb: _v, ...ins } = cmd
      void _v
      const snip = snippet(ins, lang)
      if (!snip) return { error: `I can’t write that in ${lang} by voice yet. Type it, and I’ll help with the rest.` }
      const text = model.getLineContent(cur)
      const base = text.match(/^\s*/)?.[0] ?? ''
      const blank = text.trim() === ''
      const indent = blank ? base : base + (opensBlock(text, lang) ? unit(ed) : '')
      const u = unit(ed)
      const lines = snip.lines.map((l) => indent + l.replace(/\t/g, u))
      let first: number
      // Fill an empty line (this one, or the one just below) instead of pushing it down.
      const nextBlank = !blank && cur < model.getLineCount() && model.getLineContent(cur + 1).trim() === ''
      if (blank || nextBlank) {
        const at = blank ? cur : cur + 1
        edit(ed, [{ range: { startLineNumber: at, startColumn: 1, endLineNumber: at, endColumn: model.getLineMaxColumn(at) }, text: lines.join('\n') }])
        first = at
      } else {
        const end = model.getLineMaxColumn(cur)
        edit(ed, [{ range: { startLineNumber: cur, startColumn: end, endLineNumber: cur, endColumn: end }, text: '\n' + lines.join('\n') }])
        first = cur + 1
      }
      const target = first + snip.cursorLine
      ed.setPosition({ lineNumber: target, column: model.getLineMaxColumn(target) })
      ed.revealLineInCenter(target)
      ed.focus()
      flash(ed, first, first + lines.length - 1)
      const what = ins.what === 'for' ? 'a for loop' : ins.what === 'while' ? 'a while loop' : ins.what === 'if' ? 'an if' : ins.what === 'print' ? 'a print' : 'a return'
      const note = ins.what === 'print' && lang === 'c' ? ' It prints an int; change %d if it isn’t one.' : ''
      return { say: `Added ${what} at line ${first}.${note}` }
    }
    case 'undo':
    case 'redo':
      ed.focus()
      ed.trigger('voice', cmd.verb, null)
      return { say: cmd.verb === 'undo' ? 'Undone.' : 'Redone.' }
    case 'delete': {
      const ok = lineOk(model, cmd.line, cur)
      if (typeof ok === 'string') return { error: ok }
      const last = model.getLineCount()
      const range =
        ok < last
          ? { startLineNumber: ok, startColumn: 1, endLineNumber: ok + 1, endColumn: 1 }
          : { startLineNumber: Math.max(1, ok - 1), startColumn: ok > 1 ? model.getLineMaxColumn(ok - 1) : 1, endLineNumber: ok, endColumn: model.getLineMaxColumn(ok) }
      edit(ed, [{ range, text: '' }])
      return { say: `Deleted line ${ok}. Say “undo” to bring it back.` }
    }
    case 'duplicate': {
      const ok = lineOk(model, cmd.line, cur)
      if (typeof ok === 'string') return { error: ok }
      const end = model.getLineMaxColumn(ok)
      edit(ed, [{ range: { startLineNumber: ok, startColumn: end, endLineNumber: ok, endColumn: end }, text: '\n' + model.getLineContent(ok) }])
      flash(ed, ok + 1)
      return { say: `Copied line ${ok} below it.` }
    }
    case 'comment': {
      const ok = lineOk(model, cmd.line, cur)
      if (typeof ok === 'string') return { error: ok }
      ed.setPosition({ lineNumber: ok, column: 1 })
      ed.trigger('voice', cmd.off ? 'editor.action.removeCommentLine' : 'editor.action.addCommentLine', null)
      flash(ed, ok)
      return { say: cmd.off ? `Uncommented line ${ok}.` : `Commented out line ${ok}.` }
    }
    case 'format':
      if (h.format?.()) return { say: 'Formatted.' }
      return { error: 'There’s no formatter for this language.' }
  }
}
