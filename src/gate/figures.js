const fs = require("fs");
const path = require("path");

/*
 * GATE question figures live in public/gate-fig/<paper>/<name>.{png,svg}.
 *
 *  - The PNG is the figure cropped from the official question paper: it is
 *    the faithful source (black ink on white, 300–700 px wide).
 *  - The SVG is a vector redraw. The first batch of SVGs was produced by
 *    scripts/generate_all_gate_svgs.py from the figure's alt text. Those are
 *    category templates (a generic "LOGIC CIRCUIT", a five-node "GRAPH /
 *    NETWORK", ...) baked onto a dark navy card, and most of them do not match
 *    the question's real diagram. They are flagged here as drafts so the UI
 *    shows the official figure instead, until each SVG has been redrawn and
 *    checked against the paper.
 *
 * A redrawn SVG that no longer carries the generator's signature is treated
 * as verified and preferred automatically — no data change needed.
 */

const FIG_DIR = path.join(__dirname, "..", "..", "public", "gate-fig");

/** The generator's fingerprint: a full-size rounded navy backdrop rect. */
const DRAFT_SIGNATURE = /<rect[^>]*width="100%"[^>]*height="100%"[^>]*fill="#0b1329"/i;

const cache = new Map();

/** "draft" | "redrawn" | "missing" for one SVG path relative to gate-fig/. */
function svgStatus(rel) {
  if (!rel) return "missing";
  if (cache.has(rel)) return cache.get(rel);
  let status = "missing";
  try {
    const head = fs.readFileSync(path.join(FIG_DIR, rel), "utf8").slice(0, 4000);
    status = DRAFT_SIGNATURE.test(head) ? "draft" : "redrawn";
  } catch (_) {}
  cache.set(rel, status);
  return status;
}

/** Figure as served to the client: `svg` only when it is a checked redraw. */
function annotateFigure(fig) {
  if (!fig || !fig.f) return fig;
  const status = svgStatus(fig.svg);
  const out = { f: fig.f, alt: fig.alt || "" };
  if (status === "redrawn") out.svg = fig.svg;
  else if (status === "draft") out.draft = fig.svg;
  return out;
}

module.exports = { FIG_DIR, DRAFT_SIGNATURE, svgStatus, annotateFigure };
