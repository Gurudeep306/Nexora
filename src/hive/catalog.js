// Model intelligence for Hive: what each model is, what it is good at, what it
// costs, and where to get it free.
//
// Cards describe model FAMILIES (matched by id), so a key that offers
// "openai/gpt-5-mini:free" or "claude-sonnet-5-5-20261001" still finds its card.
// The numbers are estimates from public leaderboards and lab announcements as
// of November 2026 (intelligence ≈ Artificial Analysis index rescaled to
// 0-100; coding from SWE-bench / LiveCodeBench / Aider class results). They are
// a starting point: Hive also measures every model on your own work
// (src/hive/perf.js) and the router trusts those numbers more once it has them.

// Task kinds the router understands, in rough order of difficulty.
const KINDS = {
  chat: { label: "Conversation", hint: "Questions, explanations, brainstorming" },
  mechanical: { label: "Mechanical edits", hint: "Renames, formatting, boilerplate, docstrings, translations" },
  reading: { label: "Reading & summarising", hint: "Explain code, summarise logs, PRs or documents" },
  search: { label: "Finding things", hint: "Where is X handled, map the codebase, gather context" },
  writing: { label: "Writing for people", hint: "Docs, lessons, UI copy, emails, plans" },
  coding: { label: "Everyday coding", hint: "Add a feature or endpoint, fix a clear bug, write tests" },
  review: { label: "Review & critique", hint: "Find bugs, security issues and edge cases in changes" },
  hard: { label: "Hard engineering", hint: "Multi-file refactors, architecture, concurrency, unclear bugs" },
};

// Minimum quality (0-100) a model needs before the router will use it for a
// kind on its own. Below this it is only used when nothing better exists.
const MIN_QUALITY = { chat: 55, mechanical: 45, reading: 55, search: 45, writing: 62, coding: 70, review: 72, hard: 84 };

// Cost classes, cheapest first. "free" = a free tier or free model, "sub" =
// covered by a flat-rate subscription (Claude Code, Codex).
const COST_ORDER = ["free", "sub", "low", "mid", "high"];

const c = (o) => ({ tools: true, vision: false, open: false, context: 128, speed: 3, price: null, tier: "mid", strengths: [], weaknesses: [], ...o });

// First match wins, so specific patterns come before general ones.
const CARDS = [
  // ── Anthropic ──────────────────────────────────────────────────────────
  c({ id: "claude-fable-5-2", name: "Claude Fable 5.2", lab: "Anthropic", match: /claude-fable-5-2/, intelligence: 95, coding: 95, reasoning: 96, writing: 95, speed: 2, context: 1000, price: [8, 40], tier: "high", vision: true, strengths: ["Strongest overall model available", "Long, careful agentic work", "Best writing quality"], weaknesses: ["Most expensive per token", "Slower than mid-size models"] }),
  c({ id: "claude-fable-5", name: "Claude Fable 5.1", lab: "Anthropic", match: /claude-fable-5/, intelligence: 93, coding: 94, reasoning: 94, writing: 94, speed: 2, context: 1000, price: [10, 50], tier: "high", vision: true, strengths: ["Frontier reasoning and coding", "Very reliable over long sessions"], weaknesses: ["Expensive", "Overkill for simple edits"] }),
  c({ id: "claude-opus-5-5", name: "Claude Opus 5.5", lab: "Anthropic", match: /claude-opus-5-5|^opus$/, intelligence: 90, coding: 93, reasoning: 90, writing: 92, speed: 2, context: 1000, price: [4, 20], tier: "high", vision: true, strengths: ["Excellent at large refactors and architecture", "Follows codebase conventions closely"], weaknesses: ["Premium price on the API"] }),
  c({ id: "claude-opus-5", name: "Claude Opus 5", lab: "Anthropic", match: /claude-opus-5/, intelligence: 88, coding: 91, reasoning: 88, writing: 91, speed: 2, context: 1000, price: [5, 25], tier: "high", vision: true, strengths: ["Strong agentic coding"], weaknesses: ["Superseded by Opus 5.5"] }),
  c({ id: "claude-opus-4", name: "Claude Opus 4.x", lab: "Anthropic", match: /claude-opus-4/, intelligence: 84, coding: 88, reasoning: 84, writing: 89, speed: 2, context: 200, price: [5, 25], tier: "high", vision: true, strengths: ["Solid long-horizon coding"], weaknesses: ["Older generation"] }),
  c({ id: "claude-sonnet-5-5", name: "Claude Sonnet 5.5", lab: "Anthropic", match: /claude-sonnet-5-5|^sonnet$/, intelligence: 84, coding: 89, reasoning: 83, writing: 88, speed: 3, context: 1000, price: [2, 10], tier: "mid", vision: true, strengths: ["Best price/quality for everyday coding", "Fast and dependable with tools"], weaknesses: ["Less depth than Opus on the hardest problems"] }),
  c({ id: "claude-sonnet-5", name: "Claude Sonnet 5", lab: "Anthropic", match: /claude-sonnet-5/, intelligence: 82, coding: 87, reasoning: 81, writing: 87, speed: 3, context: 1000, price: [2, 10], tier: "mid", vision: true, strengths: ["Reliable everyday coding"], weaknesses: [] }),
  c({ id: "claude-sonnet-4", name: "Claude Sonnet 4.x", lab: "Anthropic", match: /claude-sonnet-4|claude-3-7-sonnet/, intelligence: 76, coding: 82, reasoning: 74, writing: 84, speed: 3, context: 1000, price: [3, 15], tier: "mid", vision: true, strengths: ["Good coding"], weaknesses: ["Older and pricier than Sonnet 5.5"] }),
  c({ id: "claude-haiku-5", name: "Claude Haiku 5.5", lab: "Anthropic", match: /claude-haiku-5|^haiku$/, intelligence: 72, coding: 76, reasoning: 68, writing: 78, speed: 5, context: 200, price: [0.1, 0.5], tier: "low", vision: true, strengths: ["Very cheap and very fast", "Great for mechanical work and summaries"], weaknesses: ["Not for hard multi-file changes"] }),
  c({ id: "claude-haiku-4", name: "Claude Haiku 4.5", lab: "Anthropic", match: /claude-haiku-4|claude-3-5-haiku/, intelligence: 66, coding: 72, reasoning: 62, writing: 74, speed: 4, context: 200, price: [1, 5], tier: "low", vision: true, strengths: ["Fast"], weaknesses: ["Pricier than Haiku 5.5"] }),

  // ── OpenAI ─────────────────────────────────────────────────────────────
  c({ id: "gpt-6", name: "GPT-6", lab: "OpenAI", match: /gpt-6/, intelligence: 89, coding: 89, reasoning: 91, writing: 87, speed: 2, context: 400, price: [5, 30], tier: "high", vision: true, strengths: ["Frontier reasoning"], weaknesses: ["Expensive"] }),
  c({ id: "gpt-5-pro", name: "GPT-5 Pro", lab: "OpenAI", match: /gpt-5(\.\d)?-pro|o3-pro/, intelligence: 88, coding: 86, reasoning: 93, writing: 85, speed: 1, context: 400, price: [15, 120], tier: "high", vision: true, strengths: ["Deepest reasoning per request"], weaknesses: ["Very slow and very expensive", "Weak fit for long tool loops"] }),
  c({ id: "gpt-5-codex", name: "GPT-5 Codex", lab: "OpenAI", match: /gpt-5(\.\d)?-codex|codex-mini/, intelligence: 85, coding: 91, reasoning: 85, writing: 78, speed: 3, context: 400, price: [1.25, 10], tier: "mid", vision: true, strengths: ["Tuned for agentic coding", "Efficient with tokens"], weaknesses: ["Terse prose"] }),
  c({ id: "gpt-5-mini", name: "GPT-5 mini", lab: "OpenAI", match: /gpt-5(\.\d)?-mini/, intelligence: 74, coding: 76, reasoning: 75, writing: 76, speed: 4, context: 400, price: [0.25, 2], tier: "low", vision: true, strengths: ["Cheap with solid reasoning"], weaknesses: ["Loses track on long agent runs"] }),
  c({ id: "gpt-5-nano", name: "GPT-5 nano", lab: "OpenAI", match: /gpt-5(\.\d)?-nano/, intelligence: 62, coding: 62, reasoning: 62, writing: 66, speed: 5, context: 400, price: [0.05, 0.4], tier: "low", vision: true, strengths: ["Almost free", "Classification and extraction"], weaknesses: ["Not for real coding"] }),
  c({ id: "gpt-5", name: "GPT-5.x", lab: "OpenAI", match: /gpt-5/, intelligence: 86, coding: 88, reasoning: 87, writing: 86, speed: 2, context: 400, price: [1.25, 10], tier: "mid", vision: true, strengths: ["Strong all-rounder", "Good at planning and debugging"], weaknesses: ["Slower with high reasoning effort"] }),
  c({ id: "o4-mini", name: "o4-mini", lab: "OpenAI", match: /o4-mini|o3-mini/, intelligence: 72, coding: 75, reasoning: 78, writing: 70, speed: 3, context: 200, price: [1.1, 4.4], tier: "low", vision: true, strengths: ["Cheap reasoning"], weaknesses: ["Older generation"] }),
  c({ id: "o3", name: "o3", lab: "OpenAI", match: /^o3$|^o3-20/, intelligence: 80, coding: 80, reasoning: 86, writing: 78, speed: 2, context: 200, price: [2, 8], tier: "mid", vision: true, strengths: ["Careful reasoning"], weaknesses: ["Superseded by GPT-5"] }),
  c({ id: "gpt-4.1", name: "GPT-4.1", lab: "OpenAI", match: /gpt-4\.1(?!-mini|-nano)/, intelligence: 68, coding: 72, reasoning: 62, writing: 78, speed: 3, context: 1000, price: [2, 8], tier: "mid", vision: true, strengths: ["Huge context, follows instructions well"], weaknesses: ["No built-in reasoning"] }),
  c({ id: "gpt-4.1-mini", name: "GPT-4.1 mini", lab: "OpenAI", match: /gpt-4\.1-mini/, intelligence: 60, coding: 62, reasoning: 54, writing: 70, speed: 4, context: 1000, price: [0.4, 1.6], tier: "low", vision: true, strengths: ["Cheap, long context"], weaknesses: ["Weak at hard code"] }),
  c({ id: "gpt-4.1-nano", name: "GPT-4.1 nano", lab: "OpenAI", match: /gpt-4\.1-nano/, intelligence: 50, coding: 50, reasoning: 44, writing: 60, speed: 5, context: 1000, price: [0.1, 0.4], tier: "low", vision: true, strengths: ["Tiny and fast"], weaknesses: ["Simple tasks only"] }),
  c({ id: "gpt-4o-mini", name: "GPT-4o mini", lab: "OpenAI", match: /gpt-4o-mini/, intelligence: 50, coding: 50, reasoning: 44, writing: 64, speed: 5, context: 128, price: [0.15, 0.6], tier: "low", vision: true, strengths: ["Fast, cheap chat"], weaknesses: ["Old"] }),
  c({ id: "gpt-4o", name: "GPT-4o", lab: "OpenAI", match: /gpt-4o/, intelligence: 58, coding: 60, reasoning: 52, writing: 74, speed: 4, context: 128, price: [2.5, 10], tier: "mid", vision: true, strengths: ["Good multimodal chat"], weaknesses: ["Outclassed for coding"] }),
  c({ id: "gpt-oss-120b", name: "gpt-oss-120b", lab: "OpenAI (open weights)", match: /gpt-oss-120b/, intelligence: 66, coding: 68, reasoning: 72, writing: 64, speed: 5, context: 131, price: [0.1, 0.5], tier: "low", open: true, strengths: ["Open model with real reasoning", "Free on Groq, Cerebras and others", "Extremely fast on Cerebras/Groq"], weaknesses: ["Weaker at long multi-file edits"] }),
  c({ id: "gpt-oss-20b", name: "gpt-oss-20b", lab: "OpenAI (open weights)", match: /gpt-oss-20b/, intelligence: 55, coding: 56, reasoning: 60, writing: 56, speed: 5, context: 131, price: [0.05, 0.2], tier: "low", open: true, strengths: ["Small, fast, free on many hosts"], weaknesses: ["Simple tasks only"] }),

  // ── Google ─────────────────────────────────────────────────────────────
  // ── The late-2026 generation of open and fast models. Scores are estimates
  // from public leaderboards (Artificial Analysis v5, SWE-bench Pro/Verified,
  // lab model cards) and are refined by Hive's own measurements. ──
  // ── Specialists you can run on your own GPU farm (deploy/model-farm). Scores
  // are estimates from public results; Hive's measurements on your work refine
  // them, and the quality bars keep hard work on stronger models. ──
  c({ id: "qwen3.8-27b", name: "Qwen 3.8 27B", lab: "Alibaba (open weights)", match: /qwen-?3\.8-?27b/, intelligence: 72, coding: 78, reasoning: 72, writing: 70, speed: 4, context: 262, price: [0.1, 0.4], tier: "low", open: true, strengths: ["Best UI model that fits one GPU (WebDev Arena ~1590)", "Strong everyday coder"], weaknesses: ["Below frontier models on hard UI and architecture"] }),
  c({ id: "uigen", name: "UIGEN (Tesslate)", lab: "Tesslate (open weights)", match: /uigen/, intelligence: 62, coding: 74, reasoning: 60, writing: 64, speed: 3, context: 32, tier: "low", open: true, strengths: ["Trained only for UI: layouts, components, pages"], weaknesses: ["UI structure, not app logic", "Not proven against frontier models"] }),
  c({ id: "qwen3-coder-next", name: "Qwen3 Coder Next", lab: "Alibaba (open weights)", match: /qwen-?3-coder-next/, intelligence: 70, coding: 80, reasoning: 70, writing: 62, speed: 5, context: 256, price: [0.2, 0.8], tier: "low", open: true, strengths: ["Built for coding agents (~71% SWE-bench Verified)", "Only 3B active: fast"], weaknesses: ["Below frontier on the hardest refactors"] }),
  c({ id: "nemotron-cascade", name: "Nemotron Cascade", lab: "NVIDIA (open weights)", match: /nemotron-cascade/, intelligence: 72, coding: 68, reasoning: 84, writing: 64, speed: 5, context: 128, tier: "low", open: true, strengths: ["Maths and step-by-step reasoning (AIME 2026 ~95 with tools)"], weaknesses: ["Explanations need a second check"] }),
  c({ id: "devstral-small-2", name: "Devstral Small 2", lab: "Mistral (open weights)", match: /devstral-small-2/, intelligence: 64, coding: 74, reasoning: 62, writing: 60, speed: 4, context: 256, tier: "low", open: true, vision: true, strengths: ["Reads designs and screenshots", "Different family: good second-opinion reviewer"], weaknesses: [] }),
  c({ id: "gemma-4", name: "Gemma 4", lab: "Google (open weights)", match: /gemma-?4/, intelligence: 70, coding: 68, reasoning: 76, writing: 74, speed: 4, context: 128, tier: "low", open: true, vision: true, strengths: ["Different family from the coders: catches more in review", "Maths"], weaknesses: [] }),
  c({ id: "paddleocr-vl", name: "PaddleOCR-VL", lab: "Baidu (open weights)", match: /paddleocr/, intelligence: 40, coding: 20, reasoning: 30, writing: 50, speed: 5, context: 16, tier: "low", open: true, vision: true, tools: false, strengths: ["Reads scanned pages: text, tables, formulas (#1 on OmniDocBench)"], weaknesses: ["OCR only"] }),
  c({ id: "sarvam-translate", name: "Sarvam Translate", lab: "Sarvam (open weights)", match: /sarvam-translate/, intelligence: 45, coding: 20, reasoning: 35, writing: 70, speed: 5, context: 8, tier: "low", open: true, tools: false, strengths: ["Translation into 22 Indian languages"], weaknesses: ["Translation only"] }),
  c({ id: "kimi-k3", name: "Kimi K3", lab: "Moonshot (open weights)", match: /kimi-k3/, intelligence: 84, coding: 88, reasoning: 84, writing: 80, speed: 3, context: 256, price: [0.8, 3.5], tier: "low", open: true, strengths: ["Top open model for agentic coding", "Long tool loops"], weaknesses: ["Big model: slower on free hosts"] }),
  c({ id: "glm-5", name: "GLM-5.x", lab: "Zhipu (open weights)", match: /glm-?5/, intelligence: 82, coding: 87, reasoning: 81, writing: 78, speed: 3, context: 200, price: [0.6, 2.2], tier: "low", open: true, strengths: ["One of the best open coders (SWE-bench Pro)", "Often free on NVIDIA NIM"], weaknesses: ["Free hosts can queue at busy times"] }),
  c({ id: "deepseek-v4-pro", name: "DeepSeek V4 Pro", lab: "DeepSeek (open weights)", match: /deepseek-v4(\.\d)?-pro/, intelligence: 83, coding: 86, reasoning: 85, writing: 78, speed: 2, context: 256, price: [0.6, 2.4], tier: "low", open: true, strengths: ["Strong reasoning and coding at low price"], weaknesses: ["Slower than Flash"] }),
  c({ id: "deepseek-v4-flash", name: "DeepSeek V4 Flash", lab: "DeepSeek (open weights)", match: /deepseek-v4(\.\d)?(-flash)?/, intelligence: 78, coding: 81, reasoning: 79, writing: 74, speed: 4, context: 256, price: [0.15, 0.6], tier: "low", open: true, strengths: ["Best value open model", "Free on several hosts"], weaknesses: ["Less depth than V4 Pro on hard bugs"] }),
  c({ id: "qwen3.8", name: "Qwen 3.8", lab: "Alibaba (open weights)", match: /qwen-?3\.[6-9]-(max|plus|flash-next|coder|397b|235b)/, intelligence: 80, coding: 84, reasoning: 80, writing: 76, speed: 4, context: 256, price: [0.4, 1.6], tier: "low", open: true, strengths: ["Top open-weights SWE-bench Pro scores", "Fast"], weaknesses: ["Naming varies a lot between hosts"] }),
  c({ id: "qwen3.6-mid", name: "Qwen 3.5–3.8 (27–35B)", lab: "Alibaba (open weights)", match: /qwen-?3[.-][5-9]-?(27|30|32|35)b/, intelligence: 68, coding: 74, reasoning: 68, writing: 66, speed: 5, context: 128, price: [0.1, 0.4], tier: "low", open: true, strengths: ["Runs on one GPU", "Free on Groq and others"], weaknesses: ["Not for the hardest work"] }),
  c({ id: "qwen3.5", name: "Qwen 3.5–3.8", lab: "Alibaba (open weights)", match: /qwen-?3[.-][5-9]/, intelligence: 72, coding: 76, reasoning: 72, writing: 70, speed: 4, context: 128, price: [0.2, 0.8], tier: "low", open: true, strengths: ["Good all-rounder"], weaknesses: [] }),
  c({ id: "minimax-m2.7", name: "MiniMax M2.5–M2.7", lab: "MiniMax (open weights)", match: /minimax-?m2[.-]?[5-9]/, intelligence: 76, coding: 82, reasoning: 74, writing: 72, speed: 4, context: 200, price: [0.3, 1.2], tier: "low", open: true, strengths: ["Fast agentic coding", "Free on ModelScope / OpenCode Zen at times"], weaknesses: [] }),
  c({ id: "nemotron-3-ultra", name: "Nemotron 3 Ultra", lab: "NVIDIA (open weights)", match: /nemotron-3(\.\d)?-ultra/, intelligence: 76, coding: 76, reasoning: 80, writing: 72, speed: 3, context: 128, price: [0.6, 1.8], tier: "low", open: true, strengths: ["Strong reasoning", "Free on NVIDIA and OpenRouter"], weaknesses: [] }),
  c({ id: "nemotron-3", name: "Nemotron 3 Super/Nano", lab: "NVIDIA (open weights)", match: /nemotron-3(\.\d)?-(super|nano|lightning)/, intelligence: 64, coding: 64, reasoning: 66, writing: 62, speed: 5, context: 128, price: [0.1, 0.4], tier: "low", open: true, strengths: ["Fast, often free"], weaknesses: ["Light work only"] }),
  c({ id: "gemini-3.5-flash", name: "Gemini 3.5–3.8 Flash", lab: "Google", match: /gemini-3\.[5-9]-flash(?!-lite)/, intelligence: 82, coding: 81, reasoning: 82, writing: 80, speed: 5, context: 1000, price: [0.3, 2.5], tier: "low", vision: true, strengths: ["Free tier in AI Studio", "Very fast, huge context"], weaknesses: ["Free tier rate limits"] }),
  c({ id: "grok-4.1-fast", name: "Grok 4.1 Fast", lab: "xAI", match: /grok-4\.[1-9]-fast/, intelligence: 76, coding: 76, reasoning: 78, writing: 74, speed: 5, context: 2000, price: [0.2, 0.5], tier: "low", vision: true, strengths: ["Cheap, fast, 2M context"], weaknesses: [] }),
  c({ id: "mistral-medium-3.5", name: "Mistral Medium 3.5", lab: "Mistral", match: /mistral-medium-3[.-]5/, intelligence: 72, coding: 74, reasoning: 70, writing: 76, speed: 4, context: 128, price: [0.4, 2], tier: "low", strengths: ["Free experiment tier", "Good European option"], weaknesses: [] }),
  c({ id: "mimo", name: "MiMo", lab: "Xiaomi (open weights)", match: /mimo/, intelligence: 66, coding: 70, reasoning: 70, writing: 62, speed: 4, context: 128, tier: "low", open: true, strengths: ["Free on OpenCode Zen"], weaknesses: [] }),
  c({ id: "gemini-4", name: "Gemini 4", lab: "Google", match: /gemini-4/, intelligence: 88, coding: 87, reasoning: 90, writing: 86, speed: 3, context: 1000, price: [2.5, 15], tier: "high", vision: true, strengths: ["Frontier reasoning", "Huge context, native PDFs and video"], weaknesses: ["Newer, less tested with Hive tools"] }),
  c({ id: "gemini-3-pro", name: "Gemini 3 Pro", lab: "Google", match: /gemini-3(\.\d)?-pro/, intelligence: 85, coding: 85, reasoning: 86, writing: 84, speed: 3, context: 1000, price: [2, 12], tier: "mid", vision: true, strengths: ["Strong reasoning, 1M context"], weaknesses: [] }),
  c({ id: "gemini-3-flash", name: "Gemini 3 Flash", lab: "Google", match: /gemini-3(\.\d)?-flash(?!-lite)/, intelligence: 76, coding: 77, reasoning: 76, writing: 76, speed: 5, context: 1000, price: [0.3, 2.5], tier: "low", vision: true, strengths: ["Best free-tier model for agents", "Fast, cheap, vision + PDFs"], weaknesses: ["Can rush hard problems"] }),
  c({ id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", lab: "Google", match: /gemini-2\.5-pro/, intelligence: 78, coding: 78, reasoning: 80, writing: 80, speed: 3, context: 1000, price: [1.25, 10], tier: "mid", vision: true, strengths: ["Free tier in AI Studio", "1M context"], weaknesses: ["Free tier has tight daily limits"] }),
  c({ id: "gemini-flash-lite", name: "Gemini Flash-Lite", lab: "Google", match: /gemini-[\d.]+-flash-lite/, intelligence: 58, coding: 56, reasoning: 58, writing: 62, speed: 5, context: 1000, price: [0.1, 0.4], tier: "low", vision: true, strengths: ["Generous free limits", "Very fast"], weaknesses: ["Simple tasks only"] }),
  c({ id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", lab: "Google", match: /gemini-2\.5-flash/, intelligence: 68, coding: 68, reasoning: 70, writing: 72, speed: 5, context: 1000, price: [0.3, 2.5], tier: "low", vision: true, strengths: ["Free tier", "Fast with vision and PDFs"], weaknesses: ["Mid-level coding"] }),
  c({ id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", lab: "Google", match: /gemini-2\.0-flash/, intelligence: 56, coding: 54, reasoning: 52, writing: 62, speed: 5, context: 1000, price: [0.1, 0.4], tier: "low", vision: true, strengths: ["Free and fast"], weaknesses: ["Old"] }),
  c({ id: "gemma", name: "Gemma 3", lab: "Google (open weights)", match: /gemma/, intelligence: 45, coding: 40, reasoning: 42, writing: 56, speed: 4, context: 128, tier: "low", open: true, tools: false, strengths: ["Runs locally"], weaknesses: ["No reliable tool use"] }),

  // ── DeepSeek ───────────────────────────────────────────────────────────
  c({ id: "deepseek-reasoner", name: "DeepSeek R1 / Reasoner", lab: "DeepSeek (open weights)", match: /deepseek-(reasoner|r1)|deepseek-ai\/deepseek-r1/, intelligence: 76, coding: 76, reasoning: 84, writing: 70, speed: 2, context: 128, price: [0.55, 2.2], tier: "low", open: true, strengths: ["Strong reasoning at a low price", "Free on OpenRouter, NVIDIA and others"], weaknesses: ["Slow; long thinking"] }),
  c({ id: "deepseek-chat", name: "DeepSeek V3", lab: "DeepSeek (open weights)", match: /deepseek-(chat|v3)|deepseek-ai\/deepseek-v3/, intelligence: 72, coding: 77, reasoning: 70, writing: 72, speed: 3, context: 128, price: [0.27, 1.1], tier: "low", open: true, strengths: ["Excellent coding for the price", "Free on several hosts"], weaknesses: ["Occasional instruction drift"] }),

  // ── xAI ────────────────────────────────────────────────────────────────
  c({ id: "grok-4-mini", name: "Grok mini", lab: "xAI", match: /grok-[34](\.\d)?-mini|grok-4(\.\d)?-fast/, intelligence: 64, coding: 64, reasoning: 68, writing: 64, speed: 4, context: 256, price: [0.3, 0.5], tier: "low", strengths: ["Cheap and quick"], weaknesses: [] }),
  c({ id: "grok-4", name: "Grok 4.x", lab: "xAI", match: /grok-4/, intelligence: 80, coding: 80, reasoning: 84, writing: 76, speed: 2, context: 256, price: [3, 15], tier: "mid", vision: true, strengths: ["Strong reasoning"], weaknesses: ["Pricey for what it does"] }),
  c({ id: "grok-code", name: "Grok Code Fast", lab: "xAI", match: /grok-code/, intelligence: 66, coding: 74, reasoning: 64, writing: 60, speed: 5, context: 256, price: [0.2, 1.5], tier: "low", strengths: ["Fast agentic coding"], weaknesses: [] }),

  // ── Mistral ────────────────────────────────────────────────────────────
  c({ id: "devstral", name: "Devstral", lab: "Mistral (open weights)", match: /devstral/, intelligence: 64, coding: 74, reasoning: 60, writing: 60, speed: 4, context: 128, price: [0.4, 2], tier: "low", open: true, strengths: ["Built for coding agents", "Free on Mistral's experiment tier"], weaknesses: ["Less general knowledge"] }),
  c({ id: "codestral", name: "Codestral", lab: "Mistral", match: /codestral/, intelligence: 56, coding: 72, reasoning: 50, writing: 54, speed: 5, context: 256, price: [0.3, 0.9], tier: "low", strengths: ["Fast code completion and edits"], weaknesses: ["Weak reasoning"] }),
  c({ id: "magistral", name: "Magistral", lab: "Mistral", match: /magistral/, intelligence: 66, coding: 64, reasoning: 74, writing: 66, speed: 3, context: 128, price: [2, 5], tier: "mid", strengths: ["Reasoning"], weaknesses: [] }),
  c({ id: "mistral-large", name: "Mistral Large", lab: "Mistral", match: /mistral-large|pixtral-large/, intelligence: 66, coding: 66, reasoning: 62, writing: 74, speed: 3, context: 128, price: [2, 6], tier: "mid", vision: true, strengths: ["Good multilingual writing"], weaknesses: [] }),
  c({ id: "mistral-medium", name: "Mistral Medium", lab: "Mistral", match: /mistral-medium/, intelligence: 64, coding: 64, reasoning: 60, writing: 70, speed: 4, context: 128, price: [0.4, 2], tier: "low", vision: true, strengths: ["Cheap all-rounder"], weaknesses: [] }),
  c({ id: "mistral-small", name: "Mistral Small", lab: "Mistral (open weights)", match: /mistral-small|ministral|open-mistral/, intelligence: 52, coding: 50, reasoning: 46, writing: 62, speed: 5, context: 128, price: [0.1, 0.3], tier: "low", open: true, strengths: ["Tiny and fast"], weaknesses: ["Simple tasks only"] }),

  // ── Meta ───────────────────────────────────────────────────────────────
  c({ id: "llama-4-maverick", name: "Llama 4 Maverick", lab: "Meta (open weights)", match: /llama-4-maverick/, intelligence: 62, coding: 60, reasoning: 58, writing: 68, speed: 5, context: 1000, price: [0.2, 0.6], tier: "low", open: true, vision: true, strengths: ["Free on Groq, GitHub Models, NVIDIA", "Fast, long context"], weaknesses: ["Mid-level coding"] }),
  c({ id: "llama-4-scout", name: "Llama 4 Scout", lab: "Meta (open weights)", match: /llama-4-scout/, intelligence: 54, coding: 50, reasoning: 50, writing: 62, speed: 5, context: 1000, price: [0.1, 0.3], tier: "low", open: true, vision: true, strengths: ["Free and fast"], weaknesses: ["Simple tasks"] }),
  c({ id: "llama-3.3-70b", name: "Llama 3.3 70B", lab: "Meta (open weights)", match: /llama-?3\.3-70b|llama-3\.1-405b/, intelligence: 52, coding: 50, reasoning: 46, writing: 64, speed: 5, context: 128, price: [0.6, 0.6], tier: "low", open: true, strengths: ["Free nearly everywhere", "Very fast on Groq/Cerebras"], weaknesses: ["Weak at real coding"] }),
  c({ id: "llama-small", name: "Llama 3.x 8B", lab: "Meta (open weights)", match: /llama-?3\.[12]-(1|3|8|11)b|llama3-8b/, intelligence: 30, coding: 28, reasoning: 26, writing: 44, speed: 5, context: 128, price: [0.05, 0.08], tier: "low", open: true, tools: false, strengths: ["Instant"], weaknesses: ["Toy tasks only"] }),

  // ── Qwen (Alibaba) ─────────────────────────────────────────────────────
  c({ id: "qwen3-coder-480b", name: "Qwen3 Coder 480B", lab: "Alibaba (open weights)", match: /qwen3-coder(-plus|-480b|.*480b)/, intelligence: 72, coding: 84, reasoning: 70, writing: 66, speed: 4, context: 256, price: [0.4, 1.6], tier: "low", open: true, strengths: ["One of the best open coding models", "Free on OpenRouter/NVIDIA, fast on Cerebras"], weaknesses: ["Less polished prose"] }),
  c({ id: "qwen3-coder", name: "Qwen3 Coder", lab: "Alibaba (open weights)", match: /qwen3-coder|qwen-?2\.5-coder/, intelligence: 58, coding: 70, reasoning: 56, writing: 58, speed: 5, context: 256, price: [0.1, 0.3], tier: "low", open: true, strengths: ["Small coding model, free on many hosts"], weaknesses: ["Not for hard tasks"] }),
  c({ id: "qwen3-max", name: "Qwen3 Max / 235B", lab: "Alibaba", match: /qwen3-max|qwen-max|qwen3-235b|qwen3-next/, intelligence: 74, coding: 74, reasoning: 78, writing: 72, speed: 3, context: 256, price: [1.2, 6], tier: "mid", strengths: ["Strong reasoning", "Good multilingual"], weaknesses: [] }),
  c({ id: "qwq", name: "QwQ / Qwen3 32B", lab: "Alibaba (open weights)", match: /qwq|qwen3-32b|qwen3-30b/, intelligence: 58, coding: 60, reasoning: 66, writing: 58, speed: 4, context: 128, price: [0.15, 0.6], tier: "low", open: true, strengths: ["Free reasoning model"], weaknesses: ["Verbose thinking"] }),

  // ── Moonshot, Zhipu, MiniMax ───────────────────────────────────────────
  c({ id: "qwen3-small", name: "Qwen3 8B/14B", lab: "Alibaba (open weights)", match: /qwen3-(4|8|14)b|qwen-?2\.5-(7|14|32|72)b|qwen-turbo|qwen-plus|qwen-coder$/, intelligence: 46, coding: 48, reasoning: 50, writing: 52, speed: 5, context: 128, price: [0.05, 0.2], tier: "low", open: true, strengths: ["Often free", "Fast for simple work"], weaknesses: ["Too small for real coding"] }),
  c({ id: "solar", name: "Solar Pro", lab: "Upstage", match: /solar/, intelligence: 50, coding: 46, reasoning: 48, writing: 60, speed: 4, context: 64, price: [0.25, 0.25], tier: "low", strengths: ["Cheap and fast"], weaknesses: ["Smaller context"] }),
  c({ id: "kimi-k2", name: "Kimi K2", lab: "Moonshot (open weights)", match: /kimi-k2|moonshotai\/kimi/, intelligence: 74, coding: 80, reasoning: 74, writing: 74, speed: 3, context: 256, price: [0.6, 2.5], tier: "low", open: true, strengths: ["Excellent open agentic coder", "Free on OpenRouter/NVIDIA/Groq"], weaknesses: [] }),
  c({ id: "glm-4", name: "GLM 4.6", lab: "Zhipu (open weights)", match: /glm-4/, intelligence: 72, coding: 78, reasoning: 70, writing: 72, speed: 3, context: 200, price: [0.6, 2.2], tier: "low", open: true, strengths: ["Strong open coding model"], weaknesses: [] }),
  c({ id: "minimax-m2", name: "MiniMax M2", lab: "MiniMax (open weights)", match: /minimax-m2|minimax/, intelligence: 70, coding: 78, reasoning: 68, writing: 68, speed: 4, context: 200, price: [0.3, 1.2], tier: "low", open: true, strengths: ["Efficient agentic coder", "Often free on OpenRouter"], weaknesses: [] }),

  // ── Nous Research ──────────────────────────────────────────────────────
  c({ id: "hermes-4-405b", name: "Hermes 4 405B", lab: "Nous Research (open weights)", match: /hermes-?4.*405b|hermes-4-405/, intelligence: 64, coding: 64, reasoning: 70, writing: 74, speed: 3, context: 128, price: [1, 3], tier: "low", open: true, strengths: ["Hybrid reasoning with a steerable, uncensored style", "Strong writing and role play", "Reliable tool calling"], weaknesses: ["Behind the best open coders on code"] }),
  c({ id: "hermes-4-70b", name: "Hermes 4 70B", lab: "Nous Research (open weights)", match: /hermes-?4/, intelligence: 56, coding: 56, reasoning: 62, writing: 70, speed: 4, context: 128, price: [0.13, 0.4], tier: "low", open: true, strengths: ["Cheap, steerable, good writer"], weaknesses: ["Mid-level coding"] }),
  c({ id: "hermes-3", name: "Hermes 3", lab: "Nous Research (open weights)", match: /hermes-?3/, intelligence: 48, coding: 46, reasoning: 48, writing: 66, speed: 4, context: 128, price: [0.1, 0.3], tier: "low", open: true, strengths: ["Free on several hosts", "Good conversational style"], weaknesses: ["Older generation"] }),

  // ── Others ─────────────────────────────────────────────────────────────
  c({ id: "sonar", name: "Perplexity Sonar", lab: "Perplexity", match: /sonar/, intelligence: 62, coding: 50, reasoning: 60, writing: 72, speed: 4, context: 128, price: [1, 1], tier: "low", tools: false, strengths: ["Answers with live web citations"], weaknesses: ["Chat only — no tools"] }),
  c({ id: "phi", name: "Phi-4", lab: "Microsoft (open weights)", match: /phi-4/, intelligence: 45, coding: 48, reasoning: 50, writing: 50, speed: 5, context: 128, tier: "low", open: true, tools: false, strengths: ["Small, free on GitHub Models"], weaknesses: ["Simple tasks"] }),
  c({ id: "command", name: "Command R/A", lab: "Cohere", match: /command-?(r|a)/, intelligence: 50, coding: 46, reasoning: 46, writing: 66, speed: 4, context: 128, tier: "low", strengths: ["Retrieval and summaries"], weaknesses: ["Weak coding"] }),
  c({ id: "nemotron", name: "Nemotron", lab: "NVIDIA (open weights)", match: /nemotron/, intelligence: 64, coding: 62, reasoning: 70, writing: 64, speed: 3, context: 128, tier: "low", open: true, strengths: ["Free on NVIDIA NIM"], weaknesses: [] }),
];

// Subscription agents: what you get when Claude Code / Codex run on your plan.
const SUBSCRIPTION_CARDS = {
  claude_code: c({ id: "claude-code", name: "Claude Code", lab: "Anthropic · your Claude plan", intelligence: 90, coding: 94, reasoning: 90, writing: 90, speed: 2, context: 1000, tier: "sub", vision: true, strengths: ["Full agent: reads, edits, runs tests on the machine", "Uses your Claude subscription — no API credit", "Best at large, careful changes"], weaknesses: ["Needs a connected machine", "Plan usage windows (resets every few hours)"] }),
  vibe: c({ id: "vibe", name: "Mistral Vibe", lab: "Mistral · your Le Chat plan", intelligence: 76, coding: 80, reasoning: 72, writing: 72, speed: 4, context: 256, tier: "sub", vision: false, strengths: ["Full coding agent on your machine (Devstral / Mistral Medium)", "Uses your Le Chat Pro or student plan — no API credit", "Fast; good for tests, backend, refactors and fixes"], weaknesses: ["Needs a connected machine", "Below Claude on UI and hard engineering", "Plan usage limits"] }),
  codex: c({ id: "codex", name: "Codex", lab: "OpenAI · your ChatGPT plan", intelligence: 86, coding: 91, reasoning: 87, writing: 78, speed: 3, context: 400, tier: "sub", vision: true, strengths: ["Full agent with a sandbox", "Uses your ChatGPT subscription — no API credit", "Token-efficient"], weaknesses: ["Needs a connected machine", "Plan usage windows"] }),
};

/** Strip routing prefixes/suffixes: "openai/gpt-5-mini:free" → "gpt-5-mini". */
function baseId(model) {
  let s = String(model || "").toLowerCase().trim();
  s = s.replace(/:(free|beta|extended|thinking|nitro|floor)$/g, "");
  if (s.includes("/")) s = s.slice(s.lastIndexOf("/") + 1);
  return s.replace(/^models\//, "");
}

/** Rough card for an unknown model, from size/name hints. */
function guessCard(model) {
  const s = baseId(model);
  let q = 55;
  if (/(opus|fable|ultra|-pro\b|max|large|405b|480b|235b|k2|r1)/.test(s)) q = 74;
  else if (/(70b|72b|120b|medium|plus|turbo|32b|30b)/.test(s)) q = 60;
  else if (/(mini|small|lite|nano|8b|7b|3b|1b|instant|tiny)/.test(s)) q = 42;
  return c({ id: s, name: model, lab: "Unknown", intelligence: q, coding: q, reasoning: q, writing: q, speed: 3, tier: "low", guessed: true, strengths: [], weaknesses: ["Not in Hive's catalogue yet — scores are a rough guess until Hive has measured it on your work"] });
}

function cardFor(model, vendor) {
  if (SUBSCRIPTION_CARDS[vendor]) {
    const base = SUBSCRIPTION_CARDS[vendor];
    // A specific model chosen inside Claude Code inherits its quality.
    const inner = model && model !== "default" ? CARDS.find((x) => x.match.test(baseId(model))) : null;
    return inner ? { ...base, intelligence: inner.intelligence, coding: Math.max(inner.coding, base.coding - 2), reasoning: inner.reasoning, writing: inner.writing, speed: inner.speed, model } : base;
  }
  const id = baseId(model);
  const card = CARDS.find((x) => x.match.test(id)) || guessCard(model);
  return card;
}

/** Quality (0-100) of a card for a task kind. */
function quality(card, kind) {
  const sp = (card.speed || 3) * 20; // 20..100
  switch (kind) {
    case "mechanical":
      return Math.round(0.65 * card.coding + 0.35 * sp);
    case "reading":
      return Math.round(0.45 * card.intelligence + 0.35 * card.writing + 0.2 * sp);
    case "search":
      return Math.round(0.5 * card.coding + 0.2 * card.intelligence + 0.3 * sp);
    case "writing":
      return Math.round(0.75 * card.writing + 0.25 * card.intelligence);
    case "coding":
      return Math.round(0.8 * card.coding + 0.2 * card.intelligence);
    case "review":
      return Math.round(0.5 * card.coding + 0.5 * card.reasoning);
    case "hard":
      return Math.round(0.45 * card.coding + 0.35 * card.reasoning + 0.2 * card.intelligence);
    default:
      return Math.round(0.6 * card.intelligence + 0.4 * card.writing);
  }
}

/** The kinds a card is a good pick for (quality ≥ the kind's bar). */
function bestFor(card) {
  return Object.keys(KINDS).filter((k) => quality(card, k) >= MIN_QUALITY[k]);
}

/** $ for a number of tokens on a card (null when unknown). */
function priceOf(card, input = 0, output = 0) {
  if (!card.price) return null;
  return (input * card.price[0] + output * card.price[1]) / 1e6;
}

/** A card as the browser sees it (regexes stripped, derived fields added). */
function publicCard(card, extra = {}) {
  const { match, ...rest } = card;
  const scores = Object.fromEntries(Object.keys(KINDS).map((k) => [k, quality(card, k)]));
  return { ...rest, scores, bestFor: bestFor(card), ...extra };
}

// ── Free sources ─────────────────────────────────────────────────────────
// Where to get capable models for free (November 2026). Free tiers change
// often; Hive re-reads every key's live model list twice a day and the
// router treats a source that is out of quota as unavailable until it resets.
const FREE_SOURCES = [
  {
    vendor: "ollama_cloud",
    name: "Ollama Cloud",
    url: "https://ollama.com/settings/keys",
    how: "Sign in at ollama.com, open Settings → Keys, create a key.",
    free: "Free tier on big open models (no GPU of your own needed)",
    limits: "One request at a time; session and weekly limits.",
    models: ["gpt-oss 120B", "DeepSeek V4 Pro", "Kimi K2", "Qwen3 Coder", "GLM"],
    bestFor: ["coding", "reading", "writing"],
    score: 8,
  },
  {
    vendor: "opencode_zen",
    name: "OpenCode Zen",
    url: "https://opencode.ai/auth",
    how: "Sign in at opencode.ai and create an API key.",
    free: "Rotating free models (DeepSeek V4 Flash, Qwen 3.6 Plus, MiMo, MiniMax…)",
    limits: "Free models change often; some may use prompts to improve the model.",
    models: ["DeepSeek V4 Flash", "Qwen 3.6 Plus", "MiMo v2.5"],
    bestFor: ["coding", "mechanical", "reading"],
    score: 7,
  },
  {
    vendor: "kilo",
    name: "Kilo Gateway",
    url: "https://app.kilo.ai/profile",
    how: "Sign up at kilo.ai and copy your API key from your profile.",
    free: "Free models (\":free\") through one gateway",
    limits: "About 200 requests an hour.",
    models: ["Nemotron 3 Ultra", "other :free models"],
    bestFor: ["reading", "chat", "mechanical"],
    score: 5,
  },
  {
    vendor: "siliconflow",
    name: "SiliconFlow",
    url: "https://cloud.siliconflow.com/account/ak",
    how: "Sign up, open API keys, create one.",
    free: "Several models are permanently free (Qwen3 8B, GLM small, DeepSeek distills); sign-up credit for the big ones",
    limits: "Free models are rate-limited per minute.",
    models: ["Qwen3", "DeepSeek V3", "GLM", "Kimi"],
    bestFor: ["mechanical", "reading", "chat"],
    score: 7,
  },
  {
    vendor: "chutes",
    name: "Chutes",
    url: "https://chutes.ai/app/api",
    how: "Sign up, create an API key.",
    free: "A daily free allowance on many open models",
    limits: "Daily request cap on the free tier; busy models can queue.",
    models: ["DeepSeek V3/R1", "Qwen3 Coder", "GLM 4.5 Air", "Kimi K2"],
    bestFor: ["coding", "reading", "writing"],
    score: 7,
  },
  {
    vendor: "zai",
    name: "Z.ai (GLM)",
    url: "https://z.ai/manage-apikey/apikey-list",
    how: "Sign up at z.ai, create an API key.",
    free: "GLM-4.5-Flash is free",
    limits: "Rate-limited; the big GLM 4.6 is paid but cheap.",
    models: ["GLM 4.5 Flash (free)", "GLM 4.6"],
    bestFor: ["chat", "mechanical", "reading"],
    score: 6,
  },
  {
    vendor: "codestral",
    name: "Codestral (Mistral)",
    url: "https://console.mistral.ai/codestral",
    how: "In the Mistral console open Codestral and create its own key (separate from the API key).",
    free: "Free for code work",
    limits: "Per-minute and daily request caps.",
    models: ["Codestral"],
    bestFor: ["mechanical", "coding"],
    score: 6,
  },
  {
    vendor: "qwen",
    name: "Alibaba Model Studio (Qwen 3.8 Max)",
    url: "https://modelstudio.console.alibabacloud.com/",
    how: "Sign up for Alibaba Cloud (international), open Model Studio in the Singapore region, create an API key. On the model's page, turn on “Free quota only” so you're never billed.",
    free: "About 1M free tokens per model for 90 days — including Qwen 3.8 Max, Qwen's flagship",
    limits: "Per-model quota, Singapore region only; it ends after 90 days or when used up.",
    models: ["Qwen 3.8 Max", "Qwen3 Coder Plus", "Qwen 3.8 Plus", "Qwen 3.8 Flash"],
    bestFor: ["hard", "coding", "reasoning"],
    score: 7,
  },
  {
    vendor: "modelscope",
    name: "ModelScope (Alibaba)",
    url: "https://modelscope.cn/my/myaccesstoken",
    how: "Sign up (an Alibaba Cloud account is needed), copy your access token.",
    free: "About 2,000 free calls a day across Qwen, DeepSeek and more",
    limits: "Daily call cap; some models need a verified account.",
    models: ["Qwen3 Coder 480B", "Qwen3 235B", "DeepSeek V3.1"],
    bestFor: ["coding", "reading", "writing"],
    score: 7,
  },
  {
    vendor: "ovh",
    name: "OVHcloud AI Endpoints",
    url: "https://endpoints.ai.cloud.ovh.net",
    how: "Works without an account at low rate limits; create a token in OVHcloud for more.",
    free: "Anonymous free tier",
    limits: "Low requests-per-minute without a token.",
    models: ["Qwen3 32B", "Llama 3.3 70B", "Mistral Small"],
    bestFor: ["chat", "mechanical"],
    score: 5,
  },
  {
    vendor: "cohere",
    name: "Cohere (trial)",
    url: "https://dashboard.cohere.com/api-keys",
    how: "Sign up; a trial key is created for you.",
    free: "Trial keys are free",
    limits: "About 1,000 calls a month; not for production.",
    models: ["Command A"],
    bestFor: ["writing", "reading"],
    score: 4,
  },
  {
    vendor: "pollinations",
    name: "Pollinations",
    url: "https://pollinations.ai",
    how: "Nothing to sign up for — add it with any text as the key.",
    free: "Free, no account",
    limits: "Slow at busy times, no tool use; good for chat and drafts only.",
    models: ["GPT-class", "Mistral", "Qwen Coder"],
    bestFor: ["chat", "writing"],
    score: 3,
  },
  {
    vendor: "github",
    name: "GitHub Models",
    url: "https://github.com/settings/personal-access-tokens/new",
    how: "Create a fine-grained token with the “Models: read” permission (no repository access needed).",
    free: "Free for every GitHub account",
    limits: "Per-model daily request limits (roughly 50–150 requests/day on the big models, more on small ones) and ~8K-token requests on some models.",
    models: ["GPT-5 / GPT-4.1 family", "DeepSeek R1 & V3", "Llama 4", "Mistral", "Phi-4", "Grok"],
    bestFor: ["reading", "writing", "chat", "review"],
    score: 9,
  },
  {
    vendor: "gemini",
    name: "Google AI Studio",
    url: "https://aistudio.google.com/apikey",
    how: "Sign in with a Google account and create an API key. No card needed.",
    free: "Free tier on Gemini Flash, Flash-Lite and (with lower limits) Pro",
    limits: "Requests per minute and per day per model; Flash-Lite has the most generous limits. Free-tier data may be used to improve Google's products.",
    models: ["Gemini 3 Flash", "Gemini 2.5 Pro", "Gemini Flash-Lite"],
    bestFor: ["coding", "reading", "search", "chat", "mechanical"],
    score: 10,
  },
  {
    vendor: "groq",
    name: "Groq",
    url: "https://console.groq.com/keys",
    how: "Sign up and create a key. No card needed.",
    free: "Free tier on every model they host",
    limits: "Per-minute token and request limits plus daily caps; extremely fast (hundreds of tokens/s).",
    models: ["gpt-oss-120b", "Kimi K2", "Llama 4", "Qwen3 32B"],
    bestFor: ["mechanical", "reading", "search", "chat"],
    score: 9,
  },
  {
    vendor: "cerebras",
    name: "Cerebras",
    url: "https://cloud.cerebras.ai",
    how: "Sign up and create an API key. No card needed.",
    free: "Free tier with a large daily token allowance",
    limits: "About a million tokens per day on the free tier; the fastest inference available.",
    models: ["Qwen3 Coder 480B", "gpt-oss-120b", "Llama 3.3 70B"],
    bestFor: ["coding", "mechanical", "search"],
    score: 9,
  },
  {
    vendor: "openrouter",
    name: "OpenRouter (free models)",
    url: "https://openrouter.ai/keys",
    how: "Create a key. Models whose id ends in “:free” cost nothing.",
    free: "Dozens of “:free” models from many labs",
    limits: "About 20 requests/minute and 50 free requests/day (1,000/day once you have bought $10 of credit at any time).",
    models: ["DeepSeek R1/V3 :free", "Qwen3 Coder :free", "Kimi K2 :free", "Llama 4 :free", "GLM :free"],
    bestFor: ["coding", "reading", "chat"],
    score: 8,
  },
  {
    vendor: "mistral",
    name: "Mistral (Experiment plan)",
    url: "https://console.mistral.ai/api-keys",
    how: "Choose the free Experiment plan, verify a phone number and create a key.",
    free: "Free access to every Mistral model including Devstral and Codestral",
    limits: "Low requests per second and a monthly token cap; requests may be used for training.",
    models: ["Devstral", "Codestral", "Mistral Medium", "Mistral Large"],
    bestFor: ["coding", "mechanical", "writing"],
    score: 8,
  },
  {
    vendor: "nvidia",
    name: "NVIDIA NIM",
    url: "https://build.nvidia.com",
    how: "Sign up with the NVIDIA developer program and generate an API key (nvapi-…).",
    free: "Free credits for prototyping on hosted open models",
    limits: "Rate limited (around 40 requests/minute); free use is for development.",
    models: ["DeepSeek R1/V3", "Kimi K2", "Qwen3 Coder 480B", "Llama 4", "Nemotron"],
    bestFor: ["coding", "reading", "review"],
    score: 7,
  },
  {
    vendor: "sambanova",
    name: "SambaNova Cloud",
    url: "https://cloud.sambanova.ai/apis",
    how: "Sign up and create a key.",
    free: "Free tier on hosted open models",
    limits: "Per-minute request limits; fast inference.",
    models: ["DeepSeek R1/V3", "Llama 4", "Qwen3"],
    bestFor: ["reading", "mechanical", "chat"],
    score: 6,
  },
  {
    vendor: "huggingface",
    name: "Hugging Face Inference",
    url: "https://huggingface.co/settings/tokens",
    how: "Create a token with “Make calls to Inference Providers”.",
    free: "Monthly free credits across many inference providers",
    limits: "Small monthly credit (more with PRO); routes to many hosts through one API.",
    models: ["Qwen3 Coder", "DeepSeek", "Llama", "GLM", "Kimi"],
    bestFor: ["reading", "chat"],
    score: 5,
  },
  {
    vendor: "cloudflare",
    name: "Cloudflare Workers AI",
    url: "https://dash.cloudflare.com/profile/api-tokens",
    how: "Create an API token with “Workers AI: read”, and use your account id in the base URL.",
    free: "10,000 “neurons” per day free",
    limits: "Daily neuron allowance (roughly a few hundred mid-size requests).",
    models: ["Llama 4", "Qwen", "gpt-oss", "DeepSeek R1 distill"],
    bestFor: ["mechanical", "chat"],
    score: 4,
  },
  {
    vendor: "ollama",
    name: "Ollama (your own machine)",
    url: "https://ollama.com/download",
    how: "Install Ollama on a machine with a good GPU, pull a model (e.g. qwen3-coder) and point a key at http://HOST:11434/v1.",
    free: "Completely free and private — you supply the hardware",
    limits: "As fast as your GPU. A CPU-only VM is too slow for agent work.",
    models: ["Qwen3 Coder", "gpt-oss", "Llama", "GLM", "DeepSeek distills"],
    bestFor: ["mechanical", "reading", "chat"],
    score: 4,
  },
];

// Typical free-tier limits per provider, so every free connection shows a
// limit even when the provider sends no rate-limit headers. Providers change
// these; when a provider does send live numbers (x-ratelimit-* headers),
// those are shown instead. rpd = requests/day, rpm = requests/minute,
// tpd = tokens/day, tpm = tokens/month.
const FREE_LIMITS = {
  gemini: { rpd: 250, rpm: 10, note: "Gemini Flash free tier: about 250 requests a day per model (Flash-Lite allows more)" },
  groq: { rpd: 1000, rpm: 30, note: "About 1,000 requests a day and 30 a minute per model" },
  cerebras: { tpd: 1000000, rpm: 30, note: "About 1M tokens a day, 30 requests a minute" },
  openrouter: { rpd: 50, rpm: 20, note: "Free models: 50 requests a day (1,000 a day once the account has $10 of credit), 20 a minute" },
  github: { rpd: 50, rpm: 10, note: "Big models: about 50 requests a day; small models allow about 150" },
  nvidia: { rpm: 40, note: "About 40 requests a minute; no published daily cap" },
  mistral: { rpm: 60, tpm: 1000000000, note: "Free tier: about 1 request a second, 1B tokens a month" },
  codestral: { rpm: 30, rpd: 2000, note: "Codestral free: about 30 requests a minute, 2,000 a day" },
  sambanova: { rpm: 20, note: "About 20 requests a minute on the free tier" },
  cohere: { rpm: 20, rpd: 33, note: "Trial key: about 1,000 calls a month, 20 a minute" },
  cloudflare: { note: "10,000 Neurons a day free (roughly a few hundred chat replies)" },
  huggingface: { note: "Small monthly free credit; heavy use needs a PRO plan" },
  qwen: { note: "About 1M free tokens per model, for 90 days" },
  modelscope: { rpd: 2000, note: "About 2,000 free calls a day" },
  chutes: { note: "Free models with per-minute limits" },
  siliconflow: { rpm: 1000, note: "Free models with high per-minute limits" },
  zai: { note: "GLM Flash models are free with per-minute limits" },
  zhipu: { note: "GLM Flash models are free with per-minute limits" },
  pollinations: { note: "No sign-up; shared rate limit per IP address" },
  llm7: { note: "No sign-up; shared rate limit" },
  ovh: { rpm: 2, note: "Without an account: about 2 requests a minute per model" },
  ollama_cloud: { note: "Free plan with hourly and weekly usage limits" },
  opencode_zen: { note: "Free models with fair-use limits" },
  kilo: { note: "Free models with fair-use limits" },
  vercel: { note: "About $5 of free credit a month" },
};
const freeLimitFor = (vendor) => FREE_LIMITS[vendor] || null;

module.exports = { FREE_LIMITS, freeLimitFor, KINDS, MIN_QUALITY, COST_ORDER, CARDS, SUBSCRIPTION_CARDS, FREE_SOURCES, baseId, cardFor, quality, bestFor, priceOf, publicCard, guessCard };
