/*
  Avatar set: the client list (client/src/lib/avatar.ts), the server list
  (src/avatar-set.js) and the shipped SVGs (client/public/avatars/) must
  agree, and both sides must give every username the same default.

  avatar.ts is TypeScript; Node ≥ 22.18 strips the types natively.
*/
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const server = require('../src/avatar-set');

const ROOT = path.join(__dirname, '..');
const PUB = path.join(ROOT, 'client', 'public', 'avatars');
const loadClient = () => import(pathToFileURL(path.join(ROOT, 'client', 'src', 'lib', 'avatar.ts')).href);

test('client and server list the same avatars in the same order', async () => {
  const client = await loadClient();
  assert.deepEqual(client.AVATAR_SET.map((a) => a.id), server.AVATAR_SET_IDS);
  assert.equal(server.AVATAR_SET_IDS.length, 32);
  assert.deepEqual(client.AVATAR_SET.filter((a) => a.group === 'portraits').map((a) => a.id), server.PORTRAIT_IDS);
  assert.deepEqual(client.AVATAR_SET.filter((a) => a.group === 'clay').map((a) => a.id), server.CLAY_IDS);
  assert.equal(new Set(server.AVATAR_SET_IDS).size, 32, 'ids are unique');
});

test('every avatar ships as a clean, small static SVG and nothing else is in the folder', () => {
  const files = fs.readdirSync(PUB).filter((f) => f.endsWith('.svg')).sort();
  assert.deepEqual(files, server.AVATAR_SET_IDS.map((id) => `${id}.svg`).sort());
  for (const f of files) {
    const svg = fs.readFileSync(path.join(PUB, f), 'utf8');
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 64 64">/, f);
    assert.doesNotMatch(svg, /<script|<image|href="http|on[a-z]+=/i, f);
    assert.ok(svg.length < 6000, `${f} is ${svg.length} bytes`);
  }
});

test('client and server pick the same default for every username', async () => {
  const client = await loadClient();
  const names = ['gurudeep', 'GuruDeep', 'a', 'nexora', 'test_user_42', 'Ünïcode', '', 'zz'];
  for (const n of names) {
    assert.equal(`set:${client.defaultAvatarId(n)}`, server.defaultAvatar(n), n);
  }
  // Case-insensitive, like usernames themselves.
  assert.equal(server.defaultAvatar('GuruDeep'), server.defaultAvatar('gurudeep'));
  // Defaults are portraits, spread over all 16 rather than piling onto a few.
  const used = new Set(Array.from({ length: 400 }, (_, i) => server.defaultAvatar(`user${i}`)));
  assert.equal(used.size, 16);
  for (const v of used) assert.ok(server.PORTRAIT_IDS.includes(v.slice(4)), v);
});

test('old values resolve to the username default; set values are kept', async () => {
  const client = await loadClient();
  for (const old of ['gen:buddy:3', 'gen:rune:12', 'coder', '🧑‍💻', '', null, undefined, 'set:nobody', 'set:MIRA']) {
    assert.equal(server.normalizeAvatar(old, 'gurudeep'), server.defaultAvatar('gurudeep'), String(old));
    assert.equal(client.resolveAvatarId(old, 'gurudeep'), client.defaultAvatarId('gurudeep'), String(old));
    assert.equal(server.isSetAvatar(old), false);
  }
  assert.equal(server.normalizeAvatar('set:zara', 'gurudeep'), 'set:zara');
  assert.equal(client.resolveAvatarId('set:zara', 'gurudeep'), 'zara');
  assert.equal(server.isSetAvatar('set:zara'), true);
});

test('uploaded photo URLs are recognised as images, set values are not', async () => {
  const client = await loadClient();
  for (const v of ['/uploads/a.png', 'https://avatars.githubusercontent.com/u/1', 'data:image/png;base64,AA']) {
    assert.equal(client.isImageUrl(v), true, v);
  }
  for (const v of ['set:kai', 'gen:aura:1', '', null]) assert.equal(client.isImageUrl(v), false, String(v));
});
