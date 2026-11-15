// Contests and a user's solved problems. Problem lists and statements live in ./sources.
const fetch = require('node-fetch');

/* ---------- Codeforces ---------- */

async function fetchCodeforcesContests() {
  let data;
  try {
    const res = await fetch('https://codeforces.com/api/contest.list', { timeout: 8000 });
    data = await res.json();
  } catch (e) {
    console.error('CF contests error:', e.message);
    return [];
  }
  if (data.status !== 'OK') return [];
  return data.result.slice(0, 50).map(c => ({
    platform: 'codeforces',
    id: c.id,
    name: c.name,
    phase: c.phase,
    startTime: c.startTimeSeconds ? c.startTimeSeconds * 1000 : null,
    durationSeconds: c.durationSeconds,
    url: `https://codeforces.com/contest/${c.id}`,
  }));
}

async function fetchCodeforcesSolved(handle) {
  if (!handle) return [];
  const res = await fetch(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=1&count=10000`);
  const data = await res.json();
  if (data.status !== 'OK') return [];
  const solved = new Set();
  for (const sub of data.result) {
    if (sub.verdict === 'OK' && sub.problem) {
      solved.add(`${sub.problem.contestId}${sub.problem.index}`);
    }
  }
  return [...solved];
}

/* ---------- CodeChef ---------- */

async function fetchCodechefContests() {
  try {
    const res = await fetch('https://www.codechef.com/api/list/contests/all', {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      timeout: 8000,
    });
    const data = await res.json();
    const mapped = [];
    for (const phase of ['present', 'future', 'past']) {
      const list = data[`${phase}_contests`] || data[phase] || [];
      for (const c of list.slice(0, 20)) {
        mapped.push({
          platform: 'codechef',
          id: c.contest_code,
          name: c.contest_name,
          phase: phase === 'present' ? 'RUNNING' : phase === 'future' ? 'BEFORE' : 'FINISHED',
          startTime: c.contest_start_date_iso ? new Date(c.contest_start_date_iso).getTime() : null,
          durationSeconds: c.contest_duration ? parseInt(c.contest_duration) * 60 : 0,
          url: `https://www.codechef.com/${c.contest_code}`,
        });
      }
    }
    return mapped;
  } catch (e) {
    console.error('CC contests error:', e.message);
    return [];
  }
}

/* ---------- AtCoder ---------- */

async function fetchAtcoderContests() {
  try {
    const res = await fetch('https://kenkoooo.com/atcoder/resources/contests.json');
    const data = await res.json();
    // Sort by start time descending, take recent 50
    data.sort((a, b) => b.start_epoch_second - a.start_epoch_second);
    return data.slice(0, 50).map(c => ({
      platform: 'atcoder',
      id: c.id,
      name: c.title,
      phase: (c.start_epoch_second + c.duration_second) * 1000 < Date.now() ? 'FINISHED' :
             c.start_epoch_second * 1000 > Date.now() ? 'BEFORE' : 'RUNNING',
      startTime: c.start_epoch_second * 1000,
      durationSeconds: c.duration_second,
      url: `https://atcoder.jp/contests/${c.id}`,
    }));
  } catch (e) {
    console.error('AtCoder contests error:', e.message);
    return [];
  }
}




module.exports = {
  fetchCodeforcesContests,
  fetchCodeforcesSolved,
  fetchCodechefContests,
  fetchAtcoderContests,
};
