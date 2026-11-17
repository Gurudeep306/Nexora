// Messages (src/chat.js): direct messages, requests and privacy, groups and
// roles, read receipts, reactions, replies, edits, deletes, pins, polls,
// forwarding, saved messages, invite links, search, mentions, reports, and
// the one-time copy of the old one-to-one messages.
process.env.NODE_ENV = "test";
process.env.DB_PATH = ":memory:";
const test = require("node:test");
const assert = require("node:assert/strict");
const db = require("../src/db");
const chat = require("../src/chat");

const users = ["ana", "ben", "cy", "dev", "eve", "fay"];
const noShare = async () => null;
const follow = (a, b) => db.run("INSERT OR IGNORE INTO social_follows(follower, followee, status, created_at) VALUES(?,?, 'accepted', 0)", [a, b]);

test.before(async () => {
  await db.initDb();
  for (const u of users) await db.run("INSERT OR IGNORE INTO users(username, password_hash, created_at) VALUES(?, 'x', ?)", [u, new Date().toISOString()]).catch(() => db.run("INSERT OR IGNORE INTO users(username) VALUES(?)", [u]));
  // An old one-to-one message, copied in on first use.
  await db.run("INSERT INTO messages(from_user, to_user, content, read, created_at) VALUES('fay','ana','hello from before',1,'2026-01-01T00:00:00.000Z')");
  // ana follows ben, cy, dev and fay, so their messages reach her directly.
  for (const u of ["ben", "cy", "dev", "fay"]) await follow("ana", u);
  await follow("ben", "ana");
  await follow("cy", "ana");
});

test("old messages are copied in once, with their read state", async () => {
  const { conversations } = await chat.listFor("ana");
  const dm = conversations.find((c) => c.kind === "dm" && c.members.some((m) => m.username === "fay"));
  assert.ok(dm, "the old conversation is there");
  assert.equal(dm.last.body, "hello from before");
  assert.equal(dm.unread, 0, "it was read before");
  await chat.init();
  assert.equal((await chat.listFor("ana")).conversations.length, 1, "copied only once");
});

test("a direct message: send, unread, read receipt, reply, edit, delete", async () => {
  const id = await chat.openDm("ben", "ana");
  assert.equal(await chat.openDm("ana", "ben"), id, "one conversation per pair");
  const m1 = await chat.send("ben", id, { body: "hi ana" }, noShare);
  assert.equal((await chat.unread("ana")).total, 1);
  const r = await chat.markRead("ana", id);
  assert.deepEqual(r, { lastReadId: m1.id, visible: true });
  assert.equal((await chat.unread("ana")).total, 0);
  const seen = (await chat.one("ben", id)).conversation.members.find((m) => m.username === "ana");
  assert.equal(seen.lastReadId, m1.id, "ben sees that ana read it");

  const reply = await chat.send("ana", id, { body: "hey!", replyTo: m1.id }, noShare);
  assert.equal(reply.replyTo.body, "hi ana");
  await assert.rejects(chat.edit("ana", m1.id, "changed"), /only edit your own/);
  const edited = await chat.edit("ben", m1.id, "hi ana!!");
  assert.ok(edited.editedAt);
  const gone = await chat.remove("ben", m1.id);
  assert.equal(gone.deleted, true);
  assert.equal(gone.body, "");
  await assert.rejects(chat.send("ben", id, { body: "   " }, noShare), /Write a message/);
});

test("someone outside a conversation can't see or touch it", async () => {
  const id = await chat.openDm("ben", "ana");
  const { messages } = await chat.messages("ana", id);
  await assert.rejects(chat.messages("eve", id), /not found/);
  await assert.rejects(chat.send("eve", id, { body: "x" }, noShare), /not found/);
  await assert.rejects(chat.react("eve", messages.at(-1).id, "👍"), /not found/);
  await assert.rejects(chat.report("eve", messages.at(-1).id, { reason: "spam" }), /not found/);
  assert.equal((await chat.search("eve", "hey")).results.length, 0, "search only looks in your own conversations");
  assert.ok((await chat.search("ana", "hey")).results.length >= 1);
});

test("strangers land in Requests: hidden receipts, 3-message limit, accept or decline", async () => {
  // eve doesn't follow dev and dev doesn't follow eve.
  const id = await chat.openDm("eve", "dev");
  const list = (await chat.listFor("dev")).conversations.find((c) => c.id === id);
  assert.equal(list.request, true);
  for (const n of [1, 2, 3]) await chat.send("eve", id, { body: `hello ${n}` }, noShare);
  await assert.rejects(chat.send("eve", id, { body: "4" }, noShare), /accept your message request/);
  assert.equal((await chat.unread("dev")).total, 0, "requests aren't counted as unread");
  assert.equal((await chat.unread("dev")).requests, 1);
  const r = await chat.markRead("dev", id);
  assert.equal(r.visible, false, "reading a request isn't shown to the sender");
  assert.equal((await chat.one("eve", id)).conversation.members.find((m) => m.username === "dev").lastReadId, 0);
  await chat.decline("dev", id);
  assert.ok(!(await chat.listFor("dev")).conversations.some((c) => c.id === id), "declined: gone from dev's list");
});

test("replying to a request accepts it", async () => {
  const id = await chat.openDm("eve", "cy");
  await chat.send("eve", id, { body: "hi cy" }, noShare);
  await chat.send("cy", id, { body: "hi" }, noShare);
  assert.equal((await chat.listFor("cy")).conversations.find((c) => c.id === id).request, false);
});

test("privacy: people you follow only, or nobody; blocking stops everything", async () => {
  await chat.setSettings("fay", { who: "following" });
  await assert.rejects(chat.openDm("eve", "fay"), /only takes messages from people they follow/);
  await chat.setSettings("fay", { who: "nobody" });
  await assert.rejects(chat.openDm("eve", "fay"), /isn't taking new messages/);
  await assert.rejects(chat.setSettings("fay", { who: "friends" }), /Choose/);
  await chat.setSettings("fay", { who: "everyone" });
  await db.run("INSERT INTO social_blocks(blocker, blocked, created_at) VALUES('fay','eve',0)");
  await assert.rejects(chat.openDm("eve", "fay"), /can't message/);
  await assert.rejects(chat.createGroup("eve", { title: "x", members: ["fay"] }), /can't add fay/);
});

test("groups: roles, invites, rename, remove, leave and hand-over", async () => {
  const id = await chat.createGroup("ana", { title: "DP club", members: ["ben", "cy", "eve"] });
  const g = (await chat.one("ana", id)).conversation;
  assert.equal(g.role, "owner");
  assert.equal(g.members.find((m) => m.username === "eve").invited, true, "eve doesn't follow ana: an invite");
  assert.equal(g.members.find((m) => m.username === "ben").invited, false);
  await assert.rejects(chat.rename("ben", id, "Mine"), /owner and admins/);
  await chat.setRole("ana", id, "ben", "admin");
  await chat.rename("ben", id, "DP club 2", "Daily DP problems");
  assert.equal((await chat.one("cy", id)).conversation.description, "Daily DP problems");
  await assert.rejects(chat.removeMember("cy", id, "ben"), /can't remove/);
  await assert.rejects(chat.setRole("ben", id, "cy", "admin"), /Only the owner/);
  await chat.removeMember("ben", id, "cy");
  await assert.rejects(chat.messages("cy", id), /not found/, "removed: no access");
  await chat.accept("eve", id);
  await chat.leave("ana", id);
  assert.equal((await chat.one("ben", id)).conversation.role, "owner", "the admin takes over when the owner leaves");
  const sys = (await chat.messages("ben", id)).messages.filter((m) => m.kind === "system").map((m) => m.body);
  assert.ok(sys.includes("left the group") && sys.includes("is now the owner") && sys.includes("removed cy"));
});

test("reactions, pins, polls, saved, forward and mentions", async () => {
  const id = await chat.createGroup("ana", { title: "Study", members: ["ben", "cy"] });
  const m = await chat.send("ben", id, { body: "who's in @ana @cy for tonight?" }, noShare);
  assert.deepEqual(m.mentions, ["ana", "cy"]);
  await chat.mute("cy", id, true);
  assert.ok((await chat.unread("cy")).total >= 1, "a mention still counts in a muted chat");

  let r = await chat.react("cy", m.id, "🔥");
  assert.deepEqual(r.reactions, { "🔥": ["cy"] });
  r = await chat.react("cy", m.id, "🔥");
  assert.deepEqual(r.reactions, {}, "a second tap takes it back");
  await assert.rejects(chat.react("cy", m.id, "abc"), /Pick an emoji/);
  await assert.rejects(chat.react("cy", m.id, "<b>"), /Pick an emoji/);

  await assert.rejects(chat.pin("cy", m.id), /owner and admins can pin/);
  assert.ok((await chat.pin("ana", m.id)).pinnedAt);
  assert.equal((await chat.pins("cy", id)).length, 1);

  const poll = await chat.createPoll("ben", id, { question: "Which topic?", options: ["DP", "Graphs", "DP", ""] });
  assert.deepEqual(poll.poll.options.map((o) => o.text), ["DP", "Graphs"], "blank and repeated choices dropped");
  await chat.vote("cy", poll.id, [2]);
  const v = await chat.vote("ana", poll.id, [1, 2]);
  assert.deepEqual(v.poll.options.map((o) => o.voters), [["ana"], ["cy"]], "one choice only, unless the poll allows more");
  await assert.rejects(chat.closePoll("cy", poll.id), /Only whoever asked/);
  await chat.closePoll("ben", poll.id);
  await assert.rejects(chat.vote("cy", poll.id, [1]), /closed/);

  assert.equal(await chat.toggleSave("cy", m.id), true);
  assert.equal((await chat.saved("cy"))[0].id, m.id);
  const dm = await chat.openDm("cy", "ana");
  const [fwd] = await chat.forward("cy", m.id, [dm]);
  assert.equal(fwd.forwarded, true);
  assert.equal(fwd.body, m.body);
  await assert.rejects(chat.forward("cy", m.id, [999999]), /not found/);
});

test("invite links: on, preview, join, off", async () => {
  const id = await chat.createGroup("ana", { title: "Open group", members: ["ben"] });
  await assert.rejects(chat.setInvite("ben", id, true), /owner and admins/);
  const token = await chat.setInvite("ana", id, true);
  assert.match(token, /^[a-f0-9]{24}$/);
  assert.equal((await chat.one("ben", id)).conversation.inviteToken, null, "members don't see the link");
  assert.deepEqual(await chat.invitePreview(token), { id, title: "Open group", description: "", members: 2 });
  assert.equal(await chat.joinByInvite("dev", token), id);
  assert.ok((await chat.memberNames(id)).includes("dev"));
  await chat.setInvite("ana", id, false);
  await assert.rejects(chat.invitePreview(token), /doesn't work any more/);
});

test("share cards from our own links, attachments only from our uploads, reports go to moderation", async () => {
  const id = await chat.openDm("ana", "ben");
  const calls = [];
  const build = async (_u, s) => (calls.push(s), { type: s.type, id: s.id, title: "A problem", link: `/solve/${s.id}` });
  const m = await chat.send("ana", id, { body: "try https://nexoraguru.in/solve/12 tonight" }, build);
  assert.deepEqual(calls, [{ type: "problem", id: 12 }]);
  assert.equal(m.share.title, "A problem");
  await assert.rejects(chat.send("ana", id, { attachment: { url: "https://evil.example/x.png" } }, noShare), /wasn't uploaded here/);
  const pic = await chat.send("ana", id, { attachment: { url: "/uploads/chat/0123456789abcdef01234567.png", name: "graph.png", size: 10 } }, noShare);
  assert.equal(pic.attachment.kind, "image");
  const voice = await chat.send("ana", id, { attachment: { url: "/uploads/chat/0123456789abcdef01234567.webm", durationSec: 7 } }, noShare);
  assert.equal(voice.attachment.kind, "audio");
  assert.equal(voice.attachment.durationSec, 7);

  await assert.rejects(chat.report("ana", m.id, { reason: "spam" }), /your own message/);
  const rep = await chat.report("ben", m.id, { reason: "spam", details: "ads" });
  assert.equal(rep.duplicate, false);
  const row = await db.get("SELECT * FROM reports WHERE content_type='chat_message' AND content_id=?", [String(m.id)]);
  assert.equal(row.target_user, "ana");
  assert.match(row.snapshot, /solve\/12/);
});
