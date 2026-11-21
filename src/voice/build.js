/*
  Build mode (docs/voice/BLUEPRINT.md §3 row 1 and §4.3 step 5): the AI writes
  code, but only where writing it can't do the student's thinking for them.

  - "translate": the student's own code in another language, line for line.
    Allowed any time: the logic stays theirs. Bugs are translated too; the
    client checks the translation behaves exactly like the original.
  - "change": any other change ("make it iterative", "add memoization").
    Only after the judge has said Accepted on this problem, checked here on
    the server (a submission with verdict AC, or a Learn problem marked
    solved). Before that, Learn mode holds: the student writes the code.

  Free providers only (Guru's chain). The client runs the result on the
  examples and, on a failure, asks again with the failing case (at most 3
  automatic tries).
*/
const agent = require("../ai/agent");
const guru = require("./guru");
const { LANG_CONFIG } = require("../judge");

const MAX_CODE = 20000;

const TRANSLATE = `You translate a program from one programming language to another.

Rules (strict):
- Translate LINE FOR LINE. Keep the same algorithm, the same variable and function names, the same loops, the same order of operations, the same input reading and the same output format.
- Do NOT fix, improve, optimise or complete anything. If the original has a bug, the translation has the same bug. Keep the student's comments, translated into the new language's comment syntax.
- Use only the standard library of the target language. Read from standard input and write to standard output exactly as the original does.
- For Java, the public class must be named Main.
- Output ONLY the translated program in one code block. No explanation.`;

const CHANGE = `You change a student's program exactly as they ask. Their program is already accepted by the judge, so it is correct; keep it correct.

Rules (strict):
- Make ONLY the change asked for. Keep everything else as it is: names, structure, comments, input reading and output format.
- Use only the standard library. Read from standard input and write to standard output exactly as before.
- For Java, the public class must be named Main.
- If the request is not a change to this program, output exactly: NONE
- Otherwise output ONLY the whole changed program in one code block, then one line starting with "Changed:" that says in plain words what you changed.`;

/** The first fenced block, or the whole reply when it has none. */
function extractCode(out) {
  const s = String(out || "");
  const m = s.match(/```[\w+#-]*\n([\s\S]*?)```/);
  const code = (m ? m[1] : s.replace(/^Changed:.*$/im, "")).replace(/\s+$/, "");
  return code.slice(0, MAX_CODE);
}

function changedLine(out) {
  const m = String(out || "").match(/^Changed:\s*(.+)$/im);
  const s = m ? m[1].trim().slice(0, 240) : "";
  return s ? s[0].toUpperCase() + s.slice(1) : "";
}

const label = (id) => LANG_CONFIG[id]?.label || id;

/** May this student ask for a change (not a translation) on this problem? */
async function accepted(db, username, problem) {
  if (!username || !problem) return false;
  if (problem.kind === "platform") {
    const id = Number(problem.id);
    if (!Number.isInteger(id)) return false;
    const row = await db.get("SELECT 1 AS ok FROM submissions WHERE username=? AND problem_rowid=? AND verdict='AC' LIMIT 1", [username, id]);
    return !!row;
  }
  if (problem.kind === "learn") {
    const slug = String(problem.id || "");
    if (!/^[\w-]{1,80}$/.test(slug)) return false;
    const row = await db.get("SELECT status FROM learn_progress WHERE username=? AND item=?", [username, `code:${slug}`]).catch(() => null);
    return row?.status === "solved";
  }
  return false;
}

function messagesFor({ mode, code, language, target, instruction, failing, previous }) {
  const user =
    mode === "translate"
      ? `Translate this ${label(language)} program to ${label(target)}.\n\n\`\`\`${language}\n${code}\n\`\`\``
      : `The program (${label(language)}):\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nThe change the student asked for, in their words: """${instruction}"""`;
  const msgs = [{ role: "system", content: mode === "translate" ? TRANSLATE : CHANGE }, { role: "user", content: user }];
  if (previous && failing) {
    const want = mode === "translate" ? "the original program prints" : "the expected output is";
    msgs.push({ role: "assistant", content: "```\n" + String(previous).slice(0, MAX_CODE) + "\n```" });
    msgs.push({
      role: "user",
      content: `Your program behaves differently on this input.\nInput:\n${String(failing.input || "").slice(0, 2000)}\nYour program printed:\n${String(failing.actual || "").slice(0, 1000)}\n${want}:\n${String(failing.expected || "").slice(0, 1000)}${failing.error ? `\nError:\n${String(failing.error).slice(0, 800)}` : ""}\nFix only that difference and output the whole program again in one code block.`,
    });
  }
  return msgs;
}

/**
 * { ok, code, say, locked? }.
 * mode: 'translate' | 'change'; problem: { kind: 'platform'|'learn'|'custom', id }.
 */
async function buildCode({ user, db, mode, problem, code, language, target, instruction, failing, previous }) {
  const username = user?.username || "";
  const src = String(code || "");
  if (!src.trim()) return { ok: false, say: "There’s no code in the editor yet." };
  if (src.length > MAX_CODE) return { ok: false, say: "This code is too long for Build mode." };
  if (!LANG_CONFIG[language]) return { ok: false, say: "I don’t know this editor’s language." };
  if (mode === "translate") {
    if (!LANG_CONFIG[target]) return { ok: false, say: "I can’t run that language here, so I won’t translate to it." };
    if (target === language) return { ok: false, say: `It’s already in ${label(target)}.` };
  } else if (mode === "change") {
    const ask = String(instruction || "").trim();
    if (!ask) return { ok: false, say: "Say what to change, like “make it iterative”." };
    if (!(await accepted(db, username, problem))) {
      return {
        ok: false,
        locked: true,
        say: "Build mode opens once your solution is Accepted — until then you write the code, and I’ll give hints if you ask. You can still say “translate to Python”.",
      };
    }
  } else return { ok: false, say: "Unknown Build mode request." };

  const messages = messagesFor({ mode, code: src, language, target, instruction: String(instruction || "").slice(0, 600), failing, previous });
  for (const t of guru.chain()) {
    try {
      const out = await t.client.chat({ model: t.model, messages, maxTokens: 2500, temperature: 0, timeoutMs: 45000 });
      if (out.usage) agent.addUsage(username, out.usage).catch(() => {});
      if (mode === "change" && /^\s*NONE\b/.test(out.content || "")) return { ok: false, say: "That doesn’t sound like a change to this code. Try “make it iterative” or “use a hash map”." };
      const next = extractCode(out.content);
      if (!next.trim()) continue;
      const say = mode === "translate" ? `Your code, line for line, in ${label(target)}.` : changedLine(out.content) || "Here is the change.";
      return { ok: true, code: next, say, source: t.label };
    } catch {
      // Busy or limited: the next free provider.
    }
  }
  return { ok: false, say: "I can’t reach a free AI right now. Try again in a minute." };
}

module.exports = { buildCode, accepted, extractCode, changedLine, messagesFor, TRANSLATE, CHANGE };
