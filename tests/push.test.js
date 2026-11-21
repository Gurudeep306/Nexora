/*
  Web Push alerts (src/push.js): a device's subscription is kept, an alert is
  sent only to someone with no tab open, message text never carries code,
  and dead subscriptions are dropped.
*/
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-push-'));
process.env.DB_PATH = path.join(tmp, 'push.db');
process.env.NODE_ENV = 'test';

const db = require('../src/db');
const webpush = require('web-push');
const push = require('../src/push');

const sub = (n) => ({ endpoint: `https://push.example.test/${n}`, keys: { p256dh: 'BKey' + n, auth: 'auth' + n } });

test('subscribe, then alerts reach only people without an open tab', async (t) => {
  await db.run('CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY, value TEXT, updated_by TEXT, updated_at TEXT)');
  const key = await push.publicKey();
  assert.ok(typeof key === 'string' && key.length > 40, 'a VAPID public key is made once');
  assert.equal(await push.publicKey(), key, 'and kept');

  await push.subscribe('asha', sub(1));
  await push.subscribe('asha', sub(2));
  await assert.rejects(() => push.subscribe('asha', { endpoint: 'http://not-https', keys: {} }));

  const sent = [];
  t.mock.method(webpush, 'sendNotification', async (s, body) => {
    sent.push({ endpoint: s.endpoint, body: JSON.parse(body) });
    if (s.endpoint.endsWith('/2')) throw Object.assign(new Error('gone'), { statusCode: 410 });
    return {};
  });

  push.setOnline(() => ['ravi']);
  assert.equal(await push.notifyMessage('ravi', { from: { name: 'Asha' }, body: 'hi' }), 0, 'online: the page shows it');

  const n = await push.notifyMessage('asha', { from: { username: 'ravi', name: 'Ravi' }, body: 'Try this:\n```cpp\nint main(){}\n```\nworks?', url: '/messages?c=3', tag: 'chat-3' });
  assert.equal(n, 1);
  assert.equal(sent.length, 2);
  assert.equal(sent[0].body.title, 'Ravi');
  assert.match(sent[0].body.body, /\[code\]/);
  assert.doesNotMatch(sent[0].body.body, /int main/);
  assert.equal(sent[0].body.url, '/messages?c=3');

  // The dead device (410) was removed: only one is tried next time.
  sent.length = 0;
  await push.notifyCall('asha', { from: { name: 'Ravi' }, title: 'DP', code: 'abc-defg-hij', mode: 'video' });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].body.call, true);
  assert.equal(sent[0].body.url, '/live/abc-defg-hij?answer=1');
});
