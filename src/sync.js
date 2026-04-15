const fetch = require('node-fetch');

/* ---------- Codeforces ---------- */
async function fetchCodeforcesProblems() {
  const res = await fetch('https://codeforces.com/api/problemset.problems');
  const data = await res.json();
  if (data.status !== 'OK') throw new Error('CF API error');
  return data.result.problems.map(p => ({
    platform: 'codeforces',
    problem_id: `${p.contestId}${p.index}`,
    title: p.name,
    url: `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`,
    rating: p.rating || 0,
    tags: JSON.stringify(p.tags || []),
    category: (p.tags && p.tags[0]) || '',
  }));
}

async function fetchCodeforcesContests() {
  const res = await fetch('https://codeforces.com/api/contest.list');
  const data = await res.json();
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
async function fetchCodechefProblems() {
  const problems = [];
  const difficulties = [
    { tag: 'school', rating: 500 },
    { tag: 'easy', rating: 1000 },
    { tag: 'medium', rating: 1500 },
    { tag: 'hard', rating: 2000 },
    { tag: 'challenge', rating: 2500 },
    { tag: 'extcontest', rating: 1200 },
  ];
  for (const { tag, rating } of difficulties) {
    try {
      for (let page = 0; page < 15; page++) {
        const url = `https://www.codechef.com/api/list/problems/practice?page=${page}&limit=200&sort_by=difficulty_rating&sort_order=asc&search=&category=${tag}&start_rating=0&end_rating=5000`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
        });
        const data = await res.json();
        const items = data.data || [];
        if (!items.length) break;
        for (const p of items) {
          problems.push({
            platform: 'codechef',
            problem_id: p.code,
            title: p.name || p.code,
            url: `https://www.codechef.com/problems/${p.code}`,
            rating: p.difficulty_rating || rating,
            tags: JSON.stringify(p.tags || []),
            category: tag,
          });
        }
        if (items.length < 200) break;
        await new Promise(r => setTimeout(r, 300));
      }
    } catch (e) {
      console.error(`CC fetch error for ${tag}:`, e.message);
    }
  }
  return problems;
}

async function fetchCodechefContests() {
  try {
    const res = await fetch('https://www.codechef.com/api/list/contests/all', {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
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
async function fetchAtcoderProblems() {
  const problems = [];
  try {
    // AtCoder Problems API (unofficial but well-maintained public API)
    const [problemsRes, contestsRes] = await Promise.all([
      fetch('https://kenkoooo.com/atcoder/resources/problems.json'),
      fetch('https://kenkoooo.com/atcoder/resources/problem-models.json')
    ]);
    const allProblems = await problemsRes.json();
    const models = await contestsRes.json();

    for (const p of allProblems) {
      const model = models[p.id] || {};
      const difficulty = model.difficulty != null ? Math.max(0, Math.round(model.difficulty)) : 0;
      // Map AtCoder difficulty to a rating-like scale
      const tags = [];
      if (p.id.includes('_a')) tags.push('implementation');
      else if (p.id.includes('_b')) tags.push('implementation', 'math');
      else if (p.id.includes('_c')) tags.push('greedy', 'math');
      else if (p.id.includes('_d')) tags.push('dp', 'data structures');
      else if (p.id.includes('_e')) tags.push('dp', 'graphs', 'advanced');
      else if (p.id.includes('_f')) tags.push('advanced', 'math', 'data structures');

      problems.push({
        platform: 'atcoder',
        problem_id: p.id,
        title: p.title,
        url: `https://atcoder.jp/contests/${p.contest_id}/tasks/${p.id}`,
        rating: difficulty,
        tags: JSON.stringify(tags),
        category: p.contest_id.replace(/\d+/g, '').replace(/_/g, ''),
      });
    }
    console.log(`AtCoder: fetched ${problems.length} problems`);
  } catch (e) {
    console.error('AtCoder fetch error:', e.message);
  }
  return problems;
}

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

/* ---------- LeetCode (GraphQL API) ---------- */
async function fetchLeetcodeProblems() {
  const problems = [];
  try {
    const query = `query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
      problemsetQuestionList: questionList(categorySlug: $categorySlug, limit: $limit, skip: $skip, filters: $filters) {
        total: totalNum
        questions: data {
          questionFrontendId
          title
          titleSlug
          difficulty
          topicTags { name }
          paidOnly: isPaidOnly
        }
      }
    }`;

    // Fetch in batches of 100
    for (let skip = 0; skip < 4000; skip += 100) {
      const resp = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        body: JSON.stringify({
          query,
          variables: { categorySlug: '', skip, limit: 100, filters: {} },
        }),
      });
      const data = await resp.json();
      const questions = data?.data?.problemsetQuestionList?.questions || [];
      if (!questions.length) break;

      for (const q of questions) {
        if (q.paidOnly) continue; // skip premium-only
        const diffMap = { Easy: 900, Medium: 1400, Hard: 2000 };
        problems.push({
          platform: 'leetcode',
          problem_id: `LC${q.questionFrontendId}`,
          title: q.title,
          url: `https://leetcode.com/problems/${q.titleSlug}/`,
          rating: diffMap[q.difficulty] || 1200,
          tags: JSON.stringify((q.topicTags || []).map(t => t.name)),
          category: (q.difficulty || 'Medium').toLowerCase(),
        });
      }
      const total = data?.data?.problemsetQuestionList?.total || 0;
      if (skip + 100 >= total) break;
      await new Promise(r => setTimeout(r, 300));
    }
    console.log(`LeetCode: fetched ${problems.length} problems`);
  } catch (e) {
    console.error('LeetCode fetch error:', e.message);
  }
  return problems;
}

/* ---------- SPOJ (scrape problem list) ---------- */
async function fetchSpojProblems() {
  const problems = [];
  try {
    for (let start = 0; start < 2000; start += 50) {
      const resp = await fetch(`https://www.spoj.com/problems/classical/sort=0,start=${start}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 15000,
      });
      if (!resp.ok) break;
      const text = await resp.text();
      // Parse table rows: each problem row has id, name, etc.
      const rowRe = /<tr class="problemrow">\s*<td[^>]*>(\d+)<\/td>\s*<td>\s*<a href="\/problems\/([^"]+)\/"[^>]*>([^<]+)<\/a>/g;
      let match;
      let count = 0;
      while ((match = rowRe.exec(text)) !== null) {
        problems.push({
          platform: 'spoj',
          problem_id: match[2],
          title: match[3].trim(),
          url: `https://www.spoj.com/problems/${match[2]}/`,
          rating: 1200, // SPOJ doesn't have ratings — default mid
          tags: JSON.stringify([]),
          category: 'classical',
        });
        count++;
      }
      if (count < 50) break;
      await new Promise(r => setTimeout(r, 500));
    }
    console.log(`SPOJ: fetched ${problems.length} problems`);
  } catch (e) {
    console.error('SPOJ fetch error:', e.message);
  }
  return problems;
}

/* ---------- Project Euler ---------- */
async function fetchProjectEulerProblems() {
  const problems = [];
  try {
    // Use the JSON feed
    const resp = await fetch('https://projecteuler.net/minimal=problems', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 15000,
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const text = await resp.text();
    const lines = text.trim().split('\n');
    for (const line of lines) {
      const parts = line.split('##');
      if (parts.length < 2) continue;
      const id = parts[0].trim();
      const title = parts[1].trim();
      if (!id || !title || isNaN(+id)) continue;
      const difficulty = +id <= 50 ? 800 : +id <= 150 ? 1200 : +id <= 300 ? 1600 : +id <= 500 ? 2000 : 2400;
      problems.push({
        platform: 'euler',
        problem_id: `PE${id}`,
        title,
        url: `https://projecteuler.net/problem=${id}`,
        rating: difficulty,
        tags: JSON.stringify(['math', 'number-theory']),
        category: 'math',
      });
    }
    console.log(`Project Euler: fetched ${problems.length} problems`);
  } catch (e) {
    console.error('Project Euler fetch error:', e.message);
  }
  return problems;
}

module.exports = {
  fetchCodeforcesProblems,
  fetchCodeforcesContests,
  fetchCodeforcesSolved,
  fetchCodechefProblems,
  fetchCodechefContests,
  fetchAtcoderProblems,
  fetchAtcoderContests,
  fetchLeetcodeProblems,
  fetchSpojProblems,
  fetchProjectEulerProblems,
};
