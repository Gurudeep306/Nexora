export interface Diag {
  line: number
  column: number
  message: string
  severity: 'error' | 'warning'
}

/**
 * Pulls line/column locations out of compiler & runtime output so the editor
 * can underline the exact line that broke (error-lens style).
 * Covers clang/gcc/javac/rustc/go vet style messages, Python tracebacks,
 * Node stack frames and a generic "line N" last resort.
 */
export function parseDiagnostics(text: string): Diag[] {
  if (!text) return []
  const out: Diag[] = []
  const seen = new Set<string>()
  const push = (line: number, column: number, message: string, severity: Diag['severity'] = 'error') => {
    if (!Number.isFinite(line) || line < 1) return
    const key = `${line}:${message}`
    if (seen.has(key)) return
    seen.add(key)
    out.push({ line, column: Math.max(1, column || 1), message: message.slice(0, 240), severity })
  }

  // clang / gcc / javac / rustc / go:  file.ext:12:5: error: message
  for (const m of text.matchAll(/[^\s:()]+\.[A-Za-z]+:(\d+):(?:(\d+):)?\s*(error|warning|fatal error|note):\s*([^\n]+)/g)) {
    push(+m[1], +(m[2] || 1), `${m[3]}: ${m[4].trim()}`, m[3] === 'error' || m[3] === 'fatal error' ? 'error' : 'warning')
  }

  // Python traceback:  File "/tmp/arena_x.py", line 12, in <module>
  const pyException = text.match(/^([A-Za-z_.]+(?:Error|Exception|Warning|Exit)[^\n:]*)/m)?.[1]
  for (const m of text.matchAll(/File "[^"]+", line (\d+)/g)) {
    push(+m[1], 1, pyException ? `Runtime: ${pyException}` : 'Runtime error here')
  }

  // Node stack frames:  at fn (/tmp/arena_x.js:12:33)
  const jsException = text.match(/^([A-Za-z]+(?:Error|Exception)[^\n:]*)/m)?.[1]
  for (const m of text.matchAll(/\([^)\n]*\.(?:js|ts):(\d+):(\d+)\)/g)) {
    push(+m[1], +m[2], jsException ? `Runtime: ${jsException}` : 'Runtime error here')
  }

  // Last resort: "line 12"
  if (out.length === 0) {
    for (const m of text.matchAll(/\bline (\d+)\b/gi)) push(+m[1], 1, 'Error reported near here')
  }

  return out.slice(0, 40)
}
