// Social network + profiles (src/routes/social.js): posts, likes, comments,
// reposts, follows, notifications, blocking, muting, privacy, moderation,
// rate limits, profiles and the showcase.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-social-'));
const DB = path.join(tmp, 'test.db');
const stamp = Date.now().toString(36).slice(-5);
const OWNER = `own${stamp}`;
const [ANA, BEN, CAT, DAN, EVE, FAY] = ['an', 'be', 'ca', 'da', 'ev', 'fa'].map((p) => `${p}${stamp}`);
let proc, base;
let serverLog = '';

async function waitFor(url) {
  for (let i = 0; i < 160; i++) {
    try { if ((await fetch(url)).ok) return; } catch {}
    if (proc && proc.exitCode !== null) throw new Error(`server exited early (${proc.exitCode}): ${serverLog}`);
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`server not ready within 40s: ${serverLog}`);
}
const call = async (method, p, cookie, body, headers = {}) => {
  const r = await fetch(`${base}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json = {};
  try { json = JSON.parse(text); } catch {}
  return { status: r.status, body: json, text, headers: r.headers };
};
const cookieOf = (r) => (r.headers.get('set-cookie') || '').split(';')[0];
async function register(name) {
  const r = await call('POST', '/api/user/register', null, { username: name, password: 'secret123' });
  return { ...r, cookie: cookieOf(r) };
}
const c = {};
const ok = (r, msg) => assert.equal(r.status, 200, `${msg || ''} ${r.status} ${JSON.stringify(r.body)}`);

test.before(async () => {
  const port = 27000 + Math.floor(Math.random() * 1000);
  base = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ['src/server.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'test',
      DB_PATH: DB,
      OWNER_USERNAME: OWNER,
      DISABLE_PUPPETEER: '1',
      DISABLE_SCRAPER: '1',
      SOCIAL_POST_LIMIT: '6',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', (d) => { serverLog += d; });
  proc.stderr.on('data', (d) => { serverLog += d; });
  await waitFor(`${base}/api/health`);
  const owner = await register(OWNER);
  ok(owner, 'owner registers');
  c.owner = owner.cookie;
  ok(await call('PUT', '/api/admin/site/private-mode', c.owner, { enabled: false }));
  for (const n of [ANA, BEN, CAT, DAN, EVE, FAY]) {
    const r = await register(n);
    ok(r, `register ${n}`);
    c[n] = r.cookie;
  }
  ok(await call('POST', `/api/admin/users/${CAT}/role`, c.owner, { role: 'moderator' }), 'cat → moderator');
});
test.after(async () => {
  if (!proc) return;
  const done = new Promise((r) => proc.once('exit', r));
  proc.kill('SIGKILL');
  await done;
  fs.rmSync(tmp, { recursive: true, force: true });
});

const ids = {};

test('posts: text with hashtags, mentions, code and polls; stored as plain text', async () => {
  assert.equal((await call('POST', '/api/social/posts', null, { body: 'hi' })).status, 401, 'signed out');
  assert.equal((await call('POST', '/api/social/posts', c[ANA], { body: '   ' })).status, 400, 'empty');
  assert.equal((await call('POST', '/api/social/posts', c[ANA], { body: 'x'.repeat(2001) })).status, 400, 'too long');
  assert.equal((await call('POST', '/api/social/posts', c[ANA], { body: 'pic', images: ['https://evil.example/x.png'] })).status, 400, 'foreign image');
  assert.equal((await call('POST', '/api/social/posts', c[ANA], { body: 'x', share: { type: 'solved', id: 1 } })).status, 400, 'unearned share card');

  const xss = '<img src=x onerror=alert(1)> hello @' + BEN + ' #DP and #graphs';
  const p = await call('POST', '/api/social/posts', c[ANA], {
    body: xss,
    code: { lang: 'python', source: 'print("hi")' },
  });
  ok(p, 'create');
  ids.ana = p.body.post.id;
  assert.equal(p.body.post.body, xss, 'kept verbatim — the client renders text, never HTML');
  assert.deepEqual(p.body.post.code, { lang: 'python', source: 'print("hi")' });
  assert.equal(p.body.post.author.username, ANA);

  const poll = await call('POST', '/api/social/posts', c[ANA], { body: 'Best language for CP?', poll: { options: ['C++', 'Python', 'Java'], hours: 24 } });
  ok(poll, 'poll');
  ids.poll = poll.body.post.id;
  assert.equal(poll.body.post.poll.options.length, 3);
  assert.equal((await call('POST', '/api/social/posts', c[ANA], { body: 'q', poll: { options: ['a'] } })).status, 400);
  const v = await call('POST', `/api/social/posts/${ids.poll}/vote`, c[BEN], { option: 1 });
  ok(v, 'vote');
  assert.equal(v.body.post.poll.options[1].votes, 1);
  assert.equal(v.body.post.poll.my_vote, 1);
  assert.equal((await call('POST', `/api/social/posts/${ids.poll}/vote`, c[BEN], { option: 0 })).status, 409, 'one vote');

  const tag = await call('GET', '/api/social/tags/dp', c[BEN]);
  ok(tag);
  assert.ok(tag.body.items.some((i) => i.post.id === ids.ana), 'hashtag page');
  const trending = await call('GET', '/api/social/trending', c[BEN]);
  assert.ok(trending.body.tags.some((t) => t.tag === 'graphs'));
});

test('edit and delete: only the author; edits are marked', async () => {
  assert.equal((await call('PATCH', `/api/social/posts/${ids.ana}`, c[BEN], { body: 'hacked' })).status, 403);
  const e = await call('PATCH', `/api/social/posts/${ids.ana}`, c[ANA], { body: 'Edited: hello @' + BEN + ' #dp' });
  ok(e);
  assert.ok(e.body.post.edited_at, 'edited flag');
  const temp = await call('POST', '/api/social/posts', c[ANA], { body: 'temporary' });
  assert.equal((await call('DELETE', `/api/social/posts/${temp.body.post.id}`, c[BEN])).status, 403);
  ok(await call('DELETE', `/api/social/posts/${temp.body.post.id}`, c[ANA]));
  assert.equal((await call('GET', `/api/social/posts/${temp.body.post.id}`, c[ANA])).status, 404);
});

test('follows, home feed and the follow notification', async () => {
  assert.equal((await call('PUT', `/api/social/follow/${BEN}`, c[BEN])).status, 400, 'not yourself');
  const f = await call('PUT', `/api/social/follow/${ANA}`, c[BEN]);
  ok(f);
  assert.equal(f.body.following, 'accepted');
  ok(await call('PUT', `/api/social/follow/${ANA}`, c[BEN]), 'idempotent');
  const feed = await call('GET', '/api/social/feed?tab=home', c[BEN]);
  ok(feed);
  assert.ok(feed.body.items.some((i) => i.post.id === ids.ana), 'followed posts in home');
  const followers = await call('GET', `/api/social/users/${ANA}/followers`, c[DAN]);
  assert.deepEqual(followers.body.users.map((u) => u.username), [BEN]);
  const n = await call('GET', '/api/social/notifications', c[ANA]);
  assert.equal(n.body.groups.filter((g) => g.type === 'follow').length, 1, 'one follow notification, not two');
  const mention = await call('GET', '/api/social/notifications', c[BEN]);
  assert.ok(mention.body.groups.some((g) => g.type === 'mention' && g.post_id === ids.ana), 'mention notification');
  const prof = await call('GET', `/api/profiles/${ANA}`, c[BEN]);
  assert.equal(prof.body.profile.counts.followers, 1);
  assert.equal(prof.body.relation.following, 'accepted');
});

test('likes are idempotent, counted once and grouped in notifications', async () => {
  ok(await call('PUT', `/api/social/posts/${ids.ana}/like`, c[BEN]));
  const again = await call('PUT', `/api/social/posts/${ids.ana}/like`, c[BEN]);
  assert.equal(again.body.likes, 1);
  ok(await call('PUT', `/api/social/posts/${ids.ana}/like`, c[DAN]));
  ok(await call('PUT', `/api/social/posts/${ids.ana}/like`, c[EVE]));
  const n = await call('GET', '/api/social/notifications', c[ANA]);
  const likes = n.body.groups.filter((g) => g.type === 'like' && g.post_id === ids.ana);
  assert.equal(likes.length, 1, 'grouped');
  assert.equal(likes[0].actor_count, 3);
  const un = await call('DELETE', `/api/social/posts/${ids.ana}/like`, c[EVE]);
  assert.equal(un.body.likes, 2);
  const post = await call('GET', `/api/social/posts/${ids.ana}`, c[BEN]);
  assert.equal(post.body.post.me.liked, true);
  assert.equal(post.body.post.counts.likes, 2);
  const unread = await call('GET', '/api/social/notifications/unread', c[ANA]);
  assert.ok(unread.body.unread >= 3);
  ok(await call('POST', '/api/social/notifications/read', c[ANA]));
  assert.equal((await call('GET', '/api/social/notifications/unread', c[ANA])).body.unread, 0);
});

test('comments thread one level deep; replies notify the parent author', async () => {
  const c1 = await call('POST', `/api/social/posts/${ids.ana}/comments`, c[BEN], { body: 'Nice one' });
  ok(c1);
  const r1 = await call('POST', `/api/social/posts/${ids.ana}/comments`, c[ANA], { body: 'Thanks!', parent_id: c1.body.comment.id });
  ok(r1);
  assert.equal(r1.body.comment.parent_id, c1.body.comment.id);
  const r2 = await call('POST', `/api/social/posts/${ids.ana}/comments`, c[DAN], { body: 'deeper', parent_id: r1.body.comment.id });
  assert.equal(r2.body.comment.parent_id, c1.body.comment.id, 'a reply to a reply stays one level deep');
  const list = await call('GET', `/api/social/posts/${ids.ana}/comments`, c[EVE]);
  assert.equal(list.body.comments.length, 3);
  const nb = await call('GET', '/api/social/notifications', c[BEN]);
  assert.ok(nb.body.groups.some((g) => g.type === 'reply'), 'reply notification');
  const na = await call('GET', '/api/social/notifications', c[ANA]);
  assert.ok(na.body.groups.some((g) => g.type === 'comment' && g.snippet === 'Nice one'), 'comment notification with snippet');
  assert.equal((await call('DELETE', `/api/social/comments/${r2.body.comment.id}`, c[BEN])).status, 403, 'not yours');
  ok(await call('DELETE', `/api/social/comments/${r2.body.comment.id}`, c[DAN]));
  const post = await call('GET', `/api/social/posts/${ids.ana}`, c[BEN]);
  assert.equal(post.body.post.counts.comments, 2);
  ids.comment = c1.body.comment.id;
});

test('reposts and quotes reach followers; explore ranks and shows featured first', async () => {
  ok(await call('PUT', `/api/social/follow/${DAN}`, c[EVE]));
  const rp = await call('PUT', `/api/social/posts/${ids.ana}/repost`, c[DAN]);
  ok(rp);
  assert.equal(rp.body.reposts, 1);
  const feed = await call('GET', '/api/social/feed?tab=home', c[EVE]);
  const item = feed.body.items.find((i) => i.post.id === ids.ana);
  assert.ok(item, 'reposted post in follower feed');
  assert.equal(item.reposted_by.username, DAN);
  const q = await call('POST', '/api/social/posts', c[DAN], { body: 'Look at this', quote_of: ids.ana });
  ok(q);
  assert.equal(q.body.post.quote.id, ids.ana);
  const quiet = await call('POST', '/api/social/posts', c[FAY], { body: 'a quiet post' });
  assert.equal((await call('POST', `/api/social/posts/${quiet.body.post.id}/feature`, c[BEN])).status, 403, 'needs content.feature');
  ok(await call('POST', `/api/social/posts/${quiet.body.post.id}/feature`, c.owner, { on: true }));
  const ex = await call('GET', '/api/social/feed?tab=explore', c[EVE]);
  ok(ex);
  assert.equal(ex.body.items[0].post.id, quiet.body.post.id, 'featured first');
  assert.equal(ex.body.items[0].post.featured, true);
  const rest = ex.body.items.slice(1).map((i) => i.post.id);
  assert.ok(rest.indexOf(ids.ana) < rest.indexOf(q.body.post.id), 'engagement ranks higher');
  const bm = await call('PUT', `/api/social/posts/${ids.ana}/bookmark`, c[EVE]);
  ok(bm);
  assert.ok((await call('GET', '/api/social/bookmarks', c[EVE])).body.items.some((i) => i.post.id === ids.ana));
});

test('blocking: the blocked user can neither see nor interact', async () => {
  ok(await call('PUT', `/api/social/block/${BEN}`, c[ANA]));
  assert.equal((await call('GET', `/api/social/posts/${ids.ana}`, c[BEN])).status, 404, 'post hidden');
  assert.equal((await call('PUT', `/api/social/posts/${ids.ana}/like`, c[BEN])).status, 404, 'cannot like');
  assert.equal((await call('POST', `/api/social/posts/${ids.ana}/comments`, c[BEN], { body: 'hey' })).status, 404, 'cannot comment');
  assert.equal((await call('PUT', `/api/social/follow/${ANA}`, c[BEN])).status, 403, 'cannot follow');
  const feed = await call('GET', '/api/social/feed?tab=home', c[BEN]);
  assert.ok(!feed.body.items.some((i) => i.post.author.username === ANA), 'gone from feed');
  const prof = await call('GET', `/api/profiles/${ANA}`, c[BEN]);
  assert.equal(prof.body.locked, true);
  assert.equal(prof.body.profile.counts.followers, 0, 'follow removed by the block');
  const search = await call('GET', `/api/social/search?q=${ANA}`, c[BEN]);
  assert.equal(search.body.users.length, 0, 'not in search');
  // Ben's comment on Ana's post is hidden from Ana too.
  const list = await call('GET', `/api/social/posts/${ids.ana}/comments`, c[ANA]);
  assert.ok(!list.body.comments.some((x) => x.author.username === BEN));
  ok(await call('DELETE', `/api/social/block/${BEN}`, c[ANA]));
  ok(await call('GET', `/api/social/posts/${ids.ana}`, c[BEN]), 'visible again after unblock');
});

test('muting hides someone from your feeds only', async () => {
  ok(await call('PUT', `/api/social/follow/${ANA}`, c[EVE]));
  ok(await call('PUT', `/api/social/mute/${ANA}`, c[EVE]));
  const feed = await call('GET', '/api/social/feed?tab=home', c[EVE]);
  assert.ok(!feed.body.items.some((i) => i.post.author.username === ANA && !i.reposted_by));
  ok(await call('GET', `/api/social/posts/${ids.ana}`, c[EVE]), 'still reachable directly');
  ok(await call('DELETE', `/api/social/mute/${ANA}`, c[EVE]));
});

test('privacy: a followers-only profile needs an accepted follow', async () => {
  ok(await call('PUT', '/api/profiles/me', c[FAY], { visibility: 'followers' }));
  const secret = await call('POST', '/api/social/posts', c[FAY], { body: 'followers only #secret' });
  ok(secret);
  assert.equal((await call('GET', `/api/social/posts/${secret.body.post.id}`, c[BEN])).status, 404);
  const prof = await call('GET', `/api/profiles/${FAY}`, c[BEN]);
  assert.equal(prof.body.locked, true);
  assert.equal((await call('GET', `/api/profiles/${FAY}/showcase`, c[BEN])).body.locked, true);
  const posts = await call('GET', `/api/social/users/${FAY}/posts`, c[BEN]);
  assert.equal(posts.body.locked, true);
  const ex = await call('GET', '/api/social/feed?tab=explore', c[BEN]);
  assert.ok(!ex.body.items.some((i) => i.post.author.username === FAY), 'not in explore');
  const f = await call('PUT', `/api/social/follow/${FAY}`, c[BEN]);
  assert.equal(f.body.following, 'pending');
  const reqs = await call('GET', '/api/social/follow-requests', c[FAY]);
  assert.deepEqual(reqs.body.requests.map((r) => r.username), [BEN]);
  ok(await call('POST', `/api/social/followers/${BEN}/accept`, c[FAY]));
  ok(await call('GET', `/api/social/posts/${secret.body.post.id}`, c[BEN]), 'visible to an accepted follower');
  assert.equal((await call('GET', `/api/profiles/${FAY}`, c[BEN])).body.locked, false);
  assert.equal((await call('GET', `/api/social/posts/${secret.body.post.id}`, c[DAN])).status, 404, 'still hidden from others');
});

test('moderation: report → a moderator removes → hidden; restore brings it back', async () => {
  const bad = await call('POST', '/api/social/posts', c[EVE], { body: 'buy followers cheap' });
  const id = bad.body.post.id;
  const rep = await call('POST', '/api/reports', c[DAN], { content_type: 'post', content_id: id, reason: 'spam' });
  ok(rep);
  const q = await call('GET', '/api/admin/reports', c[CAT]);
  const report = q.body.reports.find((r) => r.content_type === 'post' && String(r.content_id) === String(id));
  assert.ok(report, 'in the queue');
  assert.equal(report.target_user, EVE);
  assert.equal(report.snapshot, 'buy followers cheap');
  assert.equal((await call('POST', '/api/admin/content/remove', c[DAN], { content_type: 'post', content_id: id })).status, 404, 'members cannot remove (admin API is hidden from them)');
  ok(await call('POST', '/api/admin/content/remove', c[CAT], { content_type: 'post', content_id: id, reason: 'spam' }));
  assert.equal((await call('GET', `/api/social/posts/${id}`, c[DAN])).status, 404, 'hidden from members');
  assert.equal((await call('GET', `/api/social/posts/${id}`, c[EVE])).status, 404, 'hidden from the author too');
  const asMod = await call('GET', `/api/social/posts/${id}`, c[CAT]);
  ok(asMod);
  assert.equal(asMod.body.post.removed, true, 'moderators see it flagged');
  assert.equal((await call('PATCH', `/api/social/posts/${id}`, c[EVE], { body: 'sneaky edit' })).status, 403, 'no editing removed posts');
  ok(await call('POST', '/api/admin/content/restore', c[CAT], { content_type: 'post', content_id: id }));
  const back = await call('GET', `/api/social/posts/${id}`, c[DAN]);
  ok(back);
  assert.equal(back.body.post.body, 'buy followers cheap');
  // Comments too.
  ok(await call('POST', '/api/admin/content/remove', c[CAT], { content_type: 'comment', content_id: ids.comment }));
  const list = await call('GET', `/api/social/posts/${ids.ana}/comments`, c[DAN]);
  const tomb = list.body.comments.find((x) => x.id === ids.comment);
  assert.ok(!tomb || (tomb.tombstone === 'removed' && tomb.body === ''), 'removed comment hidden (tombstone keeps its replies)');
});

test('rate limits: posting is capped per user', async () => {
  let last;
  for (let i = 0; i < 7; i++) last = await call('POST', '/api/social/posts', c[DAN], { body: `post ${i}` });
  // Dan already posted once (the quote), so the cap of 6 is hit by now.
  assert.equal(last.status, 429);
  assert.equal(last.body.code, 'rate_limited');
  ok(await call('POST', '/api/social/posts', c[BEN], { body: 'others unaffected' }));
});

test('profiles: editing, validation, pins and the showcase', async () => {
  assert.equal((await call('PUT', '/api/profiles/me', c[ANA], { links: [{ label: 'x', url: 'javascript:alert(1)' }] })).status, 400, 'no javascript: links');
  assert.equal((await call('PUT', '/api/profiles/me', c[ANA], { cover: 'https://evil.example/c.png' })).status, 400);
  assert.equal((await call('PUT', '/api/profiles/me', c[ANA], { pinned: [{ type: 'post', id: ids.poll }, { type: 'post', id: 999999 }] })).status, 400, 'own posts only');
  const r = await call('PUT', '/api/profiles/me', c[ANA], {
    display_name: 'Ana Lovelace',
    bio: 'Graphs & DP. <b>bold</b>',
    location: 'Tirupati',
    pronouns: 'she/her',
    website: 'ana.dev',
    links: [{ label: 'GitHub', url: 'https://github.com/ana' }],
    cover: 'nebula',
    accent: 'info',
    pinned: [{ type: 'post', id: ids.poll }],
  });
  ok(r);
  const p = await call('GET', `/api/profiles/${ANA}`, c[DAN]);
  assert.equal(p.body.profile.display_name, 'Ana Lovelace');
  assert.equal(p.body.profile.bio, 'Graphs & DP. <b>bold</b>');
  assert.equal(p.body.profile.website, 'https://ana.dev/');
  assert.equal(p.body.profile.cover, 'nebula');
  assert.equal(p.body.profile.links[0].label, 'GitHub');
  const s = await call('GET', `/api/profiles/${ANA}/showcase`, c[DAN]);
  ok(s);
  assert.equal(s.body.locked, false);
  assert.ok(s.body.stats.level.level >= 1);
  assert.ok(Array.isArray(s.body.heatmap));
  assert.ok(Array.isArray(s.body.achievements));
  assert.equal(s.body.pinned[0].post.id, ids.poll);
  assert.equal((await call('GET', '/api/profiles/nobody_here_x', c[DAN])).status, 404);
  const sugg = await call('GET', '/api/social/suggestions', c[EVE]);
  ok(sugg);
  assert.ok(!sugg.body.users.some((u) => u.username === EVE), 'never yourself');
});

test('friends list includes uploaded avatar URLs', async () => {
  const req = await call('POST', '/api/friends/request', c[ANA], { from: ANA, to: DAN });
  ok(req);
  const pending = await call('GET', `/api/friends/${DAN}/requests`, c[DAN]);
  ok(await call('POST', '/api/friends/accept', c[DAN], { id: pending.body.incoming[0].id }));
  const friends = await call('GET', `/api/friends/${DAN}`, c[DAN]);
  assert.ok('avatar_url' in friends.body.friends[0], 'avatar_url returned');
});

test('the social feature flag switches the API off', async () => {
  ok(await call('PUT', '/api/admin/site/flags', c.owner, { social: false }));
  const off = await call('GET', '/api/social/feed', c[ANA]);
  assert.equal(off.status, 403);
  assert.equal(off.body.code, 'feature_disabled');
  ok(await call('GET', `/api/profiles/${ANA}`, c[BEN]), 'profiles stay up');
  ok(await call('PUT', '/api/admin/site/flags', c.owner, { social: true }));
});

test('showcase: lists verified judge accounts only (the Bridge)', async () => {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(DB, { timeout: 10000 }); // wait for the server's write lock instead of failing
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS linked_accounts (username TEXT NOT NULL, platform TEXT NOT NULL, handle TEXT NOT NULL, token TEXT, token_at INTEGER, verified_at INTEGER, rating INTEGER, max_rating INTEGER, rank TEXT, solved INTEGER, imported INTEGER, last_import INTEGER, last_error TEXT, stats_json TEXT NOT NULL DEFAULT '{}', PRIMARY KEY (username, platform))`);
    db.prepare('INSERT OR REPLACE INTO linked_accounts(username, platform, handle, token, verified_at, rating, max_rating, solved) VALUES(?,?,?,?,?,?,?,?)').run(ANA, 'codeforces', 'ana_cf', null, Date.now(), 1500, 1620, 300);
    db.prepare('INSERT OR REPLACE INTO linked_accounts(username, platform, handle, token, verified_at) VALUES(?,?,?,?,?)').run(ANA, 'atcoder', 'ana_ac', 'nexora-secret', null);
  } finally {
    db.close();
  }
  const r = await call('GET', `/api/profiles/${ANA}/showcase`, c[BEN]);
  ok(r);
  assert.deepEqual(r.body.linked.map((l) => [l.platform, l.handle, l.rating, l.solved]), [['codeforces', 'ana_cf', 1500, 300]]);
  assert.ok(!JSON.stringify(r.body.linked).includes('nexora-secret'), 'proof tokens never leave the server');
});
