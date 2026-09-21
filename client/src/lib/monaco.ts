/**
 * Bundle Monaco with the app instead of loading it from a CDN at runtime.
 * - Works offline / behind strict networks and CSPs (no jsdelivr dependency).
 * - Only loaded by the pages that render an editor (Solve, AI Lab), which are
 *   lazy routes, so it doesn't bloat the first page load.
 */
import * as monaco from 'monaco-editor'
import { loader } from '@monaco-editor/react'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    if (label === 'typescript' || label === 'javascript') return new TsWorker()
    return new EditorWorker()
  },
}

loader.config({ monaco })

export { monaco }
