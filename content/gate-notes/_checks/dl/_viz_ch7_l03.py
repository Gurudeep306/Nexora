"""Chapter 7, Lesson 3 scenes (logic families and switch-level circuits). Every value comes from
beyondlib: the switch-level simulation of the CMOS inverter and of the 1991 pass-transistor network,
the pass voltages, and the switching energy and power."""
import pathlib
import sys
from fractions import Fraction as F

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import beyondlib as bz  # noqa: E402
from _viz_ch7_base import S, scene  # noqa: E402


def tone_of(v):
    return "danger" if v in ("Z", "X") else "success" if v == 1 else "accent"


@scene
def cmos_inverter_switch(L):
    """A CMOS inverter as two switches with a 10 pF load: A = 0, the rising input, A = 1, the falling
    input, then the energy per cycle and the power at 10 MHz."""
    s = S(L)
    W, NW = 640, 360
    inv, pdn, pun = bz.cmos_gate("A")
    C, V, f = F(10, 10 ** 12), bz.VDD, 10 ** 7
    e_cycle = C * V ** 2
    p = bz.dyn_power(C, V, f)
    assert e_cycle == F(250, 10 ** 12) and p == F(25, 10 ** 4)
    res = {a: bz.evaluate(inv, {"A": a}, "Y") for a in (0, 1)}
    assert [(res[a]["value"], res[a]["level"], res[a]["fight"]) for a in (0, 1)] == [(1, "strong", False), (0, "strong", False)]
    on = {a: {"p": bz.net_conducts(pun, {"A": a}, "VDD", "Y"), "n": bz.net_conducts(pdn, {"A": a}, "Y", "GND")} for a in (0, 1)}
    assert on == {0: {"p": True, "n": False}, 1: {"p": False, "n": True}}
    pj = lambda x: bz.dec(x * 10 ** 12)  # noqa: E731

    s.head("A CMOS inverter: two switches and a load", "CMOS inverter: two switches", W, NW)
    cx = s.v(300, 150)
    bw, bh = s.v(80, 70), 44
    yp, yn = 80, 196
    ym = (yp + bh + yn) / 2
    s.text("vdd", cx, 48, "VDD = 5 V", s.v(14, 12), anchor="middle", weight="bold")
    s.line("rail", [[cx, 60], [cx, yp]])
    s.box("pm", cx - bw / 2, yp, bw, bh, label="pMOS", size=s.v(14, 12))
    s.line("midp", [[cx, yp + bh], [cx, ym]])
    s.line("midn", [[cx, ym], [cx, yn]])
    s.box("nm", cx - bw / 2, yn, bw, bh, label="nMOS", size=s.v(14, 12))
    xl = s.v(500, 280)
    lw = s.v(64, 60)
    s.line("out", [[cx, ym], [xl + lw / 2, ym], [xl + lw / 2, ym + 24]])
    s.box("cl", xl, ym + 24, lw, 36, label="10 pF", size=s.v(14, 12))
    yg = yn + bh + 22
    s.line("gnd", [[cx, yn + bh], [cx, yg], [xl + lw / 2, yg], [xl + lw / 2, ym + 60]])
    s.text("gl", cx, yg + 14, "GND", s.v(13, 12), anchor="middle", tone="muted")
    s.text("yv", (cx + xl) / 2 + s.v(0, 4), ym - 13, "Y", s.v(14, 12), anchor="middle", mono=True, weight="bold")
    xg = cx - bw / 2 - s.v(50, 36)
    s.line("gin", [[cx - bw / 2, yp + bh / 2], [xg, yp + bh / 2], [xg, yn + bh / 2], [cx - bw / 2, yn + bh / 2]])
    xa = xg - s.v(54, 26)
    s.line("ain", [[xa, ym], [xg, ym]])
    s.text("av", xa - 6, ym, "A", s.v(14, 12), anchor="end", mono=True, weight="bold")
    xs = cx + bw / 2 + 10
    s.text("ps", xs, yp + bh / 2, "", s.v(13, 12), anchor="start")
    s.text("ns", xs, yn + bh / 2, "", s.v(13, 12), anchor="start")
    yb = yg + s.v(46, 46)
    s.text("en", s.v(W / 2, NW / 2), yb, "", s.v(14, 12), anchor="middle")
    s.text("st", s.v(W / 2, NW / 2), yb + 24, "", s.v(15, 13), anchor="middle", weight="bold")

    def state(a, p_on, n_on, ptext, ntext, ytext, ytone, extra=()):
        return [("av", {"text": f"A = {a}", "tone": "success" if a == 1 else "muted"}),
                ("ain", {"tone": "success" if a == 1 else "muted"}), ("gin", {"tone": "success" if a == 1 else "muted"}),
                ("pm", {"tone": p_on, "fill": "accent" if p_on == "accent" else "none"}),
                ("nm", {"tone": n_on, "fill": "accent" if n_on == "accent" else "none"}),
                ("ps", {"text": ptext, "tone": p_on}), ("ns", {"text": ntext, "tone": n_on}),
                ("yv", {"text": ytext, "tone": ytone})] + list(extra)

    r0, r1 = res[0], res[1]
    s.step(f"A = 0: the pMOS is on and the nMOS off, so Y connects to VDD only: Y = {r0['value']}, strong. "
           "No path joins VDD to ground, so no current flows.",
           *state(0, "accent", "muted", "on", "off", f"Y = {r0['value']}", "success",
                  [("rail", {"tone": "accent"}), ("out", {"tone": "success"}), ("midp", {"tone": "success"}), ("midn", {"tone": "muted"}), ("gnd", {"tone": "muted"})]))
    s.step("A rises through the middle: for a moment both transistors are partly on and a small short-circuit current "
           "flows from VDD to ground.",
           *state("↑", "warning", "warning", "partly on", "partly on", "Y falling", "warning",
                  [("rail", {"tone": "warning"}), ("midp", {"tone": "warning"}), ("midn", {"tone": "warning"}), ("gnd", {"tone": "warning"}), ("out", {"tone": "warning"})]))
    s.step(f"A = 1: the nMOS is on and the pMOS off, Y = {r1['value']}. The load empties through the nMOS: "
           f"the {pj(e_cycle / 2)} pJ it stored becomes heat.",
           *state(1, "muted", "accent", "off", "on", f"Y = {r1['value']}", "muted",
                  [("rail", {"tone": "muted"}), ("midp", {"tone": "muted"}), ("midn", {"tone": "accent"}), ("out", {"tone": "accent"}), ("gnd", {"tone": "accent"})]),
           ("en", {"text": f"discharge: {pj(e_cycle / 2)} pJ lost in the nMOS"}))
    s.step(f"A falls to 0: the pMOS refills the load. The supply gives C·V² = {pj(e_cycle)} pJ: "
           f"{pj(e_cycle / 2)} pJ stored in C, {pj(e_cycle / 2)} pJ lost in the pMOS.",
           *state(0, "accent", "muted", "on", "off", f"Y = {r0['value']}", "success",
                  [("rail", {"tone": "accent"}), ("midp", {"tone": "success"}), ("midn", {"tone": "muted"}), ("out", {"tone": "success"}), ("gnd", {"tone": "muted"})]),
           ("en", {"text": f"one full cycle draws C·V² = {pj(e_cycle)} pJ"}))
    s.step("For every input exactly one transistor conducts, so Y is always driven at full strength and, at rest, "
           "no current flows: static power 0.",
           ("st", {"text": "exactly one network on · no static current", "tone": "success"}))
    s.step(f"At 10 MHz with one full cycle per clock: P = C·V²·f = {pj(e_cycle)} pJ × 10⁷ = {bz.dec(p * 1000)} mW. "
           f"Halving V would cut it to a quarter.",
           ("st", {"text": f"P = C·V²·f = {bz.dec(p * 1000)} mW", "tone": "accent"}))
    H = int(yb + 24 + 20)
    return s.done("A CMOS inverter as two complementary switches", (W, H), (NW, H),
                  "A pMOS from VDD to the output Y and an nMOS from Y to ground share the input A; Y drives a 10 pF load. "
                  "The steps switch A and follow the current and the energy.")


@scene
def pass_transistor_paths(L):
    """The GATE 1991 network: x → pMOS(a) → nMOS(b) → f and y → nMOS(a) → pMOS(b) → f, for each (a, b),
    with x = 1 and y = 0 so the passed levels can be read."""
    s = S(L)
    W, NW = 680, 360
    net = bz.NET_1991
    X, Y = 1, 0
    rows = [(0, 0), (0, 1), (1, 0), (1, 1)]
    res = {ab: bz.f_1991(ab[0], ab[1], X, Y) for ab in rows}
    assert [res[ab]["value"] for ab in rows] == ["Z", X, Y, "Z"]
    assert all(res[ab]["level"] == "degraded" for ab in ((0, 1), (1, 0)))
    v01 = bz.pass_voltage(X, ["p", "n"])
    v10 = bz.pass_voltage(Y, ["n", "p"])
    assert (v01, v10) == (F("4.3"), F("0.7"))
    names = {0: ("pMOS a", "nMOS b"), 1: ("nMOS a", "pMOS b")}
    s.head("GATE 1991: which path reaches f?", "GATE 1991: which path reaches f?", W, NW)
    yt, yb_ = s.v(80, 76), s.v(170, 156)
    bh = 40
    if s.wd:
        xi, b1, b2, bw, xn, xo = 76, 110, 270, 110, 430, 470
    else:
        xi, b1, b2, bw, xn, xo = 34, 50, 144, 76, 250, 272
    tid = {}
    for k, (yy, inp) in enumerate(((yt, "x"), (yb_, "y"))):
        cyy = yy + bh / 2
        s.text(f"in{k}", xi - 6, cyy, s.v(f"{inp} = {X if k == 0 else Y}", f"{inp}={X if k == 0 else Y}"), s.v(14, 12), anchor="end", mono=True, weight="bold")
        s.line(f"w{k}a", [[xi, cyy], [b1, cyy]])
        s.box(f"t{k}0", b1, yy, bw, bh, label=names[k][0], size=s.v(14, 12))
        s.line(f"w{k}b", [[b1 + bw, cyy], [b2, cyy]])
        s.box(f"t{k}1", b2, yy, bw, bh, label=names[k][1], size=s.v(14, 12))
        s.line(f"w{k}c", [[b2 + bw, cyy], [xn, cyy]])
        tid[k] = (f"t{k}0", f"t{k}1")
    s.line("node", [[xn, yt + bh / 2], [xn, yb_ + bh / 2]])
    ymid = (yt + yb_ + bh) / 2
    s.line("fo", [[xn, ymid], [xo, ymid]])
    s.text("fv", xo + 6, ymid, "f", s.v(14, 12), anchor="start", mono=True, weight="bold")
    s.text("fl", xo + 6, ymid + 20, "", s.v(13, 12), anchor="start")
    ty = yb_ + bh + 28
    cw = s.v(150, 84)
    tx = s.v((W - 4 * 150) / 2, (NW - 4 * 84) / 2)
    head = ["a b", "top: a̅·b", "bottom: a·b̅", "f"] if s.wd else ["a b", "top", "bottom", "f"]
    tab = [head] + [[f"{a} {b}", "", "", ""] for a, b in rows]
    s.table("tt", tx, ty, cw, 26, tab)
    s.text("st", s.v(W / 2, NW / 2), ty + 5 * 26 + 24, "", s.v(15, 13), anchor="middle", weight="bold")
    cur = [list(r) for r in tab]
    for i, (a, b) in enumerate(rows):
        env = {"a": a, "b": b}
        ons = [[bz.conducts(t, env) for t in net[:2]], [bz.conducts(t, env) for t in net[2:]]]
        r = res[(a, b)]
        pats = []
        for k in (0, 1):
            path_on = all(ons[k])
            for j in (0, 1):
                pats.append((tid[k][j], {"tone": "accent" if ons[k][j] else "muted", "fill": "accent" if ons[k][j] else "none"}))
            pats += [(f"w{k}{c}", {"tone": "accent" if path_on else "muted"}) for c in "abc"]
            cur[i + 1][1 + k] = "on" if path_on else "off"
        v = r["value"]
        if v == "Z":
            ftxt, cell, vtxt, ltxt = "f = Z", "Z (float)" if not s.wd else "Z (floats)", "no path", "floats"
        else:
            src = "x" if (a, b) == (0, 1) else "y"
            volts = v01 if src == "x" else v10
            ftxt, cell, vtxt = f"f = {src} = {v}", f"{src} = {v}", f"{bz.dec(volts)} V"
            ltxt = vtxt + (" (degraded)" if s.wd else "")
        cur[i + 1][3] = cell
        pats += [("node", {"tone": "accent" if v != "Z" else "muted"}), ("fo", {"tone": tone_of(v)}),
                 ("fv", {"text": ftxt, "tone": tone_of(v)}), ("fl", {"text": ltxt, "tone": tone_of(v)}), ("tt", {"rows": [list(x) for x in cur], "highlight": [[i + 1, 1], [i + 1, 2], [i + 1, 3]]})]
        offs = [n for k in (0, 1) for j, n in enumerate(names[k]) if not ons[k][j]]
        if v == "Z":
            cap = (f"a b = {a}{b}: {', '.join(offs)} are off, so neither path conducts. f is connected to nothing: it floats (Z).")
        else:
            src = "x" if (a, b) == (0, 1) else "y"
            k = 0 if src == "x" else 1
            cap = (f"a b = {a}{b}: {names[k][0]} and {names[k][1]} are both on, so f = {src} = {v}; "
                   f"it arrives degraded at {vtxt} (one transistor of each type).")
        s.step(cap, *pats)
    s.step("So f = a̅·b·x + a·b̅·y. The two paths are never on together, but for a = b neither is: there f floats.",
           ("st", {"text": "f = a̅bx + ab̅y,  Z when a = b", "tone": "accent"}), ("tt", {"highlight": [[1, 3], [4, 3]]}))
    H = int(ty + 5 * 26 + 44)
    return s.done("The 1991 pass-transistor network, input pair by input pair", (W, H), (NW, H),
                  "Input x reaches f through a pMOS gated by a and an nMOS gated by b; y through an nMOS gated by a and a pMOS "
                  "gated by b. Here x = 1 and y = 0.")
