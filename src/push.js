/*
  Web Push: message and call alerts that reach a phone or computer even when
  NexoraGuru is closed (the browser's own free push service; no paid
  provider). Each device that turns alerts on stores a subscription here.

  The VAPID key pair is made once and kept in site_settings, the private key
  sealed (src/hive/vault.js), so nothing has to be configured. An alert is
  sent only to someone with no open tab (their tab shows its own alert), and
  never with the message's code or attachments: the name and a short line.
*/
const webpush = require("web-push");
const { all, get, run } = require("./db");
const { seal, open } = require("./hive/vault");

const KEY = "push_vapid";
let ready = null; // Promise<{ publicKey }>
let online = () => [];

/** Who has a socket open (set by the server): they get the in-page alert instead. */
function setOnline(fn) {
  online = fn;
}

async function init() {
  if (ready) return ready;
  ready = (async () => {
    await run(`CREATE TABLE IF NOT EXISTS push_subscriptions (
      endpoint TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      keys TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`);
    await run("CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(username)");
    let row = await get("SELECT value FROM site_settings WHERE key=?", [KEY]).catch(() => null);
    let pair = null;
    try {
      const v = row ? JSON.parse(row.value) : null;
      if (v?.publicKey && v?.privateKey) pair = { publicKey: v.publicKey, privateKey: open(v.privateKey) };
    } catch {
      pair = null;
    }
    if (!pair) {
      const k = webpush.generateVAPIDKeys();
      pair = k;
      await run(
        "INSERT INTO site_settings(key, value, updated_by, updated_at) VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at",
        [KEY, JSON.stringify({ publicKey: k.publicKey, privateKey: seal(k.privateKey) }), "system", new Date().toISOString()],
      );
    }
    const contact = process.env.PUSH_CONTACT || "https://nexoraguru.in";
    webpush.setVapidDetails(contact.startsWith("http") || contact.startsWith("mailto:") ? contact : `mailto:${contact}`, pair.publicKey, pair.privateKey);
    return { publicKey: pair.publicKey };
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

async function publicKey() {
  return (await init()).publicKey;
}

/** Save a device's subscription (from PushManager.subscribe). */
async function subscribe(username, sub) {
  await init();
  const endpoint = String(sub?.endpoint || "");
  const keys = sub?.keys && typeof sub.keys === "object" ? { p256dh: String(sub.keys.p256dh || ""), auth: String(sub.keys.auth || "") } : null;
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000 || !keys?.p256dh || !keys?.auth) throw Object.assign(new Error("That subscription is not valid."), { status: 400 });
  await run(
    "INSERT INTO push_subscriptions(endpoint, username, keys, created_at) VALUES(?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET username=excluded.username, keys=excluded.keys",
    [endpoint, username, JSON.stringify(keys), Date.now()],
  );
}

async function unsubscribe(username, endpoint) {
  await init();
  await run("DELETE FROM push_subscriptions WHERE endpoint=? AND username=?", [String(endpoint || ""), username]);
}

/** Send one alert to every device of a user. Dead subscriptions are removed. */
async function sendTo(username, payload, { evenIfOnline = false } = {}) {
  if (!username) return 0;
  if (!evenIfOnline && online().includes(username)) return 0;
  await init();
  const subs = await all("SELECT endpoint, keys FROM push_subscriptions WHERE username=?", [username]);
  let sent = 0;
  const body = JSON.stringify(payload);
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: JSON.parse(s.keys) }, body, { TTL: 3600, urgency: payload.urgency || "normal" });
      sent++;
    } catch (e) {
      if (e?.statusCode === 404 || e?.statusCode === 410) await run("DELETE FROM push_subscriptions WHERE endpoint=?", [s.endpoint]).catch(() => {});
    }
  }
  return sent;
}

/** A new message (or invite): the sender's name and a short line, never code. */
function notifyMessage(username, { from, body, url, tag }) {
  const name = from?.name || from?.username || "Someone";
  const text = String(body || "").replace(/```[\s\S]*?```/g, "[code]").replace(/\s+/g, " ").trim().slice(0, 140) || "New message";
  return sendTo(username, { title: name, body: text, url: url || "/social?tab=messages", tag: tag || `chat-${from?.username || ""}`, icon: "/apple-touch-icon.png" });
}

/** An incoming call: rings even when no tab is open. */
function notifyCall(username, { from, title, code, mode }) {
  const name = from?.name || from?.username || "Someone";
  return sendTo(username, { title: `${name} is calling`, body: `${mode === "voice" ? "Voice" : "Video"} call · ${title || "Live"}`, url: `/live/${code}?answer=1`, tag: `call-${code}`, urgency: "high", call: true, icon: "/apple-touch-icon.png" });
}

/** Routes: the public key, and saving or removing this device's subscription. */
function createPushRouter({ requireAuthenticatedUser, isTrustedOrigin }) {
  const express = require("express");
  const router = express.Router();
  // Only the site itself may add a device: another site must not be able to
  // point someone's alerts at its own endpoint.
  router.use("/api/push", (req, res, next) => {
    if (req.method !== "GET" && isTrustedOrigin && !isTrustedOrigin(req)) return res.status(403).json({ ok: false, error: "Untrusted origin" });
    next();
  });
  router.get("/api/push/key", requireAuthenticatedUser, async (req, res) => {
    try {
      res.json({ ok: true, publicKey: await publicKey() });
    } catch {
      res.status(503).json({ ok: false, error: "Notifications aren't available right now." });
    }
  });
  router.post("/api/push/subscribe", requireAuthenticatedUser, async (req, res) => {
    try {
      await subscribe(req.sessionUser.username, req.body?.subscription);
      res.json({ ok: true });
    } catch (e) {
      res.status(e.status || 500).json({ ok: false, error: e.status ? e.message : "Couldn't turn on notifications." });
    }
  });
  router.post("/api/push/unsubscribe", requireAuthenticatedUser, async (req, res) => {
    await unsubscribe(req.sessionUser.username, req.body?.endpoint).catch(() => {});
    res.json({ ok: true });
  });
  return router;
}

/** Display names for alerts. */
async function namesOf(usernames) {
  const list = [...new Set(usernames.filter(Boolean))];
  if (!list.length) return new Map();
  const rows = await all(`SELECT username, display_name FROM users WHERE username IN (${list.map(() => "?").join(",")})`, list).catch(() => []);
  return new Map(rows.map((r) => [r.username, r.display_name || r.username]));
}

module.exports = { createPushRouter, namesOf, init, publicKey, subscribe, unsubscribe, sendTo, notifyMessage, notifyCall, setOnline };
