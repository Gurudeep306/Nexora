#!/usr/bin/env node
/**
 * CodeRift — High-Performance Batch Problem Statement Scraper
 * Uses Puppeteer with parallel browser tabs to scrape problem statements
 * from Codeforces, CodeChef & AtCoder into a local database.
 *
 * Usage:
 *   node src/scraper.js                          # Scrape next 100 un-scraped
 *   node src/scraper.js --limit 1000             # Scrape next 1000
 *   node src/scraper.js --workers 8              # Use 8 parallel tabs
 *   node src/scraper.js --platform codeforces    # Only CF
 *   node src/scraper.js --platform atcoder       # Only AtCoder
 *   node src/scraper.js --rating 800 1200        # Only 800-1200 rated
 *   node src/scraper.js --id 100                 # Single problem by DB id
 *   node src/scraper.js --rescrape               # Re-scrape existing
 *   node src/scraper.js --all                    # Scrape ALL remaining
 *   node src/scraper.js --stats                  # Show scrape statistics
 */

const puppeteer = require('puppeteer');
const { run, get, all, initDb } = require('./db');

/* ---------- CLI args ---------- */
const args = process.argv.slice(2);
function flag(name) { return args.includes(`--${name}`); }
function opt(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}
function optPair(name) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] && args[i + 2] ? [+args[i + 1], +args[i + 2]] : null;
}

const SCRAPE_ALL = flag('all');
const LIMIT = SCRAPE_ALL ? 999999 : +(opt('limit', '100'));
const WORKERS = +(opt('workers', '5'));
const PLATFORM = opt('platform', null);
const RATING = optPair('rating');
const SINGLE_ID = opt('id', null);
const RESCRAPE = flag('rescrape');
const STATS_ONLY = flag('stats');
const DELAY_MS = +(opt('delay', '1500'));

/* ---------- Helpers ---------- */
const sleep = ms => new Promise(r => setTimeout(r, ms));

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return `${m}m ${rs}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

async function showStats() {
  const total = (await get('SELECT COUNT(*) as c FROM problems')).c;
  const scraped = (await get('SELECT COUNT(*) as c FROM problem_statements')).c;
  const byPlatform = await all(`
    SELECT p.platform,
           COUNT(DISTINCT p.id) as total,
           COUNT(DISTINCT ps.problem_rowid) as scraped
    FROM problems p
    LEFT JOIN problem_statements ps ON ps.problem_rowid = p.id
    GROUP BY p.platform`);

  console.log('\n╔══════════════════════════════════════╗');
  console.log('║    CodeRift — Scrape Statistics      ║');
  console.log('╠══════════════════════════════════════╣');
  console.log(`║  Total problems:     ${String(total).padStart(6)}          ║`);
  console.log(`║  Scraped:            ${String(scraped).padStart(6)}          ║`);
  console.log(`║  Remaining:          ${String(total - scraped).padStart(6)}          ║`);
  console.log(`║  Progress:           ${String(((scraped / total) * 100).toFixed(1) + '%').padStart(6)}          ║`);
  console.log('╠══════════════════════════════════════╣');
  for (const row of byPlatform) {
    const pct = row.total > 0 ? ((row.scraped / row.total) * 100).toFixed(0) : 0;
    console.log(`║  ${row.platform.padEnd(12)} ${String(row.scraped).padStart(5)}/${String(row.total).padStart(5)} (${String(pct + '%').padStart(4)})    ║`);
  }
  console.log('╚══════════════════════════════════════╝\n');
}

async function getProblemsToScrape() {
  if (SINGLE_ID) {
    return all('SELECT * FROM problems WHERE id=?', [+SINGLE_ID]);
  }

  let where = ['1=1'];
  let params = [];

  if (PLATFORM) { where.push('p.platform=?'); params.push(PLATFORM); }
  if (RATING) {
    where.push('p.rating>=? AND p.rating<=?');
    params.push(RATING[0], RATING[1]);
  }
  if (!RESCRAPE) {
    where.push('ps.problem_rowid IS NULL');
  }

  const sql = `
    SELECT p.* FROM problems p
    LEFT JOIN problem_statements ps ON ps.problem_rowid = p.id
    WHERE ${where.join(' AND ')}
    ORDER BY p.rating ASC, p.id ASC
    LIMIT ?`;
  params.push(LIMIT);
  return all(sql, params);
}

/* ---------- Codeforces scraper ---------- */
async function scrapeCodeforces(page, problem) {
  const parts = problem.problem_id.match(/^(\d+)([A-Z]\d?)$/);
  if (!parts) return null;

  const [, contestId, index] = parts;
  const url = `https://codeforces.com/problemset/problem/${contestId}/${index}`;

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('.problem-statement', { timeout: 15000 }).catch(() => null);

    const data = await page.evaluate(() => {
      const stmt = document.querySelector('.problem-statement');
      if (!stmt) return null;

      const timeLimit = stmt.querySelector('.time-limit')?.textContent?.replace('time limit per test', '').trim() || '';
      const memLimit = stmt.querySelector('.memory-limit')?.textContent?.replace('memory limit per test', '').trim() || '';
      const inputSpec = stmt.querySelector('.input-specification')?.innerHTML || '';
      const outputSpec = stmt.querySelector('.output-specification')?.innerHTML || '';
      const note = stmt.querySelector('.note')?.innerHTML || '';

      const clone = stmt.cloneNode(true);
      ['header', 'input-specification', 'output-specification', 'sample-tests', 'note']
        .forEach(cls => clone.querySelector('.' + cls)?.remove());
      const statement = clone.innerHTML || '';

      const samples = [];
      const inputs = document.querySelectorAll('.sample-test .input pre');
      const outputs = document.querySelectorAll('.sample-test .output pre');
      for (let i = 0; i < inputs.length; i++) {
        samples.push({ input: inputs[i].textContent, output: outputs[i]?.textContent || '' });
      }

      return { statement, inputSpec, outputSpec, note, timeLimit, memLimit, samples };
    });

    return data;
  } catch (err) {
    return null;
  }
}

/* ---------- CodeChef scraper (uses JSON API) ---------- */
async function scrapeCodechef(page, problem) {
  const url = `https://www.codechef.com/api/contests/PRACTICE/problems/${problem.problem_id}`;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    const text = await page.evaluate(() => document.body.innerText);
    const data = JSON.parse(text);

    const statement = (data.problemComponents?.statement || data.body || '') +
      (data.problemComponents?.constraints ? '<h3>Constraints</h3>' + data.problemComponents.constraints : '');
    const inputSpec = data.problemComponents?.inputFormat
      ? '<div class="section-title">Input</div>' + data.problemComponents.inputFormat : '';
    const outputSpec = data.problemComponents?.outputFormat
      ? '<div class="section-title">Output</div>' + data.problemComponents.outputFormat : '';
    const samples = (data.problemComponents?.sampleTestCases || []).map(tc => ({ input: tc.input, output: tc.output }));

    return {
      statement, inputSpec, outputSpec, note: '',
      timeLimit: data.time_limit || '', memLimit: data.source_size_limit || '', samples
    };
  } catch (err) {
    return null;
  }
}

/* ---------- AtCoder scraper ---------- */
async function scrapeAtcoder(page, problem) {
  try {
    const url = problem.url;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#task-statement', { timeout: 10000 }).catch(() => null);

    const data = await page.evaluate(() => {
      const taskStmt = document.querySelector('#task-statement');
      if (!taskStmt) return null;

      const lang = taskStmt.querySelector('.lang-en') || taskStmt;
      const sections = lang.querySelectorAll('.part');
      let statement = '', inputSpec = '', outputSpec = '', note = '';
      const samples = [];

      for (const section of sections) {
        const heading = section.querySelector('h3')?.textContent?.trim() || '';
        const content = section.innerHTML || '';

        if (/^(problem\s*)?statement$/i.test(heading) || /^task\s*statement$/i.test(heading)) {
          statement = content;
        } else if (/constraints/i.test(heading)) {
          statement += content;
        } else if (/input/i.test(heading) && !/sample/i.test(heading)) {
          inputSpec = content;
        } else if (/output/i.test(heading) && !/sample/i.test(heading)) {
          outputSpec = content;
        } else if (/sample\s*input/i.test(heading)) {
          const preEl = section.querySelector('pre');
          if (preEl) samples.push({ input: preEl.textContent, output: '' });
        } else if (/sample\s*output/i.test(heading)) {
          const preEl = section.querySelector('pre');
          if (preEl && samples.length > 0) samples[samples.length - 1].output = preEl.textContent;
        } else if (/note|hint|explanation/i.test(heading)) {
          note += content;
        }
      }

      if (!statement && !inputSpec) {
        statement = lang.innerHTML || taskStmt.innerHTML || '';
      }

      const limitText = document.querySelector('#task-statement')?.parentElement?.textContent || '';
      const timeMatch = limitText.match(/Time Limit\s*:\s*(\d+)\s*sec/i);
      const memMatch = limitText.match(/Memory Limit\s*:\s*(\d+)\s*MB/i);

      return {
        statement,
        inputSpec: inputSpec ? '<div class="section-title">Input</div>' + inputSpec : '',
        outputSpec: outputSpec ? '<div class="section-title">Output</div>' + outputSpec : '',
        note,
        timeLimit: timeMatch ? timeMatch[1] + ' sec' : '',
        memLimit: memMatch ? memMatch[1] + ' MB' : '',
        samples
      };
    });

    return data;
  } catch (err) {
    return null;
  }
}

/* ---------- Save to DB ---------- */
async function saveStatement(problemId, data) {
  await run(`INSERT OR REPLACE INTO problem_statements
    (problem_rowid, statement, input_spec, output_spec, note, time_limit, memory_limit, samples, scraped_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
    problemId,
    data.statement || '',
    data.inputSpec || '',
    data.outputSpec || '',
    data.note || '',
    data.timeLimit || '',
    data.memLimit || '',
    JSON.stringify(data.samples || []),
    new Date().toISOString()
  ]);
}

/* ---------- Worker (browser tab) ---------- */
async function createWorker(browser) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1280, height: 800 });
  await page.setRequestInterception(true);
  page.on('request', req => {
    const type = req.resourceType();
    if (['image', 'font', 'stylesheet', 'media'].includes(type)) {
      req.abort();
    } else {
      req.continue();
    }
  });
  return page;
}

/* ---------- Main ---------- */
async function main() {
  await initDb();

  if (STATS_ONLY) {
    await showStats();
    process.exit(0);
  }

  const problems = await getProblemsToScrape();
  if (!problems.length) {
    console.log('No problems to scrape. Use --rescrape to re-scrape existing.');
    await showStats();
    process.exit(0);
  }

  console.log(`\n🚀 Scraping ${problems.length} problems with ${WORKERS} parallel workers...\n`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled',
           '--disable-gpu', '--disable-dev-shm-usage']
  });

  const pages = [];
  for (let i = 0; i < WORKERS; i++) {
    pages.push(await createWorker(browser));
  }

  let success = 0, failed = 0, skipped = 0;
  let idx = 0;
  const startTime = Date.now();

  while (idx < problems.length) {
    const batch = problems.slice(idx, idx + WORKERS);
    const batchPromises = batch.map(async (p, wi) => {
      const page = pages[wi % pages.length];
      const num = idx + wi + 1;
      const pct = `[${num}/${problems.length}]`;

      let data = null;
      try {
        if (p.platform === 'codeforces') {
          data = await scrapeCodeforces(page, p);
        } else if (p.platform === 'codechef') {
          data = await scrapeCodechef(page, p);
        } else if (p.platform === 'atcoder') {
          data = await scrapeAtcoder(page, p);
        } else {
          console.log(`${pct} SKIP ${p.platform} ${p.problem_id}`);
          skipped++;
          return;
        }

        if (data && (data.statement || '').trim().length > 10) {
          await saveStatement(p.id, data);
          const elapsed = formatTime(Date.now() - startTime);
          const rate = ((success + failed + 1) / ((Date.now() - startTime) / 1000)).toFixed(1);
          console.log(`${pct} ✅ ${p.platform} ${p.problem_id} "${p.title.substring(0, 30)}" (${data.samples?.length || 0} samples) [${elapsed}, ${rate}/s]`);
          success++;
        } else {
          console.log(`${pct} ❌ ${p.platform} ${p.problem_id} "${p.title.substring(0, 30)}" (empty)`);
          failed++;
        }
      } catch (err) {
        console.log(`${pct} ❌ ${p.platform} ${p.problem_id} ERROR: ${err.message.substring(0, 50)}`);
        failed++;
      }
    });

    await Promise.all(batchPromises);
    idx += batch.length;

    if (idx < problems.length) await sleep(DELAY_MS);

    if ((success + failed) % 50 === 0 && success + failed > 0) {
      const elapsed = Date.now() - startTime;
      const remaining = problems.length - idx;
      const eta = formatTime((elapsed / idx) * remaining);
      console.log(`\n--- Progress: ${success} ok, ${failed} failed | ETA: ~${eta} ---\n`);
    }
  }

  for (const page of pages) await page.close().catch(() => {});
  await browser.close();

  const totalTime = formatTime(Date.now() - startTime);
  console.log(`\n📊 Done in ${totalTime}! Success: ${success}, Failed: ${failed}, Skipped: ${skipped}`);

  await showStats();
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
