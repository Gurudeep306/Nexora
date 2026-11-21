/*
  Mirror Run, lane D step 2 (docs/voice/BLUEPRINT.md §4.3): the student's
  spoken approach, in any mix of English and Hindi, becomes NexoraGuru
  pseudocode — each line tied to the words that produced it, and written
  exactly as said, mistakes included. The point is to show the student their
  own idea running; a "helpful" fix would hide the bug they need to find.

  Free providers only (the same chain as Guru). If none answers, the student
  writes the pseudocode by hand: the runner itself needs no AI.
*/
const agent = require("../ai/agent");
const { chain } = require("./guru");

const SYSTEM = `You turn a student's spoken approach to an algorithm into pseudocode, line by line, EXACTLY as they said it.

Rules (strict):
- Be faithful. Do NOT fix, improve, complete or optimise anything. If they say "while low < high", write that, even if it is wrong. If they skip a step, skip it. If something is ambiguous, pick the most literal reading.
- Use ONLY this pseudocode: assignments "x ← expr" (several with ";" on one line), "if cond:" / "else if cond:" / "else:", "while cond:", "for i from A to B:" (both ends included), "swap a[i], a[j]", "return expr", "print expr", "break", "continue". Blocks by 2-space indentation. Operators: + − * / (whole-number division rounds down) % = ≠ < ≤ > ≥ and or not; a[i]; len(a); min(…); max(…).
- Use the variable names the student used. The input array is "a" (its length is "n") and the other inputs keep the names listed below.
- After each line add "  # " and the student's own words (a few) that produced that line.
- No function header, no explanation, no code fences. Output only the pseudocode lines.
- If what they said is not an algorithm at all, output exactly: NONE`;

function clean(out) {
  let s = String(out || "").replace(/```[a-z]*\n?|```/gi, "").trim();
  if (/^NONE\b/i.test(s)) return "";
  // Keep it short and plain: at most 30 lines of at most 160 characters.
  return s.split("\n").slice(0, 30).map((l) => l.replace(/\s+$/, "").slice(0, 160)).join("\n");
}

/** { pseudo, source } — pseudo is "" when the approach couldn't be turned into steps. */
async function approachToPseudo({ user, text, inputs = [], lessonTitle = "" }) {
  const said = String(text || "").trim().slice(0, 1500);
  if (!said) return { pseudo: "", source: "rule", say: "Tell me your approach in a sentence or two." };
  const names = inputs.filter((n) => /^[A-Za-z_]\w{0,20}$/.test(n)).slice(0, 6);
  const messages = [
    { role: "system", content: SYSTEM },
    { role: "user", content: `Lesson: ${String(lessonTitle).slice(0, 120)}\nInputs: ${names.join(", ") || "a, n"}\nThe student said: """${said}"""` },
  ];
  let lastErr = null;
  for (const t of chain()) {
    try {
      const out = await t.client.chat({ model: t.model, messages, maxTokens: 500, temperature: 0, timeoutMs: 20000 });
      if (out.usage) agent.addUsage(user?.username || "", out.usage).catch(() => {});
      // An empty answer (all thinking, or cut off): try the next free provider.
      if (!String(out.content || "").trim()) continue;
      const pseudo = clean(out.content);
      if (!pseudo) return { pseudo: "", source: t.label, say: "That didn’t sound like steps yet. Say what you do first, then what repeats, then when you stop." };
      return { pseudo, source: t.label, say: "Here are your steps, written as you said them. Check them, then run." };
    } catch (e) {
      lastErr = e;
    }
  }
  void lastErr;
  return { pseudo: "", source: "none", say: "I can’t reach the AI that writes the steps right now. Type your steps in the box instead — the run itself works without it." };
}

module.exports = { approachToPseudo, SYSTEM };
