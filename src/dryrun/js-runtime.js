/*
 * NexoraGuru dry-run runtime for JavaScript and TypeScript. src/dryrun/js.js
 * joins it onto the first line of the student's program (so every line keeps
 * its number). It writes the same JSON events as the Python tracer (format:
 * src/dryrun/index.js) to stderr after the marker "\u001eNXT ".
 * Rules for this file, so it can be joined into one line: every statement
 * ends with a semicolon, comments are block comments, no regex literals.
 * It uses only `process` (no require), so it also runs as an ES module.
 */
const __nx = (() => {
  const MAXEV = 3000;
  const MAXB = 1500000;
  const MAXOBJ = 300;
  const st = { on: true, events: 0, bytes: 0, outn: 0, calls: 0, depth: 0, nextId: 0, top: null };
  const ids = new WeakMap();
  const lastObj = new Map();
  let seen = new Map();
  const reported = new WeakSet();
  const err = process.stderr.write.bind(process.stderr);
  const LINKS = ['next', 'nxt', 'prev', 'left', 'right', 'child', 'children', 'kids', 'parent', 'link', 'links'];

  /* Count what the program prints. */
  const write = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk, ...rest) => {
    st.outn += typeof chunk === 'string' ? chunk.length : Buffer.from(chunk).toString('utf8').length;
    return write(chunk, ...rest);
  };

  const big = (s) => ({ t: 'big', s: s });
  function num(v) {
    if (Number.isNaN(v)) return { t: 'num', s: 'nan' };
    if (!Number.isFinite(v)) return { t: 'num', s: v > 0 ? 'inf' : '-inf' };
    if (Number.isInteger(v) && Math.abs(v) > 9007199254740992) return big(String(v));
    return v;
  }
  function text(s) {
    return s.length > 300 ? s.slice(0, 300) + '…' : s;
  }
  const isPlain = (o) => {
    const p = Object.getPrototypeOf(o);
    return p === Object.prototype || p === null;
  };
  const keyOf = (k) => (String(Number(k)) === k ? Number(k) : k);

  function list(items, n, t, depth) {
    const out = [];
    for (let i = 0; i < items.length && i < 80; i++) {
      const s = ser(items[i], depth + 1);
      out.push(s === undefined ? null : s);
    }
    return { t: t, n: n, i: out };
  }

  /* A value as the tracer sends it, or undefined when it can't be drawn. */
  function ser(v, depth) {
    if (v === null || v === undefined) return null;
    const ty = typeof v;
    if (ty === 'number') return num(v);
    if (ty === 'bigint') return v <= 9007199254740992n && v >= -9007199254740992n ? Number(v) : big(String(v));
    if (ty === 'boolean') return v;
    if (ty === 'string') return text(v);
    if (ty !== 'object') return undefined;
    if (depth > 16) return { t: 'more' };
    if (Array.isArray(v)) return depth > 6 ? { t: 'more' } : list(v.slice(0, 80), v.length, 'list', depth);
    if (ArrayBuffer.isView(v) && typeof v.length === 'number') return list(Array.from(v.slice(0, 80)), v.length, 'list', depth);
    if (v instanceof Map) {
      const k = [];
      for (const [a, b] of v) {
        if (k.length === 80) break;
        const sa = ser(a, depth + 1);
        const sb = ser(b, depth + 1);
        k.push([sa === undefined ? null : sa, sb === undefined ? null : sb]);
      }
      return { t: 'dict', n: v.size, k: k };
    }
    if (v instanceof Set) return list(Array.from(v).slice(0, 80), v.size, 'set', depth);
    if (v instanceof Date) return v.toISOString();
    if (v instanceof RegExp || v instanceof Promise || v instanceof Error) return undefined;
    if (isPlain(v)) {
      const keys = Object.keys(v);
      /* An object of functions is a module or an API (require('readline')), not data. */
      if (keys.some((k) => typeof v[k] === 'function')) return undefined;
      /* A plain object with links (next, left…) is a node; otherwise it is a dictionary. */
      if (!keys.some((k) => LINKS.includes(k) && v[k] !== null && typeof v[k] === 'object')) {
        const k = [];
        for (const key of keys) {
          if (k.length === 80) break;
          const s = ser(v[key], depth + 1);
          if (s !== undefined) k.push([keyOf(key), s]);
        }
        return { t: 'dict', n: keys.length, k: k };
      }
    }
    /* Only the program's own classes are drawn as objects (not Node's streams and the like). */
    const c = v.constructor && v.constructor.name;
    if (!isPlain(v) && !api.classes.has(c)) return undefined;
    return ref(v);
  }

  /* Objects by identity, so links between them can be drawn. */
  function ref(o) {
    let id = ids.get(o);
    if (id === undefined) {
      id = ++st.nextId;
      ids.set(o, id);
    }
    if (!seen.has(id) && seen.size < MAXOBJ) {
      seen.set(id, null);
      const f = {};
      for (const key of Object.keys(o)) {
        let s;
        try {
          s = ser(o[key], 1);
        } catch (e) {
          s = undefined;
        }
        if (s !== undefined) f[key] = s;
      }
      const c = (o.constructor && o.constructor.name) || 'Object';
      seen.set(id, JSON.stringify({ c: c, f: f }));
    }
    return { t: 'ref', id: id };
  }

  function emit(ev) {
    if (!st.on) return;
    const s = JSON.stringify(ev);
    st.events++;
    st.bytes += s.length;
    if (st.events > MAXEV || st.bytes > MAXB) {
      st.on = false;
      err('\u001eNXT {"e":"cap"}\n');
      return;
    }
    err('\u001eNXT ' + s + '\n');
  }
  function heapDelta(ev) {
    let h = null;
    for (const [id, js] of seen) {
      if (js === null || lastObj.get(id) === js) continue;
      lastObj.set(id, js);
      if (!h) h = {};
      h[id] = JSON.parse(js);
    }
    seen = new Map();
    if (h) ev.h = h;
    return ev;
  }
  /* The variables a getter list gives, as name → JSON text; a name not yet readable is left out. */
  function vars(get) {
    const m = new Map();
    if (!get) return m;
    let pairs;
    try {
      pairs = get();
    } catch (e) {
      return m;
    }
    for (const [name, read] of pairs) {
      try {
        const s = ser(read(), 0);
        if (s !== undefined) m.set(name, JSON.stringify(s));
      } catch (e) {
        /* not readable yet (let before its line), or a getter that throws */
      }
    }
    return m;
  }

  class Frame {
    constructor(fn, line, get) {
      this.k = ++st.calls;
      this.line = line;
      this.pend = -1;
      this.last = new Map();
      this.lastGet = get;
      this.up = st.top;
      this.hasRet = false;
      this.ret_ = null;
      st.top = this;
      if (st.on) {
        const ev = { e: 'call', f: fn, k: this.k, d: st.depth, l: line, o: st.outn };
        const now = vars(get);
        if (now.size) {
          ev.v = {};
          for (const [n, js] of now) {
            this.last.set(n, js);
            ev.v[n] = JSON.parse(js);
          }
        }
        emit(heapDelta(ev));
      }
      st.depth++;
    }
    flush(get, withVars) {
      if (this.pend < 0) return;
      const ev = { e: 'line', l: this.pend, k: this.k, o: st.outn };
      if (withVars) {
        const now = vars(get);
        for (const [n, js] of now) {
          if (this.last.get(n) === js) continue;
          this.last.set(n, js);
          if (!ev.v) ev.v = {};
          ev.v[n] = JSON.parse(js);
        }
        for (const n of Array.from(this.last.keys())) {
          if (now.has(n)) continue;
          this.last.delete(n);
          if (!ev.x) ev.x = [];
          ev.x.push(n);
        }
      }
      emit(heapDelta(ev));
      this.pend = -1;
    }
    /* Line l is about to run: the line before it has finished, so send it with the variables as they are now. */
    at(l, get) {
      if (!st.on) return;
      this.lastGet = get;
      if (this.pend >= 0) this.flush(get, true);
      this.pend = l;
    }
    /* The top of a loop pass: send the loop line (its update has run) before the body starts. */
    head(get) {
      if (st.on && this.pend >= 0) this.flush(get, true);
    }
    /* The end of a loop pass, before the loop's own update (i++) or condition runs. */
    tail(l, get) {
      this.at(l, get);
      return true;
    }
    end(get) {
      if (st.on && this.pend >= 0) {
        this.line = this.pend;
        this.flush(get, true);
      }
    }
    ret(v, get) {
      if (st.on) {
        try {
          const s = ser(v, 0);
          if (s !== undefined) {
            this.ret_ = s;
            this.hasRet = true;
          }
        } catch (e) {
          /* a value we can't read: no return shown */
        }
        if (this.pend >= 0) {
          this.line = this.pend;
          this.flush(get, true);
        }
      }
      return v;
    }
    /* An exception: reported once, on the line that was running in the call where it started. */
    exc(e) {
      if (e !== null && typeof e === 'object') {
        if (reported.has(e)) return;
        reported.add(e);
      }
      const m = e && e.name && e.message !== undefined ? e.name + ': ' + e.message : String(e);
      const was = st.on;
      st.on = true;
      st.events = Math.min(st.events, MAXEV - 1);
      emit({ e: 'exc', k: this.k, l: this.pend >= 0 ? this.pend : this.line, m: text(m), o: st.outn });
      st.on = was;
      /* The line that failed has been told; it is not sent again as a finished step. */
      this.pend = -1;
    }
    /* An await: the call steps off the stack while other code runs. */
    pause(v) {
      if (st.top === this) st.top = this.up;
      st.depth--;
      return v;
    }
    /* Back from an await: on top of whatever is running now. */
    resume(v) {
      /* What was running has finished its turn (the event loop only resumes an await when nothing else runs): its last line is done. */
      if (st.on && st.top && st.top !== this && st.top.pend >= 0) st.top.flush(st.top.lastGet, true);
      this.up = st.top;
      st.top = this;
      st.depth++;
      return v;
    }
    exit() {
      st.depth--;
      st.top = this.up;
      if (!st.on) return;
      const l = this.pend >= 0 ? this.pend : this.line;
      this.flush(this.lastGet, true);
      const ev = { e: 'ret', k: this.k, l: l, o: st.outn };
      if (this.hasRet) ev.r = this.ret_;
      emit(heapDelta(ev));
    }
  }

  /* A call that is not drawn (past the limit of a comparator): every step is a no-op. */
  const QUIET = { at() {}, head() {}, tail() { return true; }, end() {}, ret(v) { return v; }, exc() {}, exit() {}, pause(v) { return v; }, resume(v) { return v; } };
  const counts = new Map();
  const api = {
    call: (fn, line, get, limit) => {
      if (limit) {
        const n = (counts.get(line) || 0) + 1;
        counts.set(line, n);
        if (n > limit) return QUIET;
      }
      return new Frame(fn, line, get);
    },
    main: null,
    classes: new Set(),
    crashed: false,
  };
  api.main = new Frame('main', 1, null);
  process.on('exit', () => {
    if (st.top === api.main && !api.crashed) api.main.exit();
  });
  process.on('uncaughtException', (e) => {
    api.crashed = true;
    (st.top || api.main).exc(e);
    err(String((e && e.stack) || e) + '\n');
    process.exit(1);
  });
  return api;
})();
const __nx_f = __nx.main;
