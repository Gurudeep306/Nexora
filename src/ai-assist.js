/* ========== AI-assisted translation + coding coach ==========
   - Language detection (script analysis → Google → LLM) with confidence
   - Translation that protects math/code, with Google or context-aware AI
   - Semantic problem finder (intent → SQL pool → AI re-rank)
   All model calls go through the Groq agent (src/ai/agent.js runTask); the
   coding coach itself lives in src/ai/modes.js (coach_* via /api/agent/task). */
const express = require("express");
const crypto = require("crypto");
const { me, meSql } = require("./context");
const { runTask } = require("./ai/agent");
const { isConfigured } = require("./ai/groq");
const { sendError } = require("./routes/agent");

const LANGUAGES = [
  // Indian languages
  { code: "hi", name: "Hindi", native: "हिन्दी", group: "indian" },
  { code: "bn", name: "Bengali", native: "বাংলা", group: "indian" },
  { code: "te", name: "Telugu", native: "తెలుగు", group: "indian" },
  { code: "mr", name: "Marathi", native: "मराठी", group: "indian" },
  { code: "ta", name: "Tamil", native: "தமிழ்", group: "indian" },
  { code: "ur", name: "Urdu", native: "اردو", group: "indian" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી", group: "indian" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ", group: "indian" },
  { code: "ml", name: "Malayalam", native: "മലയാളം", group: "indian" },
  { code: "or", name: "Odia", native: "ଓଡ଼ିଆ", group: "indian" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ", group: "indian" },
  { code: "as", name: "Assamese", native: "অসমীয়া", group: "indian" },
  { code: "mai", name: "Maithili", native: "मैथिली", group: "indian" },
  { code: "bho", name: "Bhojpuri", native: "भोजपुरी", group: "indian" },
  { code: "sa", name: "Sanskrit", native: "संस्कृतम्", group: "indian" },
  { code: "ne", name: "Nepali", native: "नेपाली", group: "indian" },
  { code: "gom", name: "Konkani", native: "कोंकणी", group: "indian" },
  { code: "doi", name: "Dogri", native: "डोगरी", group: "indian" },
  { code: "sd", name: "Sindhi", native: "سنڌي", group: "indian" },
  { code: "mni-Mtei", name: "Manipuri", native: "ꯃꯤꯇꯩꯂꯣꯟ", group: "indian" },
  // World languages
  { code: "en", name: "English", native: "English", group: "world" },
  { code: "es", name: "Spanish", native: "Español", group: "world" },
  { code: "fr", name: "French", native: "Français", group: "world" },
  { code: "de", name: "German", native: "Deutsch", group: "world" },
  { code: "pt", name: "Portuguese", native: "Português", group: "world" },
  { code: "it", name: "Italian", native: "Italiano", group: "world" },
  { code: "ru", name: "Russian", native: "Русский", group: "world" },
  { code: "uk", name: "Ukrainian", native: "Українська", group: "world" },
  { code: "zh-CN", name: "Chinese (Simplified)", native: "简体中文", group: "world" },
  { code: "zh-TW", name: "Chinese (Traditional)", native: "繁體中文", group: "world" },
  { code: "ja", name: "Japanese", native: "日本語", group: "world" },
  { code: "ko", name: "Korean", native: "한국어", group: "world" },
  { code: "ar", name: "Arabic", native: "العربية", group: "world" },
  { code: "fa", name: "Persian", native: "فارسی", group: "world" },
  { code: "tr", name: "Turkish", native: "Türkçe", group: "world" },
  { code: "vi", name: "Vietnamese", native: "Tiếng Việt", group: "world" },
  { code: "id", name: "Indonesian", native: "Bahasa Indonesia", group: "world" },
  { code: "th", name: "Thai", native: "ไทย", group: "world" },
  { code: "pl", name: "Polish", native: "Polski", group: "world" },
  { code: "nl", name: "Dutch", native: "Nederlands", group: "world" },
];
const LANG_BY_CODE = Object.fromEntries(LANGUAGES.map((l) => [l.code.toLowerCase(), l]));
const langInfo = (code) =>
  LANG_BY_CODE[String(code || "").toLowerCase()] ||
  LANG_BY_CODE[String(code || "").toLowerCase().split("-")[0]] || { code, name: code, native: code, group: "world" };

/* ── helpers ── */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function plainText(html) {
  return String(html || "")
    .replace(/\$\$\$[\s\S]*?\$\$\$/g, " ")
    .replace(/<(script|style|pre|code)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const SCRIPTS = [
  ["devanagari", /[ऀ-ॿ]/g, "hi"],
  ["bengali", /[ঀ-৿]/g, "bn"],
  ["gurmukhi", /[਀-੿]/g, "pa"],
  ["gujarati", /[઀-૿]/g, "gu"],
  ["oriya", /[଀-୿]/g, "or"],
  ["tamil", /[஀-௿]/g, "ta"],
  ["telugu", /[ఀ-౿]/g, "te"],
  ["kannada", /[ಀ-೿]/g, "kn"],
  ["malayalam", /[ഀ-ൿ]/g, "ml"],
  ["meetei", /[ꯀ-꯿]/g, "mni-Mtei"],
  ["arabic", /[؀-ۿ]/g, "ar"],
  ["cyrillic", /[Ѐ-ӿ]/g, "ru"],
  ["hangul", /[가-힯ᄀ-ᇿ]/g, "ko"],
  ["kana", /[぀-ヿ]/g, "ja"],
  ["han", /[一-鿿]/g, "zh-CN"],
  ["thai", /[฀-๿]/g, "th"],
  ["latin", /[A-Za-zÀ-ɏ]/g, "en"],
];
// Scripts shared by several languages — confirm with Google / AI.
const AMBIGUOUS = new Set(["latin", "devanagari", "bengali", "arabic", "cyrillic", "han"]);

function scriptGuess(text) {
  let best = null;
  let total = 0;
  const counts = {};
  for (const [name, re] of SCRIPTS) {
    const n = (text.match(re) || []).length;
    counts[name] = n;
    total += n;
  }
  for (const [name, , code] of SCRIPTS) {
    if (!best || counts[name] > counts[best.script]) best = { script: name, code };
  }
  if (!best || !total || counts[best.script] === 0) return null;
  // Japanese mixes kana with kanji; any kana means Japanese.
  if (best.script === "han" && counts.kana > 0) best = { script: "kana", code: "ja" };
  return { ...best, share: counts[best.script] / total };
}

async function googleTranslate(text, tl, sl = "auto") {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(tl)}&dt=t&dt=ld&dj=1&q=${encodeURIComponent(text)}`;
  const resp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(20000) });
  if (!resp.ok) throw new Error(`google ${resp.status}`);
  const data = await resp.json();
  const out = (data.sentences || []).map((s) => s.trans || "").join("");
  return {
    text: out,
    src: data.src || data.ld_result?.srclangs?.[0] || null,
    confidence: data.confidence ?? data.ld_result?.srclangs_confidences?.[0] ?? null,
  };
}

async function myMemory(chunk, tl, sl) {
  const pieces = [];
  let rest = chunk;
  while (rest.length > 450) {
    let cut = rest.lastIndexOf(". ", 450);
    if (cut < 200) cut = rest.lastIndexOf(" ", 450);
    if (cut < 200) cut = 450;
    pieces.push(rest.slice(0, cut + 1));
    rest = rest.slice(cut + 1);
  }
  if (rest) pieces.push(rest);
  const out = [];
  for (const p of pieces) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(p)}&langpair=${encodeURIComponent(sl && sl !== "auto" ? sl : "en")}|${encodeURIComponent(tl)}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(20000) });
    const j = await resp.json();
    if (j.responseStatus !== 200 || !j.responseData?.translatedText) throw new Error(`mymemory ${j.responseStatus}`);
    out.push(j.responseData.translatedText);
  }
  return out.join("");
}

/* ── Detection ── */
async function detectLanguage(html) {
  const text = plainText(html).slice(0, 1500);
  if (text.length < 3) return { code: "en", ...langInfo("en"), confidence: 0, method: "empty" };
  const guess = scriptGuess(text);
  if (guess && !AMBIGUOUS.has(guess.script) && guess.share > 0.5) {
    return { ...langInfo(guess.code), code: guess.code, confidence: Math.min(0.99, 0.7 + guess.share * 0.3), method: "script" };
  }
  try {
    const g = await googleTranslate(text.slice(0, 400), "en");
    if (g.src) {
      const code = g.src === "zh-CN" || g.src === "zh" ? "zh-CN" : g.src;
      return { ...langInfo(code), code, confidence: g.confidence ?? 0.9, method: "google" };
    }
  } catch {
    /* try AI */
  }
  // AI is optional here: without a key (or over budget) we fall back to the script guess.
  if (isConfigured() && me()) {
    try {
      const j = await runTask("detect_lang", { text }, { user: { username: me() } });
      if (j?.code) return { ...langInfo(j.code), code: j.code, confidence: j.confidence, method: "ai" };
    } catch {
      /* fallthrough */
    }
  }
  const code = guess?.code || "en";
  return { ...langInfo(code), code, confidence: guess ? 0.5 : 0.2, method: "script" };
}

/* ── Protect math / code from translators ── */
function protect(html) {
  const keep = [];
  const token = (m) => {
    keep.push(m);
    return ` ⟦${keep.length - 1}⟧ `;
  };
  const out = String(html)
    .replace(/<pre\b[\s\S]*?<\/pre>/gi, token)
    .replace(/<code\b[\s\S]*?<\/code>/gi, token)
    .replace(/\$\$\$\$\$\$[\s\S]*?\$\$\$\$\$\$/g, token)
    .replace(/\$\$\$[\s\S]*?\$\$\$/g, token)
    .replace(/<span class="(?:tex-span|tex-font-style-[a-z]+)"[^>]*>[\s\S]*?<\/span>/gi, token)
    .replace(/<(?:img|video|audio|iframe)\b[^>]*>(?:[\s\S]*?<\/(?:video|audio|iframe)>)?/gi, token)
    .replace(/<script type="math\/tex[^"]*">[\s\S]*?<\/script>/gi, token);
  return { text: out, keep };
}
function restore(text, keep) {
  return String(text).replace(/\s?⟦\s*(\d+)\s*⟧\s?/g, (_m, i) => keep[Number(i)] ?? "");
}

function chunkHtml(html, max) {
  const chunks = [];
  let rest = html;
  while (rest.length > max) {
    let at = rest.lastIndexOf("</p>", max);
    if (at < max * 0.4) at = rest.lastIndexOf(">", max);
    if (at < max * 0.4) at = rest.lastIndexOf(". ", max);
    if (at < max * 0.4) at = max;
    chunks.push(rest.slice(0, at + 1));
    rest = rest.slice(at + 1);
  }
  if (rest) chunks.push(rest);
  return chunks;
}

async function translateWithAi(html, target, source) {
  const t = langInfo(target);
  const s = langInfo(source);
  const parts = chunkHtml(html, 3500);
  const out = [];
  for (const part of parts) {
    out.push(await runTask("translate", { text: part, target: t, source: s }, { user: { username: me() } }));
  }
  return out.join("");
}

async function translateWithGoogle(html, target, source) {
  const parts = chunkHtml(html, 4200);
  const out = [];
  for (let i = 0; i < parts.length; i++) {
    if (i) await sleep(300);
    let done = null;
    for (const wait of [0, 900, 2200]) {
      if (wait) await sleep(wait);
      try {
        done = (await googleTranslate(parts[i], target, source || "auto")).text;
        if (done) break;
      } catch {
        /* retry */
      }
    }
    if (!done) done = await myMemory(parts[i], target, source);
    out.push(done);
  }
  return out.join("");
}

/* ── Router ── */
function createAiAssistRouter({ get, all, run, aiLimiter }) {
  const router = express.Router();

  router.get("/api/translate/languages", (_req, res) => res.json({ ok: true, languages: LANGUAGES }));

  const detectCache = new Map();
  router.post("/api/translate/detect", aiLimiter, async (req, res) => {
    try {
      const html = String(req.body?.html || "").slice(0, 20000);
      const k = crypto.createHash("sha1").update(html).digest("hex");
      let detected = detectCache.get(k);
      if (!detected) {
        detected = await detectLanguage(html);
        detectCache.set(k, detected);
        if (detectCache.size > 500) detectCache.delete(detectCache.keys().next().value);
      }
      res.json({ ok: true, detected });
    } catch (e) {
      sendError(res, e, "translate.detect");
    }
  });

  router.post("/api/translate", aiLimiter, async (req, res) => {
    try {
      const { html, targetLang, engine = "auto" } = req.body || {};
      if (!html || typeof html !== "string") return res.status(400).json({ ok: false, error: "No html provided" });
      if (html.length > 60000) return res.status(413).json({ ok: false, error: "Statement too long to translate" });
      const tl = String(targetLang || "en").slice(0, 10);
      const eng = ["auto", "ai", "google"].includes(engine) ? engine : "auto";

      const detected = req.body.sourceLang
        ? { ...langInfo(req.body.sourceLang), code: req.body.sourceLang, confidence: 1, method: "user" }
        : await detectLanguage(html);
      if (detected.code && detected.code.toLowerCase().split("-")[0] === tl.toLowerCase().split("-")[0] && !tl.includes("-")) {
        return res.json({ ok: true, translated: html, detected, engine: "none", sameLanguage: true });
      }

      const key = crypto.createHash("sha1").update(`v2::${eng}::${detected.code}::${tl}::${html}`).digest("hex");
      const hit = await get("SELECT translated FROM translation_cache WHERE cache_key=?", [key]);
      if (hit) return res.json({ ok: true, translated: hit.translated, detected, engine: eng, cached: true });

      const { text, keep } = protect(html);
      let used = eng;
      let out;
      if (eng === "ai") {
        out = await translateWithAi(text, tl, detected.code);
      } else if (eng === "google") {
        out = await translateWithGoogle(text, tl, detected.code);
      } else {
        // auto: Google first (fast); AI if Google is rate-limited or fails.
        try {
          out = await translateWithGoogle(text, tl, detected.code);
          used = "google";
        } catch {
          out = await translateWithAi(text, tl, detected.code);
          used = "ai";
        }
      }
      const translated = restore(out, keep);
      await run("INSERT OR REPLACE INTO translation_cache(cache_key,lang,translated,created_at) VALUES(?,?,?,?)", [
        key,
        tl,
        translated,
        new Date().toISOString(),
      ]);
      res.json({ ok: true, translated, detected, engine: used });
    } catch (e) {
      console.error("Translation error:", e.message);
      sendError(res, e, "translate");
    }
  });
  /* ── Semantic problem finder ──
     Understand the request → pull a relevance-scored candidate pool from SQL →
     let the LLM re-rank the ACTUAL problems by topic fit (not title-word overlap)
     and return real rows with a one-line reason each. */
  const findCache = new Map();
  const clean = (p) => {
    const { relevance, ...rest } = p;
    return rest;
  };
  router.post("/api/ai/find-problems", aiLimiter, async (req, res) => {
    try {
      const query = String(req.body?.query || "").trim().slice(0, 500);
      if (!query) return res.status(400).json({ ok: false, error: "Describe what you want to practice first" });
      // Sources an admin switched off are never searched, whatever the request lists.
      const off = await require("./sources").disabledPlatforms();
      const platforms = (Array.isArray(req.body?.platforms) ? req.body.platforms.map(String) : []).filter((p) => !off.has(p));
      const vocab = Array.isArray(req.body?.tags) ? req.body.tags.map(String) : [];
      const want = Math.min(Math.max(+(req.body?.limit || 12) || 12, 1), 24);

      const cacheKey = crypto.createHash("sha1").update(`${meSql()}::${want}::${query.toLowerCase()}::${[...off].sort().join(",")}`).digest("hex");
      const cached = findCache.get(cacheKey);
      if (cached) return res.json({ ok: true, ...cached, cached: true });

      /* 1) Understand the request → structured intent */
      const user = { username: me() };
      const intent = (await runTask("find_problems_intent", { query, platforms, vocab }, { user })) || {};

      const tags = (Array.isArray(intent.tags) ? intent.tags : [])
        .filter((t) => t && vocab.includes(t.tag))
        .slice(0, 4)
        .map((t) => ({ tag: t.tag, weight: Math.min(3, Math.max(1, +t.weight || 2)) }));
      const keywords = (Array.isArray(intent.keywords) ? intent.keywords : [])
        .map((k) => String(k).toLowerCase().replace(/[^a-z0-9 ]/g, "").trim())
        .filter((k) => k.length >= 3)
        .slice(0, 5);
      const platform = platforms.includes(intent.platform) ? intent.platform : "all";
      const status = ["all", "unsolved", "attempted", "solved"].includes(intent.status) ? intent.status : "all";
      const num = (v) => (v === null || v === "" || v === undefined || !Number.isFinite(+v) ? null : +v);
      const minRating = num(intent.minRating);
      const maxRating = num(intent.maxRating);
      const understanding =
        typeof intent.understanding === "string" && intent.understanding.trim()
          ? intent.understanding.trim().slice(0, 140)
          : `Problems matching "${query.slice(0, 60)}"`;

      /* 2) Candidate pool — SQL relevance score over tags + title keywords.
            SELECT-clause params bind before WHERE-clause params, so keep two lists. */
      const selectParams = [];
      const score = [];
      for (const t of tags) {
        score.push(`(CASE WHEN p.tags LIKE ? THEN ${t.weight} ELSE 0 END)`);
        selectParams.push(`%${t.tag}%`);
      }
      for (const k of keywords) {
        score.push(`(CASE WHEN lower(p.title) LIKE ? THEN 2 ELSE 0 END)`);
        selectParams.push(`%${k}%`);
      }

      const where = ["1=1"];
      const whereParams = [];
      if (off.size) {
        where.push(`p.platform NOT IN (${[...off].map(() => "?").join(",")})`);
        whereParams.push(...off);
      }
      if (platform !== "all") {
        where.push("p.platform=?");
        whereParams.push(platform);
      }
      if (minRating != null) {
        where.push("p.rating>=?");
        whereParams.push(minRating);
      }
      if (maxRating != null) {
        where.push("p.rating<=?");
        whereParams.push(maxRating);
      }
      if (status === "solved") where.push("COALESCE(pr.status,'unsolved')='solved'");
      else if (status === "attempted") where.push("COALESCE(pr.status,'unsolved')='attempted'");
      else if (status === "unsolved") where.push("(pr.status IS NULL OR pr.status='unsolved')");

      if (tags.length + keywords.length > 0) {
        const ors = [];
        for (const t of tags) {
          ors.push("p.tags LIKE ?");
          whereParams.push(`%${t.tag}%`);
        }
        for (const k of keywords) {
          ors.push("lower(p.title) LIKE ?");
          whereParams.push(`%${k}%`);
        }
        where.push(`(${ors.join(" OR ")})`);
      }

      const scoreExpr = score.length ? score.join(" + ") : "0";
      const candidates = await all(
        `SELECT p.id, p.platform, p.problem_id, p.title, p.rating, p.tags, p.category, p.url,
                COALESCE(pr.status,'unsolved') as solve_status, pr.attempts, pr.xp_earned, pr.solved_at,
                (${scoreExpr}) as relevance
         FROM problems p LEFT JOIN progress pr ON pr.problem_rowid=p.id AND pr.username=${meSql()}
         WHERE ${where.join(" AND ")}
         ORDER BY relevance DESC, (p.rating=0), p.rating ASC
         LIMIT 60`,
        [...selectParams, ...whereParams],
      );

      if (!candidates.length) {
        const payload = { understanding, matchedTags: tags.map((t) => t.tag), platform, status, minRating, maxRating, count: 0, results: [] };
        findCache.set(cacheKey, payload);
        if (findCache.size > 200) findCache.delete(findCache.keys().next().value);
        return res.json({ ok: true, ...payload });
      }

      /* 3) LLM re-rank the real candidates by topic fit.
            Keep the prompt small (top 30) and reasoning light so the JSON is not
            truncated by the model's own reasoning tokens. */
      const pool = candidates.slice(0, 30);
      const listing = pool
        .map((c, i) => `${i}. [${c.platform}] "${c.title}" — rating ${c.rating || "?"}, tags: ${c.tags || "none"}`)
        .join("\n");
      let results = null;
      try {
        const ranked = await runTask("find_problems_rank", { query, listing, want }, { user });
        if (ranked && Array.isArray(ranked.results)) {
          const seen = new Set();
          results = [];
          for (const r of ranked.results) {
            const idx = +r?.i;
            if (!Number.isInteger(idx) || idx < 0 || idx >= pool.length || seen.has(idx)) continue;
            seen.add(idx);
            results.push({ problem: clean(pool[idx]), reason: String(r.reason || "").slice(0, 90) });
            if (results.length >= want) break;
          }
        }
      } catch {
        /* fall back to SQL order below */
      }

      // Trust the model's ranking exactly — it omits non-matches on purpose, so
      // never pad the list with lower-relevance rows. Only fall back to the SQL
      // relevance order when the re-rank produced nothing at all.
      if (!results || results.length === 0) {
        results = candidates.slice(0, want).map((p) => ({ problem: clean(p), reason: "" }));
      }

      const payload = {
        understanding,
        matchedTags: tags.map((t) => t.tag),
        platform,
        status,
        minRating,
        maxRating,
        count: results.length,
        results,
      };
      findCache.set(cacheKey, payload);
      if (findCache.size > 200) findCache.delete(findCache.keys().next().value);
      res.json({ ok: true, ...payload });
    } catch (e) {
      console.error("find-problems error:", e.message);
      sendError(res, e, "find-problems");
    }
  });
  return router;
}

module.exports = { createAiAssistRouter, detectLanguage, protect, restore, scriptGuess, LANGUAGES };
