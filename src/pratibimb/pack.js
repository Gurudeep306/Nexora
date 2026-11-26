// Pratibimb identity packs (docs/pratibimb/PACK_FORMAT.md): read and check a .pbpack (a zip) without any
// dependency. A pack is genuine when its signature.json is an HMAC-SHA256 of manifest.json made with
// PRATIBIMB_PACK_KEY, and every file it lists is present with the listed SHA-256.
const crypto = require("crypto");
const zlib = require("zlib");

const SCHEMA = "nexoraguru.pratibimb.pack";
const MAX_ENTRIES = 2000;
const MAX_UNPACKED = 600 * 1024 * 1024;

/** The zip's files as { name: Buffer } (stored and deflated entries; zip64 is not needed for packs). */
function readZip(buf) {
  // End of central directory: the last 22..65557 bytes.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Not a pack file (no zip directory)");
  const count = buf.readUInt16LE(eocd + 10);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  if (count > MAX_ENTRIES) throw new Error("Too many files in the pack");
  const out = {};
  let p = cdOffset;
  let total = 0;
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("Damaged pack (directory)");
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const usize = buf.readUInt32LE(p + 24);
    const nlen = buf.readUInt16LE(p + 28);
    const xlen = buf.readUInt16LE(p + 30);
    const clen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nlen);
    p += 46 + nlen + xlen + clen;
    if (name.endsWith("/")) continue;
    if (name.includes("..") || name.startsWith("/") || name.includes("\\")) throw new Error("Unsafe file name in the pack");
    total += usize;
    if (total > MAX_UNPACKED) throw new Error("The pack is too large when unpacked");
    if (buf.readUInt32LE(local) !== 0x04034b50) throw new Error("Damaged pack (file header)");
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const data = buf.subarray(start, start + csize);
    if (method === 0) out[name] = Buffer.from(data);
    else if (method === 8) out[name] = zlib.inflateRawSync(data, { maxOutputLength: Math.max(usize, 1) });
    else throw new Error(`Unsupported compression in the pack (${method})`);
    if (out[name].length !== usize) throw new Error(`Damaged pack (${name})`);
  }
  return out;
}

/** Write a zip (stored entries): used by tests and by the server when it needs to make a small pack. */
function writeZip(files) {
  const locals = [];
  const central = [];
  let offset = 0;
  const crcTable = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[i] = c >>> 0;
    }
    return t;
  })();
  const crc32 = (b) => {
    let c = 0xffffffff;
    for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  for (const [name, data] of Object.entries(files)) {
    const nb = Buffer.from(name);
    const crc = crc32(data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(data.length, 18);
    lh.writeUInt32LE(data.length, 22);
    lh.writeUInt16LE(nb.length, 26);
    locals.push(lh, nb, data);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(20, 4);
    ch.writeUInt16LE(20, 6);
    ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(data.length, 20);
    ch.writeUInt32LE(data.length, 24);
    ch.writeUInt16LE(nb.length, 28);
    ch.writeUInt32LE(offset, 42);
    central.push(ch, nb);
    offset += 30 + nb.length + data.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

function sign(manifestBytes, key) {
  return crypto.createHmac("sha256", key).update(manifestBytes).digest("hex");
}

/**
 * Check a pack. Returns { manifest, signed, summary } or throws with a plain reason.
 * signed: true (made by this site's build machine, unchanged), false (no or wrong signature).
 */
function checkPack(buf, key = process.env.PRATIBIMB_PACK_KEY || "") {
  const files = readZip(buf);
  if (!files["manifest.json"]) throw new Error("This is not a Pratibimb pack (no manifest).");
  let manifest;
  try {
    manifest = JSON.parse(files["manifest.json"].toString("utf8"));
  } catch {
    throw new Error("The pack's manifest cannot be read.");
  }
  if (manifest.schema !== SCHEMA) throw new Error("This is not a Pratibimb pack.");
  if (!/^1\./.test(String(manifest.version || ""))) throw new Error(`This pack's version (${manifest.version}) is newer than this site understands.`);
  for (const [name, meta] of Object.entries(manifest.files || {})) {
    const f = files[name];
    if (!f) throw new Error(`The pack is missing ${name}.`);
    if (crypto.createHash("sha256").update(f).digest("hex") !== meta.sha256) throw new Error(`${name} in the pack has been changed.`);
  }
  if (!files["identity.json"]) throw new Error("The pack has no identity.json.");
  let signed = false;
  if (key && files["signature.json"]) {
    try {
      const sig = JSON.parse(files["signature.json"].toString("utf8"));
      const want = sign(files["manifest.json"], key);
      signed = typeof sig.value === "string" && sig.value.length === want.length && crypto.timingSafeEqual(Buffer.from(sig.value), Buffer.from(want));
    } catch {
      signed = false;
    }
  }
  const q = manifest.quality || {};
  return {
    manifest,
    signed,
    summary: {
      created: manifest.created || null,
      version: manifest.version,
      frames: q.frames ?? null,
      views: q.views ?? null,
      textureSeen: q.texture_seen_share ?? null,
      consent: manifest.consent ? { subject: manifest.consent.subject || null, at: manifest.consent.at || null } : null,
      signed,
    },
  };
}

module.exports = { readZip, writeZip, checkPack, sign, SCHEMA };
