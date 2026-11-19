/** How a judge language id reads to people ("cpp" → "C++"). */
const NAMES: Record<string, string> = {
  cpp: 'C++', 'c++': 'C++', cpp17: 'C++17', cpp20: 'C++20', c: 'C', python: 'Python', python3: 'Python', py: 'Python', pypy: 'PyPy',
  java: 'Java', javascript: 'JavaScript', js: 'JavaScript', typescript: 'TypeScript', ts: 'TypeScript', go: 'Go', rust: 'Rust',
  csharp: 'C#', cs: 'C#', kotlin: 'Kotlin', swift: 'Swift', ruby: 'Ruby', php: 'PHP', scala: 'Scala', haskell: 'Haskell',
  lua: 'Lua', perl: 'Perl', r: 'R', dart: 'Dart', bash: 'Bash', sql: 'SQL', ocaml: 'OCaml', elixir: 'Elixir', julia: 'Julia',
}

export function langName(id: string | null | undefined): string {
  const k = String(id ?? '').trim()
  if (!k) return 'Unknown'
  return NAMES[k.toLowerCase()] ?? (k === k.toLowerCase() ? k.charAt(0).toUpperCase() + k.slice(1) : k)
}
