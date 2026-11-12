// Secrets at rest for Hive: provider API keys and GitHub tokens.
//
// AES-256-GCM with a key derived from HIVE_SECRET (falls back to
// SESSION_SECRET). The plaintext only exists in memory for the duration of a
// provider call; the API never returns it, only the last four characters.
const crypto = require("crypto");

function masterKey() {
  const secret =
    process.env.HIVE_SECRET ||
    process.env.SESSION_SECRET ||
    (process.env.NODE_ENV === "production" ? "" : "nexora-hive-dev-only-secret");
  if (!secret) throw new Error("HIVE_SECRET (or SESSION_SECRET) must be set to store API keys");
  return crypto.createHash("sha256").update(`hive:v1:${secret}`).digest();
}

function seal(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", masterKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  return `v1:${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${enc.toString("base64")}`;
}

function open(sealed) {
  const [v, iv, tag, data] = String(sealed || "").split(":");
  if (v !== "v1" || !iv || !tag || !data) throw new Error("Unreadable secret");
  const decipher = crypto.createDecipheriv("aes-256-gcm", masterKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}

const last4 = (s) => String(s || "").trim().slice(-4);

module.exports = { seal, open, last4 };
