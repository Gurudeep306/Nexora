// One statement from a source, live: node scripts/problems/probe-one.js <source> <problem_id> [url]
const path = require('path');
const S = require(path.join(__dirname, '../../src/sources'));
const { mediaUrls } = require(path.join(__dirname, '../../src/media-store'));
(async () => {
  const [id, pid, url] = process.argv.slice(2);
  const t0 = Date.now();
  try {
    const st = await S.SOURCES[id].statement({ platform: id, problem_id: pid, url: url || '', title: pid, tags: '[]' });
    const html = st ? [st.statement, st.inputSpec, st.outputSpec, st.note].join('\n') : '';
    console.log(JSON.stringify({ id, pid, ms: Date.now() - t0, chars: html.replace(/<[^>]+>/g, '').length, time: st?.timeLimit, mem: st?.memLimit, samples: st?.samples?.length, sample0: st?.samples?.[0], imgs: mediaUrls(html), extra: st ? Object.keys(st.extra || {}) : null, tags: st?.extra?.tags }));
  } catch (e) {
    console.log(JSON.stringify({ id, pid, err: e.message, ms: Date.now() - t0 }));
  }
})();
