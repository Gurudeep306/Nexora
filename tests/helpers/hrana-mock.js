// Minimal Hrana-over-HTTP (v2) server backed by node:sqlite — a local stand-in
// for Turso so CI can test the cloud-database code path without an account.
// Usage: node tests/helpers/hrana-mock.js <db-file|:memory:> <port>
const http = require('http');
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync(process.argv[2] || ':memory:');
let requests = 0;
const toVal = (v) => {
  if (v === null || v === undefined) return { type: 'null' };
  if (typeof v === 'bigint') return { type: 'integer', value: v.toString() };
  if (typeof v === 'number') return Number.isInteger(v) ? { type: 'integer', value: String(v) } : { type: 'float', value: v };
  if (v instanceof Uint8Array) return { type: 'blob', base64: Buffer.from(v).toString('base64') };
  return { type: 'text', value: String(v) };
};
const fromVal = (v) => {
  switch (v.type) {
    case 'null': return null;
    case 'integer': return BigInt(v.value);
    case 'float': return v.value;
    case 'text': return v.value;
    case 'blob': return Buffer.from(v.base64 || '', 'base64');
  }
};
const sqls = new Map();
function execStmt(stmt) {
  const s = db.prepare(stmt.sql ?? sqls.get(stmt.sql_id));
  s.setReadBigInts(true);
  let args = (stmt.args || []).map(fromVal);
  if (stmt.named_args && stmt.named_args.length) {
    const o = {}; for (const { name, value } of stmt.named_args) o[name.replace(/^[:@$]/, '')] = fromVal(value);
    args = [o];
  }
  const cols = s.columns().map((c) => ({ name: c.name, decltype: c.type || null }));
  if (cols.length) {
    const rows = s.all(...args).map((r) => cols.map((c) => toVal(r[c.name])));
    return { cols, rows, affected_row_count: 0, last_insert_rowid: null };
  }
  const r = s.run(...args);
  return { cols: [], rows: [], affected_row_count: Number(r.changes), last_insert_rowid: String(r.lastInsertRowid) };
}
function evalCond(c, results, errors) {
  if (!c) return true;
  switch (c.type) {
    case 'ok': return results[c.step] != null;
    case 'error': return errors[c.step] != null;
    case 'not': return !evalCond(c.cond, results, errors);
    case 'and': return c.conds.every((x) => evalCond(x, results, errors));
    case 'or': return c.conds.some((x) => evalCond(x, results, errors));
    case 'is_autocommit': return !db.isTransaction;
  }
  return true;
}
const err = (e) => ({ message: String(e.message || e), code: 'SQLITE_ERROR' });
http.createServer((req, res) => {
  let body = '';
  req.on('data', (d) => (body += d));
  req.on('end', () => {
    if (req.method === 'GET' && req.url === '/health') { res.end('ok'); return; }
    if (req.method === 'GET' && req.url === '/stats') { res.end(String(requests)); return; }
    if (req.method !== 'POST' || req.url !== '/v2/pipeline') { res.statusCode = 404; res.end('not found'); return; }
    requests++;
    const { requests: reqs } = JSON.parse(body || '{}');
    const results = reqs.map((r) => {
      try {
        if (r.type === 'execute') return { type: 'ok', response: { type: 'execute', result: execStmt(r.stmt) } };
        if (r.type === 'batch') {
          const step_results = [], step_errors = [];
          r.batch.steps.forEach((st, i) => {
            step_results[i] = null; step_errors[i] = null;
            if (!evalCond(st.condition, step_results, step_errors)) return;
            try { step_results[i] = execStmt(st.stmt); } catch (e) { step_errors[i] = err(e); }
          });
          return { type: 'ok', response: { type: 'batch', result: { step_results, step_errors } } };
        }
        if (r.type === 'store_sql') { sqls.set(r.sql_id, r.sql); return { type: 'ok', response: { type: 'store_sql' } }; }
        if (r.type === 'close_sql') { sqls.delete(r.sql_id); return { type: 'ok', response: { type: 'close_sql' } }; }
        if (r.type === 'close') return { type: 'ok', response: { type: 'close' } };
        if (r.type === 'sequence') { db.exec(r.sql); return { type: 'ok', response: { type: 'sequence' } }; }
        if (r.type === 'get_autocommit') return { type: 'ok', response: { type: 'get_autocommit', is_autocommit: !db.isTransaction } };
        return { type: 'error', error: { message: 'unsupported ' + r.type } };
      } catch (e) { return { type: 'error', error: err(e) }; }
    });
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ baton: null, base_url: null, results }));
  });
}).listen(Number(process.argv[3] || 8089), () => console.log('hrana mock up'));
