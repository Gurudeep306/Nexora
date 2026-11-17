// Live check of every problem source: list size, how many rated / tagged,
// and one statement's limits, samples and images. No writes.
//   NODE_OPTIONS="-r <proxy preload>" node scripts/problems/probe.js [source…]
const path = require('path');
const S = require(path.join(__dirname, '../../src/sources'));
const { mediaUrls } = require(path.join(__dirname, '../../src/media-store'));

(async () => {
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : S.MODULES;
  for (const id of ids) {
    const m = S.SOURCES[id];
    const t0 = Date.now();
    try {
      const rows = await m.list();
      const rated = rows.filter((r) => Number(r.rating) > 0).length;
      const tagged = rows.filter((r) => (Array.isArray(r.tags) ? r.tags.length : r.tags && r.tags !== '[]')).length;
      const pick = rows[Math.min(rows.length - 1, 40)];
      let st = null;
      let err = null;
      try {
        st = await m.statement({ ...pick, tags: typeof pick.tags === 'string' ? pick.tags : JSON.stringify(pick.tags || []) });
      } catch (e) {
        err = e.message;
      }
      const html = st ? [st.statement, st.inputSpec, st.outputSpec, st.note].join('\n') : '';
      console.log(JSON.stringify({ id, n: rows.length, rated, tagged, ms: Date.now() - t0, pick: pick && pick.problem_id, chars: html.replace(/<[^>]+>/g, '').length, time: st?.timeLimit, mem: st?.memLimit, samples: st?.samples?.length, imgs: mediaUrls(html).length, extra: st ? Object.keys(st.extra || {}) : null, err }));
    } catch (e) {
      console.log(JSON.stringify({ id, listError: e.message, ms: Date.now() - t0 }));
    }
  }
})();
