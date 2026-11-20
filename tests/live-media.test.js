// Live rooms media settings (src/live/media.js): which transport a room uses,
// LiveKit access tokens in LiveKit's format (HS256 JWT, "video" grant), and
// TURN credentials in coturn's REST format.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const media = require('../src/live/media');

const decode = (jwt) => {
  const [h, b, sig] = jwt.split('.');
  return { head: JSON.parse(Buffer.from(h, 'base64url')), body: JSON.parse(Buffer.from(b, 'base64url')), sig, signed: `${h}.${b}` };
};

test('LiveKit is used only when all three settings are present', () => {
  const keep = { ...process.env };
  try {
    process.env.LIVEKIT_URL = 'wss://live.example.org';
    process.env.LIVEKIT_API_KEY = 'APIkey';
    delete process.env.LIVEKIT_API_SECRET;
    assert.equal(media.livekitConfig(), null);
    process.env.LIVEKIT_API_SECRET = 'secret-secret';
    const cfg = media.livekitConfig();
    assert.equal(cfg.http, 'https://live.example.org');
  } finally {
    process.env = keep;
  }
});

test('a LiveKit token is an HS256 JWT with the room grant', () => {
  const cfg = { key: 'APIkey', secret: 'a-long-secret-for-tests' };
  const t = media.livekitToken(cfg, { room: 'room-id', identity: 'peer1', name: 'Ana', metadata: '{"username":"ana"}' });
  const { head, body, sig, signed } = decode(t);
  assert.deepEqual(head, { alg: 'HS256', typ: 'JWT' });
  assert.equal(sig, crypto.createHmac('sha256', cfg.secret).update(signed).digest('base64url'));
  assert.equal(body.iss, 'APIkey');
  assert.equal(body.sub, 'peer1');
  assert.equal(body.name, 'Ana');
  assert.deepEqual(body.video, { room: 'room-id', roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true });
  assert.ok(body.exp > Date.now() / 1000 + 5 * 3600);
  assert.ok(body.nbf <= Date.now() / 1000);
});

test('TURN credentials follow coturn REST auth and expire', async () => {
  const keep = { ...process.env };
  try {
    process.env.TURN_URLS = 'turn:turn.example.org:3478?transport=udp, turns:turn.example.org:5349';
    process.env.TURN_SECRET = 'turn-secret';
    delete process.env.CF_TURN_KEY_ID;
    const servers = await media.iceServers('peer1');
    assert.match(String(servers[0].urls), /^stun:/);
    const turn = servers[1];
    assert.equal(turn.urls.length, 2);
    const [exp, who] = turn.username.split(':');
    assert.equal(who, 'peer1');
    assert.ok(Number(exp) > Date.now() / 1000);
    assert.equal(turn.credential, crypto.createHmac('sha1', 'turn-secret').update(turn.username).digest('base64'));
  } finally {
    process.env = keep;
  }
});
