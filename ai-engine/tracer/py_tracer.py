#!/usr/bin/env python3
"""
Nexora runtime tracer (Python).

Executes the user's real code under sys.settrace and records the ACTUAL program
state (locals of every user frame) at every executed line. Nothing about the
algorithm is assumed: the visualization is built afterwards from these recorded
states, so whatever the code really does is what gets animated.

Protocol: one JSON object on stdin, one JSON object on stdout.
  in : {code, inputs?: {named:{}, positional:[]}, stdin?: str,
        maxEvents?: int, maxSteps?: int, measure?: bool}
  out: {ok, events, entry, indexNames, stdout, error, truncated, measure}
"""

import ast
import builtins
import io
import json
import math
import random
import sys
import traceback

USER_FILE = "<user_code>"
MAX_LIST = 64          # elements serialized per container
MAX_STR = 200
MAX_FRAMES = 4         # innermost user frames captured per event

ALLOWED_MODULES = {
    "math", "heapq", "collections", "bisect", "functools", "itertools",
    "random", "string", "operator", "copy", "typing", "dataclasses", "statistics",
}


class StepLimit(Exception):
    pass


# ───────────────────────── sandbox ─────────────────────────

def make_builtins(stdin_text):
    safe = dict(vars(builtins))
    for name in ("open", "exec", "eval", "compile", "breakpoint", "help",
                 "exit", "quit", "memoryview", "globals", "vars", "__loader__"):
        safe.pop(name, None)

    real_import = builtins.__import__

    def guarded_import(name, *args, **kwargs):
        if name.split(".")[0] not in ALLOWED_MODULES:
            raise ImportError(f"module '{name}' is not available in the visualizer sandbox")
        return real_import(name, *args, **kwargs)

    lines = iter((stdin_text or "").splitlines())

    def fake_input(prompt=""):
        try:
            return next(lines)
        except StopIteration:
            raise EOFError("input() called but no stdin was provided")

    safe["__import__"] = guarded_import
    safe["input"] = fake_input
    return safe


# ───────────────────────── serialization ─────────────────────────

def ser(v, depth=0):
    if v is None or isinstance(v, bool):
        return v
    if isinstance(v, int):
        return v if abs(v) < 2 ** 53 else str(v)
    if isinstance(v, float):
        return v if math.isfinite(v) else str(v)
    if isinstance(v, str):
        return v[:MAX_STR]
    if depth >= 2:
        return {"$t": "obj", "$r": type(v).__name__}
    if isinstance(v, (list, tuple)) or type(v).__name__ == "deque":
        kind = "tuple" if isinstance(v, tuple) else "list"
        return {"$t": kind, "$id": id(v), "$n": len(v),
                "$v": [ser(x, depth + 1) for x in list(v)[:MAX_LIST]]}
    if isinstance(v, dict):
        items = list(v.items())[:MAX_LIST]
        return {"$t": "dict", "$id": id(v), "$n": len(v),
                "$v": [[ser(k, depth + 1), ser(x, depth + 1)] for k, x in items]}
    if isinstance(v, (set, frozenset)):
        try:
            items = sorted(v)
        except TypeError:
            items = list(v)
        return {"$t": "set", "$id": id(v), "$n": len(v),
                "$v": [ser(x, depth + 1) for x in items[:MAX_LIST]]}
    return {"$t": "obj", "$r": type(v).__name__}


def is_data(name, v):
    if name.startswith("__"):
        return False
    if callable(v) or isinstance(v, type) or type(v).__name__ == "module":
        return False
    return True


# ───────────────────────── tracer ─────────────────────────

class Tracer:
    def __init__(self, max_steps, max_events, record=True, input_ids=()):
        self.max_steps = max_steps
        self.max_events = max_events
        self.record = record
        self.events = []
        self.steps = 0
        self.depth = 0
        self.max_depth = 0
        self.peak_extra = 0
        self.truncated = False
        self.input_ids = set(input_ids)

    def _frames(self, frame):
        out = []
        f = frame
        while f is not None and len(out) < MAX_FRAMES:
            if f.f_code.co_filename == USER_FILE:
                src = f.f_locals if f.f_code.co_name != "<module>" else f.f_globals
                out.append({
                    "func": f.f_code.co_name,
                    "locals": {k: ser(v) for k, v in list(src.items()) if is_data(k, v)},
                })
            f = f.f_back
        return out

    def _space(self, frame):
        seen, extra = set(), 0
        f = frame
        while f is not None:
            if f.f_code.co_filename == USER_FILE and f.f_code.co_name != "<module>":
                for v in list(f.f_locals.values()):
                    if isinstance(v, (list, dict, set, tuple)) and id(v) not in self.input_ids and id(v) not in seen:
                        seen.add(id(v))
                        extra += len(v)
            f = f.f_back
        return extra + self.depth

    def _emit(self, ev):
        if not self.record:
            return
        if len(self.events) >= self.max_events:
            self.truncated = True
            return
        self.events.append(ev)

    def global_trace(self, frame, event, arg):
        if frame.f_code.co_filename != USER_FILE:
            return None
        if event == "call":
            self.depth += 1
            self.max_depth = max(self.max_depth, self.depth)
        return self.local_trace

    def local_trace(self, frame, event, arg):
        if event == "line":
            self.steps += 1
            if self.steps > self.max_steps:
                raise StepLimit(f"stopped after {self.max_steps} executed lines (possible infinite loop)")
            if self.record:
                self._emit({"kind": "line", "line": frame.f_lineno, "depth": self.depth,
                            "frames": self._frames(frame)})
            else:
                self.peak_extra = max(self.peak_extra, self._space(frame))
        elif event == "return":
            if self.record:
                self._emit({"kind": "return", "line": frame.f_lineno, "depth": self.depth,
                            "func": frame.f_code.co_name, "ret": ser(arg),
                            "frames": self._frames(frame)})
            self.depth -= 1
        return self.local_trace


# ───────────────────────── static analysis ─────────────────────────

def names_in(node):
    return {n.id for n in ast.walk(node) if isinstance(n, ast.Name)}


def analyze(tree):
    """Return (has_driver, functions, index_names, calls_by_func)."""
    index_names = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Subscript):
            sl = node.slice
            if sys.version_info < (3, 9) and isinstance(sl, ast.Index):  # pragma: no cover
                sl = sl.value
            index_names |= names_in(sl)

    has_driver = False
    for stmt in tree.body:
        if isinstance(stmt, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef, ast.Import, ast.ImportFrom)):
            continue
        if any(isinstance(n, ast.Call) for n in ast.walk(stmt)):
            has_driver = True

    functions = [s for s in tree.body if isinstance(s, ast.FunctionDef)]
    called = set()
    for f in functions:
        for n in ast.walk(f):
            if isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id != f.name:
                called.add(n.func.id)
    return has_driver, functions, index_names, called


def classify_params(fn):
    """Infer what each parameter is from how the function body USES it."""
    params = [a.arg for a in fn.args.args]
    kinds = {p: "int" for p in params}
    subscript_bare = set()   # p used directly as an index  a[p]
    mutates = False

    for node in ast.walk(fn):
        if isinstance(node, ast.Subscript):
            base = node.value
            if isinstance(base, ast.Subscript) and isinstance(base.value, ast.Name) and base.value.id in kinds:
                kinds[base.value.id] = "matrix"
            elif isinstance(base, ast.Name) and base.id in kinds and kinds[base.id] != "matrix":
                kinds[base.id] = "list"
            if isinstance(node.ctx, ast.Store):
                mutates = True
            sl = node.slice
            if isinstance(sl, ast.Name):
                subscript_bare.add(sl.id)
            for nm in names_in(sl):
                if nm in kinds and kinds[nm] == "int":
                    kinds[nm] = "index"
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id == "len" and node.args \
                    and isinstance(node.args[0], ast.Name) and node.args[0].id in kinds:
                if kinds[node.args[0].id] not in ("matrix",):
                    kinds[node.args[0].id] = "list"
            if isinstance(node.func, ast.Attribute) and isinstance(node.func.value, ast.Name) \
                    and node.func.value.id in kinds:
                if node.func.attr in ("append", "pop", "sort", "insert", "remove", "extend", "reverse", "index", "count"):
                    kinds[node.func.value.id] = "list"
                    if node.func.attr in ("append", "pop", "sort", "insert", "remove", "extend", "reverse"):
                        mutates = True
            if isinstance(node.func, ast.Name) and node.func.id == "range":
                for a in node.args:
                    if isinstance(a, ast.Name) and a.id in kinds and kinds[a.id] == "int":
                        kinds[a.id] = "size"
        elif isinstance(node, (ast.For, ast.comprehension)):
            it = node.iter
            if isinstance(it, ast.Name) and it.id in kinds:
                kinds[it.id] = "list"
        elif isinstance(node, ast.Compare):
            sides = [node.left] + list(node.comparators)
            has_elem = any(isinstance(s, ast.Subscript) for s in sides)
            for s in sides:
                if isinstance(s, ast.Name) and s.id in kinds and kinds[s.id] == "int" and has_elem:
                    kinds[s.id] = "target"

    # an "index" that is used bare as a[p] is an inclusive bound; otherwise exclusive
    inclusive = {p for p in params if kinds[p] == "index" and p in subscript_bare}
    return params, kinds, inclusive, mutates


def build_args(fn, n, inputs, rng):
    params, kinds, inclusive, mutates = classify_params(fn)
    named = dict((inputs or {}).get("named") or {})
    positional = list((inputs or {}).get("positional") or [])
    pos_lists = [p for p in positional if isinstance(p, list)]
    pos_scalars = [p for p in positional if not isinstance(p, list)]

    base_list = None
    for p in params:
        if p in named and isinstance(named[p], list):
            base_list = named[p]
            break
    if base_list is None and pos_lists:
        base_list = pos_lists[0]
    auto = base_list is None
    if base_list is None:
        base_list = [rng.randint(1, 99) for _ in range(n)]
    has_target = any(k == "target" for k in kinds.values())
    if auto and has_target and not mutates:
        base_list = sorted(base_list)   # read-only search over a list → give it ordered data
    length = len(base_list)

    args, index_seen, list_used = [], 0, False
    for p in params:
        k = kinds[p]
        if p in named:
            args.append(named[p])
            if isinstance(named[p], list):
                list_used = True
            continue
        if k == "list":
            if not list_used:
                args.append(list(base_list))
                list_used = True
            else:
                args.append(pos_lists.pop(1) if len(pos_lists) > 1 else [rng.randint(1, 99) for _ in range(length)])
        elif k == "matrix":
            side = max(2, min(length, 8)) if not auto else max(2, int(math.sqrt(n)) + 1)
            args.append([[rng.randint(0, 9) for _ in range(side)] for _ in range(side)])
        elif k == "target":
            args.append(pos_scalars.pop(0) if pos_scalars else (rng.choice(base_list) if base_list else 0))
        elif k == "index":
            if index_seen == 0:
                args.append(0)
            else:
                args.append(length - 1 if p in inclusive else length)
            index_seen += 1
        elif k == "size":
            args.append(pos_scalars.pop(0) if pos_scalars else length if list_used or any(kinds[q] == "list" for q in params) else n)
        else:
            args.append(pos_scalars.pop(0) if pos_scalars else (length if any(kinds[q] == "list" for q in params) else n))
    return args, {"params": params, "kinds": kinds, "auto": auto}


def pick_entry(functions, called):
    roots = [f for f in functions if f.name not in called]
    pool = roots or functions
    return pool[-1] if pool else None


# ───────────────────────── runner ─────────────────────────

def error_info(exc):
    line = None
    for fr in traceback.extract_tb(exc.__traceback__):
        if fr.filename == USER_FILE:
            line = fr.lineno
    return {"type": type(exc).__name__, "message": str(exc)[:500], "line": line}


def main():
    req = json.loads(sys.stdin.read() or "{}")
    code = req.get("code", "")
    inputs = req.get("inputs") or {}
    max_events = int(req.get("maxEvents", 4000))
    max_steps = int(req.get("maxSteps", 200000))
    rng = random.Random()

    out = {"ok": False, "events": [], "entry": None, "indexNames": [], "stdout": "",
           "error": None, "truncated": False, "measure": []}

    try:
        tree = ast.parse(code, USER_FILE)
    except SyntaxError as e:
        out["error"] = {"type": "SyntaxError", "message": e.msg, "line": e.lineno}
        print(json.dumps(out))
        return

    has_driver, functions, index_names, called = analyze(tree)
    out["indexNames"] = sorted(index_names)
    entry_fn = pick_entry(functions, called)

    g = {"__name__": "__main__", "__builtins__": make_builtins(req.get("stdin"))}
    stdout = io.StringIO()
    real_stdout = sys.stdout
    tracer = Tracer(max_steps, max_events, record=True)
    compiled = compile(tree, USER_FILE, "exec")

    try:
        sys.stdout = stdout
        sys.settrace(tracer.global_trace)
        exec(compiled, g)
        if not has_driver:
            if entry_fn is None:
                raise ValueError("no function or executable statement found to run")
            args, meta = build_args(entry_fn, 8, inputs, rng)
            out["entry"] = {"func": entry_fn.name, "args": [ser(a) for a in args], **meta}
            ret = g[entry_fn.name](*args)
            out["entry"]["ret"] = ser(ret)
        out["ok"] = True
    except StepLimit as e:
        out["ok"] = True
        out["truncated"] = True
        out["error"] = {"type": "StepLimit", "message": str(e), "line": None}
    except BaseException as e:  # noqa: BLE001 — user code may raise anything
        out["error"] = error_info(e)
    finally:
        sys.settrace(None)
        sys.stdout = real_stdout

    out["events"] = tracer.events
    out["truncated"] = out["truncated"] or tracer.truncated
    out["stdout"] = stdout.getvalue()[:4000]

    # Empirical complexity: run the same function on growing random inputs and count work.
    if req.get("measure", True) and out["ok"] and entry_fn is not None and entry_fn.name in g:
        budget = 600000
        prev = None
        for n in (8, 16, 32, 64, 128, 256):
            if prev and prev * 5 > budget:
                break
            try:
                args, meta = build_args(entry_fn, n, {}, rng)
            except Exception:  # noqa: BLE001
                break
            if not meta["params"]:
                break
            input_ids = [id(a) for a in args if isinstance(a, (list, dict))]
            t = Tracer(min(budget, 300000), 0, record=False, input_ids=input_ids)
            sink = io.StringIO()
            try:
                sys.stdout = sink
                sys.settrace(t.global_trace)
                g[entry_fn.name](*args)
            except StepLimit:
                break
            except BaseException:  # noqa: BLE001
                break
            finally:
                sys.settrace(None)
                sys.stdout = real_stdout
            out["measure"].append({"n": n, "steps": t.steps, "space": t.peak_extra, "depth": t.max_depth})
            budget -= t.steps
            prev = t.steps

    print(json.dumps(out, default=str))


if __name__ == "__main__":
    sys.setrecursionlimit(3000)
    main()
