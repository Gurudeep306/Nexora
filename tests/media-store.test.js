// Statement images are kept in the database once fetched, so a figure still
// loads after the judge moves it or starts refusing our server.
process.env.NODE_ENV = "test";
process.env.DB_PATH = ":memory:";
process.env.STATEMENT_MEDIA_MAX_MB = "1";
const test = require("node:test");
const assert = require("node:assert/strict");
const store = require("../src/media-store");

test("a saved image comes back byte for byte, across chunk boundaries", async () => {
  const buf = Buffer.alloc(600 * 1024, 7);
  buf[0] = 1;
  buf[buf.length - 1] = 9;
  assert.equal(await store.save("https://espresso.codeforces.com/a.png", { buf, ctype: "image/png", etag: '"abc"', at: 5 }), true);
  const got = await store.load("https://espresso.codeforces.com/a.png");
  assert.equal(got.ctype, "image/png");
  assert.equal(got.etag, '"abc"');
  assert.ok(got.buf.equals(buf));
  assert.equal(await store.load("https://espresso.codeforces.com/missing.png"), null);
});

test("the budget caps what is stored (the proxy still serves the rest)", async () => {
  const big = Buffer.alloc(700 * 1024, 1);
  assert.equal(await store.save("https://img.atcoder.jp/b.png", { buf: big, ctype: "image/png", etag: '"b"' }), false, "over the 1 MB test budget");
  const s = await store.stats();
  assert.equal(s.items, 1);
});

test("media URLs are found in statement HTML, including our own proxy fallbacks", () => {
  const html = `<p><img src="https://espresso.codeforces.com/x.png" data-proxy-src="/api/imgproxy?url=https%3A%2F%2Fespresso.codeforces.com%2Fx.png">
    <video poster="https://img.atcoder.jp/p.jpg"><source src="https://img.atcoder.jp/v.mp4"></video>
    <img src="/relative.png"><img src="data:image/png;base64,AA"></p>`;
  assert.deepEqual(store.mediaUrls(html).sort(), ["https://espresso.codeforces.com/x.png", "https://img.atcoder.jp/p.jpg", "https://img.atcoder.jp/v.mp4"]);
});
