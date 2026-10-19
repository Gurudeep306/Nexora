"""Flip-flop Scope and Counter & FSM Simulator (Chapter 6 Live Labs) test vectors.

The labs' logic lives in client/src/gate/notes/labs/seqLogic.ts, the TypeScript twin of seqlib.py.
This check computes, with seqlib (and minlib), everything that module claims, writes it to
lab_vectors_ch6.json, and fails if the committed file is stale; tests/gate-notes.test.js then checks
the TypeScript against the same file:

- characteristic tables, characteristic equations (minimal SOP of Q+ with S = R = 1 as a don't-care)
  and excitation tables of SR, JK, D and T; all 12 conversions "build X from Y" (seqlib.convert);
- the tick waveform model seqlib.scope over seeded random cases (every kind × trigger, generated or
  random clocks, random inputs, setup and hold 0–3, t_pd 1–2, Q₀ = 0, 1 or X) and the lab presets;
- ring, Johnson and LFSR registers for n = 2 … 5 (several tap sets, serial inputs and initial
  states): the cycle from the initial state, every cycle of the 2ⁿ states and the self-start verdict;
- ripple counters (up and down, negative or positive edge, several n and t_pd, overlapping clocks,
  asynchronous clear): every event and the settled states;
- synchronous counter design (seqlib.design_counter) for seeded random sequences × D / T / JK ×
  unused states as don't-cares or forced to 0, including 0, 3, 5, 6 with JK: the excitation columns,
  every minimal SOP, the chosen covers, the next map, the designed circuit's step, cycles and
  self-start verdict;
- finite state machines (the lab presets, seeded random Mealy and Moore machines and sequence
  detectors for several patterns, overlapping or not, Mealy and Moore): runs, shortest inputs,
  reachable states, partition refinement rounds (whole machine and reachable part), the implication
  table, the minimal state count and the merged table.

    python3 content/gate-notes/_checks/dl/l6_lab_vectors.py --write   # refresh the JSON
"""
from itertools import product
import json
import pathlib
import random
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import minlib as ml  # noqa: E402
import seqlib as sq  # noqa: E402

OUT = pathlib.Path(__file__).parent / "lab_vectors_ch6.json"
MODES = ("latch", "pos", "neg", "ms")


def wave(xs):
    return "".join(str(x) for x in xs)


def clock(n, period):
    """The lab's generated clock: low for period/2 ticks, then high (50 % duty), from tick 0."""
    half = period // 2
    return [(t // half) % 2 for t in range(n)]


def ins_of(spec):
    return {k: [int(c) for c in v] for k, v in spec.items()}


def scope_case(kind, mode, clk, inp, q0, tsu, th, tpd):
    r = sq.scope(kind, mode, clk, inp, q0, tsu, th, tpd)
    return {"kind": kind, "mode": mode, "clk": wave(clk), "inp": {k: wave(v) for k, v in inp.items()},
            "q0": q0, "tsu": tsu, "th": th, "tpd": tpd,
            "S": wave(r["S"]), "Q": wave(r["Q"]), "M": wave(r["M"]), "viol": [list(v) for v in r["viol"]], "edges": r["edges"]}


# ── Scope presets (the lab's PRESETS, 32 ticks) ────────────────────────────

def _w(*runs):
    """A waveform from (value, length) runs."""
    return "".join(str(v) * k for v, k in runs)


SCOPE_PRESETS = [
    {"id": "latch-vs-edge", "label": "D latch vs edge", "kind": "D", "mode": "latch", "compare": "pos", "period": 8,
     "inputs": {"D": "00111100" + "00000110" + "01111111" + "00000010"}, "tsu": 0, "th": 0, "tpd": 1, "q0": 0},
    {"id": "race-around", "label": "Race-around (JK latch, J = K = 1)", "kind": "JK", "mode": "latch", "compare": "ms", "period": 8,
     "inputs": {"J": "1" * 32, "K": "1" * 32}, "tsu": 0, "th": 0, "tpd": 1, "q0": 0},
    {"id": "ms-jk", "label": "Master–slave JK", "kind": "JK", "mode": "ms", "compare": "neg", "period": 8,
     "inputs": {"J": _w((0, 5), (1, 1), (0, 12), (1, 14)), "K": _w((0, 13), (1, 1), (0, 4), (1, 14))},
     "tsu": 0, "th": 0, "tpd": 1, "q0": 0},
    {"id": "setup", "label": "Setup and hold violations", "kind": "D", "mode": "pos", "compare": "", "period": 8,
     "inputs": {"D": _w((0, 1), (1, 10), (0, 9), (1, 6), (0, 6))}, "tsu": 2, "th": 1, "tpd": 1, "q0": 0},
    {"id": "sr-forbidden", "label": "SR forbidden, then released", "kind": "SR", "mode": "latch", "compare": "", "period": 8,
     "inputs": {"S": _w((0, 5), (1, 1), (0, 6), (1, 2), (0, 8), (1, 4), (0, 3), (1, 1), (0, 2)),
                "R": _w((0, 12), (1, 2), (0, 6), (1, 1), (0, 1), (1, 4), (0, 6))},
     "tsu": 0, "th": 0, "tpd": 1, "q0": 0},
]


def scope_vectors():
    cases = []
    for p in SCOPE_PRESETS:
        clk = clock(32, p["period"])
        for k, v in p["inputs"].items():
            assert len(v) == 32, (p["id"], k)
        for mode in [p["mode"]] + ([p["compare"]] if p["compare"] else []):
            cases.append(scope_case(p["kind"], mode, clk, ins_of(p["inputs"]), p["q0"], p["tsu"], p["th"], p["tpd"]))
    rnd = random.Random(2026)
    for i in range(384):
        kind = sq.KINDS[i % 4]
        mode = MODES[(i // 4) % 4]
        n = rnd.choice((12, 16, 24, 32))
        if i % 3:
            clk = clock(n, rnd.choice((4, 6, 8)))
        else:
            clk, c = [], rnd.randint(0, 1)
            for _ in range(n):
                if rnd.random() < 0.35:
                    c = 1 - c
                clk.append(c)
        inp = {}
        for nm in sq.INPUTS[kind]:
            p, v, xs = rnd.choice((0.15, 0.3, 0.5)), rnd.randint(0, 1), []
            for _ in range(n):
                if rnd.random() < p:
                    v = 1 - v
                xs.append(v)
            inp[nm] = xs
        cases.append(scope_case(kind, mode, clk, inp, rnd.choice((0, 1, "X")), rnd.randint(0, 3), rnd.randint(0, 3), rnd.randint(1, 2)))
    # Coverage: every rule fires somewhere.
    allv = [v[1] for c in cases for v in c["viol"]]
    assert {"setup", "hold", "forbidden"} <= set(allv)
    assert any("X" in c["Q"] for c in cases if c["mode"] == "ms") and any("X" in c["Q"] for c in cases if c["mode"] == "latch")
    return cases


# ── Tables and conversions ─────────────────────────────────────────────────

def tables():
    out = {}
    for kind in sq.KINDS:
        names = sq.INPUTS[kind]
        vars_ = list(names) + ["Q"]
        n = len(vars_)
        ones, dcs = [], []
        for m in range(2 ** n):
            b = sq.bits(m, n)
            qn = sq.ff_next(kind, b[-1], **dict(zip(names, b[:-1])))
            (dcs if qn is None else ones if qn else []).append(m)
        out[kind] = {"char": [list(r) for r in sq.char_table(kind)],
                     "eq": [s.replace("'", "′") for s in ml.min_sop(ones, dcs, n, vars_)],
                     "exc": [[q, qn, e] for q, qn, e in sq.excitation_table(kind)]}
    assert out["JK"]["eq"] == ["K′Q + JQ′"] and out["SR"]["eq"] == ["S + R′Q"] and out["D"]["eq"] == ["D"]
    conv = [{"target": t, "have": h, "eq": sq.convert(t, h)} for t in sq.KINDS for h in sq.KINDS if t != h]
    assert len(conv) == 12
    return out, conv


# ── Registers ──────────────────────────────────────────────────────────────

MAX_TAPS = {2: [0, 1], 3: [1, 2], 4: [2, 3], 5: [2, 4]}


def int_step(n, f):
    return lambda s: sq.val(f(sq.bits(s, n)))


def register_vectors():
    rnd = random.Random(66)
    out = []
    for n in (2, 3, 4, 5):
        regs = [("ring", [], 0, (1 << (n - 1))), ("ring", [], 0, 0), ("ring", [], 0, (3 << (n - 2))), ("ring", [], 0, rnd.randrange(2 ** n)),
                ("johnson", [], 0, 0), ("johnson", [], 0, rnd.randrange(2 ** n)), ("johnson", [], 0, 2 ** n - 1)]
        tapsets = [MAX_TAPS[n], [n - 1], list(range(n))] + [sorted(rnd.sample(range(n), rnd.randint(1, n))) for _ in range(3)]
        for taps in tapsets:
            for din in (0, 1):
                for init in (1 << (n - 1), 0, rnd.randrange(2 ** n)):
                    regs.append(("lfsr", taps, din, init))
        for kind, taps, din, init in regs:
            f = {"ring": sq.ring_step, "johnson": sq.johnson_step}.get(kind) or (lambda r, t=taps, d=din: sq.lfsr_step(r, t, d))
            cyc = [sq.val(s) for s in sq.register_cycle(f, sq.bits(init, n))]
            st = int_step(n, f)
            cycles = sq.autonomous_cycles(st, range(2 ** n))
            out.append({"kind": kind, "n": n, "taps": taps, "din": din, "init": init, "step": [st(s) for s in range(2 ** n)],
                        "cycle": cyc, "cycles": cycles, "selfStart": sq.self_starting(st, range(2 ** n), cyc)})
    by = {(r["kind"], r["n"], tuple(r["taps"]), r["din"], r["init"]): r for r in out}
    assert len(by[("lfsr", 4, (2, 3), 0, 8)]["cycle"]) == 15 and len(by[("johnson", 4, (), 0, 0)]["cycle"]) == 8
    assert not by[("ring", 4, (), 0, 8)]["selfStart"]
    return out


# ── Ripple counters ────────────────────────────────────────────────────────

def ripple_vectors():
    rnd = random.Random(77)
    out = []
    for n in (2, 3, 4, 5):
        for tpd in (1, 2, 3):
            for down in (False, True):
                for edge in ("neg", "pos"):
                    for P in ((n + 2) * tpd, 2 * tpd):
                        start = rnd.randrange(2 ** n)
                        clocks = [k * P for k in range(rnd.randint(3, 2 ** n + 2))]
                        clear = tclr = None
                        if not down and edge == "neg" and rnd.random() < 0.6:
                            clear, tclr = rnd.randrange(2, 2 ** n), rnd.choice((None, 1, tpd, 2 * tpd))
                        ev = sq.ripple_events(n, tpd, clocks, start, down, edge, (lambda q, c=clear: q == c) if clear is not None else None, tclr)
                        out.append({"n": n, "tpd": tpd, "clocks": clocks, "start": start, "down": down, "edge": edge, "clear": clear,
                                    "tclr": tclr, "events": [list(e) for e in ev], "end": clocks[-1] + P,
                                    "settled": sq.settled_states(ev, clocks, clocks[-1] + P)})
    # The lab's one-clock transients (clocks = [0]) for every start state.
    for n in (3, 4):
        for down in (False, True):
            for clear in (None, 2 ** n - 2):
                if down and clear is not None:
                    continue
                for start in range(2 ** n):
                    ev = sq.ripple_events(n, 2, [0], start, down, "neg", (lambda q, c=clear: q == c) if clear is not None else None, None)
                    out.append({"n": n, "tpd": 2, "clocks": [0], "start": start, "down": down, "edge": "neg", "clear": clear, "tclr": None,
                                "events": [list(e) for e in ev], "end": 100, "settled": sq.settled_states(ev, [0], 100)})
    return out


# ── Counter design ─────────────────────────────────────────────────────────

def design_case(seq, kind, unused):
    d = sq.design_counter(seq, kind, None, unused)
    n = d["n"]
    st = sq.designed_step(d, kind)
    return {"seq": seq, "kind": kind, "unused": unused, "n": n, "vars": d["vars"], "names": list(d["inputs"]),
            "inputs": {k: [on, dc] for k, (on, dc) in d["inputs"].items()}, "sop": d["sop"],
            "covers": {k: list(c) for k, c in d["covers"].items()},
            "next": [d["next"].get(s) for s in range(2 ** n)], "step": [st(s) for s in range(2 ** n)],
            "cycles": sq.autonomous_cycles(st, range(2 ** n)), "selfStart": sq.self_starting(st, range(2 ** n), seq)}


def design_vectors():
    rnd = random.Random(88)
    seqs = [[0, 3, 5, 6], [0, 1, 2, 3, 4, 5], [0, 2, 4, 6], [1, 3, 5, 7], [0, 1, 3, 2, 6, 7, 5, 4], [2, 6, 1, 7, 5], [0, 4, 2, 1]]
    for _ in range(26):
        nb = rnd.choice((2, 3, 3, 3, 4, 4))
        seqs.append(rnd.sample(range(2 ** nb), rnd.randint(2, min(2 ** nb, 7))))
    seqs += [[0, 9, 18, 27, 3], [1, 17, 30, 12]]
    out = [design_case(s, k, u) for s in seqs for k in ("D", "T", "JK") for u in ("dc", 0)]
    jk = next(c for c in out if c["seq"] == [0, 3, 5, 6] and c["kind"] == "JK" and c["unused"] == 0)
    assert jk["selfStart"]
    assert any(not c["selfStart"] for c in out)
    return out


# ── Finite state machines ──────────────────────────────────────────────────

FSM_PRESETS = [
    {"id": "det101", "label": "Overlapping 101 detector (Mealy)", "moore": False, "start": "S0", "rows": None},
    {"id": "comp2", "label": "Serial 2’s complementer", "moore": False, "start": "Q0",
     "rows": [["Q0", ["Q0", "Q1", 0, 1]], ["Q1", ["Q1", "Q1", 1, 0]]]},
    {"id": "gate1996", "label": "GATE 1996 table", "moore": False, "start": "A",
     "rows": [["A", ["D", "B", 0, 1]], ["B", ["A", "C", 0, 1]], ["C", ["A", "B", 0, 1]], ["D", ["A", "C", 1, 1]]]},
    {"id": "gate2025", "label": "GATE 2025 table", "moore": False, "start": "A",
     "rows": [["A", ["F", "B", 0, 0]], ["B", ["D", "C", 0, 0]], ["C", ["F", "E", 0, 0]], ["D", ["G", "A", 1, 0]],
              ["E", ["D", "C", 0, 0]], ["F", ["F", "B", 1, 1]], ["G", ["G", "H", 0, 1]], ["H", ["G", "A", 1, 0]]]},
]


def table_of(f, name=str):
    """Rows [[state, [next per input…, output per input… | output]]] with state names through `name`."""
    rows = []
    for s in f.states:
        nx = [name(f.delta[(s, x)]) for x in f.alphabet]
        rows.append([name(s), nx + ([f.out[s]] if f.moore else [f.out[(s, x)] for x in f.alphabet])])
    return rows


def machine(rows, moore, start):
    return sq.FSM.from_table({s: tuple(r) for s, r in rows}, (0, 1), moore, start)


def sub_machine(f):
    keep = f.reachable()
    return sq.FSM([s for s in f.states if s in keep], f.alphabet, {k: v for k, v in f.delta.items() if k[0] in keep},
                  {k: v for k, v in f.out.items() if (k in keep if f.moore else k[0] in keep)}, f.moore, f.start)


def merged(f):
    """The merged table of the last partition: each block named by its first state."""
    P = f.partitions()[-1]
    rep = {s: b[0] for b in P for s in b}
    rows = {b[0]: tuple([rep[f.delta[(b[0], x)]] for x in f.alphabet] +
                        ([f.out[b[0]]] if f.moore else [f.out[(b[0], x)] for x in f.alphabet])) for b in P}
    m = sq.FSM.from_table(rows, f.alphabet, f.moore, rep[f.start])
    assert f.equivalent(m)
    return [[s, list(r)] for s, r in rows.items()]


def fsm_case(name, rows, moore, start, rnd, detector=None):
    f = machine(rows, moore, start)
    runs = []
    for k in range(6):
        xs = [rnd.randint(0, 1) for _ in range(rnd.randint(0 if k == 0 else 1, 16))]
        r = f.run(xs)
        runs.append({"xs": xs, "states": r["states"], "outs": r["outs"], "first": r["first"]})
    sub = sub_machine(f)
    mark = f.implication()
    imp = [[a, b, mark[frozenset((a, b))]] for i, a in enumerate(f.states) for b in f.states[i + 1:] if frozenset((a, b)) in mark]
    sw = f.shortest(lambda t, y: y == 1)
    return {"name": name, "moore": moore, "start": start, "rows": rows, "detector": detector, "runs": runs,
            "shortestTo": {t: (list(w) if (w := f.shortest(lambda s, y, t=t: s == t)) is not None else None) for t in f.states},
            "shortestOne": list(sw) if sw is not None else None,
            "reachable": [s for s in f.states if s in f.reachable()], "partitions": f.partitions(), "implication": imp,
            "subPartitions": sub.partitions(), "minimal": f.minimal_states(), "merged": merged(sub)}


def fsm_vectors():
    rnd = random.Random(99)
    out, presets = [], {}
    for p in FSM_PRESETS:
        rows = p["rows"] if p["rows"] is not None else table_of(sq.detector("101"), lambda s: f"S{s}")
        presets[p["id"]] = {"label": p["label"], "moore": p["moore"], "start": p["start"], "rows": rows}
        out.append(fsm_case(p["id"], rows, p["moore"], p["start"], rnd))
    assert out[2]["minimal"] == 3 and out[3]["minimal"] == 5
    for i in range(40):
        moore = i % 2 == 1
        k = rnd.randint(2, 8)
        names = [chr(65 + j) for j in range(k)]
        rows = [[s, [rnd.choice(names), rnd.choice(names)] + ([rnd.randint(0, 1)] if moore else [rnd.randint(0, 1), rnd.randint(0, 1)])] for s in names]
        out.append(fsm_case(f"random{i}", rows, moore, names[rnd.randrange(k)] if i % 3 == 0 else names[0], rnd))
    for pat in ("101", "110", "1011", "0110", "111", "1001", "11", "0", "10", "0101"):
        for ov in (True, False):
            for mo in (False, True):
                d = sq.detector(pat, ov, mo)
                out.append(fsm_case(f"det-{pat}-{ov}-{mo}", table_of(d), mo, "0", rnd, {"pattern": pat, "overlap": ov, "moore": mo}))
    return out, presets


def build():
    tab, conv = tables()
    fsm, fpre = fsm_vectors()
    return {"tables": tab, "convert": conv, "scope": scope_vectors(),
            "scopePresets": [{**p, "clk": wave(clock(32, p["period"]))} for p in SCOPE_PRESETS],
            "clocks": {str(p): wave(clock(32, p)) for p in (4, 6, 8)},
            "registers": register_vectors(), "ripple": ripple_vectors(), "design": design_vectors(), "fsm": fsm, "fsmPresets": fpre}


data = build()
text = json.dumps(data, separators=(",", ":"), ensure_ascii=False) + "\n"
if "--write" in sys.argv:
    OUT.write_text(text)
    print(f"wrote {OUT.name}")
assert OUT.exists() and OUT.read_text() == text, "lab_vectors_ch6.json is stale: run with --write"
print(f"l6_lab_vectors: 4 flip-flop tables, {len(data['convert'])} conversions, {len(data['scope'])} scope runs, "
      f"{len(data['registers'])} registers, {len(data['ripple'])} ripple runs, {len(data['design'])} counter designs, "
      f"{len(data['fsm'])} state machines")
