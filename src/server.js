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
// NOTE: puppeteer is required lazily inside getBrowser() — its module init can
// hang in some environments and must never block server startup.
const http = require("http");
const session = require("express-session");
const passport = require("passport");
const GitHubStrategy = require("passport-github2").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { Server: SocketServer } = require("socket.io");
const { run, get, all, runBatch, initDb, dbInfo, migratePerUser } = require("./db");
const { getCatalog, getOpenCatalog, topicPool, filterIndices, filterKey, sortIndices, tagList, randomPick, likeMatcher } = require("./problem-catalog");
const dbStats = require("./db-stats");
const { sharedCache } = require("./shared-cache");
const { requestContext, me, meSql, runAs, queryCount } = require("./context");
const { recordContestRun, canSeeContestProblem } = require("./routes/hosted-contests");
const { DbSessionStore } = require("./session-store");
const { isSetAvatar, normalizeAvatar } = require("./avatar-set");
const { restoreUploads } = require("./upload-store");
const { authz } = require("./middleware/authz");
const { createAccessControl, initAdminSystem, socketAccess } = require("./authz/access");
const { can, hasAnyAdminPerm, mayUseHive } = require("./authz/permissions");
const { createAdminRouter } = require("./routes/admin");
const { createSocialRouter } = require("./routes/social");
const {
  clearSessionUser,
  createStudioAuth,
  getSessionUser,
  persistSessionUser,
  requireAuthenticatedUser,
  requireSelfOrAdmin,
} = require("./middleware/auth");
const { createAuthRouter } = require("./routes/auth");
const { createLearningRouter } = require("./routes/learning");
const { createLearnRouter } = require("./routes/learn");
const { createGateRouter, loadGateBank } = require("./routes/gate");
const { createGateMeRouter } = require("./routes/gate-me");
const { createGateNotesRouter, loadGateNotes } = require("./routes/gate-notes");
const { createStudioRouter } = require("./routes/studio");
const { createAgentRouter } = require("./routes/agent");
const { createVoiceRouter } = require("./routes/voice");
const { weaknessAnalysis } = require("./ai/data");
const { createForgeRouter } = require("./routes/forge");
const { createLiveRouter } = require("./routes/live");
const { createHiveRouter } = require("./routes/hive");
const { attachHive } = require("./hive/hub");
const { initForgeDb } = require("./forge-db");
const { initLiveDb } = require("./live-db");
const {
  fetchCodeforcesContests,
  fetchCodechefContests,
  fetchAtcoderContests,
} = require("./sync");
const { judge, quickRun, LANG_CONFIG, hasRemote, REMOTE_ONLY } = require("./judge");
const { createAiAssistRouter } = require("./ai-assist");
const {
  deployConfig,
  corsOrigin,
  isOriginAllowed,
  sessionCookie,
  publicRedirect,
} = require("./deploy-config");
const sentry = require("./sentry");

const IS_PROD = process.env.NODE_ENV === "production";
const APP_URL =
  process.env.APP_URL ||
  // Render sets RENDER_EXTERNAL_URL (e.g. https://nexora.onrender.com) automatically.
  process.env.RENDER_EXTERNAL_URL ||
  `http://localhost:${process.env.PORT || 3000}`;
// Split deploy (site and API on different hosts) — see src/deploy-config.js.
const DEPLOY = deployConfig();

/* ========== Lightweight HTTP Scrapers (fast, no browser) ========== */
// The same honest User-Agent the problem sources use: it says who we are. We
// never dress up as a desktop browser to get past a judge's bot check.
const SCRAPE_UA = require("./sources/common").UA;

/* Statement media (URL rewriting + the image-proxy allowlist) and the
   per-platform math rewrite live in ./statement-media; fetching statements
   lives in ./sources (one module per judge). */
const { normalizeStatement } = require("./statement-media");

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
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
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

// DB_STATS=1: attribute every request's rows read/written to its endpoint
// (GET /api/admin/db-stats). Must be first so session queries count too.
if (dbStats.ENABLED) app.use(dbStats.requestMiddleware());

/* ── Trust proxy (for Caddy / Nginx / Cloudflare / Railway / Render) ── */
// Default: 1 hop in production (Render's proxy, or Caddy on the VM — Caddy
// rewrites X-Forwarded-For to the real visitor IP). TRUST_PROXY overrides.
if (DEPLOY.trustProxy !== false) app.set("trust proxy", DEPLOY.trustProxy);

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
          // The in-browser voice (Settings → Voice → Kokoro, opt-in): ONNX Runtime loads its WebAssembly glue from a blob: URL inside its worker.
          "blob:",
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
        // The AI course lessons run Python in the browser (Pyodide, from jsDelivr, pinned in client/src/learn/python/runtime.ts).
        // Kokoro (Settings → Voice, opt-in): its model files come from Hugging Face and its CDN.
        // The virtual teacher (Settings → Virtual teacher): the 3D loader unpacks the model's own textures from blob: URLs.
        connectSrc: ["'self'", "blob:", "wss:", "ws:", "https://cdn.jsdelivr.net", "https://huggingface.co", "https://*.huggingface.co", "https://*.hf.co"],
        workerSrc: ["'self'", "blob:"],
        frameSrc: ["'self'", "https://www.youtube.com", "https://www.youtube-nocookie.com", "https://player.vimeo.com"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        upgradeInsecureRequests: IS_PROD ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false, // Monaco CDN workers
    // The split deploy shows /uploads images from the API host on pages of the
    // site host (same-site: api.nexoraguru.in → nexoraguru.in).
    crossOriginResourcePolicy: {
      policy: DEPLOY.publicUrl || process.env.CLIENT_ORIGINS ? "same-site" : "same-origin",
    },
    hsts: IS_PROD
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
  }),
);

/* ── CORS ── */
// CLIENT_ORIGINS (comma-separated) lists the sites allowed to call the API with
// cookies, e.g. https://nexoraguru.in,https://www.nexoraguru.in. Unset keeps
// the old behaviour (any origin in dev; APP_URL + localhost:3000 in prod).
app.use(
  cors({
    origin: corsOrigin(DEPLOY),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

/* ── Body parsing ── */
// Social image uploads carry a 2 MB image as base64 (~2.7 MB of JSON).
app.use("/api/social/upload", express.json({ limit: "3mb" }));
// Handwritten solutions arrive as pages of images (src/routes/hand.js).
app.use("/api/hand", express.json({ limit: "45mb" }));
// A coding problem's tests can be large (src/authoring.js caps them at 8 MB in all).
app.use("/api/authoring", express.json({ limit: "12mb" }));
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

// Kept in a variable so socket.io can reuse it (see io.engine.use below) and
// identify sockets by the same signed-in session as HTTP requests.
const sessionMiddleware = session({
  secret: sessionSecret || "nexora-dev-fallback-secret-do-not-use-in-prod",
  // Sessions are stored in the database so logins survive restarts/redeploys.
  store: new DbSessionStore(),
  resave: false,
  saveUninitialized: false,
  name: "nx.sid",
  // secure in production, httpOnly, sameSite lax, optional COOKIE_DOMAIN.
  cookie: sessionCookie(DEPLOY),
});
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());
// Roles, permissions, bans, private mode and feature flags for every request
// (pages and API) — see src/authz/access.js. Before requestContext so a banned
// user's request already runs signed out.
app.use(createAccessControl());
// Admin → Staff access: hidden / read-only / editable per Admin section.
app.use(require("./authz/sections").sectionGate);
// Remember who is making each request (per-user progress queries read it).
app.use(requestContext(getSessionUser));
// DB_QUERY_STATS=1 logs DB round trips + wall time per API request (perf tooling).
if (process.env.DB_QUERY_STATS === "1") {
  app.use("/api", (req, res, next) => {
    const t0 = process.hrtime.bigint();
    res.on("finish", () => {
      const ms = Number(process.hrtime.bigint() - t0) / 1e6;
      console.log(`[dbq] ${req.method} ${req.originalUrl.split("?")[0]} q=${queryCount()} ${ms.toFixed(1)}ms`);
    });
    next();
  });
}
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
        callbackURL: `${DEPLOY.apiUrl}/auth/github/callback`,
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
        callbackURL: `${DEPLOY.apiUrl}/auth/google/callback`,
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
    // Fresh session id once the provider has vouched for this person, so a
    // session id planted beforehand never becomes signed in (fixation).
    await new Promise((resolve, reject) =>
      req.session.regenerate((err) => (err ? reject(err) : resolve())),
    );
    if (linked) {
      // Lazy avatar migration (see /api/user/login).
      if (!isSetAvatar(linked.avatar)) {
        linked.avatar = normalizeAvatar(linked.avatar, linked.username);
        await run("UPDATE users SET avatar=? WHERE username=?", [linked.avatar, linked.username]).catch(() => {});
      }
      persistSessionUser(req, linked);
      return req.session.save(() => res.redirect(publicRedirect(DEPLOY, `/?auth=${provider}&linked=1`)));
    }
    req.session.oauthUser = o;
    req.session.save(() => res.redirect(publicRedirect(DEPLOY, `/?auth=${provider}`)));
  } catch (e) {
    next(e);
  }
}
app.get("/auth/github", authLimiter, (req, res, next) => {
  if (!process.env.GITHUB_CLIENT_ID)
    return res.redirect(publicRedirect(DEPLOY, "/?auth_error=github_not_configured"));
  passport.authenticate("github", { scope: ["user:email"] })(req, res, next);
});
app.get(
  "/auth/github/callback",
  // Without this guard an unconfigured provider throws "Unknown authentication
  // strategy" and the caller gets a raw 500 instead of a readable message.
  (req, res, next) => {
    if (!process.env.GITHUB_CLIENT_ID) {
      return res.redirect(publicRedirect(DEPLOY, "/?auth_error=github_not_configured"));
    }
    passport.authenticate("github", { failureRedirect: publicRedirect(DEPLOY, "/?auth_error=github_failed") })(req, res, next);
  },
  (req, res, next) => finishOAuth(req, res, next, "github"),
);

/* ── Connect GitHub to a signed-in account (Settings → Platforms) ──
   The same OAuth app as GitHub sign-in; its callback is a sub-path of the
   registered one, which GitHub allows. The state ties the answer to this
   session and this account. src/accounts.js reads the account, revokes the
   token and stores only public numbers. */
const GH_LINK_BACK = (q) => publicRedirect(DEPLOY, `/settings?tab=platform&${q}`);
app.get("/auth/github/link", authLimiter, (req, res) => {
  if (!me()) return res.redirect(publicRedirect(DEPLOY, "/?auth_error=signin_first"));
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) return res.redirect(GH_LINK_BACK("link_error=github_not_configured"));
  const state = crypto.randomBytes(16).toString("hex");
  req.session.ghLink = { state, user: me(), at: Date.now() };
  req.session.save(() =>
    res.redirect(require("./accounts").githubAuthorizeUrl({ clientId: process.env.GITHUB_CLIENT_ID, redirectUri: `${DEPLOY.apiUrl}/auth/github/callback/link`, state })),
  );
});
app.get("/auth/github/callback/link", authLimiter, async (req, res) => {
  const pending = req.session.ghLink;
  delete req.session.ghLink;
  const fresh = pending && Date.now() - pending.at < 10 * 60_000;
  if (!fresh || !pending.user || pending.user !== me() || typeof req.query.state !== "string" || req.query.state !== pending.state) {
    return req.session.save(() => res.redirect(GH_LINK_BACK("link_error=expired")));
  }
  if (req.query.error || typeof req.query.code !== "string") return req.session.save(() => res.redirect(GH_LINK_BACK("link_error=denied")));
  try {
    await require("./accounts").githubLink(me(), {
      code: req.query.code,
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      redirectUri: `${DEPLOY.apiUrl}/auth/github/callback/link`,
    });
    await awardPlatformBadges().catch(() => {});
    req.session.save(() => res.redirect(GH_LINK_BACK("linked=github")));
  } catch (e) {
    req.session.save(() => res.redirect(GH_LINK_BACK(`link_error=${encodeURIComponent(String(e.message || "failed").slice(0, 160))}`)));
  }
});

app.get("/auth/google", authLimiter, (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID)
    return res.redirect(publicRedirect(DEPLOY, "/?auth_error=google_not_configured"));
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
      return res.redirect(publicRedirect(DEPLOY, "/?auth_error=google_not_configured"));
    }
    passport.authenticate("google", { failureRedirect: publicRedirect(DEPLOY, "/?auth_error=google_failed") })(req, res, next);
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
      // index.html names the current build's files: always check it, so a deploy
      // shows on the next load. Hashed build files never change: cache them for good.
      setHeaders(res, filePath) {
        if (filePath.endsWith("index.html")) res.setHeader("Cache-Control", "no-cache");
        else if (filePath.includes(`${path.sep}assets${path.sep}`)) res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      },
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
    // /forgebuilder, /live-class serve the real pages instead
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
    // 'all' syncs every source that is switched on; a platform id syncs that one.
    const sources = require("./sources");
    const { platform } = req.body || {};
    const off = await sources.disabledPlatforms();
    const ids = platform === "all" || !platform ? sources.MODULES.filter((id) => !off.has(id)) : [String(platform)];
    if (!ids.every((id) => sources.SOURCES[id])) return res.status(400).json({ ok: false, error: "Unknown platform" });
    let inserted = 0;
    let updated = 0;
    const errors = {};
    for (const id of ids) {
      try {
        const r = await sources.syncSource(id, { by: me() });
        inserted += r.added;
        updated += r.updated;
      } catch (e) {
        errors[id] = e.message;
      }
    }
    const total = (await get("SELECT COUNT(*) as c FROM problems")).c;
    await run(
      `INSERT OR REPLACE INTO settings(key,value) VALUES('last_sync',?)`,
      [new Date().toISOString()],
    );
    res.json({ ok: Object.keys(errors).length < ids.length, inserted, updated, total, errors });
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
      topic,
      status,
      search,
      sort,
      order,
      limit,
      offset,
    } = req.query;
    // Topics: ?topic=dp,graphs (all must match), and in the search box
    // `topic:dp` or a topic's whole name ("dynamic programming").
    const topicMod = require("./topics");
    const asked = topicMod.topicsInQuery(search ? String(search) : "");
    const topicIds = [...new Set([...String(topic || "").split(",").map((t) => topicMod.findTopic(t, true)).filter(Boolean), ...asked.ids])];
    // Clamp both: LIMIT -1 means "no limit" to SQLite, and NaN binds as NULL.
    const lim = Math.min(Math.max(Math.trunc(+limit) || 50, 1), 200);
    const off = Math.max(Math.trunc(+offset) || 0, 0);
    // Filters, search, sort and counts come from the in-memory catalog (no
    // table scan); only this user's progress rows are read, by index.
    const catalog = await getCatalog();
    const filters = {
      platform: platform && platform !== "all" ? String(platform) : "",
      minRating: minRating ? +minRating : null,
      maxRating: maxRating ? +maxRating : null,
      tag: tag ? String(tag) : "",
      search: asked.rest,
      exclude: await require("./sources").disabledPlatforms(),
      topics: topicIds,
      searchTopic: asked.orTopic,
    };
    const matched = filterIndices(catalog, filters);
    const st = status && status !== "all" ? String(status) : "";
    const statusFilter = st === "solved" || st === "attempted" || st === "unsolved" || st === "examples";
    let progress = null; // problem id -> progress row
    let indices = matched;
    if (statusFilter) {
      progress = await userProgressMap();
      indices = matched.filter((i) => {
        const s0 = progress.get(catalog.rows[i].id)?.status;
        if (st === "unsolved") return s0 == null || s0 === "unsolved";
        return (s0 == null ? "unsolved" : s0) === st;
      });
    }
    const sorted = sortIndices(
      catalog,
      indices,
      sort,
      order === "desc",
      statusFilter ? null : filterKey(filters),
    );
    const page = sorted.slice(off, off + lim).map((i) => catalog.rows[i]);
    if (!progress) progress = await userProgressMap(page.map((p) => p.id));
    const problems = page.map((p) => {
      const pr = progress.get(p.id);
      return {
        ...p,
        topics: topicList(p.topics),
        solve_status: pr?.status ?? "unsolved",
        attempts: pr ? pr.attempts : null,
        xp_earned: pr ? pr.xp_earned : null,
        solved_at: pr ? pr.solved_at : null,
      };
    });
    res.json({ ok: true, total: indices.length, problems, limit: lim, offset: off, ...(topicIds.length ? { topics: topicIds } : {}) });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/**
 * The signed-in user's progress rows as a Map(problem id -> row), read by
 * index — all of them, or only those for `ids` (one page of problems).
 */
async function userProgressMap(ids) {
  const cols = "problem_rowid, status, attempts, xp_earned, solved_at";
  let rows;
  if (ids) {
    if (!ids.length) return new Map();
    rows = await all(
      `SELECT ${cols} FROM progress WHERE username=? AND problem_rowid IN (${ids.map(() => "?").join(",")})`,
      [me(), ...ids],
    );
  } else {
    rows = await all(`SELECT ${cols} FROM progress WHERE username=?`, [me()]);
  }
  return new Map(rows.map((r) => [r.problem_rowid, r]));
}

app.get("/api/problems/:id", async (req, res) => {
  try {
    const problem = await get(
      `SELECT p.*, COALESCE(pr.status,'unsolved') as solve_status, pr.attempts, pr.xp_earned, pr.notes, pt.ids AS topics
      FROM problems p LEFT JOIN progress pr ON pr.problem_rowid=p.id AND pr.username=${meSql()}
      LEFT JOIN problem_topics pt ON pt.problem_rowid=p.id WHERE p.id=?`,
      [req.params.id],
    );
    if (!problem || (problem.category === "__hidden" && !can(req, "problems.manage")))
      return res.status(404).json({ ok: false, error: "Not found" });
    // Only this account's testcases: a custom case one user adds must never
    // show up in anyone else's deck.
    const testcases = await all(
      "SELECT * FROM testcases WHERE problem_rowid=? AND username=? ORDER BY id",
      [req.params.id, me()],
    );
    const [rows, summary] = await Promise.all([
      all(
        "SELECT id,verdict,exec_time_ms,submitted_at,language,test_results FROM submissions WHERE username=? AND problem_rowid=? ORDER BY submitted_at DESC LIMIT 20",
        [me(), req.params.id],
      ),
      get(
        `SELECT COUNT(*) as attempts, MIN(submitted_at) as firstAt,
           MIN(CASE WHEN verdict='AC' THEN submitted_at END) as firstAcAt,
           MIN(CASE WHEN verdict='AC' THEN exec_time_ms END) as bestMs,
           COUNT(CASE WHEN verdict='AC' THEN 1 END) as accepted,
           COUNT(DISTINCT language) as languages
         FROM submissions WHERE username=? AND problem_rowid=?`,
        [me(), req.params.id],
      ),
    ]);
    // Tests passed out of tests run, from the stored results (not sent whole).
    const submissions = rows.map(({ test_results, ...r }) => {
      let passed = null;
      let total = null;
      try {
        const t = JSON.parse(test_results || "[]");
        if (Array.isArray(t) && t.length) {
          total = t.length;
          passed = t.filter((x) => x && x.passed).length;
        }
      } catch {
        /* an old row without results */
      }
      return { ...r, passed, total };
    });
    // Attempts before the first Accepted, and how long it took from the first try.
    let analysis = null;
    if (summary && summary.attempts) {
      const before = summary.firstAcAt
        ? (await get("SELECT COUNT(*) as c FROM submissions WHERE username=? AND problem_rowid=? AND submitted_at < ?", [me(), req.params.id, summary.firstAcAt]))?.c || 0
        : null;
      analysis = {
        attempts: summary.attempts,
        accepted: summary.accepted,
        languages: summary.languages,
        firstAt: summary.firstAt,
        firstAcAt: summary.firstAcAt,
        triesToAccept: before === null ? null : before + 1,
        minutesToAccept: summary.firstAcAt ? Math.max(0, Math.round((Date.parse(summary.firstAcAt) - Date.parse(summary.firstAt)) / 60000)) : null,
        bestMs: summary.bestMs,
      };
    }
    problem.topics = topicList(problem.topics);
    res.json({ ok: true, problem, testcases, submissions, analysis });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/** A catalog row's topic ids as a list (stored as a JSON string). */
function topicList(raw) {
  if (Array.isArray(raw)) return raw;
  try {
    const a = JSON.parse(raw || "[]");
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

/* ========== Save scraped statement helper ========== */
async function _saveStatement(problemId, data) {
  await run(
    `INSERT OR REPLACE INTO problem_statements
    (problem_rowid, statement, input_spec, output_spec, note, time_limit, memory_limit, samples, scraped_at, extra)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      JSON.stringify(data.extra || {}),
    ],
  );
  // Store the statement's media now, from absolute URLs (judges often write
  // relative ones), so the figures are ours before anyone opens the problem.
  const row = await get("SELECT platform FROM problems WHERE id=?", [problemId]).catch(() => null);
  const { normalizeStatementHtml } = require("./statement-media");
  keepStatementMedia(normalizeStatementHtml([data.statement, data.inputSpec, data.outputSpec, data.note].join("\n"), { platform: row?.platform }));
  // The statement makes the topics surer (its words count too): reclassify,
  // in the background (it never delays the page).
  require("./topics").classifyProblem(problemId).catch((e) => console.warn("[topics]", e.message));
}
// Admin re-imports (src/sources/audit.js) save through the same path.
require("./sources/audit").useSaver((id, data) => _saveStatement(id, data), (html) => keepStatementMedia(html));

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

// Host/bucket allowlist and the raster-image/video/audio type allowlist (no SVG).
const { isProxyableUrl, isProxyableMediaType } = require("./statement-media");

// The media fetcher (allowlisted hosts and types, capped size) lives in
// src/media-fetch.js, shared with the statement backfill job.
const { discardBody, readBodyCapped, fetchProxiedMedia } = require("./media-fetch");

/** Saved copy, else fetch and save. Throws when neither has it. */
async function loadStatementMedia(url) {
  const store = require("./media-store");
  const saved = await store.load(url.toString()).catch(() => null);
  if (saved) return saved;
  const entry = await fetchProxiedMedia(url);
  store.save(url.toString(), entry); // background; never blocks the response
  return entry;
}

/**
 * When a statement is saved, fetch and keep its images at once (a few at a
 * time, in the background), so the figures are already safe the first time
 * anyone opens the problem — even if the judge blocks us later.
 */
function keepStatementMedia(html) {
  const store = require("./media-store");
  const urls = store.mediaUrls(html).filter((u) => isProxyableUrl(u)).slice(0, 24);
  if (!urls.length) return;
  (async () => {
    for (const u of urls) {
      const key = new URL(u).toString();
      if (imgCacheGet(key)) continue;
      try {
        imgCachePut(key, await loadStatementMedia(new URL(u)));
      } catch {
        /* the browser still tries the judge directly, then the proxy again */
      }
    }
  })().catch(() => {});
}

app.get("/api/imgproxy", async (req, res) => {
  const url = String(req.query.url || "");
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).end();
  }
  if (!isProxyableUrl(parsed)) {
    return res.status(403).end();
  }
  const key = parsed.toString();

  const serve = (entry) => {
    // Third-party bytes on our origin: never sniffed, never scriptable.
    const ext = (entry.ctype.split("/")[1] || "bin").replace(/[^a-z0-9]/gi, "").slice(0, 8) || "bin";
    res.set({
      "Content-Type": entry.ctype,
      "Cache-Control": "public, max-age=604800, immutable",
      ETag: entry.etag,
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `inline; filename="media.${ext}"`,
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
      // The saved copy first (it survives the judge moving or blocking the file),
      // then the judge; a fresh fetch is saved for next time.
      work = loadStatementMedia(parsed).finally(() => imgInflight.delete(key));
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
// A problem whose statement is a PDF (UVa): relay the judge's public PDF from
// our origin so the problem page can show it inline (the CSP allows only
// same-origin frames). Only the judge's own host is ever fetched.
const PDF_HOSTS = new Set(["onlinejudge.org"]);
app.get("/api/problem-pdf/:id", async (req, res) => {
  try {
    const row = await get(
      "SELECT p.platform, p.problem_id, s.extra FROM problems p LEFT JOIN problem_statements s ON s.problem_rowid = p.id WHERE p.id = ?",
      [req.params.id],
    );
    let pdf = "";
    try {
      pdf = JSON.parse(row?.extra || "{}").pdf || "";
    } catch {}
    let u;
    try {
      u = new URL(pdf);
    } catch {
      return res.status(404).json({ ok: false, error: "No PDF for this problem" });
    }
    if (u.protocol !== "https:" || !PDF_HOSTS.has(u.hostname) || !/\.pdf$/i.test(u.pathname)) {
      return res.status(404).json({ ok: false, error: "No PDF for this problem" });
    }
    const { http: fetchSource } = require("./sources/common");
    const r = await fetchSource(u.href, { timeoutMs: 20000, accept: "application/pdf" });
    if (!r.ok) return res.status(502).json({ ok: false, error: `The judge answered ${r.status}` });
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 15 * 1024 * 1024 || buf.subarray(0, 4).toString() !== "%PDF") {
      return res.status(502).json({ ok: false, error: "Not a PDF" });
    }
    res.set("Content-Type", "application/pdf");
    res.set("Content-Disposition", "inline");
    res.set("Cache-Control", "public, max-age=86400");
    res.send(buf);
  } catch (e) {
    res.status(502).json({ ok: false, error: errMessage(e) });
  }
});

/* Statements from the judge within a time budget (src/statement-fetch.js). */
const { makeStatementFetcher, STILL_FETCHING } = require("./statement-fetch");
const statementFetcher = makeStatementFetcher({
  fetch: (problem) => require("./sources").fetchStatement(problem),
  save: (id, data) => _saveStatement(id, data),
  budgetMs: Number(process.env.STATEMENT_BUDGET_MS) || 40000,
  log: (problem, e) => console.log(`[statement] ✗ ${problem.platform} ${problem.problem_id}: ${e.message}`),
});

app.get("/api/problem-statement/:id", async (req, res) => {
  try {
    const problem = await get("SELECT * FROM problems WHERE id=?", [
      req.params.id,
    ]);
    // An unpublished NexoraGuru problem is staff-only, even by direct link.
    if (!problem || (problem.category === "__hidden" && !can(req, "problems.manage")))
      return res.status(404).json({ ok: false, error: "Not found" });
    // Someone is reading a Codeforces problem: get its official tests ready
    // for their first submission (background, once per problem).
    if (problem.platform === "codeforces") require("./sources/cf-dataset").fetchTests(problem.problem_id);

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
        extra: (() => {
          try {
            return JSON.parse(local.extra || "{}");
          } catch {
            return {};
          }
        })(),
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

    // 3. The platform's source module (API / page / dataset / archive),
    // within STATEMENT_BUDGET_MS: past that the page hears "still fetching"
    // (never a timeout error), while the fetch carries on and stores the
    // statement for the next visit. One fetch per problem at a time.
    const data = await statementFetcher.within(problem);
    if (data === STILL_FETCHING) {
      return res.json({ ok: true, unavailable: true, pending: true, url: problem.url, statement: "", samples: [], inputSpec: "", outputSpec: "", note: "", timeLimit: "", memLimit: "", platform: problem.platform, source: "pending" });
    }
    if (data) {
      const norm = normalizeStatement(data, problem);
      return res.json({
        ok: true,
        ...norm,
        extra: data.extra || {},
        platform: problem.platform,
        source: "live",
      });
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

    // 5. The judge wouldn't give us the statement (often a bot check in front
    // of its pages). Say so plainly; the page shows a card that opens it on
    // the judge, and the solver still works with the person's own tests.
    res.json({
      ok: true,
      unavailable: true,
      url: problem.url,
      statement: "",
      samples: [],
      inputSpec: "",
      outputSpec: "",
      note: "",
      timeLimit: "",
      memLimit: "",
      platform: problem.platform,
      source: "unavailable",
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* ========== SCRAPE STATS ========== */
// Statement coverage per platform: problem counts from the in-memory catalog,
// the cached-statement ids read at most every 10 minutes (not on each call).
let _scrapeStats = null;
app.get("/api/scrape-stats", async (_req, res) => {
  try {
    const catalog = await getCatalog();
    if (!_scrapeStats || _scrapeStats.catalog !== catalog || Date.now() - _scrapeStats.at > 10 * 60 * 1000) {
      const ids = new Set((await all("SELECT problem_rowid FROM problem_statements")).map((r) => r.problem_rowid));
      const per = new Map();
      for (const p of catalog.rows) {
        const e = per.get(p.platform) || { platform: p.platform, scraped: 0, total: 0 };
        e.total++;
        if (ids.has(p.id)) e.scraped++;
        per.set(p.platform, e);
      }
      const byPlatform = [...per.values()].sort((x, y) => (x.platform < y.platform ? -1 : x.platform > y.platform ? 1 : 0));
      _scrapeStats = { at: Date.now(), catalog, total: catalog.rows.length, scraped: ids.size, byPlatform };
    }
    const { total, scraped, byPlatform } = _scrapeStats;
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
app.use(require("./routes/coding").createCodingRouter({ get, run, me, aiLimiter, judgeLimiter }));
app.use(require("./routes/sources").createSourcesRouter({ can, me, invalidateCatalog: () => require("./problem-catalog").invalidateCatalog(), backfill: { start: () => startStatementBackfill(), pause: () => pauseStatementBackfill(), status: () => statementBackfillStatus() } }));
// Topics of every problem: the list, each problem's topics, staff corrections, the backfill (src/topics.js).
app.use(require("./routes/topics").createTopicsRouter({ can, me }));
// Problem sets: your own, public ones by likes, famous series and company lists (src/routes/problem-sets.js).
app.use(require("./routes/problem-sets").createProblemSetsRouter({ can, me }));
// Staff: "Add a coding problem" (official NexoraGuru problems).
app.use(
  require("./routes/authoring").createAuthoringRouter({
    can,
    me,
    invalidateCatalog: () => require("./problem-catalog").invalidateCatalog(),
    audit: (req, action, { targetType = null, target = null, before, after } = {}) =>
      run(
        "INSERT INTO audit_log(actor, actor_role, action, target_type, target, before, after, ip, created_at) VALUES(?,?,?,?,?,?,?,?,?)",
        [me() || "?", req.access?.role || null, action, targetType, target, before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null, req.ip || null, Date.now()],
      ),
  }),
);

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
/* Every testcase is a full execution (often a remote compile), so one request
   may carry only so many of them, and only so much stdin in total. */
const MAX_JUDGE_TESTCASES = 100;
const MAX_JUDGE_INPUT_BYTES = 1024 * 1024;

const parseJsonList = (v) => {
  try {
    const x = typeof v === "string" ? JSON.parse(v || "[]") : v;
    return Array.isArray(x) ? x : [];
  } catch {
    return [];
  }
};

/** One testcase in the shape judge() expects; `extra` overrides fields. */
const toCase = (tc, extra = {}) => ({
  id: tc?.id ?? undefined,
  label: tc?.label ? String(tc.label).slice(0, 60) : undefined,
  input: String(tc?.input ?? ""),
  expected_output: String(tc?.expected_output ?? tc?.output ?? ""),
  ...extra,
});
const isBlankCase = (c) => !c.input.trim() && !c.expected_output.trim();

function testcaseCapError(cases) {
  if (cases.length > MAX_JUDGE_TESTCASES)
    return `Too many testcases (max ${MAX_JUDGE_TESTCASES} per submission)`;
  const bytes = cases.reduce((n, c) => n + Buffer.byteLength(c.input), 0);
  if (bytes > MAX_JUDGE_INPUT_BYTES) return "Testcase input is too large (max 1 MB in total)";
  return null;
}

/**
 * What a platform problem is judged against — loaded here, never taken from
 * the request (a client-supplied list let anyone "solve" anything by sending
 * an empty or self-matching set). The statement's scraped samples always
 * count; the caller's own stored cases are added on top.
 */
async function problemTestcases(problemId) {
  const own = await all(
    "SELECT id, label, input, expected_output FROM testcases WHERE problem_rowid=? AND username=? ORDER BY id",
    [problemId, me()],
  );
  const cases = own.map((t) => toCase(t)).filter((c) => !isBlankCase(c));
  const seen = new Set(cases.map((c) => tcKey(c.input, c.expected_output)));
  const stmt = await get("SELECT samples FROM problem_statements WHERE problem_rowid=?", [problemId]);
  parseJsonList(stmt?.samples).forEach((s, i) => {
    const c = toCase(s, { id: undefined, label: `Sample ${i + 1}` });
    const k = tcKey(c.input, c.expected_output);
    if (isBlankCase(c) || seen.has(k)) return;
    seen.add(k);
    cases.push(c);
  });
  // Codeforces: the official tests (open dataset, exact-answer problems only),
  // once they're cached. The first time, they're fetched in the background and
  // this submission is judged on the examples.
  const prob = await get("SELECT platform, problem_id FROM problems WHERE id=?", [problemId]);
  if (prob?.platform === "codeforces") {
    const ds = require("./sources/cf-dataset");
    const official = await ds.cachedTests(prob.problem_id).catch(() => null);
    if (official == null) ds.fetchTests(prob.problem_id);
    let bytes = cases.reduce((n, c) => n + Buffer.byteLength(c.input), 0);
    for (const [i, t] of (official || []).entries()) {
      // Stay inside the judge's limits whatever the user added themselves.
      if (cases.length >= MAX_JUDGE_TESTCASES || bytes + Buffer.byteLength(t.input) > MAX_JUDGE_INPUT_BYTES) break;
      bytes += Buffer.byteLength(t.input);
      const c = toCase({ input: t.input, output: t.output }, { id: undefined, label: `Official test ${i + 1}`, hidden: true });
      const k = tcKey(c.input, c.expected_output);
      if (isBlankCase(c) || seen.has(k)) continue;
      seen.add(k);
      cases.push(c);
    }
  }
  return cases;
}

/** Only a Workshop problem's author (or an admin) may see its hidden tests. */
function canSeeHiddenTests(req, problem) {
  const u = me();
  if (u && problem.creator && problem.creator === u) return true;
  return can(req, "problems.manage");
}

/** A Workshop problem's samples (visible) and testcases (hidden). */
function customProblemTestcases(problem) {
  const samples = parseJsonList(problem.samples)
    .map((s, i) => toCase(s, { id: undefined, label: `Sample ${i + 1}` }))
    .filter((c) => !isBlankCase(c));
  const hidden = parseJsonList(problem.testcases)
    .map((t, i) => toCase(t, { id: undefined, label: `Hidden ${i + 1}`, hidden: true }))
    .filter((c) => !isBlankCase(c));
  return [...samples, ...hidden];
}

app.post("/api/judge", judgeLimiter, async (req, res) => {
  try {
    const { problem_id, custom_problem_id, code, testcases, language, contest_id } = req.body || {};
    const lang = LANG_CONFIG[language] ? language : "cpp";
    if (testcases != null && (!Array.isArray(testcases) || testcases.length > MAX_JUDGE_TESTCASES)) {
      return res.status(400).json({ ok: false, error: `testcases must be a list of at most ${MAX_JUDGE_TESTCASES}` });
    }
    const clientCases = (testcases || []).map((t) => toCase(t));

    let cases;
    let recordFor = null; // platform problem whose progress this verdict may update
    let redactHidden = false;
    let checker = null;
    // What the verdict rests on: a judge's own full tests, or only the examples.
    let coverage = null;
    let trustedKeys = null; // keys of the cases points may count (platform problems)
    const benchKeys = new Set(); // the NexoraGuru benchmark's tests, when it is used
    if (problem_id) {
      const prob = await get("SELECT id, platform, problem_id, category, url FROM problems WHERE id=?", [problem_id]);
      if (!prob || (prob.category === "__hidden" && !can(req, "problems.manage"))) return res.status(404).json({ ok: false, error: "Problem not found" });
      if (prob.platform === "nexora") {
        // An official NexoraGuru problem: its own tests (hidden ones are the
        // answer key: only staff see them) and its checker.
        const official = await require("./authoring").officialTests(prob.id);
        cases = official.cases;
        checker = official.checker;
        redactHidden = !can(req, "problems.manage");
      } else {
        cases = await problemTestcases(prob.id);
        // Official tests are only known for Codeforces (an open dataset); every
        // other judge keeps its tests private, so the examples are all there is.
        let official = cases.filter((c) => c.hidden).length;
        let full = official > 0;
        let cached = null;
        if (prob.platform === "codeforces") {
          const ds = require("./sources/cf-dataset");
          cached = await ds.cachedTests(prob.problem_id).catch(() => null);
          // Full = every official test ran (one that equals an example or the
          // student's own test runs once, under that name; one cut by the
          // judge's size limits did not run).
          if (cached && cached.length) {
            const ran = new Set(cases.map((c) => tcKey(c.input, c.expected_output)));
            official = cached.length;
            full = cached.every((t) => {
              const c = toCase({ input: t.input, output: t.output });
              return ran.has(tcKey(c.input, c.expected_output));
            });
          }
        }
        // No full official tests here: the NexoraGuru benchmark (examples, corner
        // cases, verified AI tests; src/testgen-benchmark.js), once one is made.
        let benchmark = 0;
        if (!full) {
          const bm = await require("./testgen-benchmark").benchmarkFor(get, prob.id);
          if (bm) {
            const ran = new Set(cases.map((c) => tcKey(c.input, c.expected_output)));
            let bytes = cases.reduce((n, c) => n + Buffer.byteLength(c.input), 0);
            for (const t of bm) {
              const c = toCase(t, { id: undefined, label: t.label });
              const k = tcKey(c.input, c.expected_output);
              benchKeys.add(k);
              // Within the judge's limits whatever the student added themselves.
              if (!ran.has(k) && cases.length < MAX_JUDGE_TESTCASES && bytes + Buffer.byteLength(c.input) <= MAX_JUDGE_INPUT_BYTES) {
                bytes += Buffer.byteLength(c.input);
                ran.add(k);
                cases.push(c);
              }
            }
            full = [...benchKeys].every((k) => ran.has(k));
            benchmark = bm.length;
          }
        }
        coverage = { full, official, judge: prob.platform, url: prob.url || null, ...(benchmark ? { benchmark } : {}) };
        if (!full && prob.platform === "codeforces" && !(cached && cached.length)) {
          const ds = require("./sources/cf-dataset");
          // "Being fetched" only while a download really runs; a failed one says so.
          if (cached == null) {
            if (ds.testsState(prob.problem_id) === "failed") coverage.failed = true;
            else coverage.pending = true;
          }
        }
      }
      // The tests points can rest on: the problem's own samples and the judge's
      // official tests — never tests the solver wrote (with their own answers).
      if (prob.platform === "nexora") trustedKeys = new Set(cases.map((c) => tcKey(c.input, c.expected_output)));
      else {
        const st = await get("SELECT samples FROM problem_statements WHERE problem_rowid=?", [prob.id]);
        trustedKeys = new Set([
          ...parseJsonList(st?.samples).map((x) => {
            const c = toCase(x);
            return tcKey(c.input, c.expected_output);
          }),
          ...cases.filter((c) => c.hidden).map((c) => tcKey(c.input, c.expected_output)),
          ...benchKeys,
        ]);
        // An official test the solver also typed in is still an official test.
        if (prob.platform === "codeforces") {
          const official = await require("./sources/cf-dataset").cachedTests(prob.problem_id).catch(() => null);
          for (const t of official || []) {
            const c = toCase({ input: t.input, output: t.output });
            trustedKeys.add(tcKey(c.input, c.expected_output));
          }
        }
      }
      // With nothing stored there is nothing to check, so nothing to record.
      if (cases.length) recordFor = prob.id;
    } else if (custom_problem_id) {
      const p = await get("SELECT id, creator, samples, testcases, contest_only FROM custom_problems WHERE id=?", [custom_problem_id]);
      if (!p || !(await canSeeContestProblem(p, me(), can(req, "contests.manage")))) return res.status(404).json({ ok: false, error: "Problem not found" });
      redactHidden = !canSeeHiddenTests(req, p);
      // Stored cases always run; the solver's own extra cases ride along.
      cases = customProblemTestcases(p);
      const seen = new Set(cases.map((c) => tcKey(c.input, c.expected_output)));
      for (const c of clientCases) {
        const k = tcKey(c.input, c.expected_output);
        if (!seen.has(k)) { seen.add(k); cases.push(c); }
      }
    } else {
      // Practice runs with no stored problem (Learn, scratch): nothing is recorded.
      cases = clientCases;
    }
    const capError = testcaseCapError(cases);
    if (capError) return res.status(400).json({ ok: false, error: capError });

    let result = await judge(code, cases, lang);
    if (checker) result = await require("./authoring").applyChecker(result, cases, checker, quickRun);
    if (redactHidden) {
      result.results = result.results.map((r, i) =>
        cases[i]?.hidden
          ? { ...r, input: "", expected: "", actual: "", stderr: r.passed ? "" : "Hidden testcase", hidden: true }
          : r,
      );
    }

    // Record submission
    let xpReport = null;
    if (recordFor) {
      const problem_id = recordFor;
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

      // Update progress. XP and the solved count are earned once per problem:
      // re-submitting an accepted solution must not farm either.
      const existing = await get(
        "SELECT * FROM progress WHERE username=? AND problem_rowid=?",
        [me(), problem_id],
      );
      // Owner's rule (session 9): passing only the examples (the judge's own
      // tests aren't here) earns the XP but not "solved" — the problem shows
      // "Passed the examples" and counts as solved only after a full check.
      // XP is earned once per problem, whichever came first.
      const accepted = result.verdict === "AC";
      const examplesOnly = accepted && !!coverage && !coverage.full;
      const fullPass = accepted && !examplesOnly;
      const firstSolve = fullPass && existing?.status !== "solved";
      const xpBefore = Number(existing?.xp_earned) || 0;
      // Owner's rule (2026-11-19): points follow the tests passed. Only the
      // problem's samples and the judge's official tests count; the best try
      // counts, and the rest comes when every test passes. Resubmitting never
      // earns the same points twice.
      const trusted = result.results.map((r, i) => ({ r, c: cases[i] })).filter(({ c }) => c && trustedKeys && trustedKeys.has(tcKey(c.input, c.expected_output)));
      const trustedPassed = trusted.filter(({ r }) => r.passed).length;
      const fullXp = await calcXp(problem_id);
      // All trusted tests passed (with the whole run accepted): the full points.
      // Some passed: that share. None to count on: nothing (own tests alone earn no points).
      const share = !trusted.length ? 0 : accepted ? 1 : trustedPassed / trusted.length;
      const xpNow = existing?.status === "solved" ? Math.max(xpBefore, fullXp) : Math.round(fullXp * share);
      const gainedXp = Math.max(0, xpNow - xpBefore);
      const partial = trusted.length ? { passed: trustedPassed, total: trusted.length, share, ofXp: fullXp } : null;
      // What this submit did to the level: the same calcLevel the Profile shows.
      if (accepted || gainedXp > 0) {
        const before = await myTotals();
        const after = { xp: before.xp + gainedXp, solved: before.solved + (firstSolve ? 1 : 0) };
        xpReport = {
          gainedXp,
          firstSolve,
          examplesOnly,
          partial,
          before: calcLevel(before.xp, before.solved),
          after: calcLevel(after.xp, after.solved),
          solved: after.solved,
        };
      }
      if (!existing) {
        await run(
          `INSERT INTO progress(username,problem_rowid,status,attempts,solved_at,xp_earned) VALUES(?,?,?,?,?,?)`,
          [
            me(),
            problem_id,
            fullPass ? "solved" : examplesOnly ? "examples" : "attempted",
            1,
            fullPass ? new Date().toISOString() : null,
            xpBefore + gainedXp,
          ],
        );
      } else {
        // Solved stays solved; "examples" rises to solved on a full check and
        // never falls back to "attempted" on a later wrong answer.
        const newStatus = existing.status === "solved" || fullPass ? "solved" : examplesOnly || existing.status === "examples" ? "examples" : "attempted";
        const xp = xpBefore + gainedXp;
        await run(
          `UPDATE progress SET status=?, attempts=attempts+1, solved_at=COALESCE(solved_at,?), xp_earned=? WHERE username=? AND problem_rowid=?`,
          [
            newStatus,
            fullPass ? new Date().toISOString() : null,
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
          firstSolve ? 1 : 0,
          gainedXp,
          firstSolve ? 1 : 0,
          gainedXp,
        ],
      );

      // Check achievements
      // Achievements are for solved problems: a full check, not the examples alone.
      await checkAchievements(problem_id, fullPass ? "AC" : result.verdict === "AC" ? "EX" : result.verdict, { firstSolve });
      // "Invite to solve": mark this person in open invites and refresh the cards.
      if (accepted) await require("./solve-invites").afterSolve(realtime, me(), Number(problem_id), { full: fullPass });
      invalidateCache();
    }

    // A run inside a contest counts there too (only while the person's time runs).
    let contest = null;
    if (contest_id && (problem_id || custom_problem_id)) {
      contest = await recordContestRun({
        contestId: contest_id,
        username: me(),
        problemRowid: problem_id ? Number(problem_id) : null,
        workshopId: problem_id ? null : Number(custom_problem_id),
        verdict: result.verdict,
        passed: result.results.filter((r) => r.passed).length,
        total: result.results.length,
        language: lang,
      }).catch((e) => ({ counted: false, reason: errMessage(e) }));
    }

    res.json({
      ok: true,
      ...result,
      ...(contest ? { contest } : {}),
      recorded: !!recordFor,
      ...(coverage ? { coverage } : {}),
      ...(xpReport ? { xp: xpReport } : {}),
      ...(problem_id && !recordFor
        ? { message: "This problem has no testcases yet — import the samples or add one, then submit." }
        : {}),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

app.post("/api/run", judgeLimiter, async (req, res) => {
  try {
    const { code, input, language } = req.body || {};
    const lang = LANG_CONFIG[language] ? language : "cpp";
    const stdin = input == null ? "" : String(input);
    if (Buffer.byteLength(stdin) > MAX_JUDGE_INPUT_BYTES)
      return res.status(400).json({ ok: false, error: "Input is too large (max 1 MB)" });
    const result = await quickRun(code, stdin, lang);
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* ========== HOW YOUR CODE RUNS ========== */
// The real translation of a program (assembly or bytecode), each instruction
// tied to its source line, for the animated "How it runs" view.
app.post("/api/explain-run", judgeLimiter, async (req, res) => {
  try {
    const { code, language, optimise } = req.body || {};
    if (!LANG_CONFIG[language]) return res.status(400).json({ ok: false, error: "Unknown language" });
    const src = String(code || "");
    if (!src.trim()) return res.status(400).json({ ok: false, error: "Write some code first" });
    if (Buffer.byteLength(src) > 64 * 1024) return res.status(400).json({ ok: false, error: "The code is too long to explain (max 64 KB)" });
    const explain = require("./explain-run");
    res.json(await explain.translate(src, language, { optimise: optimise !== false }));
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* ========== DRY RUN ========== */
// Run the student's program once with a tracer and return every step, for
// the animated dry run (src/dryrun/).
app.post("/api/dryrun", judgeLimiter, async (req, res) => {
  try {
    const { code, input, language } = req.body || {};
    if (!LANG_CONFIG[language]) return res.status(400).json({ ok: false, error: "Unknown language" });
    const src = String(code || "");
    if (!src.trim()) return res.status(400).json({ ok: false, error: "Write some code first" });
    if (Buffer.byteLength(src) > 64 * 1024) return res.status(400).json({ ok: false, error: "The code is too long to trace (max 64 KB)" });
    const stdin = input == null ? "" : String(input);
    if (Buffer.byteLength(stdin) > 64 * 1024) return res.status(400).json({ ok: false, error: "The input is too long to trace (max 64 KB)" });
    const dry = require("./dryrun");
    res.json(await dry.dryRun(src, language, stdin, quickRun));
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
      // The runners tried in order (our own Piston first when set up), so the
      // editor can say how many backups a language has.
      runners: REMOTE_ONLY ? require("./remote-exec").engineChain(id) : ["local"],
    })),
  );
});

/* Admin: run a tiny program in every language through the real judge.
   GET /api/admin/judge-selftest?langs=cpp,python  (all languages when omitted) */
app.get("/api/admin/judge-selftest", (req, res, next) =>
  can(req, "problems.manage")
    ? next()
    : // Non-admins get the same 404 as any unknown endpoint (see routes/admin.js).
      hasAnyAdminPerm(req)
      ? res.status(403).json({ ok: false, error: "Admin access required" })
      : res.status(404).json({ ok: false, error: "API endpoint not found" }),
async (req, res) => {
  try {
    const { selfTest } = require("./judge-selftest");
    const only = typeof req.query.langs === "string" && req.query.langs ? req.query.langs.split(",") : null;
    const results = await selfTest({ judge, LANG_CONFIG, hasRemote, REMOTE_ONLY }, only);
    const remote = require("./remote-exec");
    res.json({
      ok: true, remote: REMOTE_ONLY, passed: results.filter((r) => r.ok).length, total: results.length, results,
      // Which runners each language has, and which are resting after failing.
      runners: Object.fromEntries(Object.keys(LANG_CONFIG).map((l) => [l, remote.engineChain(l)])),
      health: remote.sandboxHealth(),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* ========== STATS ========== */
app.get("/api/stats", async (req, res) => {
  try {
    const result = await cachedResponse("stats", 3000, async () => {
      // Every read below is independent, so they are all started at once
      // (one round trip of latency instead of four sequential stages).
      const username = me();
      const today = new Date().toISOString().slice(0, 10);
      const userP = username
        ? get("SELECT xp_override, solved_override, role FROM users WHERE username=?", [username])
        : Promise.resolve(null);
      const todayP = get(
        `SELECT COALESCE(problems_solved,0) as solved, COALESCE(problems_attempted,0) as attempted, COALESCE(xp_earned,0) as xp FROM daily_activity WHERE username=? AND date=?`,
        [username, today],
      );
      const restP = Promise.all([
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
      // Avoid unhandled rejections if an earlier await throws first.
      for (const pr of [userP, todayP, restP]) pr.catch(() => {});

      // Batch core counts into a single query
      const counts = await get(`SELECT
      (SELECT COUNT(*) FROM progress WHERE username=${meSql()} AND status='solved') as solved,
      (SELECT COUNT(*) FROM progress WHERE username=${meSql()} AND status='attempted') as attempted,
      (SELECT COALESCE(SUM(xp_earned),0) FROM progress WHERE username=${meSql()}) as totalXp,
      (SELECT COUNT(*) FROM submissions WHERE username=${meSql()}) as submissions,
      (SELECT COUNT(*) FROM submissions WHERE username=${meSql()} AND verdict='AC') as acCount`);
      // Catalog size from memory (COUNT(*) over problems reads every row).
      const total = (await getCatalog()).rows.length;
      let {
        solved,
        attempted,
        totalXp,
        submissions: submissionCount,
        acCount,
      } = counts;
      const accuracy =
        submissionCount > 0 ? Math.round((acCount / submissionCount) * 100) : 0;

      // Apply admin overrides for the signed-in user
      const user = await userP;
      if (user) {
        totalXp += user.xp_override || 0;
        solved += user.solved_override || 0;
      }

      const [
        ratingDist,
        platformDist,
        streak,
        heatmap,
        recent,
        achievements,
        verdicts,
        dailyChallenges,
      ] = await restP;

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
      const todayStats = (await todayP) || { solved: 0, attempted: 0, xp: 0 };

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

/* How levels are earned: the real rules, for the Profile (no user data). */
app.get("/api/levels/rules", (_req, res) => {
  const ranks = require("./nexus/ranks");
  res.json({
    ok: true,
    xpByRating: XP_BY_RATING,
    problemLevels: RIFT_LEVELS.map((r) => ({ level: r.level, name: r.name, badge: r.badge, xp: r.xp, minProblems: r.minProblems })),
    web: { dsaShare: ranks.DSA_XP_SHARE, lessonXp: ranks.XP_PER_LESSON, pyqXp: ranks.XP_PER_PYQ },
  });
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
      // A Codeforces handle imports that account's solves (/api/sync-solved),
      // so one handle can be linked to only one Nexora account.
      if (key === "cf_handle" && String(value).trim()) {
        if (!CF_HANDLE_RE.test(String(value).trim()))
          return res.status(400).json({ ok: false, error: "That is not a valid Codeforces handle" });
        if (await cfHandleOwnedByOther(String(value).trim()))
          return res.status(409).json({ ok: false, error: "That Codeforces handle is already linked to another account" });
      }
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
    for (const t of ["gate_attempts", "gate_qstate", "gate_notes", "gate_collections", "gate_tests", "gate_plans", "gate_notes_progress"]) {
      await run(`DELETE FROM ${t} WHERE username=?`, [u]);
    }
    invalidateCache();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* ========== SYNC SOLVED ========== */
const CF_HANDLE_RE = /^[A-Za-z0-9_.-]{3,24}$/;
/** True when another account already has this Codeforces handle linked. */
async function cfHandleOwnedByOther(handle) {
  const row = await get(
    "SELECT username FROM settings WHERE key='cf_handle' AND username<>'' AND username<>? AND LOWER(TRIM(value))=LOWER(?) LIMIT 1",
    [me(), String(handle).trim()],
  );
  return !!row;
}

/**
 * Mark catalogue problems solved for the signed-in user (an import from a
 * verified judge account): new rows get XP, earlier attempts become solved,
 * achievements catch up once at the end. Returns how many changed.
 */
async function markSolvedRows(matched) {
  const progress = await userProgressMap();
  let changed = 0;
  let last = null;
  for (const { rowId, at } of matched) {
    const existing = progress.get(rowId);
    if (existing?.status === "solved") continue;
    const when = new Date(at && at > 0 ? at : Date.now()).toISOString();
    const xp = await calcXp(rowId);
    if (!existing) {
      await run(`INSERT INTO progress(username,problem_rowid,status,attempts,solved_at,xp_earned) VALUES(?,?,?,?,?,?)`, [me(), rowId, "solved", 1, when, xp]);
    } else {
      await run(`UPDATE progress SET status='solved', solved_at=COALESCE(solved_at,?), xp_earned=? WHERE username=? AND problem_rowid=?`, [when, xp, me(), rowId]);
    }
    progress.set(rowId, { status: "solved" });
    changed++;
    last = rowId;
  }
  if (last != null) {
    await checkAchievements(last, "AC", { backfill: true }).catch((e) => console.error("[achievements] import backfill failed:", e.message));
    invalidateCache();
  }
  return changed;
}

/** Platform badges (solve counts, ratings) from the user's verified accounts. */
async function awardPlatformBadges() {
  const accounts = require("./accounts");
  const list = await accounts.list(me());
  const now = new Date().toISOString();
  for (const [id, progress, target] of accounts.badgeProgress(list)) {
    if (progress <= 0) continue;
    await run(
      `INSERT INTO user_achievements(username, achievement_id, progress, unlocked_at) VALUES(?,?,?,?)
       ON CONFLICT(username, achievement_id) DO UPDATE SET progress = MAX(user_achievements.progress, excluded.progress), unlocked_at = COALESCE(user_achievements.unlocked_at, excluded.unlocked_at)`,
      [me(), id, Math.min(progress, target), progress >= target ? now : null],
    );
  }
}

/* Linked judge accounts: link → prove it's yours → import (src/accounts.js). */
{
  const accounts = require("./accounts");
  const fail = (res, e) => res.status(e.status && e.status < 600 ? e.status : 500).json({ ok: false, error: errMessage(e) });
  const needUser = (res) => {
    if (me()) return false;
    res.status(401).json({ ok: false, error: "Sign in first" });
    return true;
  };
  app.get("/api/accounts", async (_req, res) => {
    if (needUser(res)) return;
    try {
      res.json({
        ok: true,
        accounts: await accounts.list(me()),
        judges: Object.values(accounts.PLATFORMS).map((p) => ({ id: p.id, name: p.name, ...(p.oauth ? { oauth: true, configured: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) } : {}) })),
      });
    } catch (e) {
      fail(res, e);
    }
  });
  app.post("/api/accounts/:platform/start", async (req, res) => {
    if (needUser(res)) return;
    try {
      res.json({ ok: true, account: await accounts.start(me(), req.params.platform, req.body?.handle) });
    } catch (e) {
      fail(res, e);
    }
  });
  app.post("/api/accounts/:platform/check", async (req, res) => {
    if (needUser(res)) return;
    try {
      const r = await accounts.check(me(), req.params.platform);
      if (r.verified) await awardPlatformBadges().catch(() => {});
      res.json({ ok: true, ...r });
    } catch (e) {
      fail(res, e);
    }
  });
  app.post("/api/accounts/:platform/import", async (req, res) => {
    if (needUser(res)) return;
    try {
      const catalog = await getCatalog();
      const r = await accounts.importSolved(me(), req.params.platform, { catalog: catalog.rows, markSolved: markSolvedRows });
      await awardPlatformBadges().catch((e) => console.error("[accounts] badges failed:", e.message));
      res.json({ ok: true, ...r });
    } catch (e) {
      fail(res, e);
    }
  });
  app.delete("/api/accounts/:platform", async (req, res) => {
    if (needUser(res)) return;
    try {
      await accounts.unlink(me(), req.params.platform);
      res.json({ ok: true });
    } catch (e) {
      fail(res, e);
    }
  });
  // The old one-click Codeforces sync now imports only from a verified account
  // (a typed handle used to import anyone's solves).
  app.post("/api/sync-solved", async (_req, res) => {
    if (needUser(res)) return;
    try {
      const mine = (await accounts.list(me())).find((a) => a.platform === "codeforces");
      if (!mine?.verified) return res.json({ ok: true, synced: 0, message: "Link and verify your Codeforces account in Settings → Platforms first" });
      const catalog = await getCatalog();
      const r = await accounts.importSolved(me(), "codeforces", { catalog: catalog.rows, markSolved: markSolvedRows });
      await awardPlatformBadges().catch(() => {});
      res.json({ ok: true, synced: r.added, total: r.total });
    } catch (e) {
      fail(res, e);
    }
  });
}

/* ========== TAGS ========== */
app.get("/api/tags", async (req, res) => {
  try {
    res.json({ ok: true, tags: tagList(await getOpenCatalog()) });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* ========== HELPERS ========== */
/** XP for a first solve, by the problem's rating ("below" null: every rating above). */
const XP_BY_RATING = [
  { below: 1000, xp: 10 },
  { below: 1200, xp: 15 },
  { below: 1400, xp: 25 },
  { below: 1600, xp: 40 },
  { below: 1800, xp: 60 },
  { below: 2000, xp: 80 },
  { below: 2200, xp: 100 },
  { below: null, xp: 150 },
];
function xpForRating(rating) {
  const r = rating || 800;
  return XP_BY_RATING.find((b) => b.below === null || r < b.below).xp;
}
async function calcXp(problemId) {
  const prob = await get("SELECT rating FROM problems WHERE id=?", [problemId]);
  if (!prob) return 10;
  return xpForRating(prob.rating);
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

/** The signed-in user's XP / solved totals, with admin overrides applied —
 *  both reads run in parallel (one round trip). raw* exclude the overrides. */
async function myTotals() {
  const [row, ov] = await Promise.all([
    get(
      `SELECT COALESCE(SUM(xp_earned),0) as xp, COUNT(CASE WHEN status='solved' THEN 1 END) as solved FROM progress WHERE username=${meSql()}`,
    ),
    myOverrides(),
  ]);
  const rawXp = row?.xp || 0;
  const rawSolved = row?.solved || 0;
  return { rawXp, rawSolved, xp: rawXp + ov.xp, solved: rawSolved + ov.solved };
}

/** Tags of every problem the signed-in user has solved (one row per problem). */
function solvedTagsSql() {
  return `SELECT DISTINCT p.id, COALESCE(p.tags, '') as tags FROM progress pr JOIN problems p ON pr.problem_rowid=p.id AND pr.username=${meSql()} WHERE pr.status='solved'`;
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
  // Last 7 days for the streak calendar widget, and the active days of the
  // last 400 (more than enough for any reasonable streak) — fetched together.
  const [sevenDayRows, rows] = await Promise.all([
    all(
      "SELECT date, problems_solved FROM daily_activity WHERE username=? AND date >= date('now','-6 days') ORDER BY date ASC",
      [username],
    ),
    all(
      "SELECT date FROM daily_activity WHERE username=? AND (problems_solved > 0 OR COALESCE(gate_attempts,0) > 0) AND date >= date('now','-400 days') ORDER BY date DESC",
      [username],
    ),
  ]);
  const lastWeek = _buildLastWeek(sevenDayRows);
  return { ...streakFromDates(rows), lastWeek };
}

/**
 * Current and best streak from active-day rows ({ date: 'YYYY-MM-DD' }),
 * newest first. Current only counts if the newest day is today or yesterday.
 */
function streakFromDates(rows, now = Date.now()) {
  const today = new Date(now).toISOString().slice(0, 10);
  const yesterday = new Date(now - 86400000).toISOString().slice(0, 10);
  if (!rows.length) return { current: 0, best: 0 };

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

  return { current, best };
}

/** Streaks for many users from ONE query (instead of two per user). */
async function streaksFor(usernames) {
  const out = new Map(usernames.map((u) => [u, { current: 0, best: 0 }]));
  if (!usernames.length) return out;
  const byUser = new Map();
  // Chunked to stay well under SQLite's bound-parameter limit.
  for (let i = 0; i < usernames.length; i += 400) {
    const chunk = usernames.slice(i, i + 400);
    const rows = await all(
      `SELECT username, date FROM daily_activity
       WHERE username IN (${chunk.map(() => "?").join(",")})
         AND (problems_solved > 0 OR COALESCE(gate_attempts,0) > 0) AND date >= date('now','-400 days')
       ORDER BY username, date DESC`,
      chunk,
    );
    for (const r of rows) {
      if (!byUser.has(r.username)) byUser.set(r.username, []);
      byUser.get(r.username).push(r);
    }
  }
  for (const [u, rows] of byUser) out.set(u, streakFromDates(rows));
  return out;
}

async function checkAchievements(problemId, verdict, { backfill = false, firstSolve = false } = {}) {
  if (verdict !== "AC") return;
  const u = me();
  if (!u) return;
  const now = new Date().toISOString();
  const hour = new Date().getHours();
  const today = now.slice(0, 10);

  // Achievement definitions (static, cached) and this user's current rows,
  // read once instead of once per award.
  const [defs, mineRows] = await Promise.all([
    achievementDefs(),
    all("SELECT achievement_id, progress, unlocked_at FROM user_achievements WHERE username=?", [u]),
  ]);
  const mine = new Map(mineRows.map((r) => [r.achievement_id, r]));

  // Record progress for one achievement for this user; unlock (once) when
  // progress reaches `target` (defaults to the achievement's own target).
  // Only a real change is written (progress = MAX, unlocked_at = first).
  const award = async (id, progress, target = null) => {
    const def = defs.get(id);
    if (!def) return;
    const goal = target ?? def.target ?? 1;
    const p = Math.min(progress, goal);
    const cur = mine.get(id);
    const unlocks = progress >= goal;
    if (cur && (Number(cur.progress) || 0) >= p && (cur.unlocked_at || !unlocks)) return;
    mine.set(id, { progress: Math.max(p, Number(cur?.progress) || 0), unlocked_at: cur?.unlocked_at || (unlocks ? now : null) });
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

  // Today's daily challenge → per-user completion + bonus XP, only for the
  // submission that solves the problem: re-solving a problem already solved
  // (say, before it became today's challenge) never earns XP again.
  const dailyChallenge = backfill || !firstSolve ? null : await get(
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

let _achievementDefs = null;
/** id -> { target } for every achievement (seeded at boot, never edited). */
async function achievementDefs() {
  if (!_achievementDefs) {
    const rows = await all("SELECT id, target FROM achievements");
    _achievementDefs = new Map(rows.map((r) => [r.id, r]));
  }
  return _achievementDefs;
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
    // Same three picks for everyone each day (a shared daily challenge),
    // drawn from the in-memory catalog instead of ORDER BY RANDOM().
    const prob = randomPick(await getOpenCatalog(), diff.minR, diff.maxR);
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

/**
 * Twelve weeks of verdicts, oldest first, each week named by its Monday:
 * [{ week, AC, WA, TLE, RE, CE, other, total }]. Weeks with no submission
 * are kept (as zeros), so the chart's spacing stays true to time.
 */
function buildVerdictTrend(rows, now) {
  const monday = (d) => {
    const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
    return x;
  };
  const start = monday(now);
  const weeks = [];
  for (let i = 11; i >= 0; i--) {
    const w = new Date(start);
    w.setUTCDate(w.getUTCDate() - 7 * i);
    weeks.push({ week: w.toISOString().slice(0, 10), AC: 0, WA: 0, TLE: 0, RE: 0, CE: 0, other: 0, total: 0 });
  }
  const byWeek = new Map(weeks.map((w) => [w.week, w]));
  for (const r of rows || []) {
    const w = byWeek.get(r.week);
    if (!w) continue;
    const key = ["AC", "WA", "TLE", "RE", "CE"].includes(r.verdict) ? r.verdict : "other";
    w[key] += r.count;
    w.total += r.count;
  }
  return weeks;
}

/* ========== ADVANCED PERFORMANCE ANALYTICS ========== */
app.get("/api/performance", async (req, res) => {
  try {
    const result = await cachedResponse("performance", 3000, async () => {
      /* ── Batch core counts into single query (overrides fetched alongside) ── */
      const ovP = myOverrides();
      ovP.catch(() => {});
      const counts = await get(`SELECT
      (SELECT COUNT(*) FROM progress WHERE username=${meSql()} AND status='solved') as solved,
      (SELECT COUNT(*) FROM progress WHERE username=${meSql()} AND status='attempted') as attempted,
      (SELECT COALESCE(SUM(xp_earned),0) FROM progress WHERE username=${meSql()}) as totalXp,
      (SELECT COUNT(*) FROM submissions WHERE username=${meSql()}) as submissions,
      (SELECT COUNT(*) FROM submissions WHERE username=${meSql()} AND verdict='AC') as acCount`);
      const { attempted, submissions, acCount } = counts;
      const total = (await getCatalog()).rows.length;
      // Include admin bonuses so every page shows the same level as the Hub.
      const ov = await ovP;
      const totalXp = counts.totalXp + ov.xp;
      const solved = counts.solved + ov.solved;
      const accuracy =
        submissions > 0 ? Math.round((acCount / submissions) * 100) : 0;

      /* ── Parallel independent queries (all at once) ── */
      const today = new Date().toISOString().slice(0, 10);
      // Verdicts week by week (12 weeks), each week named by its Monday.
      const verdictTrendP = all(
        `SELECT date(substr(submitted_at,1,10),'weekday 0','-6 days') as week, verdict, COUNT(*) as count
         FROM submissions WHERE username=${meSql()} AND submitted_at >= date('now','-84 days')
         GROUP BY week, verdict ORDER BY week`,
      );
      verdictTrendP.catch(() => {});
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
      const weakTagProblems = await Promise.all(
        weakTags.map((wt) =>
          all(
            `SELECT p.id, p.title, p.problem_id, p.platform, p.rating, COALESCE(pr.status,'unsolved') as solve_status
        FROM problems p LEFT JOIN progress pr ON pr.problem_rowid=p.id AND pr.username=${meSql()}
        WHERE p.tags LIKE ? AND (pr.status IS NULL OR pr.status!='solved') AND p.rating>0
        ORDER BY p.rating ASC LIMIT 5`,
            [`%${wt.tag}%`],
          ),
        ),
      );
      weakTags.forEach((wt, i) => {
        const probs = weakTagProblems[i];
        if (probs.length)
          recommendations.push({
            tag: wt.tag,
            solveRate: wt.solveRate,
            problems: probs,
          });
      });

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

      const verdictTrend = buildVerdictTrend(await verdictTrendP, new Date());

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
        verdictTrend,
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
    // Shared with the AI agent's get_weak_tags tool (src/ai/data.js).
    const { analysis, recommendations } = await weaknessAnalysis();
    res.json({ ok: true, analysis, recommendations });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* ========== CUSTOM PROBLEMS (WORKSHOP) ========== */
/* Hidden testcases are the answer key: only the author (or an admin) gets them.
   Everyone else sees the samples and a count; /api/judge runs the hidden ones
   server-side via custom_problem_id. */
function withoutHiddenTests(req, problem) {
  if (canSeeHiddenTests(req, problem)) return problem;
  return {
    ...problem,
    testcases: "[]",
    hidden_count: parseJsonList(problem.testcases).length,
  };
}
app.get("/api/custom-problems", async (req, res) => {
  try {
    // Problems written only for contests stay out of the Workshop list (their author still sees them).
    const problems = await all(
      "SELECT * FROM custom_problems WHERE COALESCE(contest_only,0)=0 OR creator=? ORDER BY created_at DESC",
      [me() || ""],
    );
    res.json({ ok: true, problems: problems.map((p) => withoutHiddenTests(req, p)) });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});
app.get("/api/custom-problems/:id", async (req, res) => {
  try {
    const problem = await get("SELECT * FROM custom_problems WHERE id=?", [
      req.params.id,
    ]);
    if (!problem || !(await canSeeContestProblem(problem, me(), can(req, "contests.manage"))))
      return res.status(404).json({ ok: false, error: "Not found" });
    res.json({ ok: true, problem: withoutHiddenTests(req, problem) });
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
      editorial,
    } = req.body;
    if (!title || typeof title !== "string")
      return res.status(400).json({ ok: false, error: "Title required" });
    // The author is the signed-in account (authz also pins body.creator) —
    // never left blank, which would let anyone edit or delete the problem.
    const creator = me();
    if (!creator) return res.status(401).json({ ok: false, error: "Please sign in first" });
    const r = await run(
      `INSERT INTO custom_problems(creator,title,statement,input_spec,output_spec,difficulty,tags,samples,testcases,time_limit,memory_limit,created_at,editorial,topics)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        creator,
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
        String(editorial || "").slice(0, 50000),
        // Its topics, found from its title, tags and statement (src/topics.js).
        JSON.stringify(require("./topics").customTopics({ title, tags, statement, input_spec, output_spec })),
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
      editorial,
    } = req.body;
    await run(
      `UPDATE custom_problems SET title=?,statement=?,input_spec=?,output_spec=?,difficulty=?,
      tags=?,samples=?,testcases=?,time_limit=?,memory_limit=?,updated_at=?,editorial=?,topics=? WHERE id=?`,
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
        String(editorial || "").slice(0, 50000),
        JSON.stringify(require("./topics").customTopics({ title, tags, statement, input_spec, output_spec })),
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
const { NEXUS_NODES } = require("./nexus/dsa-nodes");
const nexusSubjects = require("./nexus/subjects");
const nexusCache = require("./nexus/user-cache");
const nexusRanks = require("./nexus/ranks");

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

/** The DSA rift tree with progress — the original /api/nexus logic, unchanged. */
function buildDsaNexus(totals, solvedProblems) {
  const rawTotalSolved = totals.rawSolved;
  const playerLevel = calcLevel(totals.xp, totals.solved);
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
      subject: "dsa",
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
      rows: 1,
    };
  });
  return { nodes, zones, player: playerLevel };
}

/**
 * The signed-in user's GATE study state for the Nexus: PYQs attempted /
 * answered correctly, and GATE-notes lessons finished. Two narrow queries,
 * cached per user and dropped on every write to either table.
 */
async function nexusGateState(fresh) {
  const username = me();
  const empty = { qstate: new Map(), lessons: new Set() };
  if (!username) return empty;
  if (!fresh) {
    const hit = nexusCache.getCached(username);
    if (hit) return hit;
  }
  const [qrows, lrows, trows] = await Promise.all([
    all("SELECT question_id, attempts, correct, last_at, interval_days FROM gate_qstate WHERE username=? AND attempts>0", [username]),
    all("SELECT subject, lesson, completed, updated_at FROM gate_notes_progress WHERE username=?", [username]),
    all("SELECT subject, node FROM nexus_testouts WHERE username=?", [username]).catch(() => []),
  ]);
  const state = {
    qstate: new Map((qrows || []).map((r) => [r.question_id, { attempts: r.attempts || 0, correct: r.correct || 0, lastAt: Number(r.last_at) || 0, interval: Number(r.interval_days) || 0 }])),
    lessons: new Set((lrows || []).filter((r) => r.completed).map((r) => `${r.subject}/${r.lesson}`)),
    lessonsAt: new Map((lrows || []).map((r) => [`${r.subject}/${r.lesson}`, Number(r.updated_at) || 0])),
    testouts: new Set((trows || []).map((r) => `${r.subject}:${r.node}`)),
  };
  nexusCache.setCached(username, state);
  return state;
}

/** Which GATE-notes subjects this reader may open (staff also see previews). */
function nexusNotesVisible(req, notes) {
  const staff = hasAnyAdminPerm(req);
  return new Set([...notes.subjects].filter(([, s]) => staff || !s.card.hidden).map(([id]) => id));
}

/**
 * Everything the Nexus needs for the signed-in reader: the DSA tree with
 * solve progress, every outline subject with study progress, cross links.
 */
async function nexusState(req, fresh) {
  const reg = nexusSubjects.loadRegistry(NEXUS_NODES);
  // Totals, overrides, solved tags and GATE state are independent: one parallel round trip.
  const [totals, solvedRows, explained, gateState] = await Promise.all([
    myTotals(),
    all(solvedTagsSql()),
    // Passed, unaided explain-backs count like one more solve in their skills.
    require("./voice/explain").countedTagRows({ all }, me()),
    nexusGateState(fresh),
  ]);
  const solvedProblems = [...solvedRows, ...explained];
  const dsa = buildDsaNexus(totals, solvedProblems);
  const notes = loadGateNotes();
  const computed = nexusSubjects.computeSubjects(reg, dsa.nodes, { ...gateState, notesVisible: nexusNotesVisible(req, notes) }, loadGateBank(), notes);
  for (const n of dsa.nodes) {
    n.crossRequires = [];
    n.crossUnlocks = nexusSubjects.dsaCrossUnlocks(reg, n.id, computed);
  }
  // The unified web rank: DSA XP is the floor, every subject adds on top.
  const score = nexusRanks.webScore(totals, computed, dsa.nodes);
  if (reg.subjects.has("dsa")) score.subjects.dsa = nexusRanks.subjectProgress(dsa.nodes);
  // Never below the best level this user ever had (no rank drops).
  const best = me() ? await get("SELECT web_level FROM nexus_scores WHERE username=?", [me()]).catch(() => null) : null;
  const webPlayer = nexusRanks.webLevel(score.xp, RIFT_LEVELS, best?.web_level || 1);
  // Kept for the leaderboards; written only when the numbers change.
  await nexusRanks.saveScore({ get, run }, nexusScoreSeen, me(), score, webPlayer.level).catch((e) => console.error("[nexus] score:", errMessage(e)));
  return { reg, dsa, computed, score, webPlayer };
}
const nexusScoreSeen = new Map();
const nexusBoardCache = new Map(); // key → { at, rows }

/** The rank inside one subject (tier + its title). */
function nexusSubjectRank(reg, sid, nodes) {
  return nexusRanks.subjectRank(nexusSubjects.subjectMeta(reg, sid), nexusRanks.subjectProgress(nodes), nodes);
}

/**
 * GET /api/nexus[?subject=<id>][&fresh=1]
 *
 * Without `subject` the response is exactly the old DSA rift tree, plus
 * `subject` and `subjects` (a summary per subject). Any other subject id
 * returns that subject's tree in the same shape. (The page itself reads
 * /api/nexus/web; this stays for the assistant and older clients.)
 */
app.get("/api/nexus", async (req, res) => {
  try {
    const want = typeof req.query.subject === "string" && req.query.subject ? req.query.subject : "dsa";
    const blocked = nexusBlocked(req);
    if (blocked.has(want)) return res.status(404).json({ ok: false, error: "Unknown subject" });
    const { reg, dsa, computed, webPlayer } = await nexusState(req, req.query.fresh === "1");
    const view = want === "dsa" ? dsa : computed.get(want);
    if (!view) return res.status(404).json({ ok: false, error: "Unknown subject" });
    res.json({
      ok: true,
      nodes: view.nodes,
      zones: view.zones,
      // The DSA path keeps its own Rift level (zone unlocks); webPlayer is the unified rank.
      player: dsa.player,
      webPlayer,
      riftLevels: RIFT_LEVELS,
      subject: nexusSubjects.subjectMeta(reg, want),
      subjects: nexusSubjects.subjectSummaries(reg, dsa, computed).filter((x) => !blocked.has(x.id)),
      subjectRank: nexusSubjectRank(reg, want, view.nodes),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/** The web's structure (subjects, zones, nodes, links, routes): static. */
function nexusStructure() {
  const reg = nexusSubjects.loadRegistry(NEXUS_NODES);
  // DSA zone names and colours are the Rift ladder's: no user data needed.
  return nexusSubjects.webStructure(reg, reg.structure ? null : buildDsaNexus({ xp: 0, solved: 0, rawSolved: 0 }, []));
}

/**
 * Learn subjects this visitor may not see (Admin → Site map, learn.<id>:
 * staff only, coming soon or hidden). Their own pages and API are shut by the
 * Site map gate; the shared lists (/api/nexus, /structure, /web, the subject
 * leaderboard) drop them here, so nothing of a hidden subject reaches members.
 */
function nexusBlocked(req) {
  const sitemap = require("./sitemap");
  const modes = sitemap.effectiveModes(require("./authz/site-settings").peekSettings());
  const who = { owner: req.access?.role === "owner", staff: hasAnyAdminPerm(req), hive: mayUseHive(req) };
  const out = new Set();
  for (const p of sitemap.PARTS) {
    const m = /^learn\.([a-z0-9-]+)$/.exec(p.id);
    if (m && m[1] !== "dsa" && !sitemap.allowed(modes[p.id], who, p)) out.add(m[1]);
  }
  return out;
}
/** The structure version this visitor sees: the plain one, or one that names what is hidden. */
const nexusViewVersion = (version, blocked) =>
  blocked.size ? `${version}-${require("node:crypto").createHash("sha1").update([...blocked].sort().join(",")).digest("hex").slice(0, 8)}` : version;
/** The structure without the subjects this visitor may not see. */
function nexusStructureFor(req) {
  const st = nexusStructure();
  const blocked = nexusBlocked(req);
  if (!blocked.size) return st;
  const hiddenNode = (ref) => typeof ref === "string" && ref.includes(":") && blocked.has(ref.split(":")[0]);
  return {
    ...st,
    version: nexusViewVersion(st.version, blocked),
    clusters: st.clusters
      .filter((c) => !blocked.has(c.id))
      .map((c) => ({ ...c, nodes: c.nodes.map((n) => (Array.isArray(n.req) && n.req.some(hiddenNode) ? { ...n, req: n.req.filter((r) => !hiddenNode(r)) } : n)) })),
    routes: (st.routes || []).map((r) => ({ ...r, subjects: (r.subjects || []).filter((x) => !blocked.has(x)) })).filter((r) => r.subjects.length),
    ...(st.hubs ? { hubs: JSON.parse(JSON.stringify(st.hubs, (k, v) => (k === "nexus" && blocked.has(v) ? undefined : v))) } : {}),
  };
}

/**
 * GET /api/nexus/structure[?v=<version>] — the web's structure. With the
 * current version in ?v= it is immutable and cached for a year; the client
 * keeps it on the device too, so the web paints before any request.
 */
app.get("/api/nexus/structure", (req, res) => {
  try {
    const st = nexusStructureFor(req);
    res.set("ETag", `"nx-${st.version}"`);
    res.set("Cache-Control", req.query.v === st.version ? "private, max-age=31536000, immutable" : "private, max-age=60");
    if (String(req.headers["if-none-match"] || "").includes(`"nx-${st.version}"`)) return res.status(304).end();
    res.json({ ok: true, ...st });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/**
 * One subject's tree, static: its zones (with row counts) and nodes (names,
 * icons, links, laid-out x and row), in the structure's node order so the
 * reader's numbers from /api/nexus/web line up by index. Small (a few KB),
 * versioned with the structure: with ?v=<version> it is immutable. The
 * subject page paints from it (and the device's copy) before any per-user
 * request returns.
 */
const nexusTreeCache = new Map(); // `${version}:${subject}` → body
function nexusSubjectTree(sid) {
  const st = nexusStructure();
  const key = `${st.version}:${sid}`;
  if (nexusTreeCache.has(key)) return nexusTreeCache.get(key);
  const c = st.clusters.find((x) => x.id === sid);
  if (!c) return null;
  const reg = nexusSubjects.loadRegistry(NEXUS_NODES);
  const s = reg.subjects.get(sid);
  const pos = (id) => s?.layout?.get(id) || { x: 50, row: 0 };
  const dsaZones = c.engine === "dsa" ? new Map(buildDsaNexus({ xp: 0, solved: 0, rawSolved: 0 }, []).zones.map((z) => [z.level, z])) : null;
  const nodes = c.nodes.map((n) => {
    const p = pos(n.id);
    return { id: n.id, name: n.n, zone: n.z, icon: n.i || "", requires: n.req, x: p.x, row: p.row, xp: n.xp, ...(n.k ? { kind: n.k } : {}), ...(n.o ? { optional: true } : {}) };
  });
  const zones = c.zones.map((z) => {
    const rows = Math.max(1, ...nodes.filter((n) => n.zone === z.level).map((n) => n.row + 1));
    const d = dsaZones?.get(z.level);
    return { level: z.level, name: z.name, color: z.color, rows, ...(d ? { xpRequired: d.xpRequired, probsRequired: d.probsRequired, glow: d.glow } : {}) };
  });
  const body = {
    version: st.version,
    subject: { id: c.id, name: c.name, short: c.short, stream: c.stream, engine: c.engine, description: c.description, ...(c.gate ? { gate: c.gate } : {}) },
    zones,
    nodes,
  };
  if (nexusTreeCache.size > 400) nexusTreeCache.clear();
  nexusTreeCache.set(key, body);
  return body;
}

/** GET /api/nexus/tree/:subject[?v=<version>] — see nexusSubjectTree. */
app.get("/api/nexus/tree/:subject", (req, res) => {
  try {
    const t = nexusSubjectTree(String(req.params.subject));
    if (!t) return res.status(404).json({ ok: false, error: "Unknown subject" });
    const tag = `"nxt-${t.version}-${t.subject.id}"`;
    res.set("ETag", tag);
    res.set("Cache-Control", req.query.v === t.version ? "public, max-age=31536000, immutable" : "public, max-age=60");
    if (String(req.headers["if-none-match"] || "").includes(tag)) return res.status(304).end();
    res.json({ ok: true, ...t });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

// The reader's numbers for the web, per user; recomputed at most once a
// minute, and right after any study or solve (writes to these tables).
const nexusWebCache = sharedCache({
  name: "nexus-web",
  ttlMs: 60 * 1000,
  tables: ["progress", "gate_qstate", "gate_notes_progress", "users", "nexus_testouts"],
});

/**
 * GET /api/nexus/web[?fresh=1] — the reader's state for the web: the unified
 * web rank, subject ranks, and per zone / node numbers in structure order
 * (see webState). Small; the structure comes from /api/nexus/structure.
 */
/**
 * A course page's content: content/courses/<subject>/<concept>.md (or
 * <subject>/index.md for the subject page), written by hand. Missing file:
 * body null and the page shows "Course coming soon".
 */
/**
 * GET /api/nexus/progress/:subject — the reader's numbers for one subject:
 * its zone and node tuples (as in /api/nexus/web, structure order) and its
 * rank. A few hundred bytes; the subject page fills its rings from it.
 */
app.get("/api/nexus/progress/:subject", async (req, res) => {
  try {
    const sid = String(req.params.subject);
    const web = await nexusWebFor(req);
    const sub = web.state.subjects[sid];
    if (!sub) return res.status(404).json({ ok: false, error: "Unknown subject" });
    res.set("Cache-Control", "private, no-cache");
    res.json({ ok: true, version: web.state.version, subject: sid, zones: sub.zones, nodes: sub.nodes, rank: web.ranks?.[sid] ?? null, player: sid === "dsa" ? web.dsaPlayer ?? null : null });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

app.get("/api/courses/:subject/:concept?", (req, res) => {
  const id = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
  const subject = String(req.params.subject || "");
  const concept = String(req.params.concept || "index");
  if (!id.test(subject) || !id.test(concept)) return res.status(400).json({ ok: false, error: "Bad course id" });
  const file = path.join(__dirname, "..", "content", "courses", subject, `${concept}.md`);
  fs.readFile(file, "utf8", (err, body) => {
    res.set("Cache-Control", "private, max-age=60");
    res.json({ ok: true, subject, concept, body: err ? null : body });
  });
});

/**
 * One node's content view (lazy, cached by the client): its summary and
 * "what you'll learn" topics; its GATE notes lessons with their sections,
 * worked examples, animations and practice questions (and "Read" deep
 * links); or the course outline from content/courses; and its resources.
 * Static per node — the reader's numbers come from /api/nexus/node.
 */
app.get("/api/nexus/content/:subject/:node", (req, res) => {
  try {
    const reg = nexusSubjects.loadRegistry(NEXUS_NODES);
    const sid = String(req.params.subject);
    const nid = String(req.params.node);
    const s = reg.subjects.get(sid);
    if (!s) return res.status(404).json({ ok: false, error: "Unknown subject" });
    const dsa = s.engine === "dsa";
    const raw = dsa ? reg.dsaNodes.find((n) => n.id === nid) : s.doc.nodes.find((n) => n.id === nid);
    if (!raw) return res.status(404).json({ ok: false, error: "Unknown node" });
    const extra = dsa ? nexusSubjects.readDsaContent()[nid] || {} : raw;
    const notes = loadGateNotes();
    const visible = nexusNotesVisible(req, notes);
    const notesId = s.meta.notesSubject;
    const notesSubj = notesId ? notes.subjects.get(notesId) : null;
    const skip = /^(where this fits|gate radar|summary|practice|pyqs?|gate questions|try it)/i;
    const lessons = (raw.lessons || [])
      .map((id) => {
        const hit = notesSubj?.lessons.get(id);
        if (!hit) return null;
        const l = hit.lesson;
        const href = `/gate/notes/${notesId}/${id}`;
        return {
          id,
          title: l.title,
          chapter: hit.chapter.title,
          minutes: l.est_minutes || null,
          status: l.status || "published",
          href,
          readable: visible.has(notesId),
          sections: (l.outline || []).filter((h) => h.level === 2 && !skip.test(h.text)).map((h) => ({ id: h.id, title: h.text, href: `${href}#n-${h.id}` })),
          examples: (l.blocks || []).filter((b) => b.name === "example").length,
          animations: (l.viz || []).length,
          practice: (l.practice || []).length,
          pyqs: (l.pyqLinks || l.pyqs || []).length,
        };
      })
      .filter(Boolean);
    // Flashcards: the lessons' definitions and theorems (term → statement),
    // as Markdown with inline maths.
    const flat = (n) => {
      if (n == null) return "";
      if (typeof n === "string") return n;
      if (Array.isArray(n)) return n.map(flat).join("");
      if (n.t === "im") return `$${n.v}$`;
      if (n.t === "math") return ` $$${n.v}$$ `;
      return flat(n.c);
    };
    const cards = [];
    const collect = (n) => {
      if (!n || typeof n !== "object" || cards.length >= 10) return;
      if (Array.isArray(n)) return n.forEach(collect);
      if (n.t === "block" && (n.name === "definition" || n.name === "theorem")) {
        const term = n.attrs?.term || n.attrs?.title || n.title;
        const firstP = (n.c || []).find((x) => x.t === "p");
        const back = flat(firstP).replace(/\s+/g, " ").trim();
        if (term && back) cards.push({ front: String(term), back: back.length > 360 ? `${back.slice(0, 357)}…` : back, kind: n.name });
        return;
      }
      collect(n.c);
    };
    for (const id of raw.lessons || []) collect(notesSubj?.lessons.get(id)?.lesson?.body);
    // A hand-written course (content/courses/<subject>/<node>.md): its headings.
    let course = null;
    try {
      const md = fs.readFileSync(path.join(__dirname, "..", "content", "courses", sid, `${nid}.md`), "utf8");
      course = { outline: md.split(/\r?\n/).filter((x) => /^#{1,3}\s/.test(x)).map((x) => x.replace(/^#+\s*/, "").trim()).slice(0, 30) };
    } catch {
      course = null;
    }
    res.set("Cache-Control", "private, max-age=300");
    res.json({
      ok: true,
      subject: sid,
      node: nid,
      summary: extra.summary || raw.desc || "",
      topics: extra.topics || [],
      desc: raw.desc || "",
      kind: dsa ? "skill" : raw.kind || "concept",
      optional: !dsa && (raw.optional === true || (raw.optional !== false && raw.kind === "project")),
      resources: raw.resources || [],
      lessons,
      course,
      cards,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/* ── Nexus learning intelligence (src/nexus/insights.js) ── */
const nexusInsight = require("./nexus/insights");
const nexusPeerCache = new Map(); // subject → { at, rows }
async function nexusPeerRows(ids) {
  if (!ids.length) return [];
  const key = ids.join(",");
  const hit = nexusPeerCache.get(key);
  if (hit && Date.now() - hit.at < 60 * 60 * 1000) return hit.rows;
  const rows = await all(
    `SELECT username, question_id, MIN(created_at) AS first_at, MIN(CASE WHEN outcome='correct' THEN created_at END) AS first_correct
     FROM gate_attempts WHERE question_id IN (${ids.map(() => "?").join(",")}) GROUP BY username, question_id`,
    ids,
  ).catch(() => []);
  if (nexusPeerCache.size > 200) nexusPeerCache.clear();
  nexusPeerCache.set(key, { at: Date.now(), rows: rows || [] });
  return rows || [];
}

/**
 * GET /api/nexus/insights/:subject — per node: time estimate, exam
 * weightage (marks by year), high-yield, peer mastery (aggregate only) and
 * the reader's notes/bookmarks; per zone: weightage heat; the subject's
 * remaining time and the reader's progress history.
 */
app.get("/api/nexus/insights/:subject", async (req, res) => {
  try {
    const reg = nexusSubjects.loadRegistry(NEXUS_NODES);
    const sid = String(req.params.subject);
    const s = reg.subjects.get(sid);
    if (!s) return res.status(404).json({ ok: false, error: "Unknown subject" });
    const { dsa, computed } = await nexusState(req, false);
    const view = s.engine === "dsa" ? dsa : computed.get(sid);
    const bank = loadGateBank();
    const notes = loadGateNotes();
    const pools = nexusSubjects.nodePools(reg, bank, notes);
    const notesSubj = s.meta.notesSubject ? notes.subjects.get(s.meta.notesSubject) : null;
    const weights = new Map();
    const allIds = [];
    for (const n of view.nodes) {
      const ids = pools.get(`${sid}:${n.id}`) || [];
      allIds.push(...ids);
      weights.set(n.id, nexusInsight.weightage(ids, bank.byId));
    }
    const hy = nexusInsight.highYield(weights);
    const peerRows = s.engine === "dsa" ? [] : await nexusPeerRows([...new Set(allIds)]);
    const nodes = {};
    let remaining = 0;
    for (const n of view.nodes) {
      const ids = pools.get(`${sid}:${n.id}`) || [];
      const raw = s.doc?.nodes.find((x) => x.id === n.id);
      const lessonMinutes = (raw?.lessons || []).map((l) => notesSubj?.lessons.get(l)?.lesson?.est_minutes || 0);
      const min = nexusInsight.nodeMinutes({ kind: n.kind, lessonMinutes, pyqTarget: n.metric?.pyq?.target || 0, dsaTarget: s.engine === "dsa" ? n.target : 0 });
      remaining += Math.round(min * (1 - Math.min(100, n.progress || 0) / 100));
      const w = weights.get(n.id);
      nodes[n.id] = {
        min,
        w: w.n ? w : null,
        hy: hy.has(n.id),
        peer: n.metric?.pyq ? nexusInsight.peerMastery(peerRows, ids, n.metric.pyq.target) : null,
      };
    }
    // Zone heat: share of the subject's PYQ marks.
    const total = [...weights.values()].reduce((a, w) => a + w.marks, 0);
    const zones = {};
    for (const n of view.nodes) zones[n.zone] = (zones[n.zone] || 0) + weights.get(n.id).marks;
    for (const z of Object.keys(zones)) zones[z] = total ? Math.round((zones[z] / total) * 100) : 0;
    const username = me();
    const [noteRows, histRows] = username
      ? await Promise.all([
          all("SELECT node, note, bookmarked, updated_at FROM nexus_node_notes WHERE username=? AND subject=?", [username, sid]).catch(() => []),
          all("SELECT day, subjects FROM nexus_history WHERE username=? ORDER BY day DESC LIMIT 90", [username]).catch(() => []),
        ])
      : [[], []];
    const history = (histRows || [])
      .map((r) => {
        let p = null;
        try {
          p = JSON.parse(r.subjects)[sid];
        } catch {
          p = null;
        }
        return p === undefined || p === null ? null : { day: r.day, p: Number(p) || 0 };
      })
      .filter(Boolean)
      .reverse();
    res.set("Cache-Control", "private, no-cache");
    res.json({
      ok: true,
      subject: sid,
      nodes,
      zones,
      remainingMin: remaining,
      notes: Object.fromEntries((noteRows || []).map((r) => [r.node, { note: r.note, bookmarked: !!r.bookmarked, updatedAt: Number(r.updated_at) }])),
      history,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/** GET /api/nexus/mistakes/:subject/:node — where learners slip (aggregate). */
app.get("/api/nexus/mistakes/:subject/:node", async (req, res) => {
  try {
    const reg = nexusSubjects.loadRegistry(NEXUS_NODES);
    const ids = nexusSubjects.nodePools(reg, loadGateBank(), loadGateNotes()).get(`${req.params.subject}:${req.params.node}`) || [];
    if (!ids.length) return res.json({ ok: true, slips: [] });
    const bank = loadGateBank();
    const rows = await all(
      `SELECT question_id, COUNT(*) AS n, SUM(outcome='correct') AS c FROM gate_attempts
       WHERE question_id IN (${ids.map(() => "?").join(",")}) AND outcome IN ('correct','wrong','partial') GROUP BY question_id`,
      ids,
    ).catch(() => []);
    const worst = (rows || [])
      .filter((r) => Number(r.n) >= 3)
      .map((r) => ({ id: r.question_id, n: Number(r.n), acc: Math.round((Number(r.c) / Number(r.n)) * 100) }))
      .sort((a, b) => a.acc - b.acc)
      .slice(0, 2);
    const slips = [];
    for (const w of worst) {
      const q = bank.byId.get(w.id);
      if (!q) continue;
      let wrong = null;
      if (q.type === "MCQ") {
        const opts = await all(`SELECT response, COUNT(*) AS n FROM gate_attempts WHERE question_id=? AND outcome='wrong' GROUP BY response ORDER BY n DESC LIMIT 1`, [w.id]).catch(() => []);
        const top = opts?.[0];
        if (top) {
          let v = top.response;
          try {
            v = JSON.parse(v);
          } catch {
            /* plain */
          }
          const letter = Array.isArray(v) ? v[0] : v;
          const opt = (q.options || []).find((o) => String(o.l).toUpperCase() === String(letter).toUpperCase());
          wrong = opt ? { option: opt.l, text: String(opt.t).slice(0, 120), share: Math.round((Number(top.n) / w.n) * 100) } : null;
        }
      }
      slips.push({ id: q.id, label: `${q.exam || ""} ${q.year || ""}`.trim(), topic: (q.tags || [])[0] || q.topic || null, attempts: w.n, accuracy: w.acc, text: String(q.text || "").replace(/\s+/g, " ").slice(0, 140), wrong });
    }
    res.json({ ok: true, slips });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/** GET /api/nexus/testout/:subject/:node — 3–5 auto-graded questions (no keys). */
app.get("/api/nexus/testout/:subject/:node", (req, res) => {
  const reg = nexusSubjects.loadRegistry(NEXUS_NODES);
  const bank = loadGateBank();
  const ids = nexusSubjects.nodePools(reg, bank, loadGateNotes()).get(`${req.params.subject}:${req.params.node}`) || [];
  const day = new Date().toISOString().slice(0, 10);
  const qs = nexusInsight.pickQuick(ids, bank.byId, `${me() || "-"}|${req.params.node}|${day}`);
  res.json({
    ok: true,
    available: qs.length >= 3,
    questions: qs.map((q) => ({ id: q.id, type: q.type, marks: q.marks, year: q.year, exam: q.exam, text: q.text, options: q.options || [] })),
  });
});

/** POST /api/nexus/testout/:subject/:node {answers:{id:pick}} — grade; a pass marks the node mastered. */
app.post("/api/nexus/testout/:subject/:node", async (req, res) => {
  try {
    const username = me();
    if (!username) return res.status(401).json({ ok: false, error: "Sign in" });
    const answers = req.body && typeof req.body.answers === "object" ? req.body.answers : {};
    const reg = nexusSubjects.loadRegistry(NEXUS_NODES);
    const bank = loadGateBank();
    const ids = new Set(nexusSubjects.nodePools(reg, bank, loadGateNotes()).get(`${req.params.subject}:${req.params.node}`) || []);
    const results = [];
    for (const [id, pick] of Object.entries(answers).slice(0, 5)) {
      const q = bank.byId.get(id);
      if (!q || !ids.has(id) || !nexusInsight.testable(q)) continue;
      results.push({ id, correct: nexusInsight.isCorrect(q, pick), key: q.answer });
    }
    const score = results.filter((r) => r.correct).length;
    const pass = nexusInsight.passed(score, results.length);
    if (pass) {
      await run(
        `INSERT INTO nexus_testouts(username, subject, node, score, total, created_at) VALUES(?,?,?,?,?,?)
         ON CONFLICT(username, subject, node) DO UPDATE SET score=excluded.score, total=excluded.total, created_at=excluded.created_at`,
        [username, String(req.params.subject), String(req.params.node), score, results.length, Date.now()],
      );
      nexusCache.invalidateNexusUser(username);
    }
    res.json({ ok: true, score, total: results.length, passed: pass, results });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/**
 * POST /api/nexus/done/:subject/:node — "I've learned this": masters a node
 * that has no auto-graded questions to test out with (fewer than 3); one
 * that has them must be tested out instead. Recorded like a test out
 * (60% of the node's XP), so the Nexus, ranks and trees agree at once.
 */
app.post("/api/nexus/done/:subject/:node", async (req, res) => {
  try {
    const username = me();
    if (!username) return res.status(401).json({ ok: false, error: "Sign in" });
    const reg = nexusSubjects.loadRegistry(NEXUS_NODES);
    const sid = String(req.params.subject);
    const nid = String(req.params.node);
    const s = reg.subjects.get(sid);
    if (!s || s.engine === "dsa" || !s.doc?.nodes.some((n) => n.id === nid)) return res.status(404).json({ ok: false, error: "Unknown node" });
    const bank = loadGateBank();
    const ids = nexusSubjects.nodePools(reg, bank, loadGateNotes()).get(`${sid}:${nid}`) || [];
    if (ids.map((id) => bank.byId.get(id)).filter(nexusInsight.testable).length >= 3) return res.status(409).json({ ok: false, error: "Test out to master this one" });
    await run(
      `INSERT INTO nexus_testouts(username, subject, node, score, total, created_at) VALUES(?,?,?,0,0,?)
       ON CONFLICT(username, subject, node) DO NOTHING`,
      [username, sid, nid, Date.now()],
    );
    nexusCache.invalidateNexusUser(username);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/** PUT /api/nexus/notes/:subject/:node {note, bookmarked} — the reader's own note (written on save). */
app.put("/api/nexus/notes/:subject/:node", async (req, res) => {
  try {
    const username = me();
    if (!username) return res.status(401).json({ ok: false, error: "Sign in" });
    const note = typeof req.body?.note === "string" ? req.body.note.slice(0, 4000) : "";
    const bookmarked = req.body?.bookmarked ? 1 : 0;
    const reg = nexusSubjects.loadRegistry(NEXUS_NODES);
    if (!reg.subjects.has(String(req.params.subject))) return res.status(404).json({ ok: false, error: "Unknown subject" });
    if (!note.trim() && !bookmarked) {
      await run("DELETE FROM nexus_node_notes WHERE username=? AND subject=? AND node=?", [username, String(req.params.subject), String(req.params.node)]);
    } else {
      await run(
        `INSERT INTO nexus_node_notes(username, subject, node, note, bookmarked, updated_at) VALUES(?,?,?,?,?,?)
         ON CONFLICT(username, subject, node) DO UPDATE SET note=excluded.note, bookmarked=excluded.bookmarked, updated_at=excluded.updated_at`,
        [username, String(req.params.subject), String(req.params.node), note, bookmarked, Date.now()],
      );
    }
    res.json({ ok: true, note, bookmarked: !!bookmarked });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/** POST /api/nexus/review/:subject/:node — put the node's PYQs in the Review deck (due today). */
app.post("/api/nexus/review/:subject/:node", async (req, res) => {
  try {
    const username = me();
    if (!username) return res.status(401).json({ ok: false, error: "Sign in" });
    const reg = nexusSubjects.loadRegistry(NEXUS_NODES);
    const ids = (nexusSubjects.nodePools(reg, loadGateBank(), loadGateNotes()).get(`${req.params.subject}:${req.params.node}`) || []).slice(0, 30);
    const today = new Date().toISOString().slice(0, 10);
    for (const id of ids) {
      await run(
        `INSERT INTO gate_qstate(username, question_id, due) VALUES(?,?,?)
         ON CONFLICT(username, question_id) DO UPDATE SET due=CASE WHEN gate_qstate.due IS NULL OR gate_qstate.due > excluded.due THEN excluded.due ELSE gate_qstate.due END`,
        [username, id, today],
      );
    }
    res.json({ ok: true, added: ids.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/** The reader's web numbers (cached per user, see nexusWebCache). */
async function nexusWebFor(req, fresh = false) {
    const build = async () => {
      const { reg, dsa, computed, webPlayer, score } = await nexusState(req, fresh);
      const ranks = {};
      for (const [sid, s] of reg.subjects) ranks[sid] = nexusSubjectRank(reg, sid, s.engine === "dsa" ? dsa.nodes : computed.get(sid)?.nodes || []);
      const row = me() ? await get("SELECT week, week_base_xp FROM nexus_scores WHERE username=?", [me()]).catch(() => null) : null;
      const all = [...computed.values()].flatMap((x) => x.nodes);
      const week = nexusRanks.weekSummary(row, score, all);
      return { user: me(), player: webPlayer, dsaPlayer: dsa.player, riftLevels: nexusRanks.webLevels(RIFT_LEVELS), state: nexusSubjects.webState(reg, dsa, computed), ranks, week };
    };
    const key = `${me() || "-"}|${hasAnyAdminPerm(req) ? 1 : 0}`;
    return fresh || !me() ? build() : nexusWebCache.get(key, build);
}

app.get("/api/nexus/web", async (req, res) => {
  try {
    const body = await nexusWebFor(req, req.query.fresh === "1");
    const blocked = nexusBlocked(req);
    res.set("Cache-Control", "private, no-cache");
    if (!blocked.size) return res.json({ ok: true, ...body });
    const keep = (o) => Object.fromEntries(Object.entries(o || {}).filter(([k]) => !blocked.has(k)));
    res.json({ ok: true, ...body, state: { ...body.state, version: nexusViewVersion(body.state.version, blocked), subjects: keep(body.state.subjects) }, ranks: keep(body.ranks) });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/**
 * GET /api/nexus/leaderboard?scope=all|week|friends|subject[&subject=<id>]
 * Web rank (overall, this week, friends) and one subject's mastery board.
 * Reads nexus_scores only; cached for a minute per scope.
 */
app.get("/api/nexus/leaderboard", async (req, res) => {
  try {
    const scope = ["all", "week", "friends", "subject"].includes(req.query.scope) ? req.query.scope : "all";
    const reg = nexusSubjects.loadRegistry(NEXUS_NODES);
    const subject = scope === "subject" ? String(req.query.subject || "") : null;
    if (scope === "subject" && (!reg.subjects.has(subject) || nexusBlocked(req).has(subject))) return res.status(404).json({ ok: false, error: "Unknown subject" });
    const viewer = me();
    const key = `${scope}|${subject || ""}|${scope === "friends" ? viewer : ""}`;
    const hit = nexusBoardCache.get(key);
    let rows;
    if (hit && Date.now() - hit.at < 60 * 1000) rows = hit.rows;
    else {
      rows = await nexusRanks.leaderboard({ all }, { scope, subject, viewer });
      if (nexusBoardCache.size > 300) nexusBoardCache.clear();
      nexusBoardCache.set(key, { at: Date.now(), rows });
    }
    const out = { ok: true, scope, rows: rows.map((r) => ({ ...r })) };
    if (subject) out.subject = nexusSubjects.subjectMeta(reg, subject);
    const mine = viewer ? rows.find((r) => r.username === viewer) : null;
    if (mine) out.me = mine;
    res.json(out);
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/**
 * GET /api/nexus/node/:subject/:node — one node's full detail for the panel:
 * description, resources, tags, how mastery is measured (lessons, PYQs,
 * accuracy) and its cross-subject chips. Reads only the cached GATE state,
 * never the problem tables; DSA progress comes from the web response.
 */
app.get("/api/nexus/node/:subject/:node", async (req, res) => {
  try {
    const reg = nexusSubjects.loadRegistry(NEXUS_NODES);
    const s = reg.subjects.get(req.params.subject);
    if (!s) return res.status(404).json({ ok: false, error: "Unknown node" });
    if (s.engine === "dsa") {
      const n = NEXUS_NODES.find((x) => x.id === req.params.node);
      if (!n) return res.status(404).json({ ok: false, error: "Unknown node" });
      return res.json({
        ok: true,
        node: { ...n, subject: "dsa", crossRequires: [], crossUnlocks: nexusSubjects.dsaCrossUnlocks(reg, n.id, new Map()) },
      });
    }
    if (!s.doc.nodes.some((n) => n.id === req.params.node)) return res.status(404).json({ ok: false, error: "Unknown node" });
    const gateState = await nexusGateState(false);
    const notes = loadGateNotes();
    const dsaStub = NEXUS_NODES.map((n) => ({ ...n, progress: 0, completed: false }));
    const computed = nexusSubjects.computeSubjects(reg, dsaStub, { ...gateState, notesVisible: nexusNotesVisible(req, notes) }, loadGateBank(), notes);
    const node = computed.get(req.params.subject).nodes.find((n) => n.id === req.params.node);
    res.json({ ok: true, node });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/**
 * GET /api/nexus/pyqs/:subject/:node — the PYQs behind one subject node, with
 * the user's status on each (for the node panel's practice list).
 */
app.get("/api/nexus/pyqs/:subject/:node", async (req, res) => {
  try {
    const reg = nexusSubjects.loadRegistry(NEXUS_NODES);
    const s = reg.subjects.get(req.params.subject);
    if (!s || !s.doc || !s.doc.nodes.some((n) => n.id === req.params.node)) {
      return res.status(404).json({ ok: false, error: "Unknown node" });
    }
    const bank = loadGateBank();
    const pools = nexusSubjects.nodePools(reg, bank, loadGateNotes());
    const ids = pools.get(`${req.params.subject}:${req.params.node}`) || [];
    const state = await nexusGateState(false);
    const questions = ids
      .map((id) => bank.byId.get(id))
      .filter(Boolean)
      .map((q) => {
        const st = state.qstate.get(q.id);
        return {
          id: q.id,
          paper: q.paper,
          year: Number(q.year) || null,
          marks: Number(q.marks) || null,
          type: q.type,
          topic: `${q.subject}/${q.topic}`,
          status: !st ? "new" : st.correct > 0 ? "solved" : "attempted",
        };
      })
      .sort((a, b) => (b.year || 0) - (a.year || 0));
    res.json({ ok: true, total: questions.length, questions });
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
    // Three independent reads in one parallel round trip; the topic pools are
    // filtered from the in-memory problem catalog instead of ~100 LIKE scans.
    const [totals, progressRows, catalog] = await Promise.all([
      myTotals(),
      all("SELECT problem_rowid, status, attempts FROM progress WHERE username=?", [me()]),
      getOpenCatalog(),
    ]);
    res.json(buildLevelRoadmap(catalog, progressRows, calcLevel(totals.xp, totals.solved)));
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

/**
 * The weekly practice pool for every level (pure: catalog + the user's
 * progress rows in, response body out). Same selection as the old per-topic
 * SQL: pool = problems with any topic tag in the level's rating band, ordered
 * by rating DESC, seeded-shuffled by week, unsolved first.
 */
function buildLevelRoadmap(catalog, progressRows, playerLevel, now = Date.now()) {
  const weekSeed = Math.floor(now / (7 * 24 * 60 * 60 * 1000));
  const progress = new Map();
  for (const pr of progressRows || []) progress.set(pr.problem_rowid, pr);
  const statusOf = (row) => {
    const pr = progress.get(row.id);
    return (pr && pr.status) || "unsolved";
  };
  const shape = (row) => {
    const pr = progress.get(row.id);
    return {
      id: row.id,
      problem_id: row.problem_id,
      title: row.title,
      rating: row.rating,
      platform: row.platform,
      tags: row.tags,
      url: row.url,
      solve_status: (pr && pr.status) || "unsolved",
      attempts: (pr && pr.attempts) || 0,
    };
  };

  const levels = LEVEL_TOPICS.map((lt) => {
    const rl = RIFT_LEVELS[lt.level - 1];

    // For ∞ Overflow (level 11), lower the floor to 2200 and remove the ceiling
    // so practice problems actually appear in the DB (very few problems rated 2800+ exist)
    const queryMinR = lt.level === 11 ? 2200 : rl.minR;
    const queryMaxR = lt.level === 11 ? 99999 : rl.maxR;

    const topicsResult = lt.topics.map((topic) => {
      const pool = topicPool(catalog, topic.tags, queryMinR, queryMaxR).map((i) => catalog.rows[i]);
      const shuffled = seededShuffle(pool, weekSeed + lt.level * 100 + topic.tags.length);
      const unsolved = shuffled.filter((p) => statusOf(p) !== "solved");
      const solved = shuffled.filter((p) => statusOf(p) === "solved");
      const selected = [
        ...unsolved.slice(0, topic.count),
        ...solved.slice(0, Math.max(0, topic.count - unsolved.length)),
      ]
        .slice(0, topic.count)
        .map(shape);
      selected.sort((a, b) => a.rating - b.rating);

      return {
        name: topic.name,
        desc: topic.desc,
        tags: topic.tags,
        problems: selected,
        totalPool: pool.length,
        solvedInPool: solved.length,
      };
    });

    const allProbs = topicsResult.flatMap((t) => t.problems);
    const solvedCount = allProbs.filter((p) => p.solve_status === "solved").length;

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
      progress: allProbs.length ? Math.round((solvedCount / allProbs.length) * 100) : 0,
    };
  });

  return { ok: true, levels, player: playerLevel, weekSeed };
}

/* Keep /api/roadmap and /api/skill-tree as aliases for backward compat */
app.get("/api/skill-tree", async (req, res) => {
  try {
    const [solvedRow, solvedProblems] = await Promise.all([
      get(`SELECT COUNT(*) as c FROM progress WHERE username=${meSql()} AND status='solved'`),
      all(solvedTagsSql()),
    ]);
    const rawTotalSolved = solvedRow?.c || 0;
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
    // Matching problems from the in-memory catalog (was a LIKE scan + COUNT).
    const catalog = await getOpenCatalog();
    const likes = skill.tags.map((t) => likeMatcher(`%${t}%`));
    const matching = [];
    for (const p of catalog.rows) {
      const r = p.rating;
      if (r == null || !(r >= minDiff && r <= maxDiff)) continue;
      if (likes.some((m) => m(p.tags))) matching.push(p);
    }
    const progress = await userProgressMap();
    const solvedFirst = (p) => (progress.get(p.id)?.status === "solved" ? 1 : 0);
    const problems = matching
      .slice()
      .sort((a, b) => solvedFirst(a) - solvedFirst(b) || a.rating - b.rating || a.id - b.id)
      .slice(0, 50)
      .map((p) => {
        const pr = progress.get(p.id);
        return {
          id: p.id,
          problem_id: p.problem_id,
          title: p.title,
          rating: p.rating,
          platform: p.platform,
          tags: p.tags,
          solve_status: pr?.status ?? "unsolved",
          solved_at: pr ? pr.solved_at : null,
        };
      });
    const totalRow = { c: matching.length };

    const solvedCount = problems.filter(
      (p) => p.solve_status === "solved",
    ).length;
    const totalAvailable = totalRow?.c || 0;

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

/* ── Owner / admin system: /api/admin/*, /api/site/*, /api/reports ── */
// Filled in once socket.io is up (below): presence, per-user pushes,
// broadcasts and force-disconnect for the admin panel.
const realtime = {};
// Admin changes must come from the site itself (CSRF): an allowed Origin, or
// the same host. Requests without an Origin are not from a browser page.
function isTrustedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  if (DEPLOY.enforceOrigins ? isOriginAllowed(DEPLOY, origin) : true) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}
const adminApi = createAdminRouter({ all, get, run, runBatch, realtime, isTrustedOrigin });
app.use(adminApi.router);

/* ── Social network + public profiles: /api/social/*, /api/profiles/* ── */
app.use(createSocialRouter({ all, get, run, realtime, isTrustedOrigin, calcLevel, calcStreak }).router);
// Messages: direct and group conversations (src/chat.js, src/routes/chat.js).
app.use(require("./push").createPushRouter({ requireAuthenticatedUser, isTrustedOrigin }));
// Voice: speech to text through a chain of services (Admin → AI models → Voice recognition).
app.use(require("./voice/stt").createSttRouter({ requireAuthenticatedUser, isTrustedOrigin }));
// Natural voice for spoken answers (Azure Speech free tier, capped): docs/voice/STEP1_EARS_DESIGN.md §S8.
app.use(require("./voice/tts").createTtsRouter({ requireAuthenticatedUser, isTrustedOrigin }));
app.use(require("./routes/chat").createChatRouter({ realtime, isTrustedOrigin, catalog: require("./problem-catalog"), gate: require("./routes/gate") }));
// Hosted contests: made from anywhere on the site, coding and GATE questions, marks and analysis.
app.use(require("./routes/hosted-contests").createHostedContestsRouter({ gate: require("./routes/gate"), hashPassword, verifyPassword }));

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
      SELECT u.username, u.display_name, u.avatar, u.avatar_url, u.role, u.verified, u.status, u.last_seen, f.created_at as friends_since
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
      `SELECT f.id, u.username, u.display_name, u.avatar, u.avatar_url, f.created_at
      FROM friendships f JOIN users u ON f.from_user=u.username WHERE f.to_user=? AND f.status='pending'`,
      [u],
    );
    const outgoing = await all(
      `SELECT f.id, u.username, u.display_name, u.avatar, u.avatar_url, f.created_at
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
/** Store a DM and return the stored row (selected by its own id — selecting
 *  "the newest message" could return a concurrent insert meant for someone
 *  else). Returns null when the recipient does not exist. */
async function insertDirectMessage(from, to, content) {
  const recipient = await get("SELECT username FROM users WHERE username=?", [
    to,
  ]);
  if (!recipient) return null;
  const sanitized = String(content).trim().substring(0, 2000);
  // Messages live in src/chat.js now; it copies this old table in once, so
  // make sure that copy has happened before adding here, then add it there too.
  const chat = require("./chat");
  await chat.init().catch(() => {});
  const { lastID } = await run(
    "INSERT INTO messages(from_user,to_user,content,created_at) VALUES(?,?,?,?)",
    [from, to, sanitized, new Date().toISOString()],
  );
  try {
    const conv = await chat.openDm(from, to);
    const message = await chat.send(from, conv, { body: sanitized }, async () => null);
    for (const n of [from, to]) emitToUser(n, "chat:message", { message });
  } catch {
    /* blocked, or messages unavailable: the old table still has it */
  }
  return get("SELECT * FROM messages WHERE id=?", [lastID]);
}

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
    // `from` is pinned to the signed-in user by authz (src/middleware/authz.js).
    const msg = await insertDirectMessage(from, to, content);
    if (!msg)
      return res.status(404).json({ ok: false, error: "User not found" });
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
// The same for everyone and it aggregates all of `progress`, so it is cached:
// 5 minutes, or 1 minute after a solve / activity / profile change.
const leaderboardCache = sharedCache({
  name: "leaderboard",
  ttlMs: 5 * 60 * 1000,
  minAgeMs: 60 * 1000,
  tables: ["progress", "daily_activity", "users"],
});
app.get("/api/leaderboard", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 25, 100);
    const type = req.query.type || "xp"; // xp | solved | streak
    const leaderboard = await leaderboardCache.get(`${type}|${limit}`, () => computeLeaderboard(type, limit));
    // A copy: callers must not mutate the cached rows.
    res.json({ ok: true, leaderboard: leaderboard.map((r) => ({ ...r })), type });
  } catch (e) {
    res.status(500).json({ ok: false, error: errMessage(e) });
  }
});

async function computeLeaderboard(type, limit) {
  {
    // Real per-user totals (progress rows) plus any admin override.
    const rows = await all(
      `
      SELECT u.username, u.display_name, u.avatar, u.avatar_url, u.role, u.created_at,
        COALESCE(u.xp_override,0) + COALESCE(us.xp,0) as total_xp,
        COALESCE(u.solved_override,0) + COALESCE(us.solved,0) as total_solved,
        COALESCE(us.active_days,0) as active_days
      FROM users u
      -- Per-user totals kept in step with progress / daily_activity by
      -- triggers (src/db.js initUserStats): ~2 rows read per user.
      LEFT JOIN user_stats us ON us.username = u.username
      WHERE u.username IS NOT NULL
      ORDER BY ${type === "solved" ? "total_solved DESC, total_xp DESC" : "total_xp DESC, total_solved DESC"}
      LIMIT ?`,
      [type === "streak" ? 500 : limit],
    );
    if (type === "streak") {
      // Streaks are computed from daily activity — for every candidate in one query.
      const streaks = await streaksFor(rows.filter((r) => r.active_days > 0).map((r) => r.username));
      for (const r of rows) {
        const s = r.active_days > 0 ? streaks.get(r.username) : { best: 0, current: 0 };
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
    return rows;
  }
}

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

// Contest passwords use the same salted scrypt as account passwords
// ("salt:key"). Older contests stored a static-salt SHA-256; those still
// verify, compared in constant time.
function legacyContestHash(pass) {
  return crypto
    .createHash("sha256")
    .update(pass + "nexora_salt")
    .digest("hex");
}
async function verifyContestPassword(pass, stored) {
  if (typeof stored !== "string" || !stored) return false;
  if (stored.includes(":")) return verifyPassword(pass, stored).catch(() => false);
  const a = Buffer.from(legacyContestHash(pass), "hex");
  const b = Buffer.from(stored, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
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
        await hashPassword(String(password)),
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
    if (!(await verifyContestPassword(String(password), contest.password_hash)))
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
    // Ownership/enrolment is decided by the session, never by ?username=,
    // which let anyone read a private contest by naming its creator.
    const username = me();
    const contest = await get("SELECT * FROM custom_contests WHERE id=?", [
      req.params.id,
    ]);
    if (!contest)
      return res.status(404).json({ ok: false, error: "Not found" });
    const isOwner = !!username && contest.creator === username;
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

/** True when `username` sent or received DM `id`. */
async function isMessageParticipant(id, username) {
  if (!username) return false;
  const m = await get("SELECT from_user, to_user FROM messages WHERE id=?", [
    id,
  ]);
  return !!m && (m.from_user === username || m.to_user === username);
}

app.post("/api/messages/:id/react", async (req, res) => {
  // authz requires a session and pins `username` to it.
  const { username, emoji } = req.body;
  const id = String(Number(req.params.id));
  if (!username || typeof emoji !== "string" || !emoji || emoji.length > 16)
    return res.status(400).json({ ok: false });
  try {
    if (!(await isMessageParticipant(id, username)))
      return res
        .status(403)
        .json({ ok: false, error: "You can only react to your own conversations" });
  } catch (e) {
    return res.status(500).json({ ok: false, error: errMessage(e) });
  }
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

app.get("/api/messages/:id/reactions", async (req, res) => {
  const reactions = {};
  const id = String(Number(req.params.id));
  let allowed = false;
  try {
    allowed = await isMessageParticipant(id, getSessionUser(req)?.username);
  } catch {}
  // Non-participants see no reactions (same shape, nothing leaked).
  const r = (allowed && msgReactions[id]) || {};
  for (const [e, users] of Object.entries(r)) {
    if (users.size > 0) reactions[e] = [...users];
  }
  res.json({ ok: true, reactions });
});

/* ========== AI AGENT (Groq) ========== */
// One server-side agent behind every AI feature: streaming chat, completion,
// fix, coach, … (src/ai/*, src/routes/agent.js).
app.use(createAgentRouter({ getSessionUser, requireAuthenticatedUser, studioAuth }));
app.use(createVoiceRouter({ getSessionUser, requireAuthenticatedUser }));

app.use(
  createStudioRouter({
    all,
    fetch,
    fs,
    get,
    path,
    run,
    studioAuth,
  }),
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
  createLearningRouter({
    all,
    fetch,
    get,
    run,
  }),
);

// Nexora Learn: course coding problems + per-user progress
// Bundled, read-only content (GATE bank, Learn problem set) is the same for
// everyone and changes only on deploy: let the browser reuse it for a minute,
// then revalidate cheaply with the ETag Express already sends (304).
app.get(
  [
    "/api/gate/meta",
    "/api/gate/questions",
    "/api/gate/questions/:id",
    "/api/gate/questions/:id/solution",
    "/api/gate/paper/:paperId",
    "/api/learn/problems",
    "/api/learn/problems/:slug",
  ],
  (req, res, next) => {
    res.set("Cache-Control", "private, max-age=60");
    next();
  },
);

app.use(createLearnRouter({ get, all, run }));
app.use(require("./routes/today").createTodayRouter({ all }));

// GATE CSE / IT / DA past-year question bank
app.use(createGateRouter());
// GATE learning platform: attempts, progress, review, tests, plan, leaderboard
app.use(createGateMeRouter());
// GATE Notes: the course reader (compiled lessons) + per-user study state
app.use(createGateNotesRouter());
// Handwritten solutions: tablet pad, phone photos, uploads
app.use(require("./routes/hand").createHandRouter());
// Live: study rooms and calls (video, voice, screens, tablets). The socket side
// is attached once socket.io is up (liveRooms.signal, below).
// Video explanations on questions and lessons (files on disk, data/explain).
app.use(require("./routes/explain").createExplainRouter());
// Pratibimb: a person's own talking model from their photos and voice (files on disk, data/pratibimb).
app.use(require("./routes/pratibimb").createPratibimbRouter());
const liveRooms = {};
app.use(require("./routes/live-rooms").createLiveRoomsRouter({ realtime, live: liveRooms }));

// ForgeBuilder routes
app.use("/api/forge", createForgeRouter({ all, get, run }));

// LiveClass routes
app.use("/api/live", createLiveRouter({ all, get, run }));
// Nexora Hive: staff-only multi-agent workspace (src/routes/hive.js).
app.use(createHiveRouter());

/* ========== START ========== */
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: {
    // Same allowlist as the HTTP API (CLIENT_ORIGINS).
    origin: corsOrigin(DEPLOY),
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

/* ── Socket authentication ──
 * Every socket is tied to the signed-in express session; the username used for
 * DMs, presence, rooms and signaling comes from that session, never from the
 * event payload (clients used to send `username` / `from` and the server
 * believed them, so anyone could act as anyone).
 *
 * The session middleware only runs on the handshake request — later polling
 * requests / the websocket upgrade carry the engine.io `sid` instead. */
io.engine.use((req, res, next) => {
  if (req._query?.sid === undefined) return sessionMiddleware(req, res, next);
  next();
});

function isAllowedSocketOrigin(req) {
  const origin = req.headers.origin;
  // Browsers always send Origin on websocket/XHR; non-browser clients have no
  // ambient cookies to abuse. In dev the Vite proxy forwards from localhost.
  if (!DEPLOY.enforceOrigins || !origin) return true;
  if (isOriginAllowed(DEPLOY, origin)) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

io.use(async (socket, next) => {
  if (!isAllowedSocketOrigin(socket.request))
    return next(new Error("Origin not allowed"));
  const user = getSessionUser(socket.request);
  if (!user?.username) return next(new Error("Authentication required"));
  // Banned users, and everyone without access while the site is private,
  // get no realtime connection either.
  try {
    const verdict = await socketAccess(user.username);
    if (!verdict.ok) return next(new Error(verdict.reason));
  } catch (e) {
    return next(new Error("Authentication failed"));
  }
  socket.data.username = user.username;
  next();
});

// Hive's realtime namespace: same session, origin, ban and private-mode checks
// as the default namespace; admins and the owner only (src/hive/hub.js).
/** Hive's live connection: admins and the owner, unless Admin → Site map keeps Hive to the owner. */
async function mayJoinHive(username) {
  const verdict = await socketAccess(username);
  if (!verdict.ok) return false;
  const P = require("./authz/permissions");
  const sitemap = require("./sitemap");
  const a = verdict.access;
  const mode = sitemap.effectiveModes(await require("./authz/site-settings").getSettings())["hive"];
  return sitemap.allowed(mode, { owner: a.role === "owner", staff: P.hasAnyAdminPerm(a), hive: P.mayUseHive(a) }, sitemap.BY_ID.get("hive"));
}
app.locals.mayJoinHive = mayJoinHive;

attachHive(io, {
  authorize: async (socket) => {
    if (!isAllowedSocketOrigin(socket.request)) return null;
    const user = getSessionUser(socket.request);
    if (!user?.username) return null;
    return (await mayJoinHive(user.username)) ? user.username : null;
  },
  // Hive is one shared staff workspace: every staff member can follow every chat.
  canSeeConvo: async (id) => !!(await get("SELECT id FROM hive_convos WHERE id=?", [id])),
});

/** Payloads come straight from the client — never destructure null. */
const payloadOf = (p) => (p && typeof p === "object" ? p : {});
const isId = (v) => typeof v === "string" && v.length > 0 && v.length <= 64;

function emitToUser(username, event, payload) {
  const sids = userSockets[username];
  if (!sids) return;
  for (const sid of sids) io.to(sid).emit(event, payload);
}

async function areFriends(a, b) {
  const row = await get(
    "SELECT id FROM friendships WHERE ((from_user=? AND to_user=?) OR (from_user=? AND to_user=?)) AND status='accepted'",
    [a, b, b, a],
  );
  return !!row;
}

/** The socket joined this solve room via join-solve-room. */
const inSolveRoom = (socket, roomId) =>
  isId(roomId) && socket.rooms.has(`solve-${roomId}`);

/** WebRTC signaling may only reach a socket sharing a solve room with us. */
function sharesSolveRoom(socket, targetId) {
  if (!isId(targetId) || targetId === socket.id) return false;
  const target = io.sockets.sockets.get(targetId);
  if (!target) return false;
  for (const room of socket.rooms) {
    if (room.startsWith("solve-") && target.rooms.has(room)) return true;
  }
  return false;
}

liveRooms.signal = require("./live/signal").createLiveSignal({ io, getSessionUser, socketAccess, realtime });
realtime.online = () => Object.keys(userSockets);
require("./push").setOnline(realtime.online);
realtime.emitToUser = (username, event, payload) => emitToUser(username, event, payload);
realtime.broadcast = (event, payload) => io.emit(event, payload);
realtime.disconnectUser = (username) => {
  for (const sid of userSockets[username] || []) io.sockets.sockets.get(sid)?.disconnect(true);
};

/**
 * Live events that belong to a Site map part (Admin → Site map). The part's
 * API is shut by the Site map gate; these events would skip it, so each is
 * checked here too: a member can't send a direct message while Messages is
 * switched off, or join a solve room while Rooms is.
 */
const SOCKET_PARTS = {
  "direct-message": "social.messages",
  "typing-start": "social.messages",
  "typing-stop": "social.messages",
  "chat:typing": "social.messages",
  "mark-messages-read": "social.messages",
  "join-solve-room": "social.rooms",
  "room-chat": "social.rooms",
  "room-code-change": "social.rooms",
};
async function socketPartOpen(username, partId) {
  const sitemap = require("./sitemap");
  const part = sitemap.BY_ID.get(partId);
  if (!part) return true;
  const verdict = await socketAccess(username);
  if (!verdict.ok) return false;
  const a = verdict.access;
  const mode = sitemap.effectiveModes(await require("./authz/site-settings").getSettings())[partId];
  return sitemap.allowed(mode, { owner: a.role === "owner", staff: hasAnyAdminPerm(a), hive: mayUseHive(a) }, part);
}

io.on("connection", (socket) => {
  // Set by the io.use() auth middleware from the session — the only identity
  // any handler below trusts.
  const me = socket.data.username;
  socket.use(([event], next) => {
    const partId = SOCKET_PARTS[event];
    if (!partId) return next();
    socketPartOpen(me, partId)
      .then((open) => (open ? next() : socket.emit("social-error", { error: "This section is switched off right now" })))
      .catch(() => socket.emit("social-error", { error: "This section is switched off right now" }));
  });

  /* ===== User registration & presence ===== */
  const registerPresence = async () => {
    if (onlineUsers[socket.id]) return;
    onlineUsers[socket.id] = { username: me, socketId: socket.id };
    if (!userSockets[me]) userSockets[me] = new Set();
    userSockets[me].add(socket.id);
    // Update DB status
    try {
      await run(
        "UPDATE users SET status='online', last_seen=? WHERE username=?",
        [new Date().toISOString(), me],
      );
    } catch {}
    // Broadcast online status to friends
    socket.broadcast.emit("user-online", { username: me });
  };
  registerPresence();
  // Kept for older clients; any `username` in the payload is ignored.
  socket.on("register-user", () => {
    registerPresence();
  });

  /* ===== Direct Messaging ===== */
  socket.on("direct-message", async (p) => {
    const { to, content } = payloadOf(p);
    if (!isId(to) || typeof content !== "string" || !content.trim()) return;
    try {
      const msg = await insertDirectMessage(me, to, content);
      if (!msg) return socket.emit("social-error", { error: "User not found" });
      // Send to recipient's sockets
      emitToUser(to, "new-message", { message: msg });
      // Confirm to sender
      socket.emit("message-sent", { message: msg });
    } catch (e) {
      socket.emit("social-error", { error: errMessage(e) });
    }
  });

  /* ===== Solve Room Events ===== */
  // Joining awaits a DB lookup; a leave sent meanwhile (fast unmount) bumps the
  // generation so the stale join does not complete afterwards.
  const joinGen = new Map();
  const bumpJoinGen = (roomId) => {
    const gen = (joinGen.get(roomId) || 0) + 1;
    joinGen.set(roomId, gen);
    return gen;
  };
  socket.on("join-solve-room", async (p) => {
    const { roomId } = payloadOf(p);
    if (!isId(roomId)) return;
    const gen = bumpJoinGen(roomId);
    let room;
    try {
      room = await get("SELECT id, status FROM solve_rooms WHERE id=?", [
        roomId,
      ]);
    } catch {
      return;
    }
    if (joinGen.get(roomId) !== gen || !socket.connected) return;
    if (!room || room.status !== "open") {
      socket.emit("social-error", { error: "Room not found" });
      return;
    }
    if (!solveRoomMembers[roomId]) solveRoomMembers[roomId] = [];
    const existing = solveRoomMembers[roomId].find((m) => m.username === me);
    if (!existing) {
      solveRoomMembers[roomId].push({ username: me, socketId: socket.id });
    } else {
      existing.socketId = socket.id;
    }
    socket.join(`solve-${roomId}`);
    io.to(`solve-${roomId}`).emit("room-members-updated", {
      roomId,
      members: solveRoomMembers[roomId].map((m) => m.username),
    });
  });

  socket.on("leave-solve-room", (p) => {
    const { roomId } = payloadOf(p);
    if (!isId(roomId)) return;
    bumpJoinGen(roomId);
    if (!inSolveRoom(socket, roomId)) return;
    if (solveRoomMembers[roomId]) {
      solveRoomMembers[roomId] = solveRoomMembers[roomId].filter(
        (m) => m.username !== me,
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

  socket.on("room-chat", async (p) => {
    const { roomId, content } = payloadOf(p);
    if (!inSolveRoom(socket, roomId)) return;
    if (typeof content !== "string" || !content.trim()) return;
    const sanitized = content.trim().substring(0, 2000);
    try {
      await run(
        "INSERT INTO room_messages(room_id,username,content,created_at) VALUES(?,?,?,?)",
        [roomId, me, sanitized, new Date().toISOString()],
      );
      const user = await get(
        "SELECT display_name, avatar FROM users WHERE username=?",
        [me],
      );
      io.to(`solve-${roomId}`).emit("room-chat-message", {
        roomId,
        username: me,
        content: sanitized,
        display_name: user?.display_name || me,
        avatar: normalizeAvatar(user?.avatar, me),
        created_at: new Date().toISOString(),
      });
    } catch {}
  });

  socket.on("room-code-change", (p) => {
    const { roomId, code } = payloadOf(p);
    if (!inSolveRoom(socket, roomId) || typeof code !== "string") return;
    socket
      .to(`solve-${roomId}`)
      .emit("room-code-update", { code: code.slice(0, 200000), username: me });
  });

  /* ===== WebRTC Voice Signaling ===== */
  socket.on("voice-join", (p) => {
    const { roomId } = payloadOf(p);
    if (!inSolveRoom(socket, roomId)) return;
    socket
      .to(`solve-${roomId}`)
      .emit("voice-user-joined", { username: me, socketId: socket.id });
  });

  socket.on("voice-leave", (p) => {
    const { roomId } = payloadOf(p);
    if (!inSolveRoom(socket, roomId)) return;
    socket.to(`solve-${roomId}`).emit("voice-user-left", { username: me });
  });

  socket.on("voice-offer", (p) => {
    const { to, offer } = payloadOf(p);
    if (!sharesSolveRoom(socket, to)) return;
    io.to(to).emit("voice-offer", {
      from: socket.id,
      offer,
      fromUsername: me,
    });
  });

  socket.on("voice-answer", (p) => {
    const { to, answer } = payloadOf(p);
    if (!sharesSolveRoom(socket, to)) return;
    io.to(to).emit("voice-answer", { from: socket.id, answer });
  });

  socket.on("voice-ice-candidate", (p) => {
    const { to, candidate } = payloadOf(p);
    if (!sharesSolveRoom(socket, to)) return;
    io.to(to).emit("voice-ice-candidate", { from: socket.id, candidate });
  });

  /* ===== Typing Indicators ===== */
  socket.on("typing-start", (p) => {
    const { to } = payloadOf(p);
    if (!isId(to) || to === me) return;
    emitToUser(to, "user-typing", { from: me });
  });

  // Messages (src/chat.js): "typing…" goes to the conversation's other members.
  socket.on("chat:typing", async (p) => {
    const { conversationId, typing } = payloadOf(p);
    const id = Number(conversationId);
    if (!Number.isInteger(id) || id <= 0) return;
    try {
      const chat = require("./chat");
      await chat.membership(id, me);
      for (const n of await chat.memberNames(id)) if (n !== me) emitToUser(n, "chat:typing", { conversationId: id, username: me, typing: !!typing });
    } catch {
      /* not a member: say nothing */
    }
  });

  socket.on("typing-stop", (p) => {
    const { to } = payloadOf(p);
    if (!isId(to) || to === me) return;
    emitToUser(to, "user-stopped-typing", { from: me });
  });

  /* ===== Message read receipt ===== */
  // The reader is always the session user: marks `from`'s messages to me read.
  socket.on("mark-messages-read", async (p) => {
    const { from } = payloadOf(p);
    if (!isId(from)) return;
    try {
      await run(
        "UPDATE messages SET read=1 WHERE from_user=? AND to_user=? AND read=0",
        [from, me],
      );
      emitToUser(from, "messages-read", { by: me });
    } catch {}
  });

  /* ===== Room voice speaking indicator ===== */
  socket.on("voice-speaking", (p) => {
    const { roomId, speaking } = payloadOf(p);
    if (!inSolveRoom(socket, roomId)) return;
    socket
      .to(`solve-${roomId}`)
      .emit("voice-speaking-update", { username: me, speaking: !!speaking });
  });

  /* ===== Friend challenge ===== */
  socket.on("challenge-friend", async (p) => {
    const { to, problemId, problemTitle } = payloadOf(p);
    if (!isId(to)) return;
    try {
      if (!(await areFriends(me, to))) return;
    } catch {
      return;
    }
    emitToUser(to, "challenge-received", {
      from: me,
      problemId,
      problemTitle:
        typeof problemTitle === "string" ? problemTitle.slice(0, 200) : "",
    });
  });

  /* ===== Friend request notifications ===== */
  // Only relayed when the REST request actually created a friendship row.
  socket.on("notify-friend-request", async (p) => {
    const { to } = payloadOf(p);
    if (!isId(to)) return;
    try {
      const f = await get(
        "SELECT id FROM friendships WHERE (from_user=? AND to_user=?) OR (from_user=? AND to_user=? AND status='accepted')",
        [me, to, to, me],
      );
      if (!f) return;
    } catch {
      return;
    }
    emitToUser(to, "friend-request-received", { from: me });
  });

  /* ===== Legacy collab rooms ===== */
  socket.on("create-room", (p) => {
    const data = payloadOf(p);
    const roomId = Math.random().toString(36).slice(2, 8).toUpperCase();
    rooms[roomId] = {
      host: socket.id,
      problem: data.problemId,
      code: typeof data.code === "string" ? data.code : "",
      users: [socket.id],
    };
    socket.join(roomId);
    socket.emit("room-created", { roomId });
  });
  socket.on("join-room", (p) => {
    const { roomId } = payloadOf(p);
    const room = isId(roomId) && Object.hasOwn(rooms, roomId) && rooms[roomId];
    if (!room) {
      socket.emit("room-error", { error: "Room not found" });
      return;
    }
    if (!room.users.includes(socket.id)) room.users.push(socket.id);
    socket.join(roomId);
    socket.emit("room-joined", {
      roomId,
      code: room.code,
      problem: room.problem,
    });
    io.to(roomId).emit("user-count", { count: room.users.length });
  });
  socket.on("code-change", (p) => {
    const { roomId, code } = payloadOf(p);
    if (!isId(roomId) || !socket.rooms.has(roomId) || !rooms[roomId]) return;
    if (typeof code !== "string") return;
    rooms[roomId].code = code;
    socket.to(roomId).emit("code-update", { code });
  });
  socket.on("cursor-move", (p) => {
    const { roomId, position } = payloadOf(p);
    if (!isId(roomId) || !socket.rooms.has(roomId) || !rooms[roomId]) return;
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
  // Owner from OWNER_USERNAME, first-boot private mode (src/authz/access.js).
  await initAdminSystem();
  // Admin-chosen AI providers and models (Admin → AI models).
  require("./ai/settings").startRefresh();
  // Our own code runners (Admin → Code runners) join the judge's chain.
  require("./runners").startRefresh();
  require("./piston").setExtraServers(require("./runners").judgeServers);
  require("./judge0").setServers(require("./runners").judge0Servers);
  // Public runners turned on/off and their compiler versions, kept up to date
  // by themselves every few hours (Admin → Code runners).
  await require("./compilers").load(true).catch(() => {});
  require("./compilers").startSchedule();
  await Promise.all([_forgeInit, _liveInit]);
  // Give every account its own progress/XP/settings (one-time, idempotent).
  await migratePerUser();
  // Award achievements already earned by existing progress (once per user).
  // A one-time migration: progress made since is awarded as it happens
  // (judge, CF sync), so later boots skip the scan of `progress`.
  try {
    const done = await get("SELECT value FROM settings WHERE username='' AND key='achievements_backfilled'");
    const owners = done ? [] : await all(
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
    if (!done) {
      await run("INSERT OR REPLACE INTO settings(username, key, value) VALUES('', 'achievements_backfilled', ?)", [
        new Date().toISOString(),
      ]);
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
    // the legacy SPA when no client build exists. Never served from a stale cache.
    res.setHeader("Cache-Control", "no-cache");
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
    if (status >= 500) sentry.captureException(err, { method: req.method, path: req.path });
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
    console.log(`\n🚀 NexoraGuru running on ${APP_URL}`);
    console.log(`   NODE_ENV : ${process.env.NODE_ENV || "development"}`);
    console.log(`   Port     : ${PORT}`);
    console.log(
      `   OAuth    : GitHub=${!!process.env.GITHUB_CLIENT_ID} Google=${!!process.env.GOOGLE_CLIENT_ID}\n`,
    );
    // Warm the in-memory problem catalog so the first Nexus visit doesn't pay for it.
    if (process.env.NODE_ENV !== "test") {
      getCatalog().catch((e) => console.warn("[catalog] warm-up failed:", e.message));
    }
    // A minute after start, problems with no topics yet get theirs (src/topics.js):
    // 200 at a time with a pause, so it never crowds out real requests.
    // TOPICS_STARTUP=0 turns it off.
    if (process.env.TOPICS_STARTUP !== "0") {
      setTimeout(() => require("./topics").classifyNew({ by: "startup" }), 60_000).unref();
    }
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
    sentry.captureException(err);
    if (IS_PROD) shutdown("uncaughtException");
  });
  process.on("unhandledRejection", (reason) => {
    console.error("[unhandledRejection]", reason);
    sentry.captureException(reason);
  });

  // Statement backfill: every problem's statement, samples and figures are
  // fetched ahead of time (src/sources/backfill.js), so opening a problem
  // never waits on the judge. Two minutes after start, then every 6 hours
  // (refused problems wait for their retry time). STATEMENT_BACKFILL=0 turns
  // it off; an admin can pause it in Admin → Problem sources.
  if (process.env.NODE_ENV !== "test" && process.env.STATEMENT_BACKFILL !== "0") {
    const tick = () => startStatementBackfill({ auto: true }).catch((e) => console.warn("[backfill]", e.message));
    setTimeout(tick, 2 * 60_000).unref?.();
    setInterval(tick, 6 * 3600_000).unref?.();
  }

  // Problem sources an admin marked for daily syncing (checked hourly).
  if (process.env.NODE_ENV !== "test" && process.env.DISABLE_SCRAPER !== "1") {
    const sourcesTick = () => require("./sources").autoSyncDue().catch((e) => console.warn("[sources] auto sync:", e.message));
    setTimeout(sourcesTick, 5 * 60_000).unref?.();
    setInterval(sourcesTick, 60 * 60_000).unref?.();
  }
})();

/* ========== Statement backfill ========== */
// One run at a time in this process; the admin page reads its progress.
let _backfill = null;
const BACKFILL_PAUSED = "statement_backfill_paused";
async function backfillPaused() {
  const r = await get("SELECT value FROM settings WHERE username='' AND key=?", [BACKFILL_PAUSED]).catch(() => null);
  return r?.value === "1";
}
async function startStatementBackfill({ auto = false } = {}) {
  if (_backfill && _backfill.status().running) return _backfill;
  if (auto && (await backfillPaused())) return null;
  if (!auto) await run("DELETE FROM settings WHERE username='' AND key=?", [BACKFILL_PAUSED]);
  _backfill = require("./sources/backfill").start({
    save: (id, data) => _saveStatement(id, data),
    fetch: (p) => require("./sources").fetchStatement(p),
    order: "desc",
    log: (m) => console.log(m),
  });
  return _backfill;
}
async function pauseStatementBackfill() {
  await run("INSERT OR REPLACE INTO settings(username, key, value) VALUES('', ?, '1')", [BACKFILL_PAUSED]);
  _backfill?.stop();
}
async function statementBackfillStatus() {
  return { paused: await backfillPaused(), run: _backfill ? _backfill.status() : null };
}
