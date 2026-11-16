/**
 * Dry run for Python: the student's program runs unchanged under
 * sys.settrace, on the same runners as a normal Run. After each line, the
 * tracer writes one event to stderr — the line that just ran, the function,
 * the call depth, and every variable whose value changed — so the client can
 * animate the real run. stdout is untouched (only counted, so the client
 * knows how much output each step printed).
 *
 * The event format is shared by every language (src/dryrun/index.js).
 */

const MARK = '\u001eNXT ';

// Kept small and dependency-free: it runs on any Python 3.8+.
const WRAPPER = String.raw`
import sys as _s, json as _j, base64 as _b, types as _t
_SRC = _b.b64decode("@@SRC@@").decode("utf-8")
_MAXEV, _MAXB = @@MAXEV@@, @@MAXB@@
_err = _s.stderr
_st = {"n": 0, "b": 0, "on": True, "out": 0}
class _Out:
    def __init__(s, w): s.w = w
    def write(s, x):
        _st["out"] += len(x)
        return s.w.write(x)
    def flush(s): return s.w.flush()
    def __getattr__(s, k): return getattr(s.w, k)
_s.stdout = _Out(_s.stdout)
_ids = {}
def _oid(o):
    k = id(o)
    if k not in _ids: _ids[k] = len(_ids) + 1
    return _ids[k]
def _ser(v, heap, depth=0):
    if v is None or isinstance(v, bool): return v
    if isinstance(v, int):
        return v if abs(v) < 2**53 else {"t": "big", "s": str(v)}
    if isinstance(v, float):
        return v if v == v and v not in (float("inf"), float("-inf")) else {"t": "num", "s": str(v)}
    if isinstance(v, str): return v if len(v) <= 300 else v[:300] + "…"
    if depth > 6: return {"t": "more"}
    if isinstance(v, (list, tuple)):
        return {"t": "list" if isinstance(v, list) else "tuple", "n": len(v), "i": [_ser(x, heap, depth + 1) for x in v[:80]]}
    if isinstance(v, (set, frozenset)):
        try: items = sorted(v)
        except Exception: items = list(v)
        return {"t": "set", "n": len(v), "i": [_ser(x, heap, depth + 1) for x in items[:80]]}
    if isinstance(v, dict):
        items = list(v.items())[:60]
        return {"t": "dict", "n": len(v), "k": [[_ser(a, heap, depth + 1), _ser(b, heap, depth + 1)] for a, b in items]}
    n = type(v).__name__
    if n == "deque":
        return {"t": "deque", "n": len(v), "i": [_ser(x, heap, depth + 1) for x in list(v)[:80]]}
    if isinstance(v, (_t.FunctionType, _t.BuiltinFunctionType, _t.ModuleType, type)) or callable(v) and not hasattr(v, "__dict__"):
        return None
    d = getattr(v, "__dict__", None)
    if isinstance(d, dict):
        i = _oid(v)
        if i not in heap and len(heap) < 300:
            heap[i] = None
            heap[i] = {"c": n, "f": {k: _ser(x, heap, depth + 1) for k, x in list(d.items())[:20] if not k.startswith("__")}}
        return {"t": "ref", "id": i}
    return {"t": "str", "s": repr(v)[:120]}
def _skip(k, v):
    return k.startswith("__") or k.startswith("_") and k[1:2] in ("s", "j", "b", "t") and len(k) <= 3 or isinstance(v, (_t.ModuleType, _t.FunctionType, type, _t.BuiltinFunctionType)) or k in ("_Out", "_SRC", "_MAXEV", "_MAXB", "_err", "_st", "_ids", "_oid", "_ser", "_skip", "_emit", "_last", "_tr", "_frames", "_pending", "_code", "_g", "_heapsent", "_hdelta")
_last = {}
_heapsent = {}
_frames = {}
_pending = {}
def _hdelta(heap):
    out = {}
    for i, o in heap.items():
        js = _j.dumps(o, sort_keys=True, default=str)
        if _heapsent.get(i) != js:
            _heapsent[i] = js
            out[str(i)] = o
    return out
def _emit(ev):
    if not _st["on"]: return
    if "h" in ev:
        ev["h"] = _hdelta(ev["h"])
        if not ev["h"]: del ev["h"]
    s = _j.dumps(ev, separators=(",", ":"), default=str)
    _st["n"] += 1
    _st["b"] += len(s)
    if _st["n"] > _MAXEV or _st["b"] > _MAXB:
        _st["on"] = False
        _err.write("""@@MARK@@{"e":"cap"}\n""")
        _s.settrace(None)
        return
    _err.write("@@MARK@@" + s + "\n")
def _vars(fr):
    k = id(fr)
    prev = _last.setdefault(k, {})
    heap = {}
    cur = {}
    for name, v in list(fr.f_locals.items()):
        if _skip(name, v): continue
        sv = _ser(v, heap)
        if sv is None and v is not None: continue
        cur[name] = sv
    ch = {}
    for name, sv in cur.items():
        js = _j.dumps(sv, sort_keys=True, default=str)
        if prev.get(name) != js:
            ch[name] = sv
            prev[name] = js
    gone = [n for n in list(prev) if n not in cur]
    for n in gone: del prev[n]
    return ch, gone, heap
def _depth(fr):
    d = 0
    f = fr.f_back
    while f is not None:
        if f.f_code.co_filename == "<nx>": d += 1
        f = f.f_back
    return d
def _flush(fr, extra=None):
    k = id(fr)
    line = _pending.pop(k, None)
    if line is None: return
    ch, gone, heap = _vars(fr)
    ev = {"e": "line", "l": line, "k": _frames.get(k, 0), "o": _st["out"]}
    if ch: ev["v"] = ch
    if gone: ev["x"] = gone
    if heap: ev["h"] = heap
    if extra: ev.update(extra)
    _emit(ev)
def _tr(fr, event, arg):
    if fr.f_code.co_filename != "<nx>": return None
    k = id(fr)
    if event == "call":
        nm = fr.f_code.co_name
        # Class bodies and comprehension/generator helpers are not the student's steps.
        # (CO_OPTIMIZED is set on every function and never on a class body.)
        if nm != "<module>" and (nm.startswith("<") or not fr.f_code.co_flags & 1):
            return None
        _st["calls"] = _st.get("calls", 0) + 1
        _frames[k] = _st["calls"]
        _last.pop(k, None)
        ch, gone, heap = _vars(fr)
        name = fr.f_code.co_name
        if name == "__init__" and "self" in fr.f_locals: name = type(fr.f_locals["self"]).__name__ + "()"
        ev = {"e": "call", "f": "main" if name == "<module>" else name, "k": _frames[k], "d": _depth(fr), "l": fr.f_lineno, "o": _st["out"]}
        if ch: ev["v"] = ch
        if heap: ev["h"] = heap
        _emit(ev)
        return _tr
    if event == "line":
        _flush(fr)
        _pending[k] = fr.f_lineno
    elif event == "return":
        _flush(fr)
        heap = {}
        ev = {"e": "ret", "k": _frames.get(k, 0), "l": fr.f_lineno, "o": _st["out"]}
        rv = _ser(arg, heap)
        if arg is not None and rv is not None: ev["r"] = rv
        if heap: ev["h"] = heap
        _emit(ev)
        _last.pop(k, None)
        _frames.pop(k, None)
    elif event == "exception":
        _flush(fr)
        et = arg[0].__name__ if arg and arg[0] else "Error"
        _emit({"e": "exc", "k": _frames.get(k, 0), "l": fr.f_lineno, "m": (et + ": " + str(arg[1]))[:300], "o": _st["out"]})
    return _tr
_code = compile(_SRC, "<nx>", "exec")
_g = {"__name__": "__main__", "__builtins__": __builtins__}
_s.settrace(_tr)
try:
    exec(_code, _g)
except SystemExit:
    pass
except BaseException:
    _s.settrace(None)
    import traceback as _tb
    _e = _s.exc_info()
    _tb.print_exception(_e[0], _e[1], _e[2].tb_next if _e[2] else None)
    _s.stdout.flush()
    _s.exit(1)
finally:
    _s.settrace(None)
    _s.stdout.flush()
`;

/** The Python program that runs `code` under the tracer. */
function wrapPython(code, { maxEvents = 3000, maxBytes = 1_500_000 } = {}) {
  return WRAPPER.replace('@@SRC@@', Buffer.from(String(code), 'utf8').toString('base64'))
    .replace('@@MAXEV@@', String(maxEvents))
    .replace('@@MAXB@@', String(maxBytes))
    .split('@@MARK@@')
    .join(MARK.replace('\u001e', '\\x1e'));
}

module.exports = { wrapPython, MARK };
