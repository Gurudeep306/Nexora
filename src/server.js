require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});
const crypto = require("crypto");
const { errMessage } = require("./http-error");
const fs = require("fs");
const express = require("express");
const compression = require("compression");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fetch = require("node-fetch");
const cheerio = require("cheerio");
// NOTE: puppeteer is required lazily inside getBrowser() — its module init can
// hang in some environments and must never block server startup.
const http = require("http");
const session = require("express-session");
const passport = require("passport");
const GitHubStrategy = require("passport-github2").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { Server: SocketServer } = require("socket.io");
const { run, get, all, initDb, dbInfo, migratePerUser } = require("./db");
const { requestContext, me, meSql, runAs } = require("./context");
const { DbSessionStore } = require("./session-store");
const { restoreUploads } = require("./upload-store");
const { authz } = require("./middleware/authz");
const {
  clearSessionUser,
  createStudioAuth,
  getSessionUser,
  persistSessionUser,
  requireAdmin,
  requireAuthenticatedUser,
  requireSelfOrAdmin,
} = require("./middleware/auth");
const { createAuthRouter } = require("./routes/auth");
const { createLearningRouter } = require("./routes/learning");
const { createLearnRouter } = require("./routes/learn");
const { createGateRouter } = require("./routes/gate");
const { createStudioRouter } = require("./routes/studio");
const { createExplainLabRouter } = require("./routes/explainlab");
const { createForgeRouter } = require("./routes/forge");
const { createLiveRouter } = require("./routes/live");
const { kronosChat, kronosComplete } = require("./kronos-engine");
const { initExplainLabDb } = require("./explainlab-db");
const { initForgeDb } = require("./forge-db");
const { initLiveDb } = require("./live-db");
const {
  fetchCodeforcesProblems,
  fetchCodechefProblems,
  fetchCodeforcesContests,
  fetchCodechefContests,
  fetchCodeforcesSolved,
  fetchAtcoderProblems,
  fetchAtcoderContests,
  fetchLeetcodeProblems,
  fetchSpojProblems,
  fetchProjectEulerProblems,
} = require("./sync");
const { judge, quickRun, LANG_CONFIG, hasRemote, REMOTE_ONLY } = require("./judge");
const { createAiAssistRouter } = require("./ai-assist");

const IS_PROD = process.env.NODE_ENV === "production";
const APP_URL =
  process.env.APP_URL ||
  // Render sets RENDER_EXTERNAL_URL (e.g. https://nexora.onrender.com) automatically.
  process.env.RENDER_EXTERNAL_URL ||
  `http://localhost:${process.env.PORT || 3000}`;

/* ========== Lightweight HTTP Scrapers (fast, no browser) ========== */
const SCRAPE_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function scrapePageHTTP(problem) {
  if (problem.platform === "codeforces") return await _scrapeCF_HTTP(problem);
  if (problem.platform === "codechef") return await _scrapeCC_HTTP(problem);
  if (problem.platform === "atcoder") return await _scrapeAC_HTTP(problem);
  if (problem.platform === "leetcode") return await _scrapeLC_HTTP(problem);
  if (problem.platform === "spoj") return await _scrapeSPOJ_HTTP(problem);
  if (problem.platform === "euler") return await _scrapeEuler_HTTP(problem);
  return null;
}

/* ========== Statement HTML normalization ==========
   Scraped statements keep whatever URLs the source site used: AtCoder stores
   root-relative image paths and Codeforces hotlinks espresso.codeforces.com
   (which rejects foreign referers). Rewrite every image to our own proxy and
   make other URLs absolute so statements render identically everywhere. */
/* Statement media (URL rewriting + the image-proxy allowlist) lives in its own
   module so it can be unit-tested without booting the server. */
const { isProxyableHost, normalizeStatement } = require("./statement-media");

function _parseCFStatement($) {
  const stmt = $(".problem-statement");
  if (!stmt.length) return null;

  const timeLimit = stmt
    .find(".time-limit")
    .text()
    .replace("time limit per test", "")
    .trim();
  const memLimit = stmt
    .find(".memory-limit")
    .text()
    .replace("memory limit per test", "")
    .trim();
  const inputSpec = stmt.find(".input-specification").html() || "";
  const outputSpec = stmt.find(".output-specification").html() || "";
  const note = stmt.find(".note").html() || "";

  // Clone statement and remove header/specs/samples/note
  const clone = stmt.clone();
  clone
    .find(
      ".header, .input-specification, .output-specification, .sample-tests, .note",
    )
    .remove();
  const statement = clone.html() || "";

  const samples = [];
  const inputs = stmt.find(".sample-test .input pre");
  const outputs = stmt.find(".sample-test .output pre");
  const preText = (el) => {
    // Codeforces encodes sample line breaks as <br>; .text() alone collapses them.
    const node = $(el).clone();
    node.find("br").replaceWith("\n");
    return node.text();
  };
  inputs.each((i, el) => {
    samples.push({ input: preText(el), output: preText(outputs.eq(i)) || "" });
  });

  return {
    statement,
    inputSpec,
    outputSpec,
    note,
    timeLimit,
    memLimit,
    samples,
  };
}

function _cfProblemUrl(problem) {
  const parts = problem.problem_id.match(/^(\d+)([A-Z]\d?)$/);
  if (!parts) return null;
  return `https://codeforces.com/problemset/problem/${parts[1]}/${parts[2]}`;
}

async function _scrapeCF_HTTP(problem) {
  const url = _cfProblemUrl(problem);
  if (!url) return null;
  const resp = await fetch(url, {
    headers: { "User-Agent": SCRAPE_UA, "Accept-Language": "en-US,en;q=0.9" },
    timeout: 15000,
  });
  if (!resp.ok) return null;
  const html = await resp.text();
  return _parseCFStatement(cheerio.load(html));
}

/* Cloudflare blocks plain HTTP from most datacenter IPs. The Wayback Machine
   archives Codeforces statements verbatim (images included), so it is a
   reliable browser-free source when both the live site and mirrors fail. */
async function _scrapeCF_Wayback(problem) {
  const url = _cfProblemUrl(problem);
  if (!url) return null;
  const avail = await fetch(
    `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`,
    { headers: { "User-Agent": SCRAPE_UA }, signal: AbortSignal.timeout(12000) },
  );
  if (!avail.ok) return null;
  const snap = (await avail.json())?.archived_snapshots?.closest;
  if (!snap?.available || !snap.url) return null;
  const resp = await fetch(snap.url, {
    headers: { "User-Agent": SCRAPE_UA },
    signal: AbortSignal.timeout(25000),
  });
  if (!resp.ok) return null;
  const $ = cheerio.load(await resp.text());
  // Strip the Wayback playback toolbar so it never leaks into statements.
  $('[id^="wm-"], [class^="wm-"], #donato, #playback, #resumePlay').remove();
  return _parseCFStatement($);
}

async function _scrapeCC_HTTP(problem) {
  const url = `https://www.codechef.com/api/contests/PRACTICE/problems/${problem.problem_id}`;
  const resp = await fetch(url, {
    headers: { "User-Agent": SCRAPE_UA, Accept: "application/json" },
    timeout: 15000,
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  if (!data || data.status === "error") return null;

  const statement =
    (data.problemComponents?.statement || data.body || "") +
    (data.problemComponents?.constraints
      ? "<h3>Constraints</h3>" + data.problemComponents.constraints
      : "");
  const inputSpec = data.problemComponents?.inputFormat
    ? '<div class="section-title">Input</div>' +
      data.problemComponents.inputFormat
    : "";
  const outputSpec = data.problemComponents?.outputFormat
    ? '<div class="section-title">Output</div>' +
      data.problemComponents.outputFormat
    : "";
  const samples = (data.problemComponents?.sampleTestCases || []).map((tc) => ({
    input: tc.input,
    output: tc.output,
  }));

  return {
    statement,
    inputSpec,
    outputSpec,
    note: "",
    timeLimit: data.time_limit || "",
    memLimit: data.source_size_limit || "",
    samples,
  };
}

async function _scrapeAC_HTTP(problem) {
  const resp = await fetch(problem.url, {
    headers: { "User-Agent": SCRAPE_UA },
    timeout: 15000,
  });
  if (!resp.ok) return null;
  const html = await resp.text();
  const $ = cheerio.load(html);
  const taskStmt = $("#task-statement");
  if (!taskStmt.length) return null;

  const lang = taskStmt.find(".lang-en").length
    ? taskStmt.find(".lang-en")
    : taskStmt;
  const sections = lang.find(".part");
  let statement = "",
    inputSpec = "",
    outputSpec = "",
    noteText = "";
  const samples = [];

  sections.each((_, section) => {
    const heading = $(section).find("h3").first().text().trim();
    const content = $(section).html() || "";
    if (
      /^(problem\s*)?statement$/i.test(heading) ||
      /^task\s*statement$/i.test(heading)
    )
      statement = content;
    else if (/constraints/i.test(heading)) statement += content;
    else if (/input/i.test(heading) && !/sample/i.test(heading))
      inputSpec = content;
    else if (/output/i.test(heading) && !/sample/i.test(heading))
      outputSpec = content;
    else if (/sample\s*input/i.test(heading)) {
      const pre = $(section).find("pre").first();
      if (pre.length) samples.push({ input: pre.text(), output: "" });
    } else if (/sample\s*output/i.test(heading)) {
      const pre = $(section).find("pre").first();
      if (pre.length && samples.length > 0)
        samples[samples.length - 1].output = pre.text();
    } else if (/note|hint|explanation/i.test(heading)) noteText += content;
  });

  if (!statement && !inputSpec)
    statement = lang.html() || taskStmt.html() || "";

  const limitText = taskStmt.parent().text();
  const timeMatch = limitText.match(/Time Limit\s*:\s*(\d+)\s*sec/i);
  const memMatch = limitText.match(/Memory Limit\s*:\s*(\d+)\s*MB/i);

  return {
    statement,
    inputSpec: inputSpec
      ? '<div class="section-title">Input</div>' + inputSpec
      : "",
    outputSpec: outputSpec
      ? '<div class="section-title">Output</div>' + outputSpec
      : "",
    note: noteText,
    timeLimit: timeMatch ? timeMatch[1] + " sec" : "",
    memLimit: memMatch ? memMatch[1] + " MB" : "",
    samples,
  };
}

/* ---------- LeetCode HTTP scraper (GraphQL) ---------- */
async function _scrapeLC_HTTP(problem) {
  try {
    // Extract slug from URL
    const slugMatch = problem.url.match(/\/problems\/([^/]+)/);
    if (!slugMatch) return null;
    const slug = slugMatch[1];

    const query = `query questionData($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        content
        difficulty
        exampleTestcaseList
        sampleTestCase
      }
    }`;
    const resp = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": SCRAPE_UA },
      body: JSON.stringify({ query, variables: { titleSlug: slug } }),
      timeout: 15000,
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const q = data?.data?.question;
    if (!q || !q.content) return null;

    return {
      statement: q.content,
      inputSpec: "",
      outputSpec: "",
      note: "",
      timeLimit: "",
      memLimit: "",
      samples: [],
    };
  } catch {
    return null;
  }
}

/* ---------- SPOJ HTTP scraper ---------- */
async function _scrapeSPOJ_HTTP(problem) {
  try {
    const resp = await fetch(problem.url, {
      headers: { "User-Agent": SCRAPE_UA },
      timeout: 15000,
    });
    if (!resp.ok) return null;
    const html = await resp.text();
    const $ = cheerio.load(html);
    const body = $("#problem-body");
    if (!body.length) return null;

    const statement = body.html() || "";
    // Try to extract I/O from typical SPOJ format
    const samples = [];
    const inputPre = body.find("pre").eq(0);
    const outputPre = body.find("pre").eq(1);
    if (inputPre.length && outputPre.length) {
      samples.push({ input: inputPre.text(), output: outputPre.text() });
    }

    return {
      statement,
      inputSpec: "",
      outputSpec: "",
      note: "",
      timeLimit: "",
      memLimit: "",
      samples,
    };
  } catch {
    return null;
  }
}

/* ---------- Project Euler HTTP scraper ---------- */
async function _scrapeEuler_HTTP(problem) {
  try {
    const idMatch = problem.problem_id.match(/PE(\d+)/);
    if (!idMatch) return null;
    const id = idMatch[1];
    const resp = await fetch(`https://projecteuler.net/problem=${id}`, {
      headers: { "User-Agent": SCRAPE_UA },
      timeout: 15000,
    });
    if (!resp.ok) return null;
    const html = await resp.text();
    const $ = cheerio.load(html);
    const content = $(".problem_content");
    if (!content.length) return null;

    return {
      statement: content.html() || "",
      inputSpec: "",
      outputSpec: "",
      note: "",
      timeLimit: "",
      memLimit: "",
      samples: [],
    };
  } catch {
    return null;
  }
}

/* ========== Lazy Puppeteer Browser Pool (fallback only) ========== */
let _browser = null;
let _browserLaunchPromise = null;

async function getBrowser() {
  if (_browser && _browser.connected) return _browser;
  if (_browserLaunchPromise) return _browserLaunchPromise;
  // Free hosts have no Chrome and ~512 MB RAM — skip the headless-browser
  // fallback there (DISABLE_PUPPETEER=1); plain HTTP scraping still works.
  if (process.env.DISABLE_PUPPETEER === "1") {
    return Promise.reject(new Error("Puppeteer disabled on this server"));
  }
  _browserLaunchPromise = require("puppeteer")
    .launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-gpu",
        "--disable-dev-shm-usage",
      ],
    })
    .then((b) => {
      _browser = b;
      _browserLaunchPromise = null;
      b.on("disconnected", () => {
        _browser = null;
      });
      return b;
    });
  return _browserLaunchPromise;
}

async function scrapePage(problem) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setUserAgent(SCRAPE_UA);
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const type = req.resourceType();
      if (["image", "font", "stylesheet", "media"].includes(type)) req.abort();
      else req.continue();
    });

    if (problem.platform === "codeforces")
      return await _scrapeCF(page, problem);
    if (problem.platform === "codechef") return await _scrapeCC(page, problem);
    if (problem.platform === "atcoder") return await _scrapeAC(page, problem);
    return null;
  } finally {
    await page.close().catch(() => {});
  }
}

async function _scrapeCF(page, problem) {
  const parts = problem.problem_id.match(/^(\d+)([A-Z]\d?)$/);
  if (!parts) return null;
  const [, contestId, index] = parts;
  const url = `https://codeforces.com/problemset/problem/${contestId}/${index}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page
    .waitForSelector(".problem-statement", { timeout: 15000 })
    .catch(() => null);
  return page.evaluate(() => {
    const stmt = document.querySelector(".problem-statement");
    if (!stmt) return null;
    const timeLimit =
      stmt
        .querySelector(".time-limit")
        ?.textContent?.replace("time limit per test", "")
        .trim() || "";
    const memLimit =
      stmt
        .querySelector(".memory-limit")
        ?.textContent?.replace("memory limit per test", "")
        .trim() || "";
    const inputSpec =
      stmt.querySelector(".input-specification")?.innerHTML || "";
    const outputSpec =
      stmt.querySelector(".output-specification")?.innerHTML || "";
    const note = stmt.querySelector(".note")?.innerHTML || "";
    const clone = stmt.cloneNode(true);
    [
      "header",
      "input-specification",
      "output-specification",
      "sample-tests",
      "note",
    ].forEach((cls) => clone.querySelector("." + cls)?.remove());
    const statement = clone.innerHTML || "";
    const samples = [];
    const inputs = document.querySelectorAll(".sample-test .input pre");
    const outputs = document.querySelectorAll(".sample-test .output pre");
    for (let i = 0; i < inputs.length; i++) {
      samples.push({
        input: inputs[i].textContent,
        output: outputs[i]?.textContent || "",
      });
    }
    return {
      statement,
      inputSpec,
      outputSpec,
      note,
      timeLimit,
      memLimit,
      samples,
    };
  });
}

async function _scrapeCC(page, problem) {
  const url = `https://www.codechef.com/api/contests/PRACTICE/problems/${problem.problem_id}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
  const text = await page.evaluate(() => document.body.innerText);
  const data = JSON.parse(text);
  const statement =
    (data.problemComponents?.statement || data.body || "") +
    (data.problemComponents?.constraints
      ? "<h3>Constraints</h3>" + data.problemComponents.constraints
      : "");
  const inputSpec = data.problemComponents?.inputFormat
    ? '<div class="section-title">Input</div>' +
      data.problemComponents.inputFormat
    : "";
  const outputSpec = data.problemComponents?.outputFormat
    ? '<div class="section-title">Output</div>' +
      data.problemComponents.outputFormat
    : "";
  const samples = (data.problemComponents?.sampleTestCases || []).map((tc) => ({
    input: tc.input,
    output: tc.output,
  }));
  return {
    statement,
    inputSpec,
    outputSpec,
    note: "",
    timeLimit: data.time_limit || "",
    memLimit: data.source_size_limit || "",
    samples,
  };
}

async function _scrapeAC(page, problem) {
  await page.goto(problem.url, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page
    .waitForSelector("#task-statement", { timeout: 10000 })
    .catch(() => null);
  return page.evaluate(() => {
    const taskStmt = document.querySelector("#task-statement");
    if (!taskStmt) return null;
    const lang = taskStmt.querySelector(".lang-en") || taskStmt;
    const sections = lang.querySelectorAll(".part");
    let statement = "",
      inputSpec = "",
      outputSpec = "",
      note = "";
    const samples = [];
    for (const section of sections) {
      const heading = section.querySelector("h3")?.textContent?.trim() || "";
      const content = section.innerHTML || "";
      if (
        /^(problem\s*)?statement$/i.test(heading) ||
        /^task\s*statement$/i.test(heading)
      )
        statement = content;
      else if (/constraints/i.test(heading)) statement += content;
      else if (/input/i.test(heading) && !/sample/i.test(heading))
        inputSpec = content;
      else if (/output/i.test(heading) && !/sample/i.test(heading))
        outputSpec = content;
      else if (/sample\s*input/i.test(heading)) {
        const pre = section.querySelector("pre");
        if (pre) samples.push({ input: pre.textContent, output: "" });
      } else if (/sample\s*output/i.test(heading)) {
        const pre = section.querySelector("pre");
        if (pre && samples.length > 0)
          samples[samples.length - 1].output = pre.textContent;
      } else if (/note|hint|explanation/i.test(heading)) note += content;
    }
    if (!statement && !inputSpec)
      statement = lang.innerHTML || taskStmt.innerHTML || "";
    const limitText =
      document.querySelector("#task-statement")?.parentElement?.textContent ||
      "";
    const timeMatch = limitText.match(/Time Limit\s*:\s*(\d+)\s*sec/i);
    const memMatch = limitText.match(/Memory Limit\s*:\s*(\d+)\s*MB/i);
    return {
      statement,
      inputSpec: inputSpec
        ? '<div class="section-title">Input</div>' + inputSpec
        : "",
      outputSpec: outputSpec
        ? '<div class="section-title">Output</div>' + outputSpec
        : "",
      note,
      timeLimit: timeMatch ? timeMatch[1] + " sec" : "",
      memLimit: memMatch ? memMatch[1] + " MB" : "",
      samples,
    };
  });
}

const app = express();

/* ── Trust proxy (for Nginx / Cloudflare / Railway / Render) ── */
if (IS_PROD) app.set("trust proxy", 1);

/* ── Compression ── */
app.use(compression());

/* ── Helmet — security headers ── */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Monaco loader needs this
          "'unsafe-eval'", // Monaco worker needs this
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://cdn.socket.io",
          "https://cdn.quilljs.com",
        ],
        scriptSrcAttr: ["'unsafe-inline'"], // inline onclick handlers
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://cdn.quilljs.com",
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "data:",
        ],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        // Problem statements may embed videos / audio from the source sites.
        mediaSrc: ["'self'", "https:", "blob:", "data:"],
        connectSrc: ["'self'", "wss:", "ws:", "https://api.groq.com"],
        workerSrc: ["'self'", "blob:"],
        frameSrc: ["'self'", "https://www.youtube.com", "https://www.youtube-nocookie.com", "https://player.vimeo.com"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        upgradeInsecureRequests: IS_PROD ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false, // Monaco CDN workers
    hsts: IS_PROD
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
  }),
);

/* ── CORS ── */
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : [APP_URL, "http://localhost:3000", "http://127.0.0.1:3000"];

app.use(
  cors({
    origin: IS_PROD ? allowedOrigins : true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

/* ── Body parsing ── */
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false, limit: "2mb" }));

/* ── Rate Limiters ── */
// Global limiter — 300 req/min per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Too many requests — please slow down." },
  skip: (req) => !IS_PROD, // only in production
});
app.use(globalLimiter);

// Strict limiter for auth endpoints — 10 req/min
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: "Too many auth attempts — try again in a minute.",
  },
});

// Judge limiter — 30 submissions/min per IP
const judgeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: "Submission rate limit reached — wait a moment.",
  },
});

// AI limiter — 20 req/min per IP
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "AI rate limit reached — please wait." },
});

/* ── Session & Passport ── */
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret || sessionSecret.length < 32) {
  if (IS_PROD) {
    console.error(
      "[FATAL] SESSION_SECRET must be set and at least 32 characters in production.",
    );
    process.exit(1);
  } else {
    console.warn(
      "[WARN] SESSION_SECRET not set — using insecure dev fallback. Set it before going to production!",
    );
  }
}

app.use(
  session({
    secret: sessionSecret || "nexora-dev-fallback-secret-do-not-use-in-prod",
    // Sessions are stored in the database so logins survive restarts/redeploys.
    store: new DbSessionStore(),
    resave: false,
    saveUninitialized: false,
    name: "nx.sid",
    cookie: {
      secure: IS_PROD, // HTTPS only in production
      httpOnly: true, // Not accessible via JS
      // "lax" (not "strict") so the session cookie is sent when GitHub/Google
      // redirect back to /auth/*/callback — strict drops it on that hop.
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  }),
);
app.use(passport.initialize());
app.use(passport.session());
// Remember who is making each request (per-user progress queries read it).
app.use(requestContext(getSessionUser));
// Enforce who-can-do-what on every /api route (see src/middleware/authz.js).
app.use(authz());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

/* ── GitHub OAuth Strategy ── */
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: `${APP_URL}/auth/github/callback`,
        scope: ["user:email"],
      },
      (accessToken, refreshToken, profile, done) => {
        const user = {
          provider: "github",
          providerId: profile.id,
          displayName: profile.displayName || profile.username,
          email: profile.emails?.[0]?.value || "",
          avatarUrl: profile.photos?.[0]?.value || "",
          username: profile.username || "",
        };
        done(null, user);
      },
    ),
  );
  console.log("✓ GitHub OAuth configured");
}

/* ── Google OAuth Strategy ── */
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${APP_URL}/auth/google/callback`,
        scope: ["profile", "email"],
      },
      (accessToken, refreshToken, profile, done) => {
        const user = {
          provider: "google",
          providerId: profile.id,
          displayName: profile.displayName || "",
          email: profile.emails?.[0]?.value || "",
          avatarUrl: profile.photos?.[0]?.value || "",
          username: "",
        };
        done(null, user);
      },
    ),
  );
  console.log("✓ Google OAuth configured");
}

/* ── OAuth Routes ── */
// Returning users: sign straight into the Nexora account linked to this
// GitHub/Google identity. New users: keep the verified identity pending in the
// session until they pick a username (POST /api/user/register).
async function finishOAuth(req, res, next, provider) {
  try {
    const o = req.user;
    const linked = await get(
      "SELECT * FROM users WHERE auth_provider=? AND provider_id=?",
      [provider, String(o.providerId)],
    );
    if (linked) {
      delete req.session.oauthUser;
      persistSessionUser(req, linked);
      return req.session.save(() => res.redirect(`/?auth=${provider}&linked=1`));
    }
    req.session.oauthUser = o;
    req.session.save(() => res.redirect(`/?auth=${provider}`));
  } catch (e) {
    next(e);
  }
}
app.get("/auth/github", authLimiter, (req, res, next) => {
  if (!process.env.GITHUB_CLIENT_ID)
    return res.redirect("/?auth_error=github_not_configured");
  passport.authenticate("github", { scope: ["user:email"] })(req, res, next);
});
app.get(
  "/auth/github/callback",
  // Without this guard an unconfigured provider throws "Unknown authentication
  // strategy" and the caller gets a raw 500 instead of a readable message.
  (req, res, next) => {
    if (!process.env.GITHUB_CLIENT_ID) {
      return res.redirect("/?auth_error=github_not_configured");
    }
    passport.authenticate("github", { failureRedirect: "/?auth_error=github_failed" })(req, res, next);
  },
  (req, res, next) => finishOAuth(req, res, next, "github"),
);

app.get("/auth/google", authLimiter, (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID)
    return res.redirect("/?auth_error=google_not_configured");
  passport.authenticate("google", { scope: ["profile", "email"] })(
    req,
    res,
    next,
  );
});
app.get(
  "/auth/google/callback",
  // Without this guard an unconfigured provider throws "Unknown authentication
  // strategy" and the caller gets a raw 500 instead of a readable message.
  (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.redirect("/?auth_error=google_not_configured");
    }
    passport.authenticate("google", { failureRedirect: "/?auth_error=google_failed" })(req, res, next);
  },
  (req, res, next) => finishOAuth(req, res, next, "google"),
);

/* ── Health Check — for load balancers and uptime monitors ── */
const _startTime = Date.now();
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    uptime: Math.floor((Date.now() - _startTime) / 1000),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "2.0.0",
    commit: (process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || "").slice(0, 7) || undefined,
    env: IS_PROD ? "production" : "development",
    db: dbInfo().driver,
  });
});

function getAuthProviders() {
  return {
    github: !!process.env.GITHUB_CLIENT_ID,
    google: !!process.env.GOOGLE_CLIENT_ID,
  };
}

/* ── New React client (client/dist) — mounted first so it owns `/` ── */
const CLIENT_DIST = path.join(__dirname, "..", "client", "dist");
const HAS_CLIENT_BUILD = fs.existsSync(path.join(CLIENT_DIST, "index.html"));
if (HAS_CLIENT_BUILD) {
  app.use(
    express.static(CLIENT_DIST, {
      maxAge: IS_PROD ? "1h" : "0s",
      etag: true,
      lastModified: true,
      index: "index.html",
    }),
  );
  // Legacy SPA stays reachable at /legacy (its assets resolve from the
  // public/ static mount below since they use absolute /js, /css paths).
  app.get("/legacy", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "public", "index.html"));
  });
}

// Restore uploaded files from the database when the (ephemeral) disk lost them.
app.use("/uploads", restoreUploads());

app.use(
  express.static(path.join(__dirname, "..", "public"), {
    maxAge: IS_PROD ? "1h" : "0s",
    etag: true,
    lastModified: true,
    // Resolve extensionless paths to their .html file so the sidebar links
    // /forgebuilder, /live-class, /explainlab serve the real pages instead
    // of falling through to the SPA catch-all (which served index.html).
    extensions: ["html"],
    setHeaders(res, filePath) {
      if (IS_PROD) {
        if (/\.(css|js)$/.test(filePath))
          res.setHeader("Cache-Control", "public, max-age=3600");
        if (/\.(woff2?|ttf|eot|svg|png|jpg|ico)$/.test(filePath))
          res.setHeader("Cache-Control", "public, max-age=86400");
      } else {
        // Disable caching in development so changes reflect immediately
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      }
    },
  }),
);

/* ── Lightweight in-memory TTL cache for heavy read endpoints ── */
const _apiCache = new Map();
function cachedResponse(key, ttlMs, computeFn) {
  key = `${me()}|${key}`; // cached per user — responses contain personal stats
  const entry = _apiCache.get(key);
  if (entry && Date.now() - entry.ts < ttlMs) return entry.promise;
  const promise = computeFn();
  _apiCache.set(key, { ts: Date.now(), promise });
  promise.catch(() => _apiCache.delete(key));
  return promise;
}
function invalidateCache() {
  _apiCache.clear();
}

/** Achievement definitions joined with the signed-in user's progress. */
function achievementsSql() {
  return `SELECT a.id, a.title, a.description, a.icon, a.category, a.target, a.xp_reward,
    COALESCE(ua.progress, 0) AS progress, ua.unlocked_at
    FROM achievements a
    LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.username = ${meSql()}`;
}

/* ========== SYNC ========== */
app.post("/api/sync", async (req, res) => {
  try {
    const { platform } = req.body; // 'codeforces', 'codechef', or 'all'
    let inserted = 0;
    const doInsert = async (problems) => {
      for (const p of problems) {
        try {
          await run(
            `INSERT OR IGNORE INTO problems(platform,problem_id,title,url,rating,tags,category) VALUES(?,?,?,?,?,?,?)`,
            [
              p.platform,
              p.problem_id,
              p.title,
              p.url,
              p.rating,
              p.tags,
              p.category,
            ],
          );
          inserted++;
        } catch {}
      }
    };

    if (platform === "codeforces" || platform === "all") {
      const cf = await fetchCodeforcesProblems();
      await doInsert(cf);
    }
    if (platform === "codechef" || platform === "all") {
      const cc = await fetchCodechefProblems();
      await doInsert(cc);
    }
    if (platform === "atcoder" || platform === "all") {
      const ac = await fetchAtcoderProblems();
      await doInsert(ac);
    }
    if (platform === "leetcode" || platform === "all") {
      const lc = await fetchLeetcodeProblems();
      await doInsert(lc);
    }
    if (platform === "spoj" || platform === "all") {
      const sp = await fetchSpojProblems();
      await doInsert(sp);
    }
    if (platform === "euler" || platform === "all") {
      const pe = await fetchProjectEulerProblems();
      await doInsert(pe);
    }

    const total = (await get("SELECT COUNT(*) as c FROM problems")).c;
    await run(
      `INSERT OR REPLACE INTO settings(key,value) VALUES('last_sync',?)`,
      [new Date().toISOString()],
    );
    res.json({ ok: true, inserted, total });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* ========== PROBLEMS ========== */
app.get("/api/problems", async (req, res) => {
  try {
    const {
      platform,
      minRating,
      maxRating,
      tag,
      status,
      search,
      sort,
      order,
      limit,
      offset,
    } = req.query;
    let where = ["1=1"];
    let params = [];

    if (platform && platform !== "all") {
      where.push("p.platform=?");
      params.push(platform);
    }
    if (minRating) {
      where.push("p.rating>=?");
      params.push(+minRating);
    }
    if (maxRating) {
      where.push("p.rating<=?");
      params.push(+maxRating);
    }
    if (tag) {
      where.push("p.tags LIKE ?");
      params.push(`%${tag}%`);
    }
    if (status && status !== "all") {
      if (status === "solved")
        where.push("COALESCE(pr.status,'unsolved')='solved'");
      else if (status === "attempted")
        where.push("COALESCE(pr.status,'unsolved')='attempted'");
      else if (status === "unsolved")
        where.push("(pr.status IS NULL OR pr.status='unsolved')");
    }
    if (search) {
      where.push("(p.title LIKE ? OR p.problem_id LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }

    const sortCol =
      { rating: "p.rating", title: "p.title", id: "p.problem_id" }[sort] ||
      "p.rating";
    const sortDir = order === "desc" ? "DESC" : "ASC";
    const lim = Math.min(+(limit || 50), 200);
    const off = +(offset || 0);

    const countSql = `SELECT COUNT(*) as total FROM problems p LEFT JOIN progress pr ON pr.problem_rowid=p.id AND pr.username=${meSql()} WHERE ${where.join(" AND ")}`;
    const dataSql = `SELECT p.*, COALESCE(pr.status,'unsolved') as solve_status, pr.attempts, pr.xp_earned, pr.solved_at
      FROM problems p LEFT JOIN progress pr ON pr.problem_rowid=p.id AND pr.username=${meSql()}
      WHERE ${where.join(" AND ")} ORDER BY ${sortCol === "p.rating" ? "(p.rating = 0), " : ""}${sortCol} ${sortDir} LIMIT ? OFFSET ?`;

    const { total } = await get(countSql, params);
    const problems = await all(dataSql, [...params, lim, off]);
    res.json({ ok: true, total, problems, limit: lim, offset: off });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

app.get("/api/problems/:id", async (req, res) => {
  try {
    const problem = await get(
      `SELECT p.*, COALESCE(pr.status,'unsolved') as solve_status, pr.attempts, pr.xp_earned, pr.notes
      FROM problems p LEFT JOIN progress pr ON pr.problem_rowid=p.id AND pr.username=${meSql()} WHERE p.id=?`,
      [req.params.id],
    );
    if (!problem)
      return res.status(404).json({ ok: false, error: "Not found" });
    // Only this account's testcases: a custom case one user adds must never
    // show up in anyone else's deck.
    const testcases = await all(
      "SELECT * FROM testcases WHERE problem_rowid=? AND username=? ORDER BY id",
      [req.params.id, me()],
    );
    const submissions = await all(
      "SELECT id,verdict,exec_time_ms,submitted_at FROM submissions WHERE username=? AND problem_rowid=? ORDER BY submitted_at DESC LIMIT 20",
      [me(), req.params.id],
    );
    res.json({ ok: true, problem, testcases, submissions });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* ========== Save scraped statement helper ========== */
async function _saveStatement(problemId, data) {
  await run(
    `INSERT OR REPLACE INTO problem_statements
    (problem_rowid, statement, input_spec, output_spec, note, time_limit, memory_limit, samples, scraped_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      problemId,
      data.statement || "",
      data.inputSpec || "",
      data.outputSpec || "",
      data.note || "",
      data.timeLimit || "",
      data.memLimit || "",
      JSON.stringify(data.samples || []),
      new Date().toISOString(),
    ],
  );
}

/* ========== IMAGE PROXY (statement images) ==========

   Statement images load straight from the source CDN first (see
   normalizeStatementHtml); this route is the fallback for the ones that
   hotlink-block us. Because the same handful of images is requested by every
   visitor to a problem, responses are cached in memory and revalidated with an
   ETag, so only the very first viewer ever waits on the upstream fetch. */
const IMG_CACHE_MAX_BYTES = 64 * 1024 * 1024;
const IMG_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const IMG_MAX_BYTES = 8 * 1024 * 1024;
const imgCache = new Map(); // url -> { buf, ctype, etag, at }
let imgCacheBytes = 0;
/** url -> Promise, so a burst of requests for one image does one upstream fetch. */
const imgInflight = new Map();

function imgCachePut(url, entry) {
  const prev = imgCache.get(url);
  if (prev) imgCacheBytes -= prev.buf.length;
  imgCache.set(url, entry);
  imgCacheBytes += entry.buf.length;
  // Evict oldest-first until back under budget.
  for (const [k, v] of imgCache) {
    if (imgCacheBytes <= IMG_CACHE_MAX_BYTES) break;
    if (k === url) continue;
    imgCache.delete(k);
    imgCacheBytes -= v.buf.length;
  }
}

function imgCacheGet(url) {
  const hit = imgCache.get(url);
  if (!hit) return null;
  if (Date.now() - hit.at > IMG_CACHE_TTL) {
    imgCache.delete(url);
    imgCacheBytes -= hit.buf.length;
    return null;
  }
  return hit;
}

const MEDIA_TYPE_OK = /^(image|video|audio)\//;

async function fetchProxiedMedia(startUrl) {
  let target = startUrl;
  let upstream = await fetch(target, {
    headers: { "User-Agent": SCRAPE_UA, Accept: "image/avif,image/webp,image/*,video/*,audio/*,*/*;q=0.8" },
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
  });
  // Follow at most three redirects, staying inside the allowlist.
  for (let hops = 0; hops < 3 && [301, 302, 303, 307, 308].includes(upstream.status); hops++) {
    const loc = upstream.headers.get("location");
    if (!loc) break;
    const next = new URL(loc, target);
    if (next.protocol !== "https:" || !isProxyableHost(next.hostname)) break;
    target = next;
    upstream = await fetch(target, {
      headers: { "User-Agent": SCRAPE_UA, Accept: "image/*,video/*,audio/*,*/*;q=0.8" },
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
  }
  const ctype = (upstream.headers.get("content-type") || "").split(";")[0].trim();
  if (!upstream.ok || !MEDIA_TYPE_OK.test(ctype)) {
    throw new Error(`upstream ${upstream.status} ${ctype || "unknown type"}`);
  }
  const buf = Buffer.from(await upstream.arrayBuffer());
  if (!buf.length || buf.length > IMG_MAX_BYTES) throw new Error("media too large or empty");
  return {
    buf,
    ctype,
    etag: '"' + crypto.createHash("sha1").update(buf).digest("hex").slice(0, 24) + '"',
    at: Date.now(),
  };
}

app.get("/api/imgproxy", async (req, res) => {
  const url = String(req.query.url || "");
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).end();
  }
  if (parsed.protocol !== "https:" || !isProxyableHost(parsed.hostname)) {
    return res.status(403).end();
  }
  const key = parsed.toString();

  const serve = (entry) => {
    res.set({
      "Content-Type": entry.ctype,
      "Cache-Control": "public, max-age=604800, immutable",
      ETag: entry.etag,
    });
    // The browser already has this byte-for-byte: skip the body.
    if (req.headers["if-none-match"] === entry.etag) return res.status(304).end();
    res.set("Content-Length", String(entry.buf.length));
    res.send(entry.buf);
  };

  const cached = imgCacheGet(key);
  if (cached) return serve(cached);

  try {
    let work = imgInflight.get(key);
    if (!work) {
      work = fetchProxiedMedia(parsed).finally(() => imgInflight.delete(key));
      imgInflight.set(key, work);
    }
    const entry = await work;
    imgCachePut(key, entry);
    serve(entry);
  } catch {
    res.status(502).end();
  }
});

/* ========== PROBLEM STATEMENT (fast HTTP scraping + Puppeteer fallback) ========== */
app.get("/api/problem-statement/:id", async (req, res) => {
  try {
    const problem = await get("SELECT * FROM problems WHERE id=?", [
      req.params.id,
    ]);
    if (!problem)
      return res.status(404).json({ ok: false, error: "Not found" });

    // 1. Check local problem_statements table first (instant)
    const local = await get(
      "SELECT * FROM problem_statements WHERE problem_rowid=?",
      [problem.id],
    );
    if (local && (local.statement || "").trim().length > 10) {
      let samples = [];
      try {
        samples = JSON.parse(local.samples || "[]");
      } catch {}
      const norm = normalizeStatement(
        {
          statement: local.statement,
          inputSpec: local.input_spec,
          outputSpec: local.output_spec,
          note: local.note,
        },
        problem,
      );
      return res.json({
        ok: true,
        statement: norm.statement,
        inputSpec: norm.inputSpec,
        outputSpec: norm.outputSpec,
        note: norm.note,
        timeLimit: local.time_limit,
        memLimit: local.memory_limit,
        samples,
        platform: problem.platform,
        source: "local",
      });
    }

    // 2. Check legacy cache
    const cached = await get("SELECT value FROM settings WHERE username='' AND key=?", [
      `stmt_${problem.id}`,
    ]);
    if (cached) {
      try {
        const parsed = JSON.parse(cached.value);
        if ((parsed.statement || "").trim().length > 10) {
          // Migrate legacy cache to problem_statements table
          await _saveStatement(problem.id, parsed);
          const norm = normalizeStatement(parsed, problem);
          return res.json({ ok: true, ...norm, source: "cache" });
        }
      } catch {}
    }

    // 3. FAST: HTTP scrape with fetch+cheerio (<1s)
    console.log(`[http-scrape] ${problem.platform} ${problem.problem_id}...`);
    try {
      const data = await scrapePageHTTP(problem);
      if (data && (data.statement || "").trim().length > 10) {
        await _saveStatement(problem.id, data);
        console.log(
          `[http-scrape] ✅ ${problem.problem_id} saved (${data.samples?.length || 0} samples)`,
        );
        const norm = normalizeStatement(data, problem);
        return res.json({
          ok: true,
          ...norm,
          platform: problem.platform,
          source: "http",
        });
      }
    } catch (e) {
      console.log(`[http-scrape] ✗ ${problem.problem_id}: ${e.message}`);
    }

    // 3b. ARCHIVE: Wayback Machine (Codeforces sits behind Cloudflare, which
    //     rejects plain HTTP from most servers; the archive has verbatim copies)
    if (problem.platform === "codeforces") {
      console.log(`[wayback] ${problem.problem_id}...`);
      try {
        const data = await _scrapeCF_Wayback(problem);
        if (data && (data.statement || "").trim().length > 10) {
          await _saveStatement(problem.id, data);
          console.log(
            `[wayback] ✅ ${problem.problem_id} saved (${data.samples?.length || 0} samples)`,
          );
          const norm = normalizeStatement(data, problem);
          return res.json({
            ok: true,
            ...norm,
            platform: problem.platform,
            source: "archive",
          });
        }
      } catch (e) {
        console.log(`[wayback] ✗ ${problem.problem_id}: ${e.message}`);
      }
    }

    // 4. SLOW FALLBACK: Puppeteer (for Cloudflare-protected pages)
    console.log(`[puppeteer] Falling back for ${problem.problem_id}...`);
    try {
      const data = await scrapePage(problem);
      if (data && (data.statement || "").trim().length > 10) {
        await _saveStatement(problem.id, data);
        console.log(
          `[puppeteer] ✅ ${problem.problem_id} saved (${data.samples?.length || 0} samples)`,
        );
        const norm = normalizeStatement(data, problem);
        return res.json({
          ok: true,
          ...norm,
          platform: problem.platform,
          source: "live",
        });
      }
    } catch (e) {
      console.error(`[puppeteer] ✗ ${problem.problem_id}:`, e.message);
    }

    // 5. Final fallback — clean local message (no iframe, no redirect)
    res.json({
      ok: true,
      statement: `<div style="text-align:center;padding:32px 16px">
        <div style="font-size:48px;margin-bottom:12px;opacity:0.3">📄</div>
        <p style="font-size:15px;color:var(--text-bright);margin-bottom:8px">Problem statement unavailable</p>
        <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px">Could not fetch from ${problem.platform}. You can view it on the original site.</p>
        <a href="${problem.url}" target="_blank" rel="noopener" class="btn btn-outline btn-sm" style="color:var(--brand)">Open on ${problem.platform} →</a>
      </div>`,
      samples: [],
      inputSpec: "",
      outputSpec: "",
      note: "",
      timeLimit: "",
      memLimit: "",
      platform: problem.platform,
      source: "fallback",
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* ========== SCRAPE STATS ========== */
app.get("/api/scrape-stats", async (_req, res) => {
  try {
    const total = (await get("SELECT COUNT(*) as c FROM problems")).c;
    const scraped = (await get("SELECT COUNT(*) as c FROM problem_statements"))
      .c;
    const byPlatform = await all(`
      SELECT p.platform, COUNT(ps.problem_rowid) as scraped, COUNT(p.id) as total
      FROM problems p LEFT JOIN problem_statements ps ON ps.problem_rowid = p.id
      GROUP BY p.platform`);
    res.json({
      ok: true,
      total,
      scraped,
      remaining: total - scraped,
      byPlatform,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* ========== BOOKMARKS ========== */
// List a user's bookmarked problems (full rows + id list for star state)
app.get("/api/bookmarks", async (req, res) => {
  try {
    const username = (req.query.username || "").trim();
    if (!username) return res.json({ ok: true, problems: [], problemIds: [] });
    const rows = await all(
      `SELECT p.*, b.created_at AS bookmarked_at,
              pr.status AS solve_status, pr.xp_earned
         FROM bookmarks b
         JOIN problems p ON p.id = b.problem_id
         LEFT JOIN progress pr ON pr.problem_rowid = p.id AND pr.username = b.username
        WHERE b.username = ?
        ORDER BY b.created_at DESC`,
      [username],
    );
    res.json({
      ok: true,
      problems: rows,
      problemIds: rows.map((r) => r.id),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

// Add a bookmark
app.post("/api/bookmarks", async (req, res) => {
  try {
    const { username, problemId } = req.body || {};
    if (!username || !problemId)
      return res
        .status(400)
        .json({ ok: false, error: "username and problemId required" });
    await run(
      "INSERT OR IGNORE INTO bookmarks(username, problem_id) VALUES(?,?)",
      [String(username).trim(), Number(problemId)],
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

// Remove a bookmark
app.delete("/api/bookmarks/:problemId", async (req, res) => {
  try {
    const username = (req.query.username || "").trim();
    const problemId = Number(req.params.problemId);
    if (!username || !problemId)
      return res
        .status(400)
        .json({ ok: false, error: "username and problemId required" });
    await run("DELETE FROM bookmarks WHERE username=? AND problem_id=?", [
      username,
      problemId,
    ]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* ========== DATE ACTIVITY DETAIL ========== */
app.get("/api/activity/:date", async (req, res) => {
  try {
    const date = req.params.date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
      return res.status(400).json({ ok: false, error: "Invalid date" });
    const dayStats = (await get(
      `SELECT COALESCE(problems_solved,0) as solved, COALESCE(problems_attempted,0) as attempted,
      COALESCE(xp_earned,0) as xp FROM daily_activity WHERE username=? AND date=?`,
      [me(), date],
    )) || { solved: 0, attempted: 0, xp: 0 };
    const submissions = await all(
      `SELECT s.id, s.verdict, s.exec_time_ms, s.language, s.submitted_at,
      p.title, p.rating, p.platform, p.problem_id
      FROM submissions s JOIN problems p ON s.problem_rowid=p.id
      WHERE s.username=? AND date(s.submitted_at)=? ORDER BY s.submitted_at DESC`,
      [me(), date],
    );
    res.json({ ok: true, date, stats: dayStats, submissions });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* ========== TRANSLATE ========== (see src/ai-assist.js) */
// Translation (with language detection + AI engine) and the coding coach.
app.use(createAiAssistRouter({ get, all, run, aiLimiter }));

/* ========== TESTCASES ========== */

/* Testcases are compared on content, not on label: importing the same sample
   twice (two clicks, an auto-import racing a manual one) must not duplicate it. */
const tcKey = (input, expected) =>
  `${String(input ?? "").replace(/\r\n?/g, "\n").trim()}\u0000${String(expected ?? "").replace(/\r\n?/g, "\n").trim()}`;

/**
 * Import several testcases at once.
 *
 * The sample-import button used to POST one testcase per request, so a problem
 * with six samples meant six round trips and six chances to half-fail. This
 * inserts the whole batch, skips anything already stored for that problem and
 * reports exactly what happened.
 */
app.post("/api/testcases/bulk", async (req, res) => {
  try {
    const problemId = Number(req.body?.problem_rowid);
    const incoming = Array.isArray(req.body?.testcases) ? req.body.testcases : [];
    if (!problemId || !incoming.length) {
      return res.status(400).json({ ok: false, error: "problem_rowid and testcases are required" });
    }
    if (incoming.length > 100) {
      return res.status(400).json({ ok: false, error: "Too many testcases in one request (max 100)" });
    }

    const existing = await all(
      "SELECT input, expected_output FROM testcases WHERE problem_rowid=? AND username=?",
      [problemId, me()],
    );
    const seen = new Set(existing.map((t) => tcKey(t.input, t.expected_output)));

    const added = [];
    let skipped = 0;
    for (const tc of incoming) {
      const input = String(tc?.input ?? "");
      const expected = String(tc?.expected_output ?? tc?.output ?? "");
      if (!input.trim() && !expected.trim()) { skipped++; continue; }
      const key = tcKey(input, expected);
      if (seen.has(key)) { skipped++; continue; }
      seen.add(key);
      const r = await run(
        "INSERT INTO testcases(problem_rowid,label,input,expected_output,username) VALUES(?,?,?,?,?)",
        [problemId, String(tc?.label || "Sample").slice(0, 60), input, expected, me()],
      );
      added.push({ id: r.lastID, label: tc?.label || "Sample", input, expected_output: expected });
    }

    res.json({ ok: true, added: added.length, skipped, testcases: added });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

app.post("/api/testcases", async (req, res) => {
  try {
    const { problem_rowid, label, input, expected_output } = req.body;
    const r = await run(
      "INSERT INTO testcases(problem_rowid,label,input,expected_output,username) VALUES(?,?,?,?,?)",
      [problem_rowid, label || "Sample", input, expected_output, me()],
    );
    res.json({ ok: true, id: r.lastID });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

app.put("/api/testcases/:id", async (req, res) => {
  try {
    const { label, input, expected_output } = req.body;
    // The username predicate is the real guard: without it any signed-in user
    // could edit any testcase just by guessing its id.
    const r = await run(
      "UPDATE testcases SET label=?, input=?, expected_output=? WHERE id=? AND username=?",
      [label, input, expected_output, req.params.id, me()],
    );
    if (!r.changes) return res.status(404).json({ ok: false, error: "Testcase not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

app.delete("/api/testcases/:id", async (req, res) => {
  try {
    const r = await run("DELETE FROM testcases WHERE id=? AND username=?", [req.params.id, me()]);
    if (!r.changes) return res.status(404).json({ ok: false, error: "Testcase not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* ========== JUDGE ========== */
app.post("/api/judge", judgeLimiter, async (req, res) => {
  try {
    const { problem_id, code, testcases, language } = req.body;
    const lang = LANG_CONFIG[language] ? language : "cpp";
    const result = await judge(code, testcases || [], lang);

    // Record submission
    if (problem_id) {
      await run(
        `INSERT INTO submissions(username,problem_rowid,code,language,verdict,exec_time_ms,submitted_at,test_results) VALUES(?,?,?,?,?,?,?,?)`,
        [
          me(),
          problem_id,
          code,
          lang,
          result.verdict,
          result.results.length
            ? Math.max(...result.results.map((r) => r.timeMs))
            : 0,
          new Date().toISOString(),
          JSON.stringify(result.results),
        ],
      );

      // Update progress
      const existing = await get(
        "SELECT * FROM progress WHERE username=? AND problem_rowid=?",
        [me(), problem_id],
      );
      if (!existing) {
        await run(
          `INSERT INTO progress(username,problem_rowid,status,attempts,solved_at,xp_earned) VALUES(?,?,?,?,?,?)`,
          [
            me(),
            problem_id,
            result.verdict === "AC" ? "solved" : "attempted",
            1,
            result.verdict === "AC" ? new Date().toISOString() : null,
            result.verdict === "AC" ? await calcXp(problem_id) : 0,
          ],
        );
      } else {
        const newStatus =
          result.verdict === "AC"
            ? "solved"
            : existing.status === "solved"
              ? "solved"
              : "attempted";
        const xp =
          result.verdict === "AC" && existing.status !== "solved"
            ? await calcXp(problem_id)
            : existing.xp_earned;
        await run(
          `UPDATE progress SET status=?, attempts=attempts+1, solved_at=COALESCE(solved_at,?), xp_earned=? WHERE username=? AND problem_rowid=?`,
          [
            newStatus,
            result.verdict === "AC" ? new Date().toISOString() : null,
            xp,
            me(),
            problem_id,
          ],
        );
      }

      // Update daily activity
      const today = new Date().toISOString().slice(0, 10);
      await run(
        `INSERT INTO daily_activity(username,date,problems_solved,problems_attempted,xp_earned)
        VALUES(?,?,?,1,?) ON CONFLICT(username,date) DO UPDATE SET
        problems_attempted=problems_attempted+1,
        problems_solved=problems_solved+?,
        xp_earned=xp_earned+?`,
        [
          me(),
          today,
          result.verdict === "AC" ? 1 : 0,
          result.verdict === "AC" ? await calcXp(problem_id) : 0,
          result.verdict === "AC" ? 1 : 0,
          result.verdict === "AC" ? await calcXp(problem_id) : 0,
        ],
      );

      // Check achievements
      await checkAchievements(problem_id, result.verdict);
      invalidateCache();
    }

    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

app.post("/api/run", judgeLimiter, async (req, res) => {
  try {
    const { code, input, language } = req.body;
    const lang = LANG_CONFIG[language] ? language : "cpp";
    const result = await quickRun(code, input || "", lang);
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* ========== LANGUAGES ========== */
app.get("/api/languages", (req, res) => {
  // On the hosted server only languages with a remote sandbox can run.
  res.json(
    Object.entries(LANG_CONFIG).map(([id, cfg]) => ({
      id,
      ...cfg,
      available: REMOTE_ONLY ? hasRemote(id) : true,
    })),
  );
});

/* Admin: run a tiny program in every language through the real judge.
   GET /api/admin/judge-selftest?langs=cpp,python  (all languages when omitted) */
app.get("/api/admin/judge-selftest", requireAdmin, async (req, res) => {
  try {
    const { selfTest } = require("./judge-selftest");
    const only = typeof req.query.langs === "string" && req.query.langs ? req.query.langs.split(",") : null;
    const results = await selfTest({ judge, LANG_CONFIG, hasRemote, REMOTE_ONLY }, only);
    res.json({ ok: true, remote: REMOTE_ONLY, passed: results.filter((r) => r.ok).length, total: results.length, results });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* ========== STATS ========== */
app.get("/api/stats", async (req, res) => {
  try {
    const result = await cachedResponse("stats", 3000, async () => {
      // Batch core counts into a single query
      const counts = await get(`SELECT
      (SELECT COUNT(*) FROM problems) as total,
      (SELECT COUNT(*) FROM progress WHERE username=${meSql()} AND status='solved') as solved,
      (SELECT COUNT(*) FROM progress WHERE username=${meSql()} AND status='attempted') as attempted,
      (SELECT COALESCE(SUM(xp_earned),0) FROM progress WHERE username=${meSql()}) as totalXp,
      (SELECT COUNT(*) FROM submissions WHERE username=${meSql()}) as submissions,
      (SELECT COUNT(*) FROM submissions WHERE username=${meSql()} AND verdict='AC') as acCount`);
      let {
        total,
        solved,
        attempted,
        totalXp,
        submissions: submissionCount,
        acCount,
      } = counts;
      const accuracy =
        submissionCount > 0 ? Math.round((acCount / submissionCount) * 100) : 0;

      // Apply admin overrides for the signed-in user
      const username = me();
      if (username) {
        const user = await get(
          "SELECT xp_override, solved_override, role FROM users WHERE username=?",
          [username],
        );
        if (user) {
          totalXp += user.xp_override || 0;
          solved += user.solved_override || 0;
        }
      }

      // Parallel independent queries
      const [
        ratingDist,
        platformDist,
        streak,
        heatmap,
        recent,
        achievements,
        verdicts,
        dailyChallenges,
      ] = await Promise.all([
        all(`SELECT
        CASE
          WHEN p.rating < 1000 THEN 'Newbie'
          WHEN p.rating < 1200 THEN 'Pupil'
          WHEN p.rating < 1400 THEN 'Specialist'
          WHEN p.rating < 1600 THEN 'Expert'
          WHEN p.rating < 1900 THEN 'Candidate Master'
          WHEN p.rating < 2100 THEN 'Master'
          ELSE 'Grandmaster'
        END as tier,
        COUNT(*) as count
        FROM progress pr JOIN problems p ON pr.problem_rowid=p.id WHERE pr.username=${meSql()} AND pr.status='solved'
        GROUP BY tier ORDER BY MIN(p.rating)`),
        all(`SELECT p.platform, COUNT(*) as count
        FROM progress pr JOIN problems p ON pr.problem_rowid=p.id WHERE pr.username=${meSql()} AND pr.status='solved'
        GROUP BY p.platform`),
        calcStreak(),
        all(`SELECT date, problems_solved, xp_earned FROM daily_activity
        WHERE username=${meSql()} AND date >= date('now','-365 days') ORDER BY date`),
        all(`SELECT s.id, s.verdict, s.exec_time_ms, s.submitted_at, p.title, p.problem_id, p.platform, p.rating
        FROM submissions s JOIN problems p ON s.problem_rowid=p.id WHERE s.username=${meSql()} ORDER BY s.submitted_at DESC LIMIT 15`),
        all(`${achievementsSql()} ORDER BY a.category, a.target`),
        all(
          `SELECT verdict, COUNT(*) as count FROM submissions WHERE username=${meSql()} GROUP BY verdict`,
        ),
        getDailyChallenges(),
      ]);

      // Level & Title (unified Rift Levels)
      const level = calcLevel(totalXp, solved);
      const title = getPlayerTitle(totalXp, solved);

      // All Rift Levels (for rank progression display)
      const allTitles = RIFT_LEVELS.map((r) => ({
        title: r.name,
        badge: r.badge,
        min_xp: r.xp,
        min_problems: r.minProblems,
        color: r.color,
        glow: r.glow,
      }));

      // Today's stats
      const today = new Date().toISOString().slice(0, 10);
      const todayStats = (await get(
        `SELECT COALESCE(problems_solved,0) as solved, COALESCE(problems_attempted,0) as attempted, COALESCE(xp_earned,0) as xp FROM daily_activity WHERE username=? AND date=?`,
        [me(), today],
      )) || { solved: 0, attempted: 0, xp: 0 };

      return {
        ok: true,
        total,
        solved,
        attempted,
        totalXp,
        submissions: submissionCount,
        ratingDist,
        platformDist,
        streak,
        level,
        title,
        heatmap,
        recent,
        achievements,
        verdicts,
        dailyChallenges,
        allTitles,
        todayStats,
        accuracy,
      };
    }); // end cachedResponse
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* ========== ROADMAP ========== */
app.get("/api/roadmap", async (req, res) => {
  try {
    let totalXp = (
      await get("SELECT COALESCE(SUM(xp_earned),0) as s FROM progress WHERE username=?", [me()])
    ).s;
    let totalSolved = (
      await get("SELECT COUNT(*) as c FROM progress WHERE username=? AND status='solved'", [me()])
    ).c;
    { const ov = await myOverrides(); totalXp += ov.xp; totalSolved += ov.solved; }
    const playerLevel = calcLevel(totalXp, totalSolved);

    const result = [];
    for (const rl of RIFT_LEVELS) {
      const problems = await all(
        `SELECT p.*, COALESCE(pr.status,'unsolved') as solve_status
        FROM problems p LEFT JOIN progress pr ON pr.problem_rowid=p.id AND pr.username=${meSql()}
        WHERE p.rating >= ? AND p.rating <= ? AND p.rating > 0
        ORDER BY p.rating ASC, RANDOM() LIMIT 30`,
        [rl.minR, rl.maxR],
      );

      const solvedCount = problems.filter(
        (p) => p.solve_status === "solved",
      ).length;
      const isCurrentOrPast = playerLevel.level >= rl.level;
      const isNext = playerLevel.level === rl.level - 1;

      result.push({
        level: rl.level,
        title: rl.name,
        subtitle: `Rating ${rl.minR}–${rl.maxR}`,
        minR: rl.minR,
        maxR: rl.maxR,
        count: 30,
        xpRequired: rl.xp,
        probsRequired: rl.minProblems,
        color: rl.color,
        glow: rl.glow,
        problems,
        solvedCount,
        totalCount: problems.length,
        completed: solvedCount >= problems.length && isCurrentOrPast,
        unlocked: isCurrentOrPast || isNext || solvedCount > 0,
        progress: problems.length
          ? Math.round((solvedCount / problems.length) * 100)
          : 0,
      });
    }

    res.json({ ok: true, levels: result });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* ========== CONTESTS ========== */
// Contest lists change rarely; cache them so every page view doesn't hit
// Codeforces/CodeChef (they rate-limit) and one slow site can't break the page.
let _contestCache = { at: 0, contests: null };
const CONTEST_TTL_MS = 10 * 60 * 1000;
app.get("/api/contests", async (req, res) => {
  try {
    if (_contestCache.contests && Date.now() - _contestCache.at < CONTEST_TTL_MS) {
      return res.json({ ok: true, contests: _contestCache.contests, cached: true });
    }
    const [cfR, ccR] = await Promise.allSettled([
      fetchCodeforcesContests(),
      fetchCodechefContests(),
    ]);
    const cf = cfR.status === "fulfilled" ? cfR.value : [];
    const cc = ccR.status === "fulfilled" ? ccR.value : [];
    const all = [...cf, ...cc].sort((a, b) => {
      const order = {
        RUNNING: 0,
        CODING: 0,
        BEFORE: 1,
        PENDING: 1,
        FINISHED: 2,
      };
      return (
        (order[a.phase] ?? 2) - (order[b.phase] ?? 2) ||
        (a.startTime || 0) - (b.startTime || 0)
      );
    });
    // Keep serving the last good list if both sources failed this time.
    if (all.length) _contestCache = { at: Date.now(), contests: all };
    res.json({ ok: true, contests: all.length ? all : _contestCache.contests || [] });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* ========== SETTINGS ========== */
app.get("/api/settings", async (req, res) => {
  try {
    // Site-wide values (username '') first, then the user's own on top.
    const rows = await all(
      "SELECT username, key, value FROM settings WHERE (username='' AND key NOT LIKE 'stmt\\_%' ESCAPE '\\' AND key<>'peruser_migrated') OR username=? ORDER BY username=''  DESC",
      [me()],
    );
    const settings = {};
    for (const r of rows) settings[r.key] = r.value;
    res.json({ ok: true, settings });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

app.post("/api/settings", async (req, res) => {
  try {
    // Personal settings only (handles, layout…); keys/values are size-capped.
    for (const [key, value] of Object.entries(req.body || {}).slice(0, 50)) {
      if (!/^[a-z0-9_]{1,64}$/i.test(key) || key.startsWith("stmt_") || key === "last_sync") continue;
      await run("INSERT OR REPLACE INTO settings(username,key,value) VALUES(?,?,?)", [
        me(),
        key,
        String(value).slice(0, 4000),
      ]);
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* ========== RESET PROGRESS ========== */
app.post("/api/reset-progress", async (req, res) => {
  try {
    // Resets only the signed-in user's own progress.
    const u = me();
    await run("DELETE FROM progress WHERE username=?", [u]);
    await run("DELETE FROM code_replays WHERE username=?", [u]);
    await run("DELETE FROM submissions WHERE username=?", [u]);
    await run("DELETE FROM daily_activity WHERE username=?", [u]);
    await run("DELETE FROM user_achievements WHERE username=?", [u]);
    await run("DELETE FROM user_daily_challenges WHERE username=?", [u]);
    invalidateCache();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* ========== SYNC SOLVED ========== */
app.post("/api/sync-solved", async (req, res) => {
  try {
    const cfHandle = (
      await get("SELECT value FROM settings WHERE username=? AND key='cf_handle'", [me()])
    )?.value;
    if (!cfHandle)
      return res.json({ ok: true, synced: 0, message: "No CF handle set" });

    const solvedIds = await fetchCodeforcesSolved(cfHandle);
    let synced = 0;
    for (const pid of solvedIds) {
      const prob = await get(
        "SELECT id FROM problems WHERE platform='codeforces' AND problem_id=?",
        [pid],
      );
      if (!prob) continue;
      const existing = await get(
        "SELECT * FROM progress WHERE username=? AND problem_rowid=?",
        [me(), prob.id],
      );
      if (!existing) {
        const xp = await calcXp(prob.id);
        await run(
          `INSERT INTO progress(username,problem_rowid,status,attempts,solved_at,xp_earned) VALUES(?,?,?,?,?,?)`,
          [me(), prob.id, "solved", 1, new Date().toISOString(), xp],
        );
        synced++;
      } else if (existing.status !== "solved") {
        const xp = await calcXp(prob.id);
        await run(
          `UPDATE progress SET status='solved', solved_at=COALESCE(solved_at,?), xp_earned=? WHERE username=? AND problem_rowid=?`,
          [new Date().toISOString(), xp, me(), prob.id],
        );
        synced++;
      }
    }
    invalidateCache();
    res.json({ ok: true, synced, total: solvedIds.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* ========== TAGS ========== */
app.get("/api/tags", async (req, res) => {
  try {
    const rows = await all(
      "SELECT DISTINCT tags FROM problems WHERE tags != '[]' LIMIT 500",
    );
    const tagSet = new Set();
    for (const r of rows) {
      try {
        JSON.parse(r.tags).forEach((t) => tagSet.add(t));
      } catch {}
    }
    res.json({ ok: true, tags: [...tagSet].sort() });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* ========== HELPERS ========== */
async function calcXp(problemId) {
  const prob = await get("SELECT rating FROM problems WHERE id=?", [problemId]);
  if (!prob) return 10;
  const r = prob.rating || 800;
  if (r < 1000) return 10;
  if (r < 1200) return 15;
  if (r < 1400) return 25;
  if (r < 1600) return 40;
  if (r < 1800) return 60;
  if (r < 2000) return 80;
  if (r < 2200) return 100;
  return 150;
}

/* ── Unified Rift Levels — single progression system ──
   Each level gate requires 100+ NEW problems from the previous tier.
   XP thresholds are calibrated to roughly match solving that many
   problems at the tier's average XP value.
   Level-up breakdown (new problems required per jump):
     Bit→Byte        +100 probs   (total 100)
     Byte→Kilobyte   +120 probs   (total 220)
     Kilobyte→Mega   +160 probs   (total 380)
     Mega→Giga       +170 probs   (total 550)
     Giga→Tera       +200 probs   (total 750)
     Tera→Peta       +250 probs   (total 1,000)
     Peta→Exa        +350 probs   (total 1,350)
     Exa→Zetta       +450 probs   (total 1,800)
     Zetta→Yotta     +700 probs   (total 2,500)
     Yotta→∞         +1,000 probs (total 3,500)
*/
const RIFT_LEVELS = [
  {
    level: 1,
    name: "Bit",
    badge: "⚡",
    xp: 0,
    minProblems: 0,
    minR: 0,
    maxR: 800,
    color: "#6b7280",
    glow: "none",
  },
  {
    level: 2,
    name: "Byte",
    badge: "◆",
    xp: 800,
    minProblems: 100,
    minR: 800,
    maxR: 1000,
    color: "#84cc16",
    glow: "none",
  },
  {
    level: 3,
    name: "Kilobyte",
    badge: "◈",
    xp: 2000,
    minProblems: 220,
    minR: 1000,
    maxR: 1200,
    color: "#22c55e",
    glow: "0 0 6px rgba(34,197,94,0.3)",
  },
  {
    level: 4,
    name: "Megabyte",
    badge: "✦",
    xp: 4500,
    minProblems: 380,
    minR: 1200,
    maxR: 1400,
    color: "#06b6d4",
    glow: "0 0 8px rgba(6,182,212,0.3)",
  },
  {
    level: 5,
    name: "Gigabyte",
    badge: "★",
    xp: 9000,
    minProblems: 550,
    minR: 1400,
    maxR: 1600,
    color: "#3b82f6",
    glow: "0 0 10px rgba(59,130,246,0.4)",
  },
  {
    level: 6,
    name: "Terabyte",
    badge: "◉",
    xp: 18000,
    minProblems: 750,
    minR: 1600,
    maxR: 1800,
    color: "#8b5cf6",
    glow: "0 0 12px rgba(139,92,246,0.5)",
  },
  {
    level: 7,
    name: "Petabyte",
    badge: "♦",
    xp: 34000,
    minProblems: 1000,
    minR: 1800,
    maxR: 2000,
    color: "#d946ef",
    glow: "0 0 14px rgba(217,70,239,0.5)",
  },
  {
    level: 8,
    name: "Exabyte",
    badge: "✧",
    xp: 62000,
    minProblems: 1350,
    minR: 2000,
    maxR: 2200,
    color: "#f43f5e",
    glow: "0 0 16px rgba(244,63,94,0.6)",
  },
  {
    level: 9,
    name: "Zettabyte",
    badge: "⬡",
    xp: 107000,
    minProblems: 1800,
    minR: 2200,
    maxR: 2500,
    color: "#ef4444",
    glow: "0 0 18px rgba(239,68,68,0.6)",
  },
  {
    level: 10,
    name: "Yottabyte",
    badge: "♛",
    xp: 180000,
    minProblems: 2500,
    minR: 2500,
    maxR: 2800,
    color: "#f59e0b",
    glow: "0 0 22px rgba(245,158,11,0.7)",
  },
  {
    level: 11,
    name: "∞ Overflow",
    badge: "∞",
    xp: 310000,
    minProblems: 3500,
    minR: 2800,
    maxR: 3500,
    color: "#fbbf24",
    glow: "0 0 28px rgba(251,191,36,0.8)",
  },
];

/** Admin-granted XP/solve bonuses for the signed-in user (0 for most users). */
async function myOverrides() {
  const u = me();
  if (!u) return { xp: 0, solved: 0 };
  const row = await get("SELECT xp_override, solved_override FROM users WHERE username=?", [u]);
  return { xp: row?.xp_override || 0, solved: row?.solved_override || 0 };
}

function calcLevel(xp, solvedCount = 0) {
  let lvl = 1;
  for (let i = 1; i < RIFT_LEVELS.length; i++) {
    if (xp >= RIFT_LEVELS[i].xp && solvedCount >= RIFT_LEVELS[i].minProblems)
      lvl = i + 1;
  }
  const curr = RIFT_LEVELS[lvl - 1];
  const next = RIFT_LEVELS[lvl] || null;
  const xpInLevel = xp - curr.xp;
  const xpForNext = next ? next.xp - curr.xp : curr.xp;
  const probsInLevel = solvedCount - curr.minProblems;
  const probsForNext = next
    ? next.minProblems - curr.minProblems
    : curr.minProblems;
  return {
    level: lvl,
    xp,
    name: curr.name,
    badge: curr.badge,
    color: curr.color,
    glow: curr.glow,
    xpInLevel,
    xpForNext,
    probsInLevel,
    probsForNext,
    xpGated: next ? xp < next.xp : false,
    probGated: next ? solvedCount < next.minProblems : false,
  };
}

function _buildLastWeek(sevenDayRows) {
  const today = new Date();
  const lastWeek = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    const found = sevenDayRows.find((r) => r.date === ds);
    lastWeek.push({ date: ds, solved: found ? found.problems_solved : 0 });
  }
  return lastWeek;
}

async function calcStreak(username = me()) {
  // Current streak: only need recent consecutive days, not entire table
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // Last 7 days for the streak calendar widget
  const sevenDayRows = await all(
    "SELECT date, problems_solved FROM daily_activity WHERE username=? AND date >= date('now','-6 days') ORDER BY date ASC",
    [username],
  );
  const lastWeek = _buildLastWeek(sevenDayRows);

  // Fetch only last 400 days (more than enough for any reasonable streak)
  const rows = await all(
    "SELECT date FROM daily_activity WHERE username=? AND problems_solved > 0 AND date >= date('now','-400 days') ORDER BY date DESC",
    [username],
  );
  if (!rows.length) return { current: 0, best: 0, lastWeek };

  let current = 0;
  let prev = null;
  for (const r of rows) {
    if (!prev) {
      if (r.date === today || r.date === yesterday) {
        current = 1;
        prev = r.date;
      } else break;
    } else {
      const diff = (new Date(prev) - new Date(r.date)) / 86400000;
      if (diff === 1) {
        current++;
        prev = r.date;
      } else break;
    }
  }

  // Best streak in single pass
  let best = current;
  let streak = 1;
  for (let i = 1; i < rows.length; i++) {
    const diff =
      (new Date(rows[i - 1].date) - new Date(rows[i].date)) / 86400000;
    if (diff === 1) {
      streak++;
      if (streak > best) best = streak;
    } else streak = 1;
  }
  if (streak > best) best = streak;

  return { current, best, lastWeek };
}

async function checkAchievements(problemId, verdict, { backfill = false } = {}) {
  if (verdict !== "AC") return;
  const u = me();
  if (!u) return;
  const now = new Date().toISOString();
  const hour = new Date().getHours();
  const today = now.slice(0, 10);

  // Record progress for one achievement for this user; unlock (once) when
  // progress reaches `target` (defaults to the achievement's own target).
  const award = async (id, progress, target = null) => {
    const def = await get("SELECT target FROM achievements WHERE id=?", [id]);
    if (!def) return;
    const goal = target ?? def.target ?? 1;
    const p = Math.min(progress, goal);
    await run(
      `INSERT INTO user_achievements(username, achievement_id, progress, unlocked_at)
       VALUES(?,?,?,?)
       ON CONFLICT(username, achievement_id) DO UPDATE SET
         progress = MAX(user_achievements.progress, excluded.progress),
         unlocked_at = COALESCE(user_achievements.unlocked_at, excluded.unlocked_at)`,
      [u, id, p, progress >= goal ? now : null],
    );
  };

  const solved = (
    await get("SELECT COUNT(*) as c FROM progress WHERE username=? AND status='solved'", [u])
  ).c;
  const prob = await get("SELECT * FROM problems WHERE id=?", [problemId]);

  // Solve milestones + first blood
  for (const [id, target] of Object.entries({ solve_10: 10, solve_50: 50, solve_100: 100, solve_500: 500 })) {
    await award(id, solved, target);
  }
  if (solved >= 1) await award("first_blood", 1, 1);

  // Perfect score (first attempt AC)
  const existing = await get(
    "SELECT attempts FROM progress WHERE username=? AND problem_rowid=?",
    [u, problemId],
  );
  if (existing && existing.attempts <= 1) await award("perfect_score", 1, 1);

  // Night owl (midnight–4am) / early bird (5–7am) — only for a live solve
  if (!backfill && hour >= 0 && hour < 4) await award("night_owl", 1, 1);
  if (!backfill && hour >= 5 && hour < 7) await award("early_bird", 1, 1);

  // Marathon (5 in a day)
  const todaySolved =
    (await get(
      "SELECT COALESCE(problems_solved,0) as c FROM daily_activity WHERE username=? AND date=?",
      [u, today],
    ))?.c || 0;
  if (todaySolved >= 1) await award("marathon", todaySolved, 5);

  // Tag master (10 distinct tags solved)
  const tagRows = await all(
    `SELECT DISTINCT p.tags FROM progress pr JOIN problems p ON pr.problem_rowid=p.id
     WHERE pr.username=? AND pr.status='solved' AND p.tags != '[]'`,
    [u],
  );
  const uniqueTags = new Set();
  for (const r of tagRows) {
    try {
      JSON.parse(r.tags).forEach((t) => uniqueTags.add(t));
    } catch {}
  }
  if (uniqueTags.size) await award("tag_master", uniqueTags.size, 10);

  // Today's daily challenge → per-user completion + bonus XP
  const dailyChallenge = backfill ? null : await get(
    `SELECT dc.* FROM daily_challenges dc
     LEFT JOIN user_daily_challenges udc ON udc.challenge_id = dc.id AND udc.username = ?
     WHERE dc.date=? AND dc.problem_rowid=? AND udc.challenge_id IS NULL`,
    [u, today, problemId],
  );
  if (dailyChallenge) {
    await run(
      "INSERT OR IGNORE INTO user_daily_challenges(username, challenge_id, completed_at) VALUES(?,?,?)",
      [u, dailyChallenge.id, now],
    );
    await run(
      "UPDATE progress SET xp_earned=xp_earned+? WHERE username=? AND problem_rowid=?",
      [dailyChallenge.bonus_xp, u, problemId],
    );
  }
  const completedDailies =
    (await get("SELECT COUNT(*) as c FROM user_daily_challenges WHERE username=?", [u]))?.c || 0;
  if (completedDailies) await award("daily_warrior", completedDailies, 7);

  // Rating achievements
  for (const r of [1000, 1400, 1800, 2100]) {
    if (prob && prob.rating >= r) await award(`rating_${r}`, 1, 1);
  }

  // Both platforms
  const plat = await all(
    `SELECT p.platform, COUNT(*) as c FROM progress pr JOIN problems p ON pr.problem_rowid=p.id
     WHERE pr.username=? AND pr.status='solved' AND p.platform IN ('codeforces','codechef')
     GROUP BY p.platform`,
    [u],
  );
  if (plat.length === 2) await award("both_platforms", 2, 2);

  // Streaks
  const { current } = await calcStreak(u);
  for (const t of [3, 7, 30]) if (current >= 1) await award(`streak_${t}`, current, t);
}

function getPlayerTitle(xp, solvedCount = 0) {
  const lvlData = calcLevel(xp, solvedCount);
  const curr = RIFT_LEVELS[lvlData.level - 1];
  const next = RIFT_LEVELS[lvlData.level] || null;
  return {
    current: {
      title: curr.name,
      badge: curr.badge,
      min_xp: curr.xp,
      color: curr.color,
      glow: curr.glow,
    },
    next: next
      ? {
          title: next.name,
          badge: next.badge,
          min_xp: next.xp,
          min_problems: next.minProblems,
          color: next.color,
          glow: next.glow,
        }
      : null,
    xpToNext: next ? Math.max(0, next.xp - xp) : 0,
    probsToNext: next ? Math.max(0, next.minProblems - solvedCount) : 0,
  };
}

async function getDailyChallenges() {
  const today = new Date().toISOString().slice(0, 10);

  // Check if today's challenges exist
  const existing = await all(
      `SELECT dc.id, dc.date, dc.problem_rowid, dc.difficulty, dc.bonus_xp,
      CASE WHEN udc.challenge_id IS NULL THEN 0 ELSE 1 END AS completed, udc.completed_at,
      p.title, p.problem_id, p.platform, p.rating, p.url, p.tags
    FROM daily_challenges dc JOIN problems p ON dc.problem_rowid=p.id
    LEFT JOIN user_daily_challenges udc ON udc.challenge_id = dc.id AND udc.username = ${meSql()}
    WHERE dc.date=? ORDER BY dc.difficulty`,
    [today],
  );

  if (existing.length >= 3) return existing;

  // Generate 3 daily challenges (easy, medium, hard)
  const difficulties = [
    { label: "easy", minR: 800, maxR: 1100, bonus: 25 },
    { label: "medium", minR: 1200, maxR: 1600, bonus: 50 },
    { label: "hard", minR: 1700, maxR: 2400, bonus: 100 },
  ];

  const challenges = [];
  for (const diff of difficulties) {
    const prob = await get(
      // Same three picks for everyone each day (a shared daily challenge).
      `SELECT p.* FROM problems p
       WHERE p.rating >= ? AND p.rating <= ? AND p.rating > 0
       ORDER BY RANDOM() LIMIT 1`,
      [diff.minR, diff.maxR],
    );
    if (prob) {
      await run(
        `INSERT OR IGNORE INTO daily_challenges(date,problem_rowid,difficulty,bonus_xp) VALUES(?,?,?,?)`,
        [today, prob.id, diff.label, diff.bonus],
      );
      challenges.push({
        ...prob,
        difficulty: diff.label,
        bonus_xp: diff.bonus,
        completed: 0,
        completed_at: null,
        date: today,
      });
    }
  }

  // Return fresh or combined
  if (challenges.length) {
    return await all(
      `SELECT dc.id, dc.date, dc.problem_rowid, dc.difficulty, dc.bonus_xp,
      CASE WHEN udc.challenge_id IS NULL THEN 0 ELSE 1 END AS completed, udc.completed_at,
      p.title, p.problem_id, p.platform, p.rating, p.url, p.tags
    FROM daily_challenges dc JOIN problems p ON dc.problem_rowid=p.id
    LEFT JOIN user_daily_challenges udc ON udc.challenge_id = dc.id AND udc.username = ${meSql()}
    WHERE dc.date=? ORDER BY dc.difficulty`,
      [today],
    );
  }
  return [];
}

/* ========== AI OPPONENT ========== */
app.post("/api/ai-battle/start", async (req, res) => {
  try {
    const { problem_id } = req.body;
    const prob = await get("SELECT * FROM problems WHERE id=?", [problem_id]);
    if (!prob) return res.status(404).json({ ok: false, error: "Not found" });
    const r = prob.rating || 800;
    let baseTime;
    if (r < 1000) baseTime = 180000 + Math.random() * 300000;
    else if (r < 1200) baseTime = 300000 + Math.random() * 420000;
    else if (r < 1400) baseTime = 480000 + Math.random() * 720000;
    else if (r < 1600) baseTime = 720000 + Math.random() * 1080000;
    else if (r < 1800) baseTime = 900000 + Math.random() * 1500000;
    else baseTime = 1200000 + Math.random() * 2400000;
    const aiTime = Math.round(baseTime * (0.7 + Math.random() * 0.6));
    const ins = await run(
      "INSERT INTO ai_battles(username, problem_rowid, ai_time_ms, played_at) VALUES(?,?,?,?)",
      [me(), problem_id, aiTime, new Date().toISOString()],
    );
    const battle = { id: ins.lastID };
    res.json({ ok: true, battleId: battle.id, aiTimeMs: aiTime, rating: r });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});
app.post("/api/ai-battle/complete", async (req, res) => {
  try {
    const { battleId, playerTimeMs, won } = req.body;
    await run(
      "UPDATE ai_battles SET player_time_ms=?, player_won=? WHERE id=? AND username=?",
      [playerTimeMs, won ? 1 : 0, battleId, me()],
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});
app.get("/api/ai-battles/:problemId", async (req, res) => {
  try {
    const battles = await all(
      "SELECT * FROM ai_battles WHERE username=? AND problem_rowid=? ORDER BY played_at DESC LIMIT 10",
      [me(), req.params.problemId],
    );
    const stats = await get(
      "SELECT COUNT(*) as total, SUM(player_won) as wins FROM ai_battles WHERE username=? AND problem_rowid=?",
      [me(), req.params.problemId],
    );
    res.json({
      ok: true,
      battles,
      wins: stats?.wins || 0,
      total: stats?.total || 0,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* ========== DECOMPOSITION NOTES ========== */
app.get("/api/decomposition/:problemId", async (req, res) => {
  try {
    const note = await get(
      "SELECT * FROM decomposition_notes WHERE username=? AND problem_rowid=?",
      [me(), req.params.problemId],
    );
    res.json({
      ok: true,
      note: note || {
        approach: "",
        brute_force: "",
        optimization: "",
        data_structures: "",
        edge_cases: "",
      },
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});
app.post("/api/decomposition", async (req, res) => {
  try {
    const {
      problem_id,
      approach,
      brute_force,
      optimization,
      data_structures,
      edge_cases,
    } = req.body;
    await run(
      `INSERT INTO decomposition_notes(username, problem_rowid, approach, brute_force, optimization, data_structures, edge_cases, updated_at)
      VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(username, problem_rowid) DO UPDATE SET
      approach=excluded.approach, brute_force=excluded.brute_force, optimization=excluded.optimization,
      data_structures=excluded.data_structures, edge_cases=excluded.edge_cases, updated_at=excluded.updated_at`,
      [
        me(),
        problem_id,
        approach || "",
        brute_force || "",
        optimization || "",
        data_structures || "",
        edge_cases || "",
        new Date().toISOString(),
      ],
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* ========== CODE REPLAY ========== */
app.post("/api/code-replay", async (req, res) => {
  try {
    const { submission_id, events, duration_ms } = req.body;
    // Only attach replays to your own submissions.
    const own = await get("SELECT id FROM submissions WHERE id=? AND username=?", [submission_id, me()]);
    if (!own) return res.status(403).json({ ok: false, error: "Not your submission" });
    await run(
      "INSERT INTO code_replays(username, submission_id, events, duration_ms, created_at) VALUES(?,?,?,?,?)",
      [
        me(),
        submission_id,
        JSON.stringify(events),
        duration_ms || 0,
        new Date().toISOString(),
      ],
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});
app.get("/api/code-replay/:submissionId", async (req, res) => {
  try {
    const replay = await get(
      "SELECT * FROM code_replays WHERE submission_id=? AND username=?",
      [req.params.submissionId, me()],
    );
    if (!replay) return res.json({ ok: false, error: "No replay" });
    res.json({
      ok: true,
      replay: { ...replay, events: JSON.parse(replay.events || "[]") },
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* ========== ADVANCED PERFORMANCE ANALYTICS ========== */
app.get("/api/performance", async (req, res) => {
  try {
    const result = await cachedResponse("performance", 3000, async () => {
      /* ── Batch core counts into single query ── */
      const counts = await get(`SELECT
      (SELECT COUNT(*) FROM problems) as total,
      (SELECT COUNT(*) FROM progress WHERE username=${meSql()} AND status='solved') as solved,
      (SELECT COUNT(*) FROM progress WHERE username=${meSql()} AND status='attempted') as attempted,
      (SELECT COALESCE(SUM(xp_earned),0) FROM progress WHERE username=${meSql()}) as totalXp,
      (SELECT COUNT(*) FROM submissions WHERE username=${meSql()}) as submissions,
      (SELECT COUNT(*) FROM submissions WHERE username=${meSql()} AND verdict='AC') as acCount`);
      const { total, attempted, submissions, acCount } = counts;
      // Include admin bonuses so every page shows the same level as the Hub.
      const ov = await myOverrides();
      const totalXp = counts.totalXp + ov.xp;
      const solved = counts.solved + ov.solved;
      const accuracy =
        submissions > 0 ? Math.round((acCount / submissions) * 100) : 0;

      /* ── Parallel independent queries (all at once) ── */
      const today = new Date().toISOString().slice(0, 10);
      const [
        streak,
        ratingDist,
        platformDist,
        verdicts,
        heatmap,
        recent,
        ratingClimb,
        solveSpeed,
        langUsage,
        weeklyProgress,
        solvedTags,
        attemptedTags,
        hourDist,
        hardestSolved,
        mostAttempted,
        firstSolves,
        todayStats,
      ] = await Promise.all([
        calcStreak(),
        all(`SELECT
        CASE WHEN p.rating<1000 THEN 'Newbie' WHEN p.rating<1200 THEN 'Pupil'
          WHEN p.rating<1400 THEN 'Specialist' WHEN p.rating<1600 THEN 'Expert'
          WHEN p.rating<1900 THEN 'Candidate Master' WHEN p.rating<2100 THEN 'Master'
          ELSE 'Grandmaster' END as tier,
        COUNT(*) as count FROM progress pr JOIN problems p ON pr.problem_rowid=p.id AND pr.username=${meSql()}
        WHERE pr.status='solved' GROUP BY tier ORDER BY MIN(p.rating)`),
        all(`SELECT p.platform, COUNT(*) as count
        FROM progress pr JOIN problems p ON pr.problem_rowid=p.id AND pr.username=${meSql()} WHERE pr.status='solved' GROUP BY p.platform`),
        all(
          `SELECT verdict, COUNT(*) as count FROM submissions WHERE username=${meSql()} GROUP BY verdict`,
        ),
        all(`SELECT date, problems_solved, xp_earned FROM daily_activity WHERE username=${meSql()} AND date >= date('now','-365 days') ORDER BY date`),
        all(`SELECT s.id, s.verdict, s.exec_time_ms, s.memory_kb, s.submitted_at, s.language,
        p.title, p.problem_id, p.platform, p.rating, p.tags
        FROM submissions s JOIN problems p ON s.problem_rowid=p.id AND s.username=${meSql()} ORDER BY s.submitted_at DESC LIMIT 20`),
        all(`SELECT p.rating, pr.solved_at as date
        FROM progress pr JOIN problems p ON pr.problem_rowid=p.id AND pr.username=${meSql()}
        WHERE pr.status='solved' AND p.rating > 0 AND pr.solved_at IS NOT NULL
        ORDER BY pr.solved_at ASC`),
        all(`SELECT
        CASE WHEN p.rating<1000 THEN '800-999' WHEN p.rating<1200 THEN '1000-1199'
          WHEN p.rating<1400 THEN '1200-1399' WHEN p.rating<1600 THEN '1400-1599'
          WHEN p.rating<1800 THEN '1600-1799' WHEN p.rating<2000 THEN '1800-1999'
          WHEN p.rating<2200 THEN '2000-2199' WHEN p.rating<2500 THEN '2200-2499'
          ELSE '2500+' END as bracket,
        ROUND(AVG(pr.attempts),1) as avgAttempts,
        COUNT(*) as count,
        ROUND(AVG(pr.time_spent)/60.0,1) as avgMinutes
        FROM progress pr JOIN problems p ON pr.problem_rowid=p.id AND pr.username=${meSql()}
        WHERE pr.status='solved' AND p.rating>0
        GROUP BY bracket ORDER BY MIN(p.rating)`),
        all(`SELECT language, COUNT(*) as count,
        SUM(CASE WHEN verdict='AC' THEN 1 ELSE 0 END) as acCount
        FROM submissions WHERE username=${meSql()} GROUP BY language ORDER BY count DESC`),
        all(`SELECT
        strftime('%Y-W%W', date) as week,
        SUM(problems_solved) as solved,
        SUM(xp_earned) as xp,
        COUNT(*) as activeDays
        FROM daily_activity WHERE username=${meSql()} AND date >= date('now','-84 days')
        GROUP BY week ORDER BY week`),
        all(
          `SELECT p.tags, p.rating FROM progress pr JOIN problems p ON pr.problem_rowid=p.id AND pr.username=${meSql()} WHERE pr.status='solved' AND p.tags!='[]'`,
        ),
        all(
          `SELECT p.tags FROM progress pr JOIN problems p ON pr.problem_rowid=p.id AND pr.username=${meSql()} WHERE pr.status='attempted' AND p.tags!='[]'`,
        ),
        all(`SELECT
        CAST(strftime('%H', submitted_at) AS INTEGER) as hour,
        COUNT(*) as total,
        SUM(CASE WHEN verdict='AC' THEN 1 ELSE 0 END) as ac
        FROM submissions WHERE username=${meSql()} AND submitted_at IS NOT NULL
        GROUP BY hour ORDER BY hour`),
        all(`SELECT p.id, p.title, p.problem_id, p.platform, p.rating, pr.attempts, pr.solved_at
        FROM progress pr JOIN problems p ON pr.problem_rowid=p.id AND pr.username=${meSql()}
        WHERE pr.status='solved' AND p.rating>0
        ORDER BY p.rating DESC LIMIT 5`),
        all(`SELECT p.id, p.title, p.problem_id, p.platform, p.rating,
        pr.attempts, pr.status as solve_status
        FROM progress pr JOIN problems p ON pr.problem_rowid=p.id AND pr.username=${meSql()}
        WHERE pr.attempts >= 2
        ORDER BY pr.attempts DESC LIMIT 5`),
        all(`SELECT
        CASE WHEN p.rating<1000 THEN '< 1000' WHEN p.rating<1200 THEN '1000-1199'
          WHEN p.rating<1400 THEN '1200-1399' WHEN p.rating<1600 THEN '1400-1599'
          WHEN p.rating<1800 THEN '1600-1799' WHEN p.rating<2000 THEN '1800-1999'
          WHEN p.rating<2200 THEN '2000-2199' WHEN p.rating<2400 THEN '2200-2399'
          WHEN p.rating<2600 THEN '2400-2599' WHEN p.rating<2800 THEN '2600-2799'
          ELSE '2800+' END as bracket,
        MIN(pr.solved_at) as firstDate,
        p.title as firstTitle
        FROM progress pr JOIN problems p ON pr.problem_rowid=p.id AND pr.username=${meSql()}
        WHERE pr.status='solved' AND p.rating>0 AND pr.solved_at IS NOT NULL
        GROUP BY bracket ORDER BY MIN(p.rating)`),
        get(
          `SELECT COALESCE(problems_solved,0) as solved, COALESCE(problems_attempted,0) as attempted,
        COALESCE(xp_earned,0) as xp FROM daily_activity WHERE username=${meSql()} AND date=?`,
          [today],
        ),
      ]);

      const level = calcLevel(totalXp, solved);
      const allTitles = RIFT_LEVELS.map((r) => ({
        title: r.name,
        badge: r.badge,
        minXp: r.xp,
        minProblems: r.minProblems,
        color: r.color,
        glow: r.glow,
        level: r.level,
      }));
      const finalTodayStats = todayStats || { solved: 0, attempted: 0, xp: 0 };

      /* ── Tag performance (in-memory, fast) ── */
      const tagStats = {};
      for (const r of solvedTags) {
        try {
          JSON.parse(r.tags).forEach((t) => {
            if (!tagStats[t])
              tagStats[t] = { solved: 0, attempted: 0, ratings: [] };
            tagStats[t].solved++;
            tagStats[t].ratings.push(r.rating);
          });
        } catch {}
      }
      for (const r of attemptedTags) {
        try {
          JSON.parse(r.tags).forEach((t) => {
            if (!tagStats[t])
              tagStats[t] = { solved: 0, attempted: 0, ratings: [] };
            tagStats[t].attempted++;
          });
        } catch {}
      }
      const tagAnalysis = Object.entries(tagStats)
        .map(([tag, s]) => ({
          tag,
          solved: s.solved,
          attempted: s.attempted,
          total: s.solved + s.attempted,
          solveRate:
            s.solved + s.attempted > 0
              ? Math.round((s.solved / (s.solved + s.attempted)) * 100)
              : 0,
          maxRating: s.ratings.length ? Math.max(...s.ratings) : 0,
          avgRating: s.ratings.length
            ? Math.round(
                s.ratings.reduce((a, b) => a + b, 0) / s.ratings.length,
              )
            : 0,
        }))
        .filter((a) => a.total >= 2)
        .sort((a, b) => a.solveRate - b.solveRate);

      /* ── Recommended practice (weak areas) ── */
      const weakTags = tagAnalysis.filter((a) => a.solveRate < 70).slice(0, 5);
      const recommendations = [];
      for (const wt of weakTags) {
        const probs = await all(
          `SELECT p.id, p.title, p.problem_id, p.platform, p.rating, COALESCE(pr.status,'unsolved') as solve_status
        FROM problems p LEFT JOIN progress pr ON pr.problem_rowid=p.id AND pr.username=${meSql()}
        WHERE p.tags LIKE ? AND (pr.status IS NULL OR pr.status!='solved') AND p.rating>0
        ORDER BY p.rating ASC LIMIT 5`,
          [`%${wt.tag}%`],
        );
        if (probs.length)
          recommendations.push({
            tag: wt.tag,
            solveRate: wt.solveRate,
            problems: probs,
          });
      }

      /* ── Milestones & forecasting ── */
      const nextLevel = RIFT_LEVELS[level.level] || null;
      const avgDailyXp = heatmap.length
        ? Math.round(
            heatmap.reduce((s, d) => s + d.xp_earned, 0) /
              Math.max(heatmap.length, 1),
          )
        : 0;
      const avgDailySolves = heatmap.length
        ? +(
            heatmap.reduce((s, d) => s + d.problems_solved, 0) /
            Math.max(heatmap.length, 1)
          ).toFixed(1)
        : 0;
      const daysToNextLevel = nextLevel
        ? Math.max(
            level.xpGated
              ? Math.ceil((nextLevel.xp - totalXp) / Math.max(avgDailyXp, 1))
              : 0,
            level.probGated
              ? Math.ceil(
                  (nextLevel.minProblems - solved) /
                    Math.max(avgDailySolves, 0.1),
                )
              : 0,
          )
        : null;

      /* ── Consistency score (0-100) ── */
      const last30 = heatmap.slice(-30);
      const activeDays30 = last30.filter((d) => d.problems_solved > 0).length;
      const consistencyScore = Math.round((activeDays30 / 30) * 100);

      return {
        ok: true,
        total,
        solved,
        attempted,
        totalXp,
        submissions,
        accuracy,
        streak,
        level,
        allTitles,
        ratingDist,
        platformDist,
        verdicts,
        heatmap,
        recent,
        todayStats: finalTodayStats,
        ratingClimb,
        solveSpeed,
        langUsage,
        weeklyProgress,
        tagAnalysis,
        recommendations,
        nextLevel: nextLevel
          ? {
              level: nextLevel.level,
              name: nextLevel.name,
              color: nextLevel.color,
              xpNeeded: nextLevel.xp,
              probsNeeded: nextLevel.minProblems,
              daysEstimate: daysToNextLevel,
            }
          : null,
        avgDailyXp,
        avgDailySolves,
        consistencyScore,
        hourDist,
        hardestSolved,
        mostAttempted,
        firstSolves,
      };
    }); // end cachedResponse
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* ========== WEAKNESS ANALYSIS ========== */
app.get("/api/weakness-analysis", async (req, res) => {
  try {
    const solved = await all(
      `SELECT p.tags FROM progress pr JOIN problems p ON pr.problem_rowid=p.id AND pr.username=${meSql()} WHERE pr.status='solved' AND p.tags!='[]'`,
    );
    const attempted = await all(
      `SELECT p.tags FROM progress pr JOIN problems p ON pr.problem_rowid=p.id AND pr.username=${meSql()} WHERE pr.status='attempted' AND p.tags!='[]'`,
    );
    const tagStats = {};
    for (const r of solved) {
      try {
        JSON.parse(r.tags).forEach((t) => {
          if (!tagStats[t]) tagStats[t] = { solved: 0, attempted: 0 };
          tagStats[t].solved++;
        });
      } catch {}
    }
    for (const r of attempted) {
      try {
        JSON.parse(r.tags).forEach((t) => {
          if (!tagStats[t]) tagStats[t] = { solved: 0, attempted: 0 };
          tagStats[t].attempted++;
        });
      } catch {}
    }
    const analysis = Object.entries(tagStats)
      .map(([tag, s]) => ({
        tag,
        solved: s.solved,
        attempted: s.attempted,
        total: s.solved + s.attempted,
        solveRate:
          s.solved + s.attempted > 0
            ? Math.round((s.solved / (s.solved + s.attempted)) * 100)
            : 0,
        strength:
          s.solved >= 10 ? "strong" : s.solved >= 5 ? "moderate" : "weak",
      }))
      .filter((a) => a.total >= 2)
      .sort((a, b) => a.solveRate - b.solveRate);
    const weakTags = analysis.filter((a) => a.solveRate < 70).slice(0, 5);
    const recommendations = [];
    for (const wt of weakTags) {
      const probs = await all(
        `SELECT p.id, p.title, p.problem_id, p.platform, p.rating, COALESCE(pr.status,'unsolved') as solve_status
        FROM problems p LEFT JOIN progress pr ON pr.problem_rowid=p.id AND pr.username=${meSql()}
        WHERE p.tags LIKE ? AND (pr.status IS NULL OR pr.status!='solved') AND p.rating>0
        ORDER BY p.rating ASC LIMIT 5`,
        [`%${wt.tag}%`],
      );
      if (probs.length)
        recommendations.push({
          tag: wt.tag,
          solveRate: wt.solveRate,
          problems: probs,
        });
    }
    res.json({ ok: true, analysis, recommendations });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* ========== CUSTOM PROBLEMS (WORKSHOP) ========== */
app.get("/api/custom-problems", async (req, res) => {
  try {
    const problems = await all(
      "SELECT * FROM custom_problems ORDER BY created_at DESC",
    );
    res.json({ ok: true, problems });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});
app.get("/api/custom-problems/:id", async (req, res) => {
  try {
    const problem = await get("SELECT * FROM custom_problems WHERE id=?", [
      req.params.id,
    ]);
    if (!problem)
      return res.status(404).json({ ok: false, error: "Not found" });
    res.json({ ok: true, problem });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});
app.post("/api/custom-problems", async (req, res) => {
  try {
    const {
      title,
      statement,
      input_spec,
      output_spec,
      difficulty,
      tags,
      samples,
      testcases,
      time_limit,
      memory_limit,
    } = req.body;
    if (!title || typeof title !== "string")
      return res.status(400).json({ ok: false, error: "Title required" });
    const r = await run(
      `INSERT INTO custom_problems(title,statement,input_spec,output_spec,difficulty,tags,samples,testcases,time_limit,memory_limit,created_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
      [
        title,
        statement || "",
        input_spec || "",
        output_spec || "",
        difficulty || 1000,
        JSON.stringify(tags || []),
        JSON.stringify(samples || []),
        JSON.stringify(testcases || []),
        time_limit || "2 seconds",
        memory_limit || "256 MB",
        new Date().toISOString(),
      ],
    );
    res.json({ ok: true, id: r.lastID });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});
app.put("/api/custom-problems/:id", async (req, res) => {
  try {
    const {
      title,
      statement,
      input_spec,
      output_spec,
      difficulty,
      tags,
      samples,
      testcases,
      time_limit,
      memory_limit,
    } = req.body;
    await run(
      `UPDATE custom_problems SET title=?,statement=?,input_spec=?,output_spec=?,difficulty=?,
      tags=?,samples=?,testcases=?,time_limit=?,memory_limit=?,updated_at=? WHERE id=?`,
      [
        title,
        statement || "",
        input_spec || "",
        output_spec || "",
        difficulty || 1000,
        JSON.stringify(tags || []),
        JSON.stringify(samples || []),
        JSON.stringify(testcases || []),
        time_limit || "2 seconds",
        memory_limit || "256 MB",
        new Date().toISOString(),
        req.params.id,
      ],
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});
app.delete("/api/custom-problems/:id", async (req, res) => {
  try {
    await run("DELETE FROM custom_problems WHERE id=?", [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* ========== THE NEXUS — Unified Progression Tree ========== */
/*
 Each Rift Level is a "zone" containing topic-based skill branches.
 Skills have prerequisites within/across zones. The whole thing forms
 one large DAG — "The Nexus". Completing skill branches within a zone
 + meeting XP/problem-count gates unlocks the next zone.
*/
const NEXUS_NODES = [
  // ── Zone 1: Bit (Rating 0-800) ──
  {
    id: "bit_basics",
    zone: 1,
    name: "Fundamentals",
    icon: '<i class="icon-book"></i>',
    desc: "Implementation, simulation, basic I/O",
    tags: ["implementation", "math"],
    requires: [],
    target: 8,
    x: 50,
    y: 0,
    difficulty: [800, 1000],
    xpReward: 50,
    resources: [
      {
        title: "USACO Guide: Intro",
        url: "https://usaco.guide/general/intro-cp",
      },
      {
        title: "CF: Way to Practice",
        url: "https://codeforces.com/blog/entry/66909",
      },
    ],
  },

  // ── Zone 2: Byte (Rating 800-1000) ──
  {
    id: "byte_sorting",
    zone: 2,
    name: "Sorting",
    icon: '<i class="icon-chart"></i>',
    desc: "Comparison sorts, counting sort, custom comparators",
    tags: ["sortings"],
    requires: ["bit_basics"],
    target: 6,
    x: 20,
    y: 1,
    difficulty: [800, 1200],
    xpReward: 60,
    resources: [
      {
        title: "Sorting Algorithms",
        url: "https://usaco.guide/bronze/intro-sorting",
      },
    ],
  },
  {
    id: "byte_strings",
    zone: 2,
    name: "Strings",
    icon: '<i class="icon-abc"></i>',
    desc: "String manipulation, pattern matching, palindromes",
    tags: ["strings"],
    requires: ["bit_basics"],
    target: 6,
    x: 50,
    y: 1,
    difficulty: [800, 1200],
    xpReward: 60,
    resources: [
      {
        title: "String Basics",
        url: "https://usaco.guide/bronze/intro-complete",
      },
    ],
  },
  {
    id: "byte_brute",
    zone: 2,
    name: "Complete Search",
    icon: '<i class="icon-search"></i>',
    desc: "Enumeration, recursion, backtracking, pruning",
    tags: ["brute force", "constructive algorithms"],
    requires: ["bit_basics"],
    target: 6,
    x: 80,
    y: 1,
    difficulty: [800, 1200],
    xpReward: 60,
    resources: [
      {
        title: "Complete Search",
        url: "https://usaco.guide/bronze/intro-complete",
      },
    ],
  },

  // ── Zone 3: Kilobyte (Rating 1000-1200) ──
  {
    id: "kb_bsearch",
    zone: 3,
    name: "Binary Search",
    icon: '<i class="icon-search"></i>',
    desc: "Binary search on answers, two pointers, ternary search",
    tags: ["binary search", "two pointers"],
    requires: ["byte_sorting"],
    target: 6,
    x: 25,
    y: 2,
    difficulty: [1000, 1400],
    xpReward: 70,
    resources: [
      {
        title: "Binary Search Guide",
        url: "https://usaco.guide/silver/binary-search",
      },
    ],
  },
  {
    id: "kb_greedy",
    zone: 3,
    name: "Greedy",
    icon: '<i class="icon-coins"></i>',
    desc: "Exchange arguments, scheduling, interval problems",
    tags: ["greedy"],
    requires: ["byte_sorting"],
    target: 8,
    x: 50,
    y: 2,
    difficulty: [1000, 1400],
    xpReward: 80,
    resources: [
      {
        title: "Greedy Algorithms",
        url: "https://usaco.guide/bronze/intro-greedy",
      },
    ],
  },
  {
    id: "kb_prefix",
    zone: 3,
    name: "Prefix Sums",
    icon: '<i class="icon-trending"></i>',
    desc: "1D/2D prefix sums, difference arrays",
    tags: ["data structures", "math"],
    requires: ["bit_basics"],
    target: 6,
    x: 75,
    y: 2,
    difficulty: [1000, 1400],
    xpReward: 70,
    resources: [
      { title: "Prefix Sums", url: "https://usaco.guide/silver/prefix-sums" },
    ],
  },

  // ── Zone 4: Megabyte (Rating 1200-1400) ──
  {
    id: "mb_ntheory",
    zone: 4,
    name: "Number Theory",
    icon: '<i class="icon-hash"></i>',
    desc: "Primes, GCD, modular arithmetic, sieve",
    tags: ["number theory"],
    requires: ["bit_basics"],
    target: 6,
    x: 10,
    y: 3,
    difficulty: [1000, 1600],
    xpReward: 80,
    resources: [
      { title: "Number Theory", url: "https://usaco.guide/gold/divisibility" },
    ],
  },
  {
    id: "mb_dp",
    zone: 4,
    name: "DP Foundations",
    icon: '<i class="icon-puzzle"></i>',
    desc: "Fibonacci, knapsack, LIS, LCS, coin change",
    tags: ["dp"],
    requires: ["kb_bsearch", "byte_brute"],
    target: 10,
    x: 35,
    y: 3,
    difficulty: [1200, 1600],
    xpReward: 100,
    resources: [
      { title: "Intro to DP", url: "https://usaco.guide/gold/intro-dp" },
    ],
  },
  {
    id: "mb_graphs",
    zone: 4,
    name: "Graph Basics",
    icon: '<i class="icon-graph"></i>',
    desc: "BFS, DFS, connected components, bipartite check",
    tags: ["graphs", "dfs and similar", "bfs"],
    requires: ["byte_brute"],
    target: 8,
    x: 60,
    y: 3,
    difficulty: [1200, 1600],
    xpReward: 90,
    resources: [
      {
        title: "Graph Traversal",
        url: "https://usaco.guide/silver/graph-traversal",
      },
    ],
  },
  {
    id: "mb_dsu",
    zone: 4,
    name: "Disjoint Sets",
    icon: '<i class="icon-link"></i>',
    desc: "Union-Find, path compression, weighted DSU",
    tags: ["dsu"],
    requires: ["mb_graphs"],
    target: 6,
    x: 85,
    y: 3,
    difficulty: [1200, 1600],
    xpReward: 90,
    resources: [{ title: "DSU Guide", url: "https://usaco.guide/gold/dsu" }],
  },

  // ── Zone 5: Gigabyte (Rating 1400-1600) ──
  {
    id: "gb_adv_dp",
    zone: 5,
    name: "Advanced DP",
    icon: '<i class="icon-brain"></i>',
    desc: "Bitmask DP, digit DP, tree DP, DP on DAGs",
    tags: ["dp", "bitmasks"],
    requires: ["mb_dp", "mb_graphs"],
    target: 12,
    x: 15,
    y: 4,
    difficulty: [1400, 2000],
    xpReward: 150,
    resources: [
      { title: "Bitmask DP", url: "https://usaco.guide/gold/dp-bitmasks" },
    ],
  },
  {
    id: "gb_ds",
    zone: 5,
    name: "Data Structures",
    icon: '<i class="icon-building"></i>',
    desc: "Stacks, queues, sets, maps, priority queues, BIT",
    tags: ["data structures"],
    requires: ["kb_prefix", "byte_sorting"],
    target: 10,
    x: 40,
    y: 4,
    difficulty: [1400, 1800],
    xpReward: 120,
    resources: [{ title: "PURS Guide", url: "https://usaco.guide/gold/PURS" }],
  },
  {
    id: "gb_trees",
    zone: 5,
    name: "Trees",
    icon: '<i class="icon-tree"></i>',
    desc: "Tree traversal, LCA, diameter, Euler tour",
    tags: ["trees"],
    requires: ["mb_graphs"],
    target: 8,
    x: 65,
    y: 4,
    difficulty: [1400, 1800],
    xpReward: 110,
    resources: [
      { title: "Tree Algorithms", url: "https://usaco.guide/gold/tree-euler" },
    ],
  },
  {
    id: "gb_spaths",
    zone: 5,
    name: "Shortest Paths",
    icon: '<i class="icon-path"></i>',
    desc: "Dijkstra, Bellman-Ford, Floyd-Warshall, 0-1 BFS",
    tags: ["shortest paths", "graphs"],
    requires: ["mb_graphs", "mb_dp"],
    target: 8,
    x: 90,
    y: 4,
    difficulty: [1400, 2000],
    xpReward: 140,
    resources: [
      {
        title: "Shortest Paths",
        url: "https://usaco.guide/gold/shortest-paths",
      },
    ],
  },

  // ── Zone 6: Terabyte (Rating 1600-1800) ──
  {
    id: "tb_segtree",
    zone: 6,
    name: "Segment Tree",
    icon: '<i class="icon-pine"></i>',
    desc: "Range queries, lazy propagation, persistent seg tree",
    tags: ["data structures"],
    requires: ["gb_ds"],
    target: 10,
    x: 20,
    y: 5,
    difficulty: [1600, 2200],
    xpReward: 160,
    resources: [{ title: "PURS", url: "https://usaco.guide/plat/RURQ" }],
  },
  {
    id: "tb_combo",
    zone: 6,
    name: "Combinatorics",
    icon: '<i class="icon-dice"></i>',
    desc: "Permutations, binomial coefficients, inclusion-exclusion",
    tags: ["combinatorics", "math"],
    requires: ["mb_ntheory", "mb_dp"],
    target: 8,
    x: 50,
    y: 5,
    difficulty: [1600, 1800],
    xpReward: 110,
    resources: [
      { title: "Combinatorics", url: "https://usaco.guide/gold/combo" },
    ],
  },
  {
    id: "tb_stralgo",
    zone: 6,
    name: "String Algorithms",
    icon: '<i class="icon-abc"></i>',
    desc: "KMP, Z-function, hashing, suffix array basics",
    tags: ["string suffix structures", "hashing", "strings"],
    requires: ["byte_strings", "mb_dp"],
    target: 6,
    x: 80,
    y: 5,
    difficulty: [1600, 2200],
    xpReward: 150,
    resources: [
      {
        title: "String Hashing",
        url: "https://usaco.guide/gold/string-hashing",
      },
    ],
  },

  // ── Zone 7: Petabyte (Rating 1800-2000) ──
  {
    id: "pb_flows",
    zone: 7,
    name: "Network Flow",
    icon: '<i class="icon-water"></i>',
    desc: "Max flow, min cut, bipartite matching, Hungarian",
    tags: ["flows", "graph matchings"],
    requires: ["gb_spaths"],
    target: 6,
    x: 15,
    y: 6,
    difficulty: [1800, 2400],
    xpReward: 180,
    resources: [{ title: "Max Flow", url: "https://usaco.guide/adv/max-flow" }],
  },
  {
    id: "pb_game",
    zone: 7,
    name: "Game Theory",
    icon: '<i class="icon-gamepad"></i>',
    desc: "Sprague-Grundy, nim, minimax with alpha-beta",
    tags: ["games"],
    requires: ["mb_dp", "mb_ntheory"],
    target: 5,
    x: 45,
    y: 6,
    difficulty: [1800, 2200],
    xpReward: 140,
    resources: [
      { title: "Game Theory", url: "https://codeforces.com/blog/entry/66040" },
    ],
  },
  {
    id: "pb_adv_trees",
    zone: 7,
    name: "Advanced Trees",
    icon: '<i class="icon-leaf"></i>',
    desc: "HLD, centroid decomposition, link-cut trees",
    tags: ["trees", "data structures"],
    requires: ["gb_trees", "tb_segtree"],
    target: 8,
    x: 75,
    y: 6,
    difficulty: [2000, 2600],
    xpReward: 200,
    resources: [{ title: "HLD", url: "https://usaco.guide/plat/hld" }],
  },
  {
    id: "pb_geometry",
    zone: 7,
    name: "Geometry",
    icon: '<i class="icon-geometry"></i>',
    desc: "Convex hull, line intersection, polygon area",
    tags: ["geometry"],
    requires: ["byte_sorting", "mb_ntheory"],
    target: 6,
    x: 95,
    y: 6,
    difficulty: [1800, 2200],
    xpReward: 150,
    resources: [
      { title: "Geometry Guide", url: "https://usaco.guide/plat/geo-pri" },
    ],
  },

  // ── Zone 8: Exabyte (Rating 2000-2200) ──
  {
    id: "eb_fft",
    zone: 8,
    name: "FFT / NTT",
    icon: '<i class="icon-wave-line"></i>',
    desc: "Fast Fourier transform, polynomial multiplication",
    tags: ["fft", "math"],
    requires: ["mb_ntheory", "gb_adv_dp"],
    target: 5,
    x: 25,
    y: 7,
    difficulty: [2000, 2600],
    xpReward: 200,
    resources: [
      { title: "Convolutions", url: "https://usaco.guide/adv/convolutions" },
    ],
  },
  {
    id: "eb_dp_opt",
    zone: 8,
    name: "DP Optimization",
    icon: '<i class="icon-bolt"></i>',
    desc: "Divide & conquer DP, Knuth, CHT, aliens trick",
    tags: ["dp"],
    requires: ["gb_adv_dp", "tb_segtree"],
    target: 8,
    x: 55,
    y: 7,
    difficulty: [2200, 2800],
    xpReward: 220,
    resources: [
      { title: "DP Optimizations", url: "https://usaco.guide/adv/dp-more" },
    ],
  },
  {
    id: "eb_adv_graphs",
    zone: 8,
    name: "Advanced Graphs",
    icon: '<i class="icon-graph"></i>',
    desc: "2-SAT, block-cut tree, SCC, Euler paths",
    tags: ["graphs", "dfs and similar"],
    requires: ["mb_graphs", "gb_spaths"],
    target: 6,
    x: 85,
    y: 7,
    difficulty: [2000, 2600],
    xpReward: 180,
    resources: [],
  },

  // ── Zone 9: Zettabyte (Rating 2200-2500) ──
  {
    id: "zb_expert_ds",
    zone: 9,
    name: "Expert Structures",
    icon: '<i class="icon-building"></i>',
    desc: "Treap, splay, persistent structures, wavelet tree",
    tags: ["data structures"],
    requires: ["tb_segtree", "eb_dp_opt"],
    target: 8,
    x: 30,
    y: 8,
    difficulty: [2200, 2800],
    xpReward: 250,
    resources: [],
  },
  {
    id: "zb_expert_combo",
    zone: 9,
    name: "Expert Combinatorics",
    icon: '<i class="icon-dice"></i>',
    desc: "Generating functions, Burnside, Polya, formal power series",
    tags: ["combinatorics", "math"],
    requires: ["tb_combo", "eb_fft"],
    target: 6,
    x: 70,
    y: 8,
    difficulty: [2200, 2800],
    xpReward: 220,
    resources: [],
  },

  // ── Zone 10: Yottabyte (Rating 2500-2800) ──
  {
    id: "yb_expert_trees",
    zone: 10,
    name: "Expert Trees",
    icon: '<i class="icon-tree"></i>',
    desc: "Top tree, Euler tour tree, LCT applications",
    tags: ["trees", "data structures"],
    requires: ["pb_adv_trees", "zb_expert_ds"],
    target: 8,
    x: 30,
    y: 9,
    difficulty: [2500, 3000],
    xpReward: 300,
    resources: [],
  },
  {
    id: "yb_expert_math",
    zone: 10,
    name: "Expert Math",
    icon: '<i class="icon-hash"></i>',
    desc: "Elliptic curves, matroid intersection, multivariate polynomials",
    tags: ["math", "number theory"],
    requires: ["zb_expert_combo"],
    target: 6,
    x: 70,
    y: 9,
    difficulty: [2500, 3000],
    xpReward: 280,
    resources: [],
  },

  // ── Zone 11: ∞ Overflow (Rating 2800-3500) ──
  {
    id: "overflow_ascension",
    zone: 11,
    name: "Ascension",
    icon: '<i class="icon-crown"></i>',
    desc: "Solve elite problems across all domains — prove you have overflowed",
    tags: [],
    requires: ["pb_flows", "eb_fft", "eb_dp_opt", "yb_expert_trees"],
    target: 30,
    x: 50,
    y: 10,
    difficulty: [2800, 3500],
    xpReward: 500,
    resources: [],
  },
];

const ZONE_NAMES = [
  "",
  "Bit",
  "Byte",
  "Kilobyte",
  "Megabyte",
  "Gigabyte",
  "Terabyte",
  "Petabyte",
  "Exabyte",
  "Zettabyte",
  "Yottabyte",
  "∞ Overflow",
];

/* unified /api/nexus — replaces both /api/roadmap and /api/skill-tree */
app.get("/api/nexus", async (req, res) => {
  try {
    let totalXp = (
      await get(`SELECT COALESCE(SUM(xp_earned),0) as s FROM progress WHERE username=${meSql()}`)
    ).s;
    let totalSolved = (
      await get(`SELECT COUNT(*) as c FROM progress WHERE username=${meSql()} AND status='solved'`)
    ).c;
    const rawTotalSolved = totalSolved;
    { const ov = await myOverrides(); totalXp += ov.xp; totalSolved += ov.solved; }
    const playerLevel = calcLevel(totalXp, totalSolved);

    // Fetch all distinct solved problems and their tags in ONE query instead of 40+ round trips
    const solvedProblems = await all(
      `SELECT DISTINCT p.id, COALESCE(p.tags, '') as tags FROM progress pr JOIN problems p ON pr.problem_rowid=p.id AND pr.username=${meSql()} WHERE pr.status='solved'`
    );
    const solvedTagList = (solvedProblems || []).map((p) => (p.tags || "").toLowerCase());

    // Build skill nodes with progress
    const nodes = [];
    for (const skill of NEXUS_NODES) {
      let solvedCount = 0;
      if (skill.tags.length > 0) {
        const lowerTags = skill.tags.map((t) => t.toLowerCase());
        solvedCount = solvedTagList.filter((tags) =>
          lowerTags.some((t) => tags.includes(t))
        ).length;
      } else {
        solvedCount = rawTotalSolved || 0;
      }
      const prereqsMet =
        skill.requires.length === 0 ||
        skill.requires.every((rid) => {
          const req = nodes.find((n) => n.id === rid);
          return req && req.progress >= 100;
        });
      const zoneUnlocked = playerLevel.level >= skill.zone;
      // Zone 11 (∞ Overflow) unlocks all its nodes once the player reaches level 11
      const overflowUnlock = skill.zone === 11 && zoneUnlocked;
      const progress = Math.min(
        100,
        Math.round((solvedCount / skill.target) * 100),
      );
      nodes.push({
        ...skill,
        solved: Math.min(solvedCount, skill.target),
        progress,
        unlocked:
          overflowUnlock || (prereqsMet && zoneUnlocked) || progress > 0,
        completed: progress >= 100,
      });
    }

    // Build zones from RIFT_LEVELS
    const zones = RIFT_LEVELS.map((rl) => {
      const zoneNodes = nodes.filter((n) => n.zone === rl.level);
      const completedNodes = zoneNodes.filter((n) => n.completed).length;
      const totalNodes = zoneNodes.length;
      const zoneProgress =
        totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;
      return {
        level: rl.level,
        name: rl.name,
        color: rl.color,
        glow: rl.glow,
        xpRequired: rl.xp,
        probsRequired: rl.minProblems,
        minR: rl.minR,
        maxR: rl.maxR,
        unlocked: true, // all zones are always browsable
        locked: playerLevel.level < rl.level, // true = not yet reached (shows requirement banner)
        completed: playerLevel.level > rl.level && zoneProgress === 100,
        current: playerLevel.level === rl.level,
        nodeCount: totalNodes,
        nodesCompleted: completedNodes,
        zoneProgress,
      };
    });

    res.json({
      ok: true,
      nodes,
      zones,
      player: playerLevel,
      riftLevels: RIFT_LEVELS,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* ========== LEVEL ROADMAP — curated problems per level ========== */
const LEVEL_TOPICS = [
  // ── Level 1: Bit (0–800) ── Total: ~110 problems
  {
    level: 1,
    topics: [
      {
        name: "Implementation Basics",
        tags: ["implementation"],
        count: 20,
        desc: "Basic coding, simulation, and following instructions",
      },
      {
        name: "Math Foundations",
        tags: ["math"],
        count: 18,
        desc: "Simple arithmetic, divisibility, and number properties",
      },
      {
        name: "String Manipulation",
        tags: ["strings"],
        count: 15,
        desc: "Character processing, substrings, and parsing",
      },
      {
        name: "Brute Force",
        tags: ["brute force"],
        count: 18,
        desc: "Exhaustive search, trying all possibilities",
      },
      {
        name: "Greedy Intro",
        tags: ["greedy"],
        count: 15,
        desc: "Making locally optimal choices",
      },
      {
        name: "Sorting Basics",
        tags: ["sortings"],
        count: 12,
        desc: "Simple sorting and ordering",
      },
      {
        name: "Constructive Basics",
        tags: ["constructive algorithms"],
        count: 12,
        desc: "Building valid solutions step by step",
      },
    ],
  },
  // ── Level 2: Byte (800–1000) ── Total: ~110 problems
  {
    level: 2,
    topics: [
      {
        name: "Greedy Strategies",
        tags: ["greedy"],
        count: 18,
        desc: "Exchange arguments, scheduling, interval selection",
      },
      {
        name: "Sorting & Ordering",
        tags: ["sortings"],
        count: 15,
        desc: "Comparison sorts, custom comparators, multi-key sorting",
      },
      {
        name: "Constructive Algorithms",
        tags: ["constructive algorithms"],
        count: 15,
        desc: "Building valid solutions via invariants",
      },
      {
        name: "Implementation Practice",
        tags: ["implementation"],
        count: 15,
        desc: "Moderate simulation and case handling",
      },
      {
        name: "Math & Logic",
        tags: ["math"],
        count: 15,
        desc: "Pattern recognition, parity, modular arithmetic basics",
      },
      {
        name: "String Processing",
        tags: ["strings"],
        count: 12,
        desc: "Palindromes, substrings, frequency counting",
      },
      {
        name: "Brute Force & Enumeration",
        tags: ["brute force"],
        count: 12,
        desc: "Smart enumeration and pruning",
      },
      {
        name: "Number Theory Intro",
        tags: ["number theory"],
        count: 8,
        desc: "GCD, primes intro, divisibility",
      },
    ],
  },
  // ── Level 3: Kilobyte (1000–1200) ── Total: ~110 problems
  {
    level: 3,
    topics: [
      {
        name: "Dynamic Programming Intro",
        tags: ["dp"],
        count: 18,
        desc: "Fibonacci, knapsack, LIS, coin change",
      },
      {
        name: "Binary Search",
        tags: ["binary search"],
        count: 15,
        desc: "Search on sorted arrays and answer spaces",
      },
      {
        name: "Greedy Advanced",
        tags: ["greedy"],
        count: 14,
        desc: "Complex greedy with proof of correctness",
      },
      {
        name: "Two Pointers & Sliding Window",
        tags: ["two pointers"],
        count: 12,
        desc: "Sliding window max/min, meet in middle",
      },
      {
        name: "Sorting Applications",
        tags: ["sortings"],
        count: 12,
        desc: "Sorting as preprocessing, median tricks",
      },
      {
        name: "Number Theory Foundations",
        tags: ["number theory"],
        count: 10,
        desc: "Sieve, GCD/LCM, modular inverse",
      },
      {
        name: "Data Structures Intro",
        tags: ["data structures"],
        count: 10,
        desc: "Sets, maps, stacks, priority queues",
      },
      {
        name: "Constructive & Math",
        tags: ["constructive algorithms", "math"],
        count: 10,
        desc: "Constructive solutions with math insight",
      },
      {
        name: "Bitmask Basics",
        tags: ["bitmasks"],
        count: 9,
        desc: "XOR tricks, subset enumeration, bit manipulation",
      },
    ],
  },
  // ── Level 4: Megabyte (1200–1400) ── Total: ~115 problems
  {
    level: 4,
    topics: [
      {
        name: "DP Intermediate",
        tags: ["dp"],
        count: 18,
        desc: "Subsequence DP, interval DP, LCS, bitmask DP intro",
      },
      {
        name: "Graph Introduction",
        tags: ["graphs", "dfs and similar"],
        count: 15,
        desc: "BFS, DFS, connected components, bipartite check",
      },
      {
        name: "Binary Search Mastery",
        tags: ["binary search"],
        count: 12,
        desc: "Binary search + greedy, complex predicates",
      },
      {
        name: "Disjoint Set Union",
        tags: ["dsu"],
        count: 10,
        desc: "Union-Find, connected components online",
      },
      {
        name: "Combinatorics Intro",
        tags: ["combinatorics"],
        count: 10,
        desc: "Counting principles, nCr, inclusion-exclusion",
      },
      {
        name: "Two Pointers Pro",
        tags: ["two pointers"],
        count: 10,
        desc: "Merging sorted arrays, partition problems",
      },
      {
        name: "Number Theory Applied",
        tags: ["number theory"],
        count: 10,
        desc: "Euler totient, modular exponentiation",
      },
      {
        name: "Constructive Hard",
        tags: ["constructive algorithms"],
        count: 10,
        desc: "Non-trivial constructions",
      },
      {
        name: "Bitmask Techniques",
        tags: ["bitmasks"],
        count: 10,
        desc: "Bitmask states, subset DP basics",
      },
      {
        name: "String Algorithms Intro",
        tags: ["strings", "hashing"],
        count: 10,
        desc: "String hashing, pattern matching basics",
      },
    ],
  },
  // ── Level 5: Gigabyte (1400–1600) ── Total: ~115 problems
  {
    level: 5,
    topics: [
      {
        name: "Advanced DP",
        tags: ["dp"],
        count: 18,
        desc: "Tree DP, digit DP, DP on DAGs, bitmask DP",
      },
      {
        name: "Graph Algorithms",
        tags: ["graphs"],
        count: 14,
        desc: "Shortest paths intro, cycle detection, topological sort",
      },
      {
        name: "DFS & BFS Applications",
        tags: ["dfs and similar"],
        count: 12,
        desc: "Flood fill, tree traversal, back edges, SCC basics",
      },
      {
        name: "Range Query Structures",
        tags: ["data structures"],
        count: 14,
        desc: "Segment tree basics, BIT/Fenwick tree",
      },
      {
        name: "Tree Algorithms",
        tags: ["trees"],
        count: 12,
        desc: "LCA, tree diameter, centroid basics, Euler tour",
      },
      {
        name: "Combinatorics Applied",
        tags: ["combinatorics"],
        count: 10,
        desc: "Binomial coefficients, Catalan numbers, derangements",
      },
      {
        name: "Binary Search + DS",
        tags: ["binary search", "data structures"],
        count: 10,
        desc: "Segment tree, range queries with search",
      },
      {
        name: "Shortest Paths",
        tags: ["shortest paths"],
        count: 10,
        desc: "Dijkstra, Bellman-Ford, 0-1 BFS",
      },
      {
        name: "Interactive Problems",
        tags: ["interactive"],
        count: 7,
        desc: "Binary search queries, adaptive strategies",
      },
      {
        name: "Bitmask DP",
        tags: ["bitmasks", "dp"],
        count: 8,
        desc: "Subset enumeration DP, profile DP intro",
      },
    ],
  },
  // ── Level 6: Terabyte (1600–1800) ── Total: ~115 problems
  {
    level: 6,
    topics: [
      {
        name: "Expert DP",
        tags: ["dp"],
        count: 18,
        desc: "Convex hull trick, Li Chao tree, aliens trick intro",
      },
      {
        name: "Segment Tree Pro",
        tags: ["data structures"],
        count: 15,
        desc: "Lazy propagation, persistent segment tree",
      },
      {
        name: "Advanced Graph Theory",
        tags: ["graphs", "shortest paths"],
        count: 12,
        desc: "Min cost flow intro, network modeling",
      },
      {
        name: "Tree Decomposition",
        tags: ["trees"],
        count: 12,
        desc: "Centroid decomposition, virtual tree, HLD intro",
      },
      {
        name: "String Processing",
        tags: ["strings", "hashing"],
        count: 10,
        desc: "Z-function, KMP, suffix array intro",
      },
      {
        name: "DSU & Connectivity",
        tags: ["dsu"],
        count: 10,
        desc: "Online connectivity, DSU on tree",
      },
      {
        name: "Number Theory Pro",
        tags: ["number theory"],
        count: 10,
        desc: "CRT, discrete log, primitive roots",
      },
      {
        name: "Bitmask Mastery",
        tags: ["bitmasks"],
        count: 10,
        desc: "SOS DP, broken profile DP",
      },
      {
        name: "Combinatorics & Counting",
        tags: ["combinatorics"],
        count: 10,
        desc: "Inclusion-exclusion, Burnside lemma intro",
      },
      {
        name: "Divide and Conquer",
        tags: ["divide and conquer"],
        count: 8,
        desc: "CDQ divide and conquer, merge sort tree",
      },
    ],
  },
  // ── Level 7: Petabyte (1800–2000) ── Total: ~110 problems
  {
    level: 7,
    topics: [
      {
        name: "Hard DP",
        tags: ["dp"],
        count: 18,
        desc: "Profile DP, DP with convex hull trick, connection profile",
      },
      {
        name: "Advanced Data Structures",
        tags: ["data structures"],
        count: 15,
        desc: "Treap, splay tree, implicit treap",
      },
      {
        name: "Hard Graphs",
        tags: ["graphs", "dfs and similar"],
        count: 14,
        desc: "2-SAT, block-cut tree, dominator tree, SCC applications",
      },
      {
        name: "Hard Combinatorics",
        tags: ["combinatorics", "math"],
        count: 12,
        desc: "Generating functions intro, Polya counting",
      },
      {
        name: "Tree Mastery",
        tags: ["trees"],
        count: 10,
        desc: "Auxiliary trees, LCT basics, ETT",
      },
      {
        name: "Geometry",
        tags: ["geometry"],
        count: 10,
        desc: "Convex hull, line sweep, half-plane intersection",
      },
      {
        name: "Game Theory",
        tags: ["games"],
        count: 8,
        desc: "Sprague-Grundy, nim variants",
      },
      {
        name: "Network Flow",
        tags: ["flows"],
        count: 8,
        desc: "Max flow, bipartite matching applications",
      },
      {
        name: "Interactive Pro",
        tags: ["interactive"],
        count: 7,
        desc: "Complex query strategies",
      },
      {
        name: "Probabilities",
        tags: ["probabilities"],
        count: 8,
        desc: "Expected value, linearity of expectation",
      },
    ],
  },
  // ── Level 8: Exabyte (2000–2200) ── Total: ~105 problems
  {
    level: 8,
    topics: [
      {
        name: "Expert DP Techniques",
        tags: ["dp"],
        count: 16,
        desc: "Lambda optimization, DP with Li Chao tree",
      },
      {
        name: "Expert Data Structures",
        tags: ["data structures"],
        count: 14,
        desc: "Link-cut tree, wavelet tree, segment tree merging",
      },
      {
        name: "Expert Graph Algorithms",
        tags: ["graphs", "dfs and similar"],
        count: 12,
        desc: "Tarjan SCC, bridge tree, Euler tour HLD",
      },
      {
        name: "Hard Number Theory",
        tags: ["number theory", "math"],
        count: 12,
        desc: "CRT, quadratic residues, NTT, modular systems",
      },
      {
        name: "Divide and Conquer Pro",
        tags: ["divide and conquer"],
        count: 10,
        desc: "CDQ, persistent divide and conquer",
      },
      {
        name: "Expert Trees",
        tags: ["data structures", "trees"],
        count: 10,
        desc: "Euler tour tree, link-cut applications",
      },
      {
        name: "Probabilities & EV",
        tags: ["probabilities"],
        count: 8,
        desc: "Markov chains, probability DP",
      },
      {
        name: "Geometry Pro",
        tags: ["geometry"],
        count: 8,
        desc: "Rotating calipers, Minkowski sum",
      },
      {
        name: "FFT & Polynomials",
        tags: ["fft"],
        count: 8,
        desc: "NTT applications, polynomial division",
      },
      {
        name: "Matrix Exponentiation",
        tags: ["matrices"],
        count: 7,
        desc: "Linear recurrence, matrix power",
      },
    ],
  },
  // ── Level 9: Zettabyte (2200–2500) ── Total: ~105 problems
  {
    level: 9,
    topics: [
      {
        name: "Research-Level DP",
        tags: ["dp"],
        count: 16,
        desc: "Aliens trick, Knuth optimization, WQS binary search",
      },
      {
        name: "Championship Data Structures",
        tags: ["data structures"],
        count: 14,
        desc: "Persistent structures, segment tree beats",
      },
      {
        name: "Advanced Number Theory",
        tags: ["number theory", "math"],
        count: 12,
        desc: "Mobius inversion, Dirichlet convolution",
      },
      {
        name: "Advanced Combinatorics",
        tags: ["combinatorics"],
        count: 12,
        desc: "Burnside, Polya enumeration, formal power series",
      },
      {
        name: "Championship Graphs",
        tags: ["graphs", "shortest paths"],
        count: 10,
        desc: "Advanced flow modeling, planarity, virtual graphs",
      },
      {
        name: "Expert Strings",
        tags: ["strings", "hashing"],
        count: 10,
        desc: "Suffix automaton, palindrome tree",
      },
      {
        name: "Complex Bitmask",
        tags: ["bitmasks"],
        count: 8,
        desc: "Subset sum convolution, zeta/Mobius on subsets",
      },
      {
        name: "Advanced Geometry",
        tags: ["geometry"],
        count: 8,
        desc: "3D geometry, Voronoi basics",
      },
      {
        name: "Flows & Matching Pro",
        tags: ["flows"],
        count: 8,
        desc: "Min-cost max-flow applications, Hungarian algorithm",
      },
      {
        name: "Expert Interactive",
        tags: ["interactive"],
        count: 7,
        desc: "Randomized interactive, adversary arguments",
      },
    ],
  },
  // ── Level 10: Yottabyte (2500–2800) ── Total: ~105 problems
  {
    level: 10,
    topics: [
      {
        name: "World Finals DP",
        tags: ["dp", "graphs", "data structures"],
        count: 16,
        desc: "ICPC World Finals level technique fusion",
      },
      {
        name: "Expert Trees & DS",
        tags: ["trees", "data structures"],
        count: 14,
        desc: "Top tree, Euler tour tree applications",
      },
      {
        name: "Expert Math & NT",
        tags: ["math", "number theory"],
        count: 12,
        desc: "Multivariate polynomials, elliptic curves",
      },
      {
        name: "Advanced Flows",
        tags: ["flows", "graphs"],
        count: 10,
        desc: "Project selection, circulation, flow on grids",
      },
      {
        name: "FFT & Polynomials Pro",
        tags: ["fft"],
        count: 10,
        desc: "Chirp Z-transform, multipoint evaluation",
      },
      {
        name: "Expert Combinatorics",
        tags: ["combinatorics", "math"],
        count: 10,
        desc: "Matroids, polymatroids, species",
      },
      {
        name: "Matrix & Linear Algebra",
        tags: ["matrices"],
        count: 8,
        desc: "Matroid intersection, Gaussian elimination",
      },
      {
        name: "Expert Divide & Conquer",
        tags: ["divide and conquer"],
        count: 8,
        desc: "Persistent D&C, kinetic data structures",
      },
      {
        name: "Complex Constructive",
        tags: ["constructive algorithms"],
        count: 8,
        desc: "Multi-step constructions, invariant proofs",
      },
      {
        name: "String Suffix Structures",
        tags: ["string suffix structures"],
        count: 9,
        desc: "Suffix tree, suffix automaton advanced",
      },
    ],
  },
  // ── Level 11: ∞ Overflow (2800–3500) ── Total: ~105 problems
  {
    level: 11,
    topics: [
      {
        name: "Legendary DP",
        tags: ["dp"],
        count: 16,
        desc: "The hardest DP problems ever created",
      },
      {
        name: "Legendary Data Structures",
        tags: ["data structures"],
        count: 14,
        desc: "Novel data structure combinations",
      },
      {
        name: "Legendary Graphs",
        tags: ["graphs", "trees"],
        count: 14,
        desc: "Exotic graph algorithms, planar graphs",
      },
      {
        name: "Advanced FFT & Polynomials",
        tags: ["fft"],
        count: 10,
        desc: "Subset convolution, partition function",
      },
      {
        name: "Legendary Combinatorics",
        tags: ["combinatorics", "math"],
        count: 12,
        desc: "Advanced species, operad theory",
      },
      {
        name: "Advanced Geometry",
        tags: ["geometry"],
        count: 10,
        desc: "Algebraic geometry, higher-dim structures",
      },
      {
        name: "Legendary Math",
        tags: ["math", "number theory"],
        count: 10,
        desc: "Research-level number theory and algebra",
      },
      {
        name: "Legendary Interactive",
        tags: ["interactive"],
        count: 8,
        desc: "Information-theoretic lower bound problems",
      },
      {
        name: "Legendary Strings",
        tags: ["string suffix structures", "hashing"],
        count: 8,
        desc: "Suffix tree advanced, eertree applications",
      },
      {
        name: "Expert Games",
        tags: ["games"],
        count: 5,
        desc: "Complex game theory, Sprague-Grundy on graphs",
      },
    ],
  },
];

function seededShuffle(arr, seed) {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

app.get("/api/level-roadmap", async (req, res) => {
  try {
    let totalXp = (
      await get(`SELECT COALESCE(SUM(xp_earned),0) as s FROM progress WHERE username=${meSql()}`)
    ).s;
    let totalSolved = (
      await get(`SELECT COUNT(*) as c FROM progress WHERE username=${meSql()} AND status='solved'`)
    ).c;
    { const ov = await myOverrides(); totalXp += ov.xp; totalSolved += ov.solved; }
    const playerLevel = calcLevel(totalXp, totalSolved);
    const weekSeed = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));

    const levels = await Promise.all(
      LEVEL_TOPICS.map(async (lt) => {
        const rl = RIFT_LEVELS[lt.level - 1];

        // For ∞ Overflow (level 11), lower the floor to 2200 and remove the ceiling
        // so practice problems actually appear in the DB (very few problems rated 2800+ exist)
        const queryMinR = lt.level === 11 ? 2200 : rl.minR;
        const queryMaxR = lt.level === 11 ? 99999 : rl.maxR;

        // Each topic runs its own tag/rating query concurrently
        const topicsResult = await Promise.all(
          lt.topics.map(async (topic) => {
            const tagCond = topic.tags.map(() => "p.tags LIKE ?").join(" OR ");
            const tagParams = topic.tags.map((t) => `%${t}%`);
            const pool = await all(
              `
            SELECT p.id, p.problem_id, p.title, p.rating, p.platform, p.tags, p.url,
              COALESCE(pr.status,'unsolved') as solve_status,
              COALESCE(pr.attempts,0) as attempts
            FROM problems p
            LEFT JOIN progress pr ON pr.problem_rowid = p.id AND pr.username=${meSql()}
            WHERE (${tagCond})
              AND p.rating >= ? AND p.rating <= ?
              AND p.rating > 0
            ORDER BY p.rating DESC
          `,
              [...tagParams, queryMinR, queryMaxR],
            );

            const shuffled = seededShuffle(
              pool,
              weekSeed + lt.level * 100 + topic.tags.length,
            );
            const unsolved = shuffled.filter((p) => p.solve_status !== "solved");
            const solved = shuffled.filter((p) => p.solve_status === "solved");
            const selected = [
              ...unsolved.slice(0, topic.count),
              ...solved.slice(0, Math.max(0, topic.count - unsolved.length)),
            ].slice(0, topic.count);
            selected.sort((a, b) => a.rating - b.rating);

            return {
              name: topic.name,
              desc: topic.desc,
              tags: topic.tags,
              problems: selected,
              totalPool: pool.length,
              solvedInPool: pool.filter((p) => p.solve_status === "solved").length,
            };
          }),
        );

        const allProbs = topicsResult.flatMap((t) => t.problems);
        const solvedCount = allProbs.filter(
          (p) => p.solve_status === "solved",
        ).length;

        return {
          level: lt.level,
          name: rl.name,
          color: rl.color,
          glow: rl.glow,
          minR: rl.minR,
          maxR: rl.maxR,
          xpRequired: rl.xp,
          probsRequired: rl.minProblems,
          unlocked: true, // all levels are always browsable
          current: playerLevel.level === lt.level,
          topics: topicsResult,
          totalProblems: allProbs.length,
          solvedCount,
          progress: allProbs.length
            ? Math.round((solvedCount / allProbs.length) * 100)
            : 0,
        };
      }),
    );

    res.json({ ok: true, levels, player: playerLevel, weekSeed });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* Keep /api/roadmap and /api/skill-tree as aliases for backward compat */
app.get("/api/skill-tree", async (req, res) => {
  try {
    const rawTotalSolved = (
      await get(`SELECT COUNT(*) as c FROM progress WHERE username=${meSql()} AND status='solved'`)
    )?.c || 0;
    const solvedProblems = await all(
      `SELECT DISTINCT p.id, COALESCE(p.tags, '') as tags FROM progress pr JOIN problems p ON pr.problem_rowid=p.id AND pr.username=${meSql()} WHERE pr.status='solved'`
    );
    const solvedTagList = (solvedProblems || []).map((p) => (p.tags || "").toLowerCase());

    const nodes = [];
    for (const skill of NEXUS_NODES) {
      let solvedCount = 0;
      if (skill.tags.length > 0) {
        const lowerTags = skill.tags.map((t) => t.toLowerCase());
        solvedCount = solvedTagList.filter((tags) =>
          lowerTags.some((t) => tags.includes(t))
        ).length;
      } else {
        solvedCount = rawTotalSolved;
      }
      const prereqsMet =
        skill.requires.length === 0 ||
        skill.requires.every((rid) => {
          const req = nodes.find((n) => n.id === rid);
          return req && req.progress >= 100;
        });
      const progress = Math.min(
        100,
        Math.round((solvedCount / skill.target) * 100),
      );
      nodes.push({
        ...skill,
        solved: Math.min(solvedCount, skill.target),
        progress,
        unlocked: prereqsMet || progress > 0,
        completed: progress >= 100,
      });
    }
    res.json({
      ok: true,
      nodes,
      tierNames: RIFT_LEVELS.map((r) => r.name),
      tierColors: RIFT_LEVELS.map((r) => r.color),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* Node detail — problems matching this skill node */
app.get("/api/skill-tree/:nodeId/problems", async (req, res) => {
  try {
    const skill = NEXUS_NODES.find((s) => s.id === req.params.nodeId);
    if (!skill)
      return res.status(404).json({ ok: false, error: "Node not found" });
    if (!skill.tags.length) return res.json({ ok: true, problems: [], skill });

    const [minDiff, maxDiff] = skill.difficulty || [0, 9999];
    const tagCond = skill.tags.map(() => "p.tags LIKE ?").join(" OR ");
    const tagParams = skill.tags.map((t) => `%${t}%`);

    const problems = await all(
      `
      SELECT p.id, p.problem_id, p.title, p.rating, p.platform, p.tags,
        COALESCE(pr.status,'unsolved') as solve_status,
        pr.solved_at
      FROM problems p
      LEFT JOIN progress pr ON pr.problem_rowid = p.id AND pr.username=${meSql()}
      WHERE (${tagCond})
        AND p.rating >= ? AND p.rating <= ?
      ORDER BY
        CASE WHEN pr.status = 'solved' THEN 1 ELSE 0 END,
        p.rating ASC
      LIMIT 50
    `,
      [...tagParams, minDiff, maxDiff],
    );

    const solvedCount = problems.filter(
      (p) => p.solve_status === "solved",
    ).length;
    const totalAvailable =
      (
        await get(
          `SELECT COUNT(*) as c FROM problems p WHERE (${tagCond}) AND p.rating >= ? AND p.rating <= ?`,
          [...tagParams, minDiff, maxDiff],
        )
      )?.c || 0;

    res.json({
      ok: true,
      problems,
      skill: { ...skill, solvedCount, totalAvailable },
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

// Password hashing with scrypt
function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, derived) => {
      if (err) reject(err);
      resolve(salt + ":" + derived.toString("hex"));
    });
  });
}
function verifyPassword(password, hash) {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(":");
    crypto.scrypt(password, salt, 64, (err, derived) => {
      if (err) reject(err);
      resolve(crypto.timingSafeEqual(Buffer.from(key, "hex"), derived));
    });
  });
}

const studioPassword = process.env.STUDIO_PASSWORD;
if (!studioPassword) {
  if (IS_PROD) {
    console.error(
      "[FATAL] STUDIO_PASSWORD must be set in production — refusing to start with the insecure built-in default.",
    );
    process.exit(1);
  } else {
    console.warn(
      "[WARN] STUDIO_PASSWORD not set — using insecure dev fallback. Set it before going to production!",
    );
  }
}
const studioAuth = createStudioAuth({
  studioPass: studioPassword || "nexora-studio-dev-only",
});

app.use(
  createAuthRouter({
    authLimiter,
    clearSessionUser,
    get,
    all,
    getAuthProviders,
    getSessionUser,
    hashPassword,
    persistSessionUser,
    requireAdmin,
    requireAuthenticatedUser,
    requireSelfOrAdmin,
    run,
    verifyPassword,
    path,
    fs,
    calcLevel,
    calcStreak,
  }),
);

app.get("/api/user/search", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    // Require at least 2 chars to prevent overly broad scans
    if (!q || q.length < 2) return res.json({ ok: true, users: [] });
    const users = await all(
      "SELECT username, display_name, avatar, avatar_url, status, last_seen, role FROM users WHERE username LIKE ? OR display_name LIKE ? LIMIT 20",
      [`%${q}%`, `%${q}%`],
    );
    res.json({ ok: true, users });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* ========== SOCIAL: FRIENDS ========== */
app.get("/api/friends/:username", async (req, res) => {
  try {
    const u = req.params.username;
    const friends = await all(
      `
      SELECT u.username, u.display_name, u.avatar, u.status, u.last_seen, f.created_at as friends_since
      FROM friendships f JOIN users u ON (CASE WHEN f.from_user=? THEN f.to_user ELSE f.from_user END) = u.username
      WHERE (f.from_user=? OR f.to_user=?) AND f.status='accepted'`,
      [u, u, u],
    );
    res.json({ ok: true, friends });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

app.get("/api/friends/:username/requests", async (req, res) => {
  try {
    const u = req.params.username;
    const incoming = await all(
      `SELECT f.id, u.username, u.display_name, u.avatar, f.created_at
      FROM friendships f JOIN users u ON f.from_user=u.username WHERE f.to_user=? AND f.status='pending'`,
      [u],
    );
    const outgoing = await all(
      `SELECT f.id, u.username, u.display_name, u.avatar, f.created_at
      FROM friendships f JOIN users u ON f.to_user=u.username WHERE f.from_user=? AND f.status='pending'`,
      [u],
    );
    res.json({ ok: true, incoming, outgoing });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

app.post("/api/friends/request", async (req, res) => {
  try {
    const { from, to } = req.body;
    if (!from || !to || from === to)
      return res.status(400).json({ ok: false, error: "Invalid request" });
    const target = await get("SELECT * FROM users WHERE username=?", [to]);
    if (!target)
      return res.status(404).json({ ok: false, error: "User not found" });
    const existing = await get(
      "SELECT * FROM friendships WHERE (from_user=? AND to_user=?) OR (from_user=? AND to_user=?)",
      [from, to, to, from],
    );
    if (existing) {
      if (existing.status === "accepted")
        return res.json({ ok: false, error: "Already friends" });
      if (existing.status === "pending")
        return res.json({ ok: false, error: "Request already pending" });
    }
    await run(
      "INSERT INTO friendships(from_user,to_user,status,created_at) VALUES(?,?,?,?)",
      [from, to, "pending", new Date().toISOString()],
    );
    // Activity feed
    await run(
      "INSERT INTO activity_feed(username,type,content,created_at) VALUES(?,?,?,?)",
      [
        from,
        "friend_request",
        `sent a friend request to ${to}`,
        new Date().toISOString(),
      ],
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

app.post("/api/friends/accept", async (req, res) => {
  try {
    const { id } = req.body;
    const f = await get("SELECT * FROM friendships WHERE id=? AND status=?", [
      id,
      "pending",
    ]);
    if (!f)
      return res.status(404).json({ ok: false, error: "Request not found" });
    await run("UPDATE friendships SET status=? WHERE id=?", ["accepted", id]);
    await run(
      "INSERT INTO activity_feed(username,type,content,created_at) VALUES(?,?,?,?)",
      [
        f.to_user,
        "friend_accepted",
        `became friends with ${f.from_user}`,
        new Date().toISOString(),
      ],
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

app.post("/api/friends/reject", async (req, res) => {
  try {
    const { id } = req.body;
    await run("DELETE FROM friendships WHERE id=? AND status=?", [
      id,
      "pending",
    ]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

app.delete("/api/friends/:id", async (req, res) => {
  try {
    await run("DELETE FROM friendships WHERE id=?", [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* ========== SOCIAL: MESSAGES ========== */
app.get("/api/messages/unread/:username", async (req, res) => {
  try {
    const counts = await all(
      `SELECT from_user, COUNT(*) as count FROM messages WHERE to_user=? AND read=0 GROUP BY from_user`,
      [req.params.username],
    );
    const total = counts.reduce((s, c) => s + c.count, 0);
    res.json({ ok: true, counts, total });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

app.get("/api/messages/:user1/:user2", async (req, res, next) => {
  if (req.params.user2 === "reactions") return next();
  try {
    const { user1, user2 } = req.params;
    const msgs = await all(
      `SELECT * FROM messages WHERE (from_user=? AND to_user=?) OR (from_user=? AND to_user=?)
      ORDER BY created_at ASC LIMIT 200`,
      [user1, user2, user2, user1],
    );
    // Mark as read
    await run(
      "UPDATE messages SET read=1 WHERE from_user=? AND to_user=? AND read=0",
      [user2, user1],
    );
    res.json({ ok: true, messages: msgs });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

app.post("/api/messages", async (req, res) => {
  try {
    const { from, to, content } = req.body;
    if (!from || !to || !content?.trim())
      return res.status(400).json({ ok: false, error: "Missing fields" });
    const sanitized = content.trim().substring(0, 2000);
    await run(
      "INSERT INTO messages(from_user,to_user,content,created_at) VALUES(?,?,?,?)",
      [from, to, sanitized, new Date().toISOString()],
    );
    const msg = await get("SELECT * FROM messages ORDER BY id DESC LIMIT 1");
    res.json({ ok: true, message: msg });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* ========== SOCIAL: SOLVE ROOMS ========== */
app.get("/api/rooms", async (req, res) => {
  try {
    const rooms =
      await all(`SELECT r.*, u.display_name as creator_name, u.avatar as creator_avatar,
      p.title as problem_title, p.rating as problem_rating, p.platform as problem_platform
      FROM solve_rooms r
      JOIN users u ON r.creator = u.username
      LEFT JOIN problems p ON r.problem_id = p.id
      WHERE r.status='open'
      ORDER BY r.created_at DESC LIMIT 50`);
    // Add member counts from active socket rooms
    for (const room of rooms) {
      room.member_count = (solveRoomMembers[room.id] || []).length;
    }
    res.json({ ok: true, rooms });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

app.post("/api/rooms", async (req, res) => {
  try {
    const { name, creator, problem_id, is_voice, max_members } = req.body;
    if (!name || !creator)
      return res
        .status(400)
        .json({ ok: false, error: "Name and creator required" });
    const id = Math.random().toString(36).slice(2, 8).toUpperCase();
    await run(
      "INSERT INTO solve_rooms(id,name,creator,problem_id,max_members,is_voice,status,created_at) VALUES(?,?,?,?,?,?,?,?)",
      [
        id,
        name.substring(0, 50),
        creator,
        problem_id || null,
        max_members || 5,
        is_voice ? 1 : 0,
        "open",
        new Date().toISOString(),
      ],
    );
    const room = await get("SELECT * FROM solve_rooms WHERE id=?", [id]);
    await run(
      "INSERT INTO activity_feed(username,type,content,problem_id,created_at) VALUES(?,?,?,?,?)",
      [
        creator,
        "room_created",
        `created room "${name}"`,
        problem_id || null,
        new Date().toISOString(),
      ],
    );
    res.json({ ok: true, room });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

app.get("/api/rooms/:id", async (req, res) => {
  try {
    const room = await get(
      `SELECT r.*, p.title as problem_title, p.rating as problem_rating, p.platform as problem_platform
      FROM solve_rooms r LEFT JOIN problems p ON r.problem_id = p.id WHERE r.id=?`,
      [req.params.id],
    );
    if (!room)
      return res.status(404).json({ ok: false, error: "Room not found" });
    room.members = solveRoomMembers[room.id] || [];
    res.json({ ok: true, room });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

app.delete("/api/rooms/:id", async (req, res) => {
  try {
    await run("UPDATE solve_rooms SET status='closed' WHERE id=?", [
      req.params.id,
    ]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

app.get("/api/rooms/:id/messages", async (req, res) => {
  try {
    const msgs = await all(
      `SELECT rm.*, u.display_name, u.avatar FROM room_messages rm
      JOIN users u ON rm.username = u.username WHERE rm.room_id=? ORDER BY rm.created_at ASC LIMIT 200`,
      [req.params.id],
    );
    res.json({ ok: true, messages: msgs });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* ========== SOCIAL: ACTIVITY FEED ========== */
app.get("/api/feed/:username", async (req, res) => {
  try {
    const u = req.params.username;
    // Get feed from friends + self
    const feed = await all(
      `
      SELECT af.*, u.display_name, u.avatar,
        p.title as problem_title, p.rating as problem_rating, p.platform as problem_platform
      FROM activity_feed af
      JOIN users u ON af.username = u.username
      LEFT JOIN problems p ON af.problem_id = p.id
      WHERE af.username = ? OR af.username IN (
        SELECT CASE WHEN f.from_user=? THEN f.to_user ELSE f.from_user END
        FROM friendships f WHERE (f.from_user=? OR f.to_user=?) AND f.status='accepted'
      )
      ORDER BY af.created_at DESC LIMIT 50`,
      [u, u, u, u],
    );
    res.json({ ok: true, feed });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* ========== LEADERBOARD ========== */
app.get("/api/leaderboard", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 25, 100);
    const type = req.query.type || "xp"; // xp | solved | streak
    // Real per-user totals (progress rows) plus any admin override.
    const rows = await all(
      `
      SELECT u.username, u.display_name, u.avatar, u.avatar_url, u.role, u.created_at,
        COALESCE(u.xp_override,0) + COALESCE(pg.xp,0) as total_xp,
        COALESCE(u.solved_override,0) + COALESCE(pg.solved,0) as total_solved,
        COALESCE(da.active_days,0) as active_days
      FROM users u
      LEFT JOIN (SELECT username, SUM(xp_earned) as xp,
                   SUM(CASE WHEN status='solved' THEN 1 ELSE 0 END) as solved
                 FROM progress GROUP BY username) pg ON pg.username = u.username
      LEFT JOIN (SELECT username, COUNT(*) as active_days FROM daily_activity
                 WHERE problems_solved > 0 GROUP BY username) da ON da.username = u.username
      WHERE u.username IS NOT NULL
      ORDER BY ${type === "solved" ? "total_solved DESC, total_xp DESC" : "total_xp DESC, total_solved DESC"}
      LIMIT ?`,
      [type === "streak" ? 500 : limit],
    );
    if (type === "streak") {
      // Streaks are computed per user from their daily activity.
      for (const r of rows) {
        const s = r.active_days > 0 ? await calcStreak(r.username) : { best: 0, current: 0 };
        r.best_streak = s.best;
        r.current_streak = s.current;
      }
      rows.sort((a, b) => b.best_streak - a.best_streak || b.total_xp - a.total_xp);
      rows.splice(limit);
    }
    for (const r of rows) {
      const lv = calcLevel(r.total_xp, r.total_solved);
      r.level = lv.level;
      r.level_name = lv.name;
    }
    res.json({ ok: true, leaderboard: rows, type });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* ========== WORKSHOP STATS ========== */
app.get("/api/workshop/stats", async (req, res) => {
  try {
    const username = req.query.username;
    const totalCustom =
      (await get("SELECT COUNT(*) as c FROM custom_problems"))?.c || 0;
    const totalContests = username
      ? (
          await get(
            "SELECT COUNT(*) as c FROM custom_contests WHERE creator=?",
            [username],
          )
        )?.c || 0
      : 0;
    res.json({ ok: true, totalCustom, totalContests });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* ========== CUSTOM CONTESTS & QUIZZES ========== */

function hashPass(pass) {
  return crypto
    .createHash("sha256")
    .update(pass + "nexora_salt")
    .digest("hex");
}

function genContestCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "NX-";
  for (let i = 0; i < 6; i++)
    code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// Create contest
app.post("/api/contests/create", async (req, res) => {
  try {
    const {
      creator,
      title,
      description,
      type,
      password,
      org_tag,
      start_time,
      duration_mins,
      problems,
      max_participants,
    } = req.body;
    if (!creator || !title || !password || !start_time)
      return res
        .status(400)
        .json({ ok: false, error: "Missing required fields" });
    const validTypes = ["speed", "accuracy", "quiz"];
    if (!validTypes.includes(type))
      return res.status(400).json({ ok: false, error: "Invalid type" });
    if (password.length < 4)
      return res
        .status(400)
        .json({ ok: false, error: "Password must be at least 4 characters" });
    let code;
    let attempts = 0;
    do {
      code = genContestCode();
      const existing = await get(
        "SELECT id FROM custom_contests WHERE contest_code=?",
        [code],
      );
      if (!existing) break;
      attempts++;
    } while (attempts < 10);
    const r = await run(
      `INSERT INTO custom_contests(creator,title,description,type,contest_code,password_hash,org_tag,start_time,duration_mins,problems,max_participants)
       VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
      [
        creator,
        title,
        description || "",
        type || "speed",
        code,
        hashPass(password),
        org_tag || "",
        start_time,
        duration_mins || 60,
        JSON.stringify(problems || []),
        max_participants || 50,
      ],
    );
    res.json({ ok: true, contest_id: r.lastID, contest_code: code });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

// List contests by creator
app.get("/api/contests/mine", async (req, res) => {
  try {
    // "Mine" means the signed-in account. This took ?username= from the caller,
    // so anyone could list anyone else's contests just by asking for them.
    const username = me();
    if (!username) return res.status(401).json({ ok: false, error: "Please sign in first" });
    const contests = await all(
      `SELECT id, title, description, type, contest_code, org_tag, start_time, duration_mins, problems, max_participants, created_at,
       (SELECT COUNT(*) FROM contest_participants WHERE contest_id = custom_contests.id) as participant_count
       FROM custom_contests WHERE creator=? ORDER BY created_at DESC`,
      [username],
    );
    res.json({ ok: true, contests });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

// Join contest with code + password
app.post("/api/contests/join", async (req, res) => {
  try {
    const { username, contest_code, password } = req.body;
    if (!username || !contest_code || !password)
      return res.status(400).json({ ok: false, error: "Missing fields" });
    const contest = await get(
      "SELECT * FROM custom_contests WHERE contest_code=?",
      [contest_code.toUpperCase()],
    );
    if (!contest)
      return res.status(404).json({ ok: false, error: "Contest not found" });
    if (contest.password_hash !== hashPass(password))
      return res.status(401).json({ ok: false, error: "Wrong password" });
    const count = await get(
      "SELECT COUNT(*) as c FROM contest_participants WHERE contest_id=?",
      [contest.id],
    );
    if (count.c >= contest.max_participants)
      return res.status(400).json({ ok: false, error: "Contest is full" });
    // Upsert participant
    await run(
      `INSERT OR IGNORE INTO contest_participants(contest_id,username) VALUES(?,?)`,
      [contest.id, username],
    );
    const safeContest = { ...contest, password_hash: undefined };
    delete safeContest.password_hash;
    res.json({
      ok: true,
      contest: safeContest,
      participant_count: count.c + 1,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

// Get single contest details (public fields only if participant)
app.get("/api/contests/:id", async (req, res) => {
  try {
    const { username } = req.query;
    const contest = await get("SELECT * FROM custom_contests WHERE id=?", [
      req.params.id,
    ]);
    if (!contest)
      return res.status(404).json({ ok: false, error: "Not found" });
    const isOwner = contest.creator === username;
    const isParticipant = username
      ? !!(await get(
          "SELECT id FROM contest_participants WHERE contest_id=? AND username=?",
          [contest.id, username],
        ))
      : false;
    if (!isOwner && !isParticipant)
      return res.status(403).json({ ok: false, error: "Not enrolled" });
    const participants = await all(
      "SELECT username, score, joined_at FROM contest_participants WHERE contest_id=? ORDER BY score DESC",
      [contest.id],
    );
    const { password_hash, ...safe } = contest;
    res.json({ ok: true, contest: safe, participants, isOwner });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

// Delete contest (owner only)
app.delete("/api/contests/:id", async (req, res) => {
  try {
    const { username } = req.body;
    const contest = await get(
      "SELECT creator FROM custom_contests WHERE id=?",
      [req.params.id],
    );
    if (!contest) return res.status(404).json({ ok: false });
    if (contest.creator !== username)
      return res.status(403).json({ ok: false, error: "Not owner" });
    await run("DELETE FROM contest_participants WHERE contest_id=?", [
      req.params.id,
    ]);
    await run("DELETE FROM custom_contests WHERE id=?", [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* ========== MESSAGE REACTIONS ========== */
// In-memory reactions store (persists until server restart; lightweight for small squads)
const msgReactions = {}; // { msgId: { emoji: Set<username> } }

app.post("/api/messages/:id/react", (req, res) => {
  const { username, emoji } = req.body;
  const id = req.params.id;
  if (!username || !emoji) return res.status(400).json({ ok: false });
  if (!msgReactions[id]) msgReactions[id] = {};
  if (!msgReactions[id][emoji]) msgReactions[id][emoji] = new Set();
  if (msgReactions[id][emoji].has(username)) {
    msgReactions[id][emoji].delete(username);
  } else {
    msgReactions[id][emoji].add(username);
  }
  const reactions = {};
  for (const [e, users] of Object.entries(msgReactions[id])) {
    if (users.size > 0) reactions[e] = [...users];
  }
  // Broadcast to both chat participants via socket
  res.json({ ok: true, reactions });
});

app.get("/api/messages/:id/reactions", (req, res) => {
  const reactions = {};
  const r = msgReactions[req.params.id] || {};
  for (const [e, users] of Object.entries(r)) {
    if (users.size > 0) reactions[e] = [...users];
  }
  res.json({ ok: true, reactions });
});

/* ========== AI CODE HELPER (inline completion + error fix) ========== */

// In-memory completion cache (key → {text, ts})
const _aiCache = new Map();
const AI_CACHE_TTL = 90000; // 90 seconds
const AI_CACHE_MAX = 300;

// ── Kronos-1 Sovereign In-House AI Core (Primary intelligence for all Nexora features) ──
async function _geminiComplete(apiKey, prompt) {
  return kronosComplete(apiKey, prompt);
}

async function _groqChat(apiKey, messages, opts = {}) {
  return kronosChat(apiKey, messages, opts);
}

function _aiCacheKey(prefix, suffix, lang) {
  const pLines = prefix.split("\n").slice(-8).join("\n").trim();
  const sLines = (suffix || "").split("\n").slice(0, 4).join("\n").trim();
  return `${lang}::${pLines}::${sLines}`;
}

// Build a fill-in-the-middle prompt for Gemini
function _buildGeminiPrompt(language, prefixCtx, suffixCtx) {
  return `You are an expert inline code completion assistant for a competitive programming IDE.
Language: ${language}

Complete ONLY the missing code exactly where [CURSOR] is. Output raw code only — no markdown, no fences, no explanations. 1-3 lines maximum.

[CODE BEFORE CURSOR]
${prefixCtx}
[CURSOR]
[CODE AFTER CURSOR]
${suffixCtx || ""}

Completion:`;
}

app.use(
  createStudioRouter({
    all,
    fetch,
    fs,
    get,
    path,
    run,
    studioAuth,
    _groqChat,
  }),
);

// Initialize ExplainLab database
const _explainInit = initExplainLabDb().catch((e) =>
  console.error("[ExplainLab] DB init error:", e.message),
);

// Initialize ForgeBuilder database
const _forgeInit = initForgeDb().catch((e) =>
  console.error("[ForgeBuilder] DB init error:", e.message),
);

// Initialize LiveClass database
const _liveInit = initLiveDb().catch((e) =>
  console.error("[LiveClass] DB init error:", e.message),
);

app.use(
  createExplainLabRouter({
    all,
    fetch,
    fs,
    get,
    getSessionUser,
    path,
    requireAuthenticatedUser,
    run,
    _groqChat,
  }),
);

app.use(
  createLearningRouter({
    AI_CACHE_MAX,
    AI_CACHE_TTL,
    _aiCache,
    _aiCacheKey,
    _buildGeminiPrompt,
    _geminiComplete,
    _groqChat,
    aiLimiter,
    all,
    fetch,
    get,
    run,
  }),
);

// Nexora Learn: course coding problems + per-user progress
app.use(createLearnRouter({ get, all, run }));

// GATE CSE / IT / DA past-year question bank
app.use(createGateRouter());

// ForgeBuilder routes
app.use("/api/forge", createForgeRouter({ all, get, run }));

// LiveClass routes
app.use("/api/live", createLiveRouter({ all, get, run }));

/* ========== START ========== */
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: {
    origin: IS_PROD ? allowedOrigins : "*",
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Collaborative rooms (legacy)
const rooms = {};
// Solve-together rooms with members
const solveRoomMembers = {};
// Online user tracking: socketId -> { username, socketId }
const onlineUsers = {};
// username -> Set of socketIds
const userSockets = {};

io.on("connection", (socket) => {
  /* ===== User registration & presence ===== */
  socket.on("register-user", async ({ username }) => {
    if (!username) return;
    onlineUsers[socket.id] = { username, socketId: socket.id };
    if (!userSockets[username]) userSockets[username] = new Set();
    userSockets[username].add(socket.id);
    // Update DB status
    try {
      await run(
        "UPDATE users SET status='online', last_seen=? WHERE username=?",
        [new Date().toISOString(), username],
      );
    } catch {}
    // Broadcast online status to friends
    socket.broadcast.emit("user-online", { username });
  });

  /* ===== Direct Messaging ===== */
  socket.on("direct-message", async ({ from, to, content }) => {
    if (!from || !to || !content?.trim()) return;
    const sanitized = content.trim().substring(0, 2000);
    try {
      await run(
        "INSERT INTO messages(from_user,to_user,content,created_at) VALUES(?,?,?,?)",
        [from, to, sanitized, new Date().toISOString()],
      );
      const msg = await get("SELECT * FROM messages ORDER BY id DESC LIMIT 1");
      // Send to recipient's sockets
      const recipientSockets = userSockets[to];
      if (recipientSockets) {
        for (const sid of recipientSockets) {
          io.to(sid).emit("new-message", { message: msg });
        }
      }
      // Confirm to sender
      socket.emit("message-sent", { message: msg });
    } catch (e) {
      socket.emit("social-error", { error: errMessage(e) });
    }
  });

  /* ===== Solve Room Events ===== */
  socket.on("join-solve-room", ({ roomId, username }) => {
    if (!solveRoomMembers[roomId]) solveRoomMembers[roomId] = [];
    const existing = solveRoomMembers[roomId].find(
      (m) => m.username === username,
    );
    if (!existing) {
      solveRoomMembers[roomId].push({ username, socketId: socket.id });
    } else {
      existing.socketId = socket.id;
    }
    socket.join(`solve-${roomId}`);
    io.to(`solve-${roomId}`).emit("room-members-updated", {
      roomId,
      members: solveRoomMembers[roomId].map((m) => m.username),
    });
  });

  socket.on("leave-solve-room", ({ roomId, username }) => {
    if (solveRoomMembers[roomId]) {
      solveRoomMembers[roomId] = solveRoomMembers[roomId].filter(
        (m) => m.username !== username,
      );
      if (solveRoomMembers[roomId].length === 0)
        delete solveRoomMembers[roomId];
    }
    socket.leave(`solve-${roomId}`);
    io.to(`solve-${roomId}`).emit("room-members-updated", {
      roomId,
      members: (solveRoomMembers[roomId] || []).map((m) => m.username),
    });
  });

  socket.on("room-chat", async ({ roomId, username, content }) => {
    if (!roomId || !username || !content?.trim()) return;
    const sanitized = content.trim().substring(0, 2000);
    try {
      await run(
        "INSERT INTO room_messages(room_id,username,content,created_at) VALUES(?,?,?,?)",
        [roomId, username, sanitized, new Date().toISOString()],
      );
      const user = await get(
        "SELECT display_name, avatar FROM users WHERE username=?",
        [username],
      );
      io.to(`solve-${roomId}`).emit("room-chat-message", {
        roomId,
        username,
        content: sanitized,
        display_name: user?.display_name || username,
        avatar: user?.avatar || "coder",
        created_at: new Date().toISOString(),
      });
    } catch {}
  });

  socket.on("room-code-change", ({ roomId, code, username }) => {
    socket.to(`solve-${roomId}`).emit("room-code-update", { code, username });
  });

  /* ===== WebRTC Voice Signaling ===== */
  socket.on("voice-join", ({ roomId, username }) => {
    socket
      .to(`solve-${roomId}`)
      .emit("voice-user-joined", { username, socketId: socket.id });
  });

  socket.on("voice-leave", ({ roomId, username }) => {
    socket.to(`solve-${roomId}`).emit("voice-user-left", { username });
  });

  socket.on("voice-offer", ({ to, offer, from }) => {
    io.to(to).emit("voice-offer", {
      from: socket.id,
      offer,
      fromUsername: from,
    });
  });

  socket.on("voice-answer", ({ to, answer }) => {
    io.to(to).emit("voice-answer", { from: socket.id, answer });
  });

  socket.on("voice-ice-candidate", ({ to, candidate }) => {
    io.to(to).emit("voice-ice-candidate", { from: socket.id, candidate });
  });

  /* ===== Typing Indicators ===== */
  socket.on("typing-start", ({ from, to }) => {
    const recipientSockets = userSockets[to];
    if (recipientSockets) {
      for (const sid of recipientSockets) {
        io.to(sid).emit("user-typing", { from });
      }
    }
  });

  socket.on("typing-stop", ({ from, to }) => {
    const recipientSockets = userSockets[to];
    if (recipientSockets) {
      for (const sid of recipientSockets) {
        io.to(sid).emit("user-stopped-typing", { from });
      }
    }
  });

  /* ===== Message read receipt ===== */
  socket.on("mark-messages-read", async ({ from, to }) => {
    try {
      await run(
        "UPDATE messages SET read=1 WHERE from_user=? AND to_user=? AND read=0",
        [from, to],
      );
      const senderSockets = userSockets[from];
      if (senderSockets) {
        for (const sid of senderSockets) {
          io.to(sid).emit("messages-read", { by: to });
        }
      }
    } catch {}
  });

  /* ===== Room voice speaking indicator ===== */
  socket.on("voice-speaking", ({ roomId, username, speaking }) => {
    socket
      .to(`solve-${roomId}`)
      .emit("voice-speaking-update", { username, speaking });
  });

  /* ===== Friend challenge ===== */
  socket.on("challenge-friend", ({ from, to, problemId, problemTitle }) => {
    const recipientSockets = userSockets[to];
    if (recipientSockets) {
      for (const sid of recipientSockets) {
        io.to(sid).emit("challenge-received", {
          from,
          problemId,
          problemTitle,
        });
      }
    }
  });

  /* ===== Friend request notifications ===== */
  socket.on("notify-friend-request", ({ to, from }) => {
    const recipientSockets = userSockets[to];
    if (recipientSockets) {
      for (const sid of recipientSockets) {
        io.to(sid).emit("friend-request-received", { from });
      }
    }
  });

  /* ===== Legacy collab rooms ===== */
  socket.on("create-room", (data) => {
    const roomId = Math.random().toString(36).slice(2, 8).toUpperCase();
    rooms[roomId] = {
      host: socket.id,
      problem: data.problemId,
      code: data.code || "",
      users: [socket.id],
    };
    socket.join(roomId);
    socket.emit("room-created", { roomId });
  });
  socket.on("join-room", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) {
      socket.emit("room-error", { error: "Room not found" });
      return;
    }
    room.users.push(socket.id);
    socket.join(roomId);
    socket.emit("room-joined", {
      roomId,
      code: room.code,
      problem: room.problem,
    });
    io.to(roomId).emit("user-count", { count: room.users.length });
  });
  socket.on("code-change", ({ roomId, code }) => {
    if (rooms[roomId]) rooms[roomId].code = code;
    socket.to(roomId).emit("code-update", { code });
  });
  socket.on("cursor-move", ({ roomId, position }) => {
    socket.to(roomId).emit("cursor-update", { userId: socket.id, position });
  });

  /* ===== Disconnect cleanup ===== */
  socket.on("disconnect", async () => {
    const userData = onlineUsers[socket.id];
    if (userData) {
      const { username } = userData;
      if (userSockets[username]) {
        userSockets[username].delete(socket.id);
        if (userSockets[username].size === 0) {
          delete userSockets[username];
          try {
            await run(
              "UPDATE users SET status='offline', last_seen=? WHERE username=?",
              [new Date().toISOString(), username],
            );
          } catch {}
          socket.broadcast.emit("user-offline", { username });
        }
      }
      delete onlineUsers[socket.id];
    }
    // Clean up solve rooms
    for (const [roomId, members] of Object.entries(solveRoomMembers)) {
      const idx = members.findIndex((m) => m.socketId === socket.id);
      if (idx !== -1) {
        const removed = members.splice(idx, 1)[0];
        io.to(`solve-${roomId}`).emit("room-members-updated", {
          roomId,
          members: members.map((m) => m.username),
        });
        io.to(`solve-${roomId}`).emit("voice-user-left", {
          username: removed.username,
        });
        if (members.length === 0) delete solveRoomMembers[roomId];
      }
    }
    // Legacy rooms cleanup
    for (const [roomId, room] of Object.entries(rooms)) {
      room.users = room.users.filter((u) => u !== socket.id);
      if (room.users.length === 0) delete rooms[roomId];
      else io.to(roomId).emit("user-count", { count: room.users.length });
    }
  });
});

(async () => {
  await initDb();
  await Promise.all([_explainInit, _forgeInit, _liveInit]);
  // Give every account its own progress/XP/settings (one-time, idempotent).
  await migratePerUser();
  // Award achievements already earned by existing progress (once per user).
  try {
    const owners = await all(
      `SELECT DISTINCT p.username FROM progress p
       WHERE p.status='solved' AND p.username<>''
       AND NOT EXISTS (SELECT 1 FROM user_achievements ua WHERE ua.username=p.username)`,
    );
    for (const { username } of owners) {
      const last = await get(
        "SELECT problem_rowid FROM progress WHERE username=? AND status='solved' ORDER BY solved_at DESC LIMIT 1",
        [username],
      );
      if (last) await runAs(username, () => checkAchievements(last.problem_rowid, "AC", { backfill: true }));
    }
  } catch (e) {
    console.error("[achievements] backfill failed:", e.message);
  }

  /* ── Global 404 handler (after all routes) ── */
  app.use((req, res) => {
    if (req.path.startsWith("/api/")) {
      return res
        .status(404)
        .json({ ok: false, error: "API endpoint not found" });
    }
    // SPA fallback — new React client owns client-side routes; fall back to
    // the legacy SPA when no client build exists.
    res.sendFile(
      HAS_CLIENT_BUILD
        ? path.join(CLIENT_DIST, "index.html")
        : path.join(__dirname, "..", "public", "index.html"),
    );
  });

  /* ── Global error handler ── */
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    const isDev = !IS_PROD;
    console.error(
      `[${new Date().toISOString()}] ${req.method} ${req.path} → ${status}:`,
      err.message,
    );
    res.status(status).json({
      ok: false,
      error: status < 500 ? err.message : "Internal server error",
      ...(isDev && { stack: err.stack }),
    });
  });

  server.listen(PORT, () => {
    console.log(`\n🚀 Nexora running on ${APP_URL}`);
    console.log(`   NODE_ENV : ${process.env.NODE_ENV || "development"}`);
    console.log(`   Port     : ${PORT}`);
    console.log(
      `   OAuth    : GitHub=${!!process.env.GITHUB_CLIENT_ID} Google=${!!process.env.GOOGLE_CLIENT_ID}\n`,
    );
  });

  /* ── Graceful shutdown ── */
  const shutdown = (signal) => {
    console.log(
      `\n[shutdown] ${signal} received — closing server gracefully...`,
    );
    server.close(() => {
      console.log("[shutdown] HTTP server closed. Goodbye.");
      process.exit(0);
    });
    // Force close after 10s
    setTimeout(() => {
      console.error("[shutdown] Forced exit.");
      process.exit(1);
    }, 10000);
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("uncaughtException", (err) => {
    console.error("[uncaughtException]", err);
    if (IS_PROD) shutdown("uncaughtException");
  });
  process.on("unhandledRejection", (reason) => {
    console.error("[unhandledRejection]", reason);
  });

  // Background pre-scraper: silently scrape un-cached statements
  _backgroundScrape();
})();

/* ========== Background Pre-Scraper ========== */
async function _backgroundScrape() {
  const BG_BATCH = 30;
  try {
    // Prioritize non-CF (fast HTTP scraping) first, then CF (Puppeteer)
    const httpPending = await all(
      `
      SELECT p.* FROM problems p
      LEFT JOIN problem_statements ps ON ps.problem_rowid = p.id
      WHERE ps.problem_rowid IS NULL AND p.platform != 'codeforces'
      ORDER BY p.rating ASC LIMIT ?`,
      [BG_BATCH],
    );

    const cfPending = await all(
      `
      SELECT p.* FROM problems p
      LEFT JOIN problem_statements ps ON ps.problem_rowid = p.id
      WHERE ps.problem_rowid IS NULL AND p.platform = 'codeforces'
      ORDER BY p.rating ASC LIMIT ?`,
      [Math.max(5, BG_BATCH - httpPending.length)],
    );

    const pending = [...httpPending, ...cfPending];
    if (!pending.length) {
      console.log("[bg-scrape] All problems already cached.");
      return;
    }
    console.log(
      `[bg-scrape] Pre-scraping ${pending.length} problems (${httpPending.length} HTTP + ${cfPending.length} CF)...`,
    );

    let ok = 0,
      fail = 0;
    for (const problem of pending) {
      try {
        // Use fast HTTP for non-CF, Puppeteer for CF
        let data;
        if (problem.platform !== "codeforces") {
          data = await scrapePageHTTP(problem);
        }
        if (!data || (data.statement || "").trim().length <= 10) {
          data = await scrapePage(problem);
        }
        if (data && (data.statement || "").trim().length > 10) {
          await _saveStatement(problem.id, data);
          ok++;
        } else {
          fail++;
        }
      } catch {
        fail++;
      }
      // Polite delay: shorter for HTTP, longer for Puppeteer
      await new Promise((r) =>
        setTimeout(r, problem.platform === "codeforces" ? 2500 : 800),
      );
    }
    console.log(`[bg-scrape] Done: ${ok} cached, ${fail} failed.`);

    // Schedule next batch
    setTimeout(_backgroundScrape, 30000);
  } catch (e) {
    console.error("[bg-scrape] Error:", e.message);
  }
}
