/*
  Fetching a problem's statement from its judge, within a time budget.

  Some judges answer slowly (Codeforces sits behind a bot check, so its
  statements come from a dataset or an archive, each with its own timeout).
  The page must never wait so long that its request times out and shows an
  error. So:
  - after `budgetMs` the caller hears STILL_FETCHING and the page says "still
    getting it — try again soon";
  - the fetch carries on and saves the statement, so the next visit is instant;
  - one fetch per problem at a time, shared by everyone who opens it.
  Tested in tests/statement-fetch.test.js.
*/
const STILL_FETCHING = Symbol("still fetching");

/** A statement worth keeping has more than a few words of text. */
const usable = (d) => !!d && String(d.statement || "").replace(/<[^>]+>/g, "").trim().length > 10;

/**
 * fetch(problem) → statement data or null; save(id, data) stores it.
 * Returns { within(problem) → data | null | STILL_FETCHING, inflight }.
 */
function makeStatementFetcher({ fetch, save, budgetMs = 40000, log = () => {} }) {
  const inflight = new Map();
  function once(problem) {
    const had = inflight.get(problem.id);
    if (had) return had;
    const p = (async () => {
      const data = await fetch(problem);
      if (!usable(data)) return null;
      await save(problem.id, data);
      return data;
    })().finally(() => inflight.delete(problem.id));
    // A fetch nobody waits for any more must not crash the server when it fails.
    p.catch((e) => log(problem, e));
    inflight.set(problem.id, p);
    return p;
  }
  async function within(problem) {
    let timer;
    const late = new Promise((ok) => {
      timer = setTimeout(() => ok(STILL_FETCHING), budgetMs);
    });
    try {
      return await Promise.race([once(problem).catch(() => null), late]);
    } finally {
      clearTimeout(timer);
    }
  }
  return { within, inflight };
}

module.exports = { makeStatementFetcher, STILL_FETCHING, usable };
