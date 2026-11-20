// Real-time layer authorization: socket.io identifies the user from the
// express session, never from `username` / `from` fields in event payloads.
//
// socket.io-client is only a client/ dependency, so this test speaks the
// engine.io v4 long-polling protocol directly over fetch (which lets us send
// the session Cookie header).
const { freePort } = require('./helpers/free-port');
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

let serverProc;
let baseUrl;
let serverLog = '';

async function waitForServer(url, timeoutMs = 50000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/api/health`);
      if (res.ok) return;
    } catch {}
    if (serverProc && serverProc.exitCode !== null) {
      throw new Error(`server exited early (${serverProc.exitCode}): ${serverLog}`);
    }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error(`Server did not become ready within ${timeoutMs}ms: ${serverLog}`);
}

/** Minimal socket.io (EIO=4, polling) client. */
async function connectSocket(cookie = '') {
  const headers = cookie ? { Cookie: cookie } : {};
  const open = await fetch(`${baseUrl}/socket.io/?EIO=4&transport=polling`, { headers });
  assert.equal(open.status, 200, 'engine.io handshake');
  const body = await open.text();
  assert.equal(body[0], '0', `engine.io open packet, got ${body}`);
  const { sid } = JSON.parse(body.slice(1));
  const url = `${baseUrl}/socket.io/?EIO=4&transport=polling&sid=${sid}`;
  const send = async (packet) => {
    const r = await fetch(url, { method: 'POST', headers: { ...headers, 'Content-Type': 'text/plain' }, body: packet });
    assert.equal(r.status, 200);
  };
  const queue = [];
  /** Next socket.io packet (string without the engine.io "4" prefix). */
  const next = async () => {
    while (!queue.length) {
      const r = await fetch(url, { headers });
      const text = await r.text();
      for (const p of text.split('\x1e')) {
        if (p === '2') await send('3'); // ping → pong
        else if (p.startsWith('4')) queue.push(p.slice(1));
      }
    }
    return queue.shift();
  };
  /** Wait for a specific event, skipping others (e.g. user-online). */
  const waitFor = async (event) => {
    for (;;) {
      const p = await next();
      if (!p.startsWith('2')) continue;
      const [name, data] = JSON.parse(p.slice(1));
      if (name === event) return data;
    }
  };
  await send('40'); // connect to the default namespace
  const connectReply = await next();
  return {
    connected: connectReply.startsWith('0'),
    connectReply,
    emit: (event, data) => send(`42${JSON.stringify([event, data])}`),
    waitFor,
    close: () => send('1').catch(() => {}),
  };
}

async function registerUser(prefix) {
  const username = `${prefix}${Date.now().toString(36).slice(-5)}${Math.floor(Math.random() * 1e4)}`;
  const res = await fetch(`${baseUrl}/api/user/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, display_name: prefix, password: 'pass1234', avatar: 'coder' }),
  });
  assert.equal(res.status, 200, await res.clone().text());
  const cookie = res.headers.get('set-cookie')?.split(';')[0] || '';
  assert.ok(cookie.includes('nx.sid='));
  return { username, cookie };
}

async function conversation(viewer, other) {
  const res = await fetch(
    `${baseUrl}/api/messages/${encodeURIComponent(viewer.username)}/${encodeURIComponent(other.username)}`,
    { headers: { Cookie: viewer.cookie } },
  );
  assert.equal(res.status, 200);
  return (await res.json()).messages;
}

let alice;
let bob;

test.before(async () => {
  const port = await freePort();
  baseUrl = `http://127.0.0.1:${port}`;
  serverProc = spawn(process.execPath, ['src/server.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'test',
      DISABLE_PUPPETEER: '1',
      DISABLE_SCRAPER: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  serverProc.stdout.on('data', (d) => { serverLog += d; });
  serverProc.stderr.on('data', (d) => { serverLog += d; });
  await waitForServer(baseUrl);
  alice = await registerUser('sal');
  bob = await registerUser('sbo');
});

test.after(async () => {
  if (!serverProc) return;
  serverProc.kill('SIGTERM');
  await new Promise(resolve => serverProc.once('exit', resolve));
});

test('unauthenticated socket is refused and cannot register or send a DM', async () => {
  const anon = await connectSocket();
  assert.equal(anon.connected, false, `expected connect error, got ${anon.connectReply}`);
  assert.match(anon.connectReply, /^4.*Authentication required/);

  const content = `anon-forged-${Date.now()}`;
  // The engine.io session may already be closed; either way nothing may land.
  await anon.emit('register-user', { username: bob.username }).catch(() => {});
  await anon.emit('direct-message', { from: alice.username, to: bob.username, content }).catch(() => {});
  await new Promise(r => setTimeout(r, 300));
  const msgs = await conversation(bob, alice);
  assert.equal(msgs.some(m => m.content === content), false);
  await anon.close();
});

test('authenticated DM is stored from the session user, not the payload', async () => {
  const sock = await connectSocket(alice.cookie);
  assert.equal(sock.connected, true, sock.connectReply);

  const content = `hello-${Date.now()}`;
  // Forge `from` as bob — the server must ignore it.
  await sock.emit('direct-message', { from: bob.username, to: bob.username, content });
  const { message } = await sock.waitFor('message-sent');
  assert.equal(message.from_user, alice.username);
  assert.equal(message.to_user, bob.username);
  assert.equal(message.content, content);

  const stored = (await conversation(bob, alice)).filter(m => m.content === content);
  assert.equal(stored.length, 1);
  assert.equal(stored[0].from_user, alice.username);
  assert.equal(stored[0].id, message.id);
  await sock.close();
});

test('REST DM returns the row it inserted and pins the sender', async () => {
  const content = `rest-${Date.now()}`;
  const res = await fetch(`${baseUrl}/api/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: bob.cookie },
    body: JSON.stringify({ from: alice.username, to: alice.username, content }),
  });
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.message.from_user, bob.username);
  assert.equal(body.message.to_user, alice.username);
  assert.equal(body.message.content, content);
});

test('only conversation participants can react to a message', async () => {
  const outsider = await registerUser('sev');
  const res = await fetch(`${baseUrl}/api/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: alice.cookie },
    body: JSON.stringify({ to: bob.username, content: 'react to me' }),
  });
  const { message } = await res.json();
  const react = (user) => fetch(`${baseUrl}/api/messages/${message.id}/react`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: user.cookie },
    body: JSON.stringify({ username: bob.username, emoji: '👍' }),
  });
  assert.equal((await react(outsider)).status, 403);
  const ok = await react(bob);
  assert.equal(ok.status, 200);
  assert.deepEqual((await ok.json()).reactions, { '👍': [bob.username] });
});
