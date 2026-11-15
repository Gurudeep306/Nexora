/** Heuristic flag for commands that destroy data or pipe remote code: shown as a warning chip before approval. */
const RISKY_CMD = /\b(rm\s+-[a-z]*r[a-z]*f\b|git\s+push\s+(-f|--force)\b|git\s+reset\s+--hard\b|drop\s+table\b|truncate\b|sudo\b|curl[^\n|]*\|\s*(ba|z)?sh\b|mkfs\b|\bdd\b[^\n]*of=\/dev\/|>\s*\/dev\/[sd])/i
export const riskyCommand = (cmd: string) => RISKY_CMD.test(cmd)
