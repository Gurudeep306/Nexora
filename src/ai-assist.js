/* ========== AI-assisted translation + coding coach ==========
   - Language detection (script analysis → Google → LLM) with confidence
   - Translation that protects math/code, with Google or context-aware AI
   - Coach endpoints: live insight on the user's code, tricky test ideas,
     failure explanations — hints only, never full solutions. */
const express = require("express");
const crypto = require("crypto");

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

/* LLM: Groq first (fast), Gemini as fallback. */
async function llm(messages, { json = false, maxTokens = 1200, temperature = 0.2 } = {}) {
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
          ...(/gpt-oss/.test(model) ? { reasoning_effort: "low" } : {}),
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
function createAiAssistRouter({ get, run, aiLimiter }) {
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

  /* ── Coding coach ── */
  const COACH_RULES = `You are "Nexora Coach", an expert competitive-programming mentor watching a student code in an online judge.
Hard rules: NEVER write the full solution or large code blocks. At most one short line of code in a hint. Be concrete and brief.`;

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
                .join("\n")}\n\nAnalyse what the student is doing. Reply JSON only:
{"summary": "one sentence: what the code currently does / tries to do",
 "approach": "short name of the technique (e.g. two pointers, prefix sums, BFS) or 'unclear'",
 "time": "Big-O time of the code as written", "space": "Big-O memory",
 "fits": true|false|null  (would it pass typical limits for this problem?),
 "progress": 0-100 (how complete the solution looks),
 "issues": [{"line": n, "severity": "error"|"warning"|"info", "message": "specific bug / risk (overflow, off-by-one, TLE, uninitialised, I/O)"}],
 "edgeCases": ["short edge case the code may miss"],
 "nextStep": "one concrete hint for what to do next (no full code)"}`,
            },
          ],
          { json: true, maxTokens: 900, temperature: 0.2 },
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
              content: `Problem: ${title}\n---\n${stmt}\n---\nPropose 4 small, VALID tricky test inputs that follow the exact input format above (edge cases: minimum sizes, equal values, large values, special structure). For each, compute the correct expected output by careful reasoning; if you are not certain, use an empty string for "expected". Reply JSON only:
{"tests": [{"label": "short name", "input": "exact stdin", "expected": "exact stdout or empty", "why": "what it checks"}]}`,
            },
          ],
          { json: true, maxTokens: 1400, temperature: 0.3 },
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
              }\n\nExplain in 3-6 short markdown bullet points WHY this verdict happens and where in the code (line numbers), then give one hint to fix it. No full solution.`,
            },
          ],
          { maxTokens: 700, temperature: 0.3 },
        );
        return res.json({ ok: true, explanation: out.trim() });
      }

      if (mode === "ask") {
        const q = String(req.body.question || "").slice(0, 1500);
        const out = await llm(
          [
            { role: "system", content: COACH_RULES + reply },
            { role: "user", content: `Problem: ${title}\n---\n${stmt.slice(0, 3500)}\n---\nCurrent ${language} code:\n${src}\n\nQuestion: ${q}` },
          ],
          { maxTokens: 800, temperature: 0.4 },
        );
        return res.json({ ok: true, answer: out.trim() });
      }

      res.status(400).json({ ok: false, error: "Unknown coach mode" });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  return router;
}

module.exports = { createAiAssistRouter, detectLanguage, protect, restore, scriptGuess, LANGUAGES };
