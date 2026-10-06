/* ========== AI-assisted translation + coding coach ==========
   - Language detection (script analysis → Google → LLM) with confidence
   - Translation that protects math/code, with Google or context-aware AI
   - Coach endpoints: live insight on the user's code, tricky test ideas,
     failure explanations — hints only, never full solutions. */
const express = require("express");
const crypto = require("crypto");
const { meSql } = require("./context");

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

/* LLM: Nexora-Core private model first, then Groq, then Gemini as fallback. */
async function llm(messages, { json = false, maxTokens = 1200, temperature = 0.2, reasoning = "low" } = {}) {
  const nexoraCoreUrl = process.env.NEXORA_CORE_URL;
  const nexoraCoreKey = process.env.NEXORA_CORE_KEY || process.env.NEXORA_INTERNAL_SECRET;
  if (nexoraCoreUrl) {
    try {
      const headers = { "Content-Type": "application/json" };
      if (nexoraCoreKey) {
        headers["Authorization"] = `Bearer ${nexoraCoreKey}`;
        headers["X-Nexora-Secret"] = nexoraCoreKey;
      }
      const r = await fetch(nexoraCoreUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: process.env.NEXORA_CORE_MODEL || "nexora-core-7b",
          messages,
          max_tokens: maxTokens,
          temperature,
          ...(json ? { response_format: { type: "json_object" } } : {}),
        }),
        signal: AbortSignal.timeout(45000),
      }).catch(() => null);
      if (r?.ok) {
        const d = await r.json();
        const content = d.choices?.[0]?.message?.content || "";
        if (content.trim()) return content;
      }
    } catch {
      /* fallback to secondary */
    }
  }

  const groqKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  if (groqKey) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
          ...(json ? { response_format: { type: "json_object" } } : {}),
          ...(/gpt-oss/.test(model) ? { reasoning_effort: reasoning } : {}),
        }),
        signal: AbortSignal.timeout(45000),
      }).catch((e) => ({ ok: false, status: 0, text: async () => e.message }));
      if (r.status === 429 && attempt === 0) {
        await sleep(2000);
        continue;
      }
      if (r.ok) {
        const d = await r.json();
        const content = d.choices?.[0]?.message?.content || "";
        if (content.trim()) return content;
      }
      break;
    }
  }
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    const prompt = messages.map((m) => `${m.role.toUpperCase()}:\n${m.content}`).join("\n\n");
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature, maxOutputTokens: maxTokens, ...(json ? { responseMimeType: "application/json" } : {}) },
        }),
        signal: AbortSignal.timeout(45000),
      },
    ).catch(() => null);
    if (r?.ok) {
      const d = await r.json();
      const t = d.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
      if (t.trim()) return t;
    }
  }
  throw new Error("AI is not available right now (no API key or provider error)");
}

function parseJson(text) {
  const s = String(text || "");
  try {
    return JSON.parse(s);
  } catch {
    const m = s.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        /* fallthrough */
      }
    }
  }
  return null;
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
  try {
    const out = await llm(
      [
        {
          role: "system",
          content:
            'Identify the natural language of the text. Reply with JSON only: {"code": "<BCP-47 / Google Translate code, e.g. en, ru, hi, te, zh-CN>", "confidence": 0..1}',
        },
        { role: "user", content: text.slice(0, 800) },
      ],
      { json: true, maxTokens: 60, temperature: 0 },
    );
    const j = parseJson(out);
    if (j?.code) return { ...langInfo(j.code), code: j.code, confidence: Number(j.confidence) || 0.7, method: "ai" };
  } catch {
    /* fallthrough */
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
    const res = await llm(
      [
        {
          role: "system",
          content: `You translate competitive-programming problem statements from ${s.name || "the source language"} into ${t.name} (${t.native}).
Rules:
- Output ONLY the translated HTML fragment — no commentary, no code fences.
- Keep every HTML tag and attribute exactly as given; translate only human-readable text.
- Tokens like ⟦7⟧ are placeholders for formulas/code: copy them unchanged and keep them in the right place.
- Never change numbers, variable names, identifiers, sample data or units.
- Use natural, clear, technical ${t.name}. ${t.group === "indian" ? `Keep widely used CS terms (array, string, integer, test case, query, modulo, subsequence, graph, tree) in English in Latin script where a ${t.name}-speaking programmer would.` : ""}`,
        },
        { role: "user", content: part },
      ],
      { maxTokens: 4000, temperature: 0.1 },
    );
    out.push(res.replace(/^```(?:html)?\s*|```\s*$/g, ""));
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
      res.status(500).json({ ok: false, error: e.message });
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
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  /* ── AI problem finder: natural language → database filters ── */
  const searchCache = new Map();
  router.post("/api/ai/problem-search", aiLimiter, async (req, res) => {
    try {
      const query = String(req.body?.query || "").trim().slice(0, 400);
      if (!query) return res.status(400).json({ ok: false, error: "Describe what you want to practice first" });
      const platforms = Array.isArray(req.body?.platforms) ? req.body.platforms.map(String) : [];
      const tags = Array.isArray(req.body?.tags) ? req.body.tags.map(String) : [];
      const bands = Array.isArray(req.body?.bands) ? req.body.bands.map(String) : [];

      const cacheKey = `${query}::${platforms.join(",")}::${bands.join(",")}`;
      const hit = searchCache.get(cacheKey);
      if (hit) return res.json({ ok: true, ...hit, cached: true });

      const out = await llm(
        [
          {
            role: "system",
            content: `You are the search brain of a competitive-programming problem database. Convert the user's natural-language request into query filters.
Reply with JSON ONLY, exactly these keys:
{"platform": one of [${platforms.join(", ")}] or "all",
 "difficulty": one of [${bands.join(", ")}] or "all",
 "tags": up to 3 most relevant items chosen from [${tags.slice(0, 120).join(", ")}] (use [] if none fit),
 "search": 1-3 lowercase keywords likely to appear in problem titles, or "",
 "status": one of ["all","unsolved","attempted","solved"],
 "sort": one of ["rating","title","id"],
 "summary": one friendly sentence (max 18 words) restating what the user will get}
Pick the single closest platform/difficulty; never invent tags outside the list.`,
          },
          { role: "user", content: query },
        ],
        { json: true, maxTokens: 300, temperature: 0.1 },
      );
      const j = parseJson(out);
      if (!j) return res.status(502).json({ ok: false, error: "AI returned an unreadable answer — try rephrasing" });

      const filters = {
        platform: platforms.includes(j.platform) ? j.platform : "all",
        difficulty: bands.includes(j.difficulty) ? j.difficulty : "all",
        tags: (Array.isArray(j.tags) ? j.tags : []).filter((t) => tags.includes(t)).slice(0, 3),
        search: typeof j.search === "string" ? j.search.slice(0, 60) : "",
        status: ["all", "unsolved", "attempted", "solved"].includes(j.status) ? j.status : "all",
        sort: ["rating", "title", "id"].includes(j.sort) ? j.sort : "rating",
        summary: typeof j.summary === "string" ? j.summary.slice(0, 140) : "Here is what I found for you",
      };
      const payload = { filters };
      searchCache.set(cacheKey, payload);
      if (searchCache.size > 300) searchCache.delete(searchCache.keys().next().value);
      res.json({ ok: true, ...payload });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
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
      const platforms = Array.isArray(req.body?.platforms) ? req.body.platforms.map(String) : [];
      const vocab = Array.isArray(req.body?.tags) ? req.body.tags.map(String) : [];
      const want = Math.min(Math.max(+(req.body?.limit || 12) || 12, 1), 24);

      const cacheKey = crypto.createHash("sha1").update(`${meSql()}::${want}::${query.toLowerCase()}`).digest("hex");
      const cached = findCache.get(cacheKey);
      if (cached) return res.json({ ok: true, ...cached, cached: true });

      /* 1) Understand the request → structured intent */
      const intentOut = await llm(
        [
          {
            role: "system",
            content: `You are the semantic search brain of a competitive-programming database (Codeforces, CodeChef, AtCoder, LeetCode, SPOJ, Project Euler). Problem titles are often cryptic, so TAGS and DIFFICULTY carry more signal than title words.
Read the request and reply with JSON ONLY:
{"tags": up to 4 objects [{"tag": <EXACTLY one of the allowed tags>, "weight": 1-3, 3 = the core topic}] most relevant first ([] if none fit),
 "keywords": 2-5 lowercase concrete words likely to appear literally in a problem TITLE for this topic (include singular AND plural forms and obvious synonyms, e.g. for digit problems: "digit","digits","number","sum"). Use [] only for purely abstract requests with no concrete noun,
 "minRating": integer|null, "maxRating": integer|null,
 "platform": one of [${platforms.join(", ")}] or "all",
 "status": one of ["all","unsolved","attempted","solved"],
 "understanding": one short sentence (max 16 words) describing what you searched for}
Difficulty guide: easy≈[null,1200], medium≈[1200,1600], hard≈[1600,1900], elite≈[1900,null], "around X"≈[X-200,X+200]; leave null when open-ended.
"not solved yet"/"unattempted" → status "unsolved". Allowed tags: [${vocab.join(", ")}]. NEVER invent a tag outside this list; if the request is vague still choose the closest tags.`,
          },
          { role: "user", content: query },
        ],
        { json: true, maxTokens: 420, temperature: 0.1, reasoning: "medium" },
      );
      const intent = parseJson(intentOut) || {};

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
        const rankOut = await llm(
          [
            {
              role: "system",
              content: `You rank competitive-programming problems by how well each matches a practice request. Judge the real topic (infer from title + tags), NOT literal word overlap — a cryptic title with the right tags is a good match. Reply JSON ONLY: {"results":[{"i": <index from the list>, "reason": "<=10 words on why it fits>"}]} — best matches first, at most ${want}, OMIT anything that clearly does not fit.`,
            },
            { role: "user", content: `Request: "${query}"\n\nNumbered problems:\n${listing}` },
          ],
          { json: true, maxTokens: 1200, temperature: 0.1, reasoning: "low" },
        );
        const ranked = parseJson(rankOut);
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
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  /* ── Coding coach ── */
  const COACH_RULES = `You are "Nexora Coach", a world-class competitive-programming mentor sitting beside a student in an online judge. You have the problem statement and the student's current code.

How you talk:
- Plain, warm, precise sentences. No filler ("great question", "I hope this helps"), no hedging stacks, no emojis.
- Correct grammar and spelling. Short sentences. One idea per sentence.
- Use clean GitHub markdown: **bold** for key terms, \`code\` for identifiers/values, - bullets for lists, and reference code as line L12.
- Be specific to THIS code and THIS problem. Quote the exact variable, line, or test value. Never give generic advice the student could get anywhere.

Hard rules:
- NEVER write the full solution and never a code block longer than one short line. Guide, don't hand over.
- If you are not sure of something (an expected output, a complexity), say so plainly instead of inventing it.
- Stay on the student's language and the actual problem; do not drift into unrelated theory.`;

  router.post("/api/ai/coach", aiLimiter, async (req, res) => {
    try {
      const { mode = "insight", code = "", language = "cpp", title = "", statement = "", verdict, failing, uiLang } = req.body || {};
      const src = String(code).slice(0, 12000);
      const stmt = String(statement).slice(0, 5000);
      const reply = uiLang && uiLang !== "en" ? ` Write all human-readable strings in ${langInfo(uiLang).name}.` : "";

      if (mode === "insight") {
        const out = await llm(
          [
            { role: "system", content: COACH_RULES + reply },
            {
              role: "user",
              content: `Problem: ${title}\n---\n${stmt}\n---\nStudent's ${language} code (line numbers added):\n${src
                .split("\n")
                .map((l, i) => `${i + 1}| ${l}`)
                .join("\n")}\n\nRead the code carefully and analyse what the student is actually doing. Reply JSON only:
{"summary": "one crisp sentence: what this code currently does or tries to do (name the real approach, not vague wording)",
 "approach": "short standard name of the technique (e.g. two pointers, prefix sums, BFS on a grid, DP over subsets) or 'unclear'",
 "time": "tight Big-O time of the code AS WRITTEN, e.g. O(n log n)",
 "space": "tight Big-O extra memory, e.g. O(n)",
 "fits": true|false|null  (would it pass typical limits, ~1e8 ops/sec, for this problem's constraints? null if constraints unknown),
 "progress": 0-100 (how complete and correct the solution looks),
 "issues": [{"line": <int line number>, "severity": "error"|"warning"|"info", "message": "one specific, actionable sentence about a real bug or risk in THIS code (overflow, off-by-one, wrong edge case, TLE, uninitialised, I/O format). Only include issues you can point to a line for."}],
 "edgeCases": ["a concrete input case this code likely mishandles, described in a few words"],
 "nextStep": "one concrete hint for the single most important thing to do next (no full code)"}
Keep every string short and human. Do not pad lists — an empty list is better than a weak entry.`,
            },
          ],
          { json: true, maxTokens: 1000, temperature: 0.2, reasoning: "medium" },
        );
        const j = parseJson(out);
        if (!j) return res.status(502).json({ ok: false, error: "AI returned an unreadable answer" });
        j.issues = Array.isArray(j.issues) ? j.issues.slice(0, 8) : [];
        j.edgeCases = Array.isArray(j.edgeCases) ? j.edgeCases.slice(0, 6) : [];
        return res.json({ ok: true, insight: j });
      }

      if (mode === "tests") {
        const out = await llm(
          [
            { role: "system", content: COACH_RULES },
            {
              role: "user",
              content: `Problem: ${title}\n---\n${stmt}\n---\nDesign 4 small, tricky test cases that STRESS THIS PROBLEM's logic. Follow the exact input format and every stated constraint (T test cases, ranges, array sizes) precisely — an input that violates the format is useless.

Cover different edge shapes: minimum size, all-equal values, maximum/near-limit values, and any special structure the statement hints at.

For each case, compute the expected output yourself by carefully hand-tracing the problem rules. Only fill "expected" when you are confident it is exactly right; otherwise use an empty string so the student can run and inspect it. Never guess an expected value.

Reply JSON only:
{"tests": [{"label": "2-3 word name of what it checks", "input": "exact stdin, with real newlines", "expected": "exact stdout, or empty string if unsure", "why": "one short sentence: what this case is designed to catch"}]}`,
            },
          ],
          { json: true, maxTokens: 1600, temperature: 0.2, reasoning: "high" },
        );
        const j = parseJson(out);
        const tests = Array.isArray(j?.tests) ? j.tests.slice(0, 6) : [];
        return res.json({
          ok: true,
          tests: tests
            .filter((t) => typeof t?.input === "string" && t.input.length < 5000)
            .map((t) => ({ label: String(t.label || "AI test").slice(0, 40), input: t.input, expected: String(t.expected ?? ""), why: String(t.why || "") })),
        });
      }

      if (mode === "explain") {
        const out = await llm(
          [
            { role: "system", content: COACH_RULES + reply },
            {
              role: "user",
              content: `Problem: ${title}\n---\n${stmt.slice(0, 3000)}\n---\nCode (${language}):\n${src}\n\nVerdict: ${verdict || "unknown"}\n${
                failing ? `Failing case:\nINPUT:\n${String(failing.input || "").slice(0, 1500)}\nEXPECTED:\n${String(failing.expected || "").slice(0, 800)}\nGOT:\n${String(failing.actual || "").slice(0, 800)}\nSTDERR:\n${String(failing.stderr || "").slice(0, 800)}` : ""
              }\n\nExplain this verdict so the student understands and can fix it themselves. Use exactly this markdown structure, keeping each part tight:

**What happened** — one sentence on what the verdict means for this submission.
**Where** — 1-3 bullets pointing at the specific line(s) (L##) and the exact value/variable that goes wrong; trace the failing input concretely if one is given.
**Why** — one or two sentences on the root cause (logic gap, wrong edge case, overflow, complexity, I/O format).
**Try this** — one concrete hint for the fix. Do NOT give the corrected code.

If the verdict is a compile error, focus on the exact syntax/type problem and the line. Be accurate; if the failing output is not shown, reason from the code.`,
            },
          ],
          { maxTokens: 800, temperature: 0.2, reasoning: "medium" },
        );
        return res.json({ ok: true, explanation: out.trim() });
      }

      if (mode === "ask") {
        const q = String(req.body.question || "").slice(0, 1500);
        const out = await llm(
          [
            { role: "system", content: COACH_RULES + reply + " Answer the question directly first, then add only the detail that helps. Format in clean markdown (bullets, `code`, **bold**). Keep it focused — typically under 150 words." },
            { role: "user", content: `Problem: ${title}\n---\n${stmt.slice(0, 3500)}\n---\nCurrent ${language} code:\n${src}\n\nQuestion: ${q}` },
          ],
          { maxTokens: 800, temperature: 0.4, reasoning: "medium" },
        );
        return res.json({ ok: true, answer: out.trim() });
      }

      res.status(400).json({ ok: false, error: "Unknown coach mode" });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  /* ── AI Animation Generator: Algorithmic frames for Nexora VizPlayer ── */
  router.post("/api/ai/animate", aiLimiter, async (req, res) => {
    try {
      const topic = String(req.body?.topic || "two pointers").slice(0, 150);
      const input = Array.isArray(req.body?.input) ? req.body.input.slice(0, 12) : null;

      const out = await llm(
        [
          {
            role: "system",
            content: `You are the animation synthesizer for Nexora. Output JSON ONLY matching this format:
{"title": "${topic}",
 "type": "nexora_visualization",
 "data_structure": "array",
 "frames": [
   {"step": 1, "explanation": "string description", "state": {"kind": "array", "id": "arr", "cells": [{"id": "c0", "v": 1}], "pointers": {"left": 0}, "roles": {0: "active"}}}
 ]}
Keep frames concise (between 4 and 8 steps). Roles can be: active, compare, swap, done, found.`,
          },
          {
            role: "user",
            content: `Generate visual frames for ${topic}${input ? ` with input array [${input.join(", ")}]` : ""}`,
          },
        ],
        { json: true, maxTokens: 1200, temperature: 0.1 },
      );

      const parsed = parseJson(out);
      if (!parsed || !Array.isArray(parsed.frames)) {
        return res.status(502).json({ ok: false, error: "Could not generate animation frames" });
      }

      res.json({ ok: true, visualization: parsed });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  return router;
}

module.exports = { createAiAssistRouter, detectLanguage, protect, restore, scriptGuess, LANGUAGES };
