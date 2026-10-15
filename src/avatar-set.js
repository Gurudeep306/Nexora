// The NexoraGuru avatar set (server copy). Users store "set:<id>" in
// users.avatar; anything else (old "gen:<style>:<n>" values, legacy preset
// keys such as "coder", emoji, empty) maps to a deterministic default picked
// from the username. Must match client/src/lib/avatar.ts — the order of IDS
// and the hash decide everyone's default. tests/avatar-set.test.js checks.

const AVATAR_SET_IDS = [
  "mira", "kai", "noor", "arjun", "zara", "leo", "sana", "dev",
  "ivy", "omar", "hana", "ravi", "ama", "theo", "lina", "jay",
];
const IDS = new Set(AVATAR_SET_IDS);

// FNV-1a over the lower-cased username.
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function defaultAvatar(username) {
  const s = String(username ?? "").toLowerCase();
  return `set:${AVATAR_SET_IDS[hash(s) % AVATAR_SET_IDS.length]}`;
}

function isSetAvatar(value) {
  const m = /^set:([a-z]+)$/.exec(String(value ?? ""));
  return !!m && IDS.has(m[1]);
}

// The value a user should have stored: their own choice when it is a set id,
// otherwise their username's default.
function normalizeAvatar(value, username) {
  return isSetAvatar(value) ? value : defaultAvatar(username);
}

module.exports = { AVATAR_SET_IDS, defaultAvatar, isSetAvatar, normalizeAvatar };
