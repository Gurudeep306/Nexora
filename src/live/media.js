// How the media (sound, video, screens) of a Live room travels.
//
// Two ways, chosen per room when it opens:
//   - "sfu": a LiveKit server (free, open source; self-hosted or LiveKit Cloud)
//     receives each person's video once and forwards it to everyone, so a room
//     can hold a whole class. Switched on by LIVEKIT_URL, LIVEKIT_API_KEY and
//     LIVEKIT_API_SECRET (see deploy/livekit/README.md).
//   - "mesh": without that server, browsers connect to each other directly.
//     Every person sends their video to every other person, so this stays
//     smooth only for small rooms (MESH_MAX devices).
//
// For "mesh", ICE servers help browsers find each other: a public STUN server
// by default, and a TURN relay when one is configured (coturn with
// TURN_URLS + TURN_SECRET, or Cloudflare's TURN with CF_TURN_KEY_ID +
// CF_TURN_API_TOKEN). Without TURN, some strict networks cannot connect.
const crypto = require("crypto");

const MESH_MAX = 5;
const SFU_MAX_ENV = Math.max(2, Math.min(200, Number(process.env.LIVE_MAX_PEOPLE) || 50));
/** Devices per room through a video server (Admin → Live, else LIVE_MAX_PEOPLE). */
const serverMax = () => {
  const c = require("./config").peekConfig();
  return c.maxPeople && c.maxPeople !== 50 ? c.maxPeople : SFU_MAX_ENV;
};
/** Devices a room may hold with this transport. */
const capOf = (kind) => (kind === "mesh" ? MESH_MAX : serverMax());

/** LiveKit settings: Admin → Live first, then LIVEKIT_* environment variables. */
function livekitConfig() {
  return require("./config").livekit();
}

const b64u = (v) => Buffer.from(typeof v === "string" ? v : JSON.stringify(v)).toString("base64url");
function signJwt(payload, secret) {
  const head = b64u({ alg: "HS256", typ: "JWT" });
  const body = b64u(payload);
  const sig = crypto.createHmac("sha256", secret).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${sig}`;
}

/** A LiveKit access token for one device in one room (6 hours). */
function livekitToken(cfg, { room, identity, name, metadata, canPublish = true }) {
  const now = Math.floor(Date.now() / 1000);
  return signJwt(
    {
      iss: cfg.key,
      sub: identity,
      nbf: now - 10,
      exp: now + 6 * 3600,
      name,
      metadata,
      video: { room, roomJoin: true, canPublish, canSubscribe: true, canPublishData: true },
    },
    cfg.secret,
  );
}

/** Calls LiveKit's room service (remove a person, close a room). Errors are logged, not thrown. */
async function livekitAdmin(cfg, method, body) {
  if (!cfg) return null;
  const now = Math.floor(Date.now() / 1000);
  const token = signJwt({ iss: cfg.key, nbf: now - 10, exp: now + 120, video: { room: body.room, roomAdmin: true, roomCreate: true } }, cfg.secret);
  try {
    const r = await fetch(`${cfg.http}/twirp/livekit.RoomService/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (e) {
    console.error(`[live] LiveKit ${method}: ${e.message}`);
    return null;
  }
}

let cfCache = { at: 0, servers: null };
/** ICE servers for direct (mesh) connections. */
async function iceServers(identity) {
  const servers = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
  const turnUrls = (process.env.TURN_URLS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const turnSecret = process.env.TURN_SECRET;
  if (turnUrls.length && turnSecret) {
    // coturn's "REST API" credentials: they expire, and need no database.
    const username = `${Math.floor(Date.now() / 1000) + 6 * 3600}:${identity}`;
    const credential = crypto.createHmac("sha1", turnSecret).update(username).digest("base64");
    servers.push({ urls: turnUrls, username, credential });
  }
  const cfKey = process.env.CF_TURN_KEY_ID;
  const cfToken = process.env.CF_TURN_API_TOKEN;
  if (cfKey && cfToken) {
    if (!cfCache.servers || Date.now() - cfCache.at > 3600_000) {
      try {
        const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(cfKey)}/credentials/generate-ice-servers`, {
          method: "POST",
          headers: { authorization: `Bearer ${cfToken}`, "content-type": "application/json" },
          body: JSON.stringify({ ttl: 8 * 3600 }),
          signal: AbortSignal.timeout(5000),
        });
        const j = await r.json();
        if (Array.isArray(j.iceServers)) cfCache = { at: Date.now(), servers: j.iceServers };
      } catch (e) {
        console.error(`[live] Cloudflare TURN: ${e.message}`);
      }
    }
    // Port 53 is blocked by most browsers; leave those addresses out.
    if (cfCache.servers) servers.push(...cfCache.servers.map((s) => ({ ...s, urls: [].concat(s.urls).filter((u) => !/:53(\?|$)/.test(u)) })));
  }
  return servers;
}

module.exports = { MESH_MAX, capOf, serverMax, livekitConfig, livekitToken, livekitAdmin, iceServers, signJwt };
