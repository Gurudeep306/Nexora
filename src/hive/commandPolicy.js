// Which commands an agent may run on a machine without a person approving
// them, under the machine policy "safe" (Machines → Agent permissions).
//
// Deliberately narrow: tests, builds, type checks, linters and read-only git
// and file commands — one plain command, nothing chained, piped, redirected
// or substituted. Everything else still waits for a person.

const SAFE = [
  /^(npm|pnpm|yarn|bun) (test|t|run [\w:.-]+|ci --dry-run|ls|outdated|audit)( [\w:=./@-]+)*$/,
  /^npx (tsc|oxlint|eslint|prettier --check|vitest run|jest|playwright test|vite build)( [\w:=./@-]+)*$/,
  /^node (--test|-v|--version)( [\w:=./@*-]+)*$/,
  /^(python3?|py) -m (pytest|unittest|mypy|ruff check|black --check)( [\w:=./@-]+)*$/,
  /^(pytest|ruff check|mypy)( [\w:=./@-]+)*$/,
  /^(go (test|build|vet)|cargo (test|build|check|clippy|fmt --check))( [\w:=./@-]+)*$/,
  /^git (status|diff|log|show|branch|rev-parse|ls-files|blame)( [\w:=./@^~-]+)*$/,
  /^(ls|pwd|cat|head|tail|wc|grep|rg|find|which|tree|du|file|stat)( [\w:=./@*-]+)*$/,
  /^(node|python3?|npm|go|cargo|java|javac|gcc|g\+\+|rustc) (-v|-V|--version)$/,
];
// Anything that could chain, pipe, redirect, substitute or escalate.
const UNSAFE = /[;&|<>`$\\\n\r]|\bsudo\b|\brm\b|\bmv\b|\bchmod\b|\bchown\b|--exec\b|-exec\b|-delete\b|\bcurl\b|\bwget\b/;

/** May `command` run without a person approving it (policy "safe")? */
function safeCommand(command) {
  const c = String(command || "").trim().replace(/\s+/g, " ");
  if (!c || c.length > 300 || UNSAFE.test(c)) return false;
  return SAFE.some((re) => re.test(c));
}

module.exports = { safeCommand };
