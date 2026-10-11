/* Algorithm-animation specs produced by the model.
   The model writes a ```nexora_animation JSON block; we pull it out of the
   reply, then normalise whatever shape it produced into the frame format the
   client's CyberMatrixPlayer renders. */

const BLOCK_RE = /```(?:nexora_animation|json)\s*\n?([\s\S]*?)```/i;

/** Wants an animation? Same heuristic the old chat route used. */
function wantsAnimation(text) {
  return /animate|visuali[sz]|simulation|step through|show animation|animation/i.test(String(text || ""));
}

function normaliseAnimation(spec) {
  if (!spec || typeof spec !== "object" || !Array.isArray(spec.frames) || spec.frames.length === 0) return null;
  const frames = spec.frames.slice(0, 24).map((frame, fIdx) => {
    const f = frame && typeof frame === "object" ? frame : {};
    const roles = f.roles || f.state?.roles || {};
    const rawCells = Array.isArray(f.cells) ? f.cells : Array.isArray(f.state?.cells) ? f.state.cells : [];
    const cells = rawCells.slice(0, 40).map((c, cIdx) => {
      if (c && typeof c === "object") {
        const role = c.role || roles[cIdx] || "idle";
        return {
          id: String(c.id || `c${cIdx}`),
          v: c.v !== undefined ? c.v : c.value !== undefined ? c.value : cIdx,
          addr: c.addr || `0x${(4096 + cIdx * 4).toString(16)}`,
          role,
          elevation: Number.isFinite(c.elevation) ? c.elevation : role === "swap" ? -20 : role === "compare" ? -28 : 0,
        };
      }
      return { id: `c${cIdx}`, v: c, addr: `0x${(4096 + cIdx * 4).toString(16)}`, role: roles[cIdx] || "idle", elevation: 0 };
    });
    return {
      step: f.step || fIdx + 1,
      explanation: String(f.explanation || `Execution step ${fIdx + 1}`).slice(0, 400),
      cells,
      pointers: f.pointers || f.state?.pointers || {},
      roles,
      soundEffect: f.soundEffect || (Object.values(roles).includes("swap") ? "swap" : "hop"),
      codeLine: f.codeLine || 1,
    };
  });
  return {
    title: String(spec.title || "Algorithm animation").slice(0, 120),
    algorithm: String(spec.algorithm || "").slice(0, 80),
    data_structure: String(spec.data_structure || "array").slice(0, 40),
    time_complexity: String(spec.time_complexity || "").slice(0, 40),
    space_complexity: String(spec.space_complexity || "").slice(0, 40),
    pseudo_lines: Array.isArray(spec.pseudo_lines) ? spec.pseudo_lines.slice(0, 30).map((l) => String(l).slice(0, 160)) : [],
    frames,
    total_frames: frames.length,
  };
}

/** { text, visualization } — the prose with the JSON block removed, plus the spec. */
function extractAnimation(reply) {
  const text = String(reply || "");
  const m = text.match(BLOCK_RE);
  if (!m) return { text, visualization: null };
  let spec = null;
  try {
    spec = JSON.parse(m[1]);
  } catch {
    return { text, visualization: null };
  }
  const visualization = normaliseAnimation(spec);
  if (!visualization) return { text, visualization: null };
  return { text: text.replace(BLOCK_RE, "").trim(), visualization };
}

module.exports = { extractAnimation, normaliseAnimation, wantsAnimation };
