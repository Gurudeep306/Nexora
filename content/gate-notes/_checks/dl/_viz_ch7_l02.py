"""Chapter 7, Lesson 2 scenes (DAC and ADC basics). Every value comes from convlib: the SAR search
step by step (trial codes, DAC voltages, comparator decisions, the shrinking interval) and the
current-switched R-2R ladder solved by nodal analysis (node voltages, leg currents, the reference
current, I_out and V_o for each code)."""
import pathlib
import sys
from fractions import Fraction as F

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import convlib as cv  # noqa: E402
from _viz_ch7_base import S, scene  # noqa: E402

def d(x):
    """A value as a short decimal with a true minus sign."""
    return cv.dec(x).replace("-", "−")



@scene
def sar_binary_search(L):
    """4-bit SAR, V_ref = 10 V, V_in = 6.4 V: one bit per clock, the interval of possible codes halves."""
    s = S(L)
    W, NW = 680, 360
    n, vref, vin = 4, cv.frac(10), cv.frac("6.4")
    r = cv.sar(n, vref, vin)
    q = r["lsb"]
    assert r["code"] == 0b1010 == cv.ideal_code(n, vref, vin) and q == F(5, 8)
    s.head(f"SAR: a binary search for V_in = {d(vin)} V ({n} bits, V_ref = {d(vref)} V)", f"SAR search for V_in = {d(vin)} V", W, NW)
    # The chart: one column per clock, voltage upwards.
    ax, x1 = s.v(70, 46), s.v(330, 256)
    yt, yb = s.v(62, 52), s.v(340, 232)
    col0, cw = ax + 10, s.v(62, 50)

    def y(v):
        return round(yb - float(v / vref) * (yb - yt), 2)

    s.line("ax", [[ax, yt - 6], [ax, yb], [x1, yb]], tone="muted")
    for k, v in enumerate((0, F(5, 2), 5, F(15, 2), 10)):
        s.text(f"t{k}", ax - 6, y(v), d(v), s.v(13, 12), anchor="end", mono=True, tone="muted")
    s.text("tv", ax - 6, yt - 20, "V", s.v(13, 12), anchor="end", mono=True, tone="muted")
    for k in range(n):
        s.text(f"s{k}", col0 + cw * k + cw / 2, yb + 14, str(k + 1), s.v(13, 12), anchor="middle", mono=True, tone="muted")
    s.text("sl", col0 + cw * n / 2, yb + 32, "clock (one bit per clock)", s.v(13, 12), anchor="middle", tone="muted")
    yv = y(vin)
    s.line("vin", [[ax, yv], [x1, yv]], tone="accent", dashed=True)
    s.text("vinl", x1 + 4, yv, "V_in", s.v(13, 12), anchor="start", mono=True, weight="bold", tone="accent")
    for k, st in enumerate(r["steps"]):
        lo, hi = st["range"]
        bx = col0 + cw * k + 4
        s.box(f"hlb{k}", bx, y(hi * q), cw - 8, round(y(lo * q) - y(hi * q), 2), fill="accent", tone="accent", hidden=True, opacity=0.35)
        s.line(f"seg{k}", [[bx, y(st["v"])], [bx + cw - 8, y(st["v"])]], tone="accent", hidden=True)
    # The table of trials.
    tx, ty = s.v(372, 12), s.v(62, yb + 52)
    tw = s.v(58, 66)
    head = ["clock", "trial", "V_DAC", "keep?", "code"]
    rows = [head] + [[str(k + 1), "", "", "", ""] for k in range(n)]
    s.table("tt", tx, ty, tw, 30, rows)
    ry = ty + 30 * (n + 1) + 22
    s.text("reg", tx, ry, "register: " + "0" * n, s.v(15, 13), anchor="start", mono=True, weight="bold")
    s.text("res", tx, ry + 26, "", s.v(14, 12), anchor="start", weight="bold")
    s.step(f"Start: register {'0' * n}. All {2 ** n} codes 0–{2 ** n - 1} are possible, so the search interval is all of 0 to {d(vref)} V.",
           ("hlb0", {"hidden": False}))
    cur = [list(x) for x in rows]
    for k, st in enumerate(r["steps"]):
        trial = cv.bstr(st["trial"], n)
        cur[k + 1][1], cur[k + 1][2] = trial, d(st["v"])
        name = "the MSB" if st["bit"] == n - 1 else f"bit {st['bit']}"
        s.step(f"Clock {k + 1}: set {name}. Trial {trial} = {st['trial']} makes the DAC give {st['trial']} × {d(q)} = {d(st['v'])} V.",
               ("seg%d" % k, {"hidden": False, "tone": "accent"}), ("hlb%d" % k, {"hidden": False}),
               ("tt", {"rows": [list(x) for x in cur], "highlight": [[k + 1, 1], [k + 1, 2]]}),
               ("reg", {"text": "register: " + trial}))
        cur[k + 1][3], cur[k + 1][4] = ("yes" if st["keep"] else "no"), cv.bstr(st["code"], n)
        lo2, hi2 = (st["trial"], st["range"][1]) if st["keep"] else (st["range"][0], st["trial"])
        cmp = "≥" if st["keep"] else "<"
        verdict = "stays 1" if st["keep"] else "is cleared"
        s.step(f"V_in = {d(vin)} V {cmp} {d(st['v'])} V, so bit {st['bit']} {verdict}: the code lies in {lo2}–{hi2 - 1}.",
               ("seg%d" % k, {"tone": "success" if st["keep"] else "danger"}),
               ("tt", {"rows": [list(x) for x in cur], "highlight": [[k + 1, 3], [k + 1, 4]]}),
               ("reg", {"text": "register: " + cv.bstr(st["code"], n)}))
    code = cv.bstr(r["code"], n)
    s.step(f"Done in {n} clocks: code {code} = {r['code']}, i.e. {d(r['vq'])} V. The error {d(r['err'])} V is {d(r['errLsb'])} LSB, under one LSB.",
           ("res", {"text": f"code {code} = {r['code']} → {d(r['vq'])} V", "tone": "success"}), ("tt", {"highlight": [[n, 4]]}))
    H = s.v(ry + 44, ry + 44)
    return s.done("Successive approximation as a binary search", (W, max(H, yb + 50)), (NW, H),
                  f"A {n}-bit successive-approximation ADC with V_ref = {d(vref)} V converts V_in = {d(vin)} V. Each clock sets one bit, "
                  "the DAC turns the trial code into a voltage, and the comparator keeps or clears the bit.")


@scene
def r2r_ladder_currents(L):
    """The current-switched 3-bit R-2R ladder of the C 397 example: V_ref = 5 V, R = R_f = 2 kΩ."""
    s = S(L)
    W, NW = 680, 360
    n, vref, R, Rf = 3, cv.frac(5), cv.frac(2), cv.frac(2)
    base = cv.ladder(n, 0, vref, R, Rf)
    assert base["iref"] == F(5, 2) and base["volts"] == [5, F(5, 2), F(5, 4)]
    s.head("Current-switched R-2R ladder: the current halves at every node", "R-2R ladder: currents halve", W, NW)
    yr = s.v(96, 96)                                   # the rail
    xs = s.v([170, 330, 490], [88, 172, 256])          # nodes A2, A1, A0
    xt = s.v(600, 336)                                  # terminator column
    rw, rh = s.v(46, 34), 22                            # a series R box
    lw, lh = 24, s.v(46, 40)                            # a vertical 2R box
    ylt = yr + 26                                       # top of the leg boxes
    ysw = ylt + lh + s.v(26, 22)                        # switch point
    yout = ysw + s.v(56, 50)                            # the summing bus
    sz = s.v(13, 12)
    # V_ref source and its current.
    xsrc = s.v(40, 8)
    s.text("src", xsrc, yr - 20, s.v(f"V_ref = {d(vref)} V", "V_ref"), s.v(14, 12), anchor="start", mono=True, weight="bold")
    s.line("wsrc", [[xsrc + 4, yr], [xs[0], yr]], tone="ink")
    s.text("iref", xsrc, yr + 22, "I = ?", sz, anchor="start", mono=True)
    for k in range(n):
        x = xs[k]
        nm = f"A{n - 1 - k}"
        s.node(f"nd{k}", x, yr, 4, fill="ink", tone="ink")
        s.text(f"nl{k}", x + 8, yr - 14, nm, sz, anchor="start", mono=True, weight="bold")
        s.text(f"nv{k}", x, yr - 32, "", sz, anchor="middle", mono=True, tone="accent")
        if k < n - 1:
            mx = (x + xs[k + 1]) / 2
            s.line(f"ws{k}a", [[x, yr], [mx - rw / 2, yr]])
            s.box(f"rs{k}", mx - rw / 2, yr - rh / 2, rw, rh, label="R", size=sz, mono=True)
            s.line(f"ws{k}b", [[mx + rw / 2, yr], [xs[k + 1], yr]])
        # the 2R leg, its current and its switch
        s.line(f"wl{k}a", [[x, yr], [x, ylt]])
        s.box(f"rl{k}", x - lw / 2, ylt, lw, lh, label="2R", size=sz, mono=True)
        s.line(f"wl{k}b", [[x, ylt + lh], [x, ysw]])
        s.text(f"il{k}", x + lw / 2 + 5, ylt + lh / 2, "", sz, anchor="start", mono=True, tone="accent")
        b = n - 1 - k
        s.line(f"go{k}", [[x, ysw], [x, yout]], tone="muted", dashed=True)
        s.line(f"gg{k}", [[x, ysw], [x + s.v(22, 16), ysw]], tone="success")
        s.text(f"gl{k}", x + s.v(26, 20), ysw, "gnd", sz, anchor="start", mono=True, tone="muted")
        s.text(f"bl{k}", x - 6, ysw + s.v(20, 18), f"b{b}=0", sz, anchor="end", mono=True, weight="bold")
    # the terminator 2R to ground
    s.line("wt", [[xs[-1], yr], [xt, yr], [xt, ylt]])
    s.box("rt", xt - lw / 2, ylt, lw, lh, label="2R", size=sz, mono=True)
    s.line("wtb", [[xt, ylt + lh], [xt, ysw]], tone="success")
    s.text("tg", xt, ysw + 14, "gnd", sz, anchor="middle", mono=True, tone="muted")
    s.text("it", xt - 4, ylt - 12, "", sz, anchor="end", mono=True, tone="accent")
    # the summing bus into the amplifier
    xa = s.v(40, 10)
    aw = s.v(118, 76)
    s.line("bus", [[xs[-1], yout], [xa + aw, yout]], tone="muted")
    s.text("outl", xs[0] + 10, yout - 12, s.v("OUT = 0 V", "OUT=0 V"), sz, anchor="start", mono=True, tone="muted")
    s.box("amp", xa, yout - 20, aw, 40, label="Σ, R_f = R" if s.wd else "R_f = R", size=sz, mono=True)
    s.text("iout", xs[0] + 8, yout + 16, "I_out = 0", sz, anchor="start", mono=True)
    s.text("vo", s.v(W / 2, NW / 2), yout + s.v(48, 44), "", s.v(14, 12), anchor="middle", weight="bold")
    s.text("rr", s.v(W / 2, NW / 2), yr - 46, "", sz, anchor="middle", tone="accent")

    def code_patches(code):
        Lc = cv.ladder(n, code, vref, R, Rf)
        ps = []
        for k in range(n):
            on = Lc["bits"][k]
            ps += [(f"go{k}", {"tone": "accent" if on else "muted", "dashed": not on}),
                   (f"gg{k}", {"tone": "muted" if on else "success", "dashed": bool(on)}),
                   (f"bl{k}", {"text": f"b{n - 1 - k}={on}", "tone": "accent" if on else "ink"})]
        ps += [("iout", {"text": f"I_out = {d(Lc['iout'])} mA", "tone": "accent" if code else "ink"}),
               ("vo", {"text": f"code {cv.bstr(code, n)}: V_o = −R_f · I_out = {d(Lc['vo'])} V", "tone": "accent"})]
        return Lc, ps

    s.step("Every switch is at ground. Both switch positions are at 0 V (OUT is a virtual ground), so the ladder's currents never depend on the code.",
           ("rr", {"text": ""}))
    s.step("Looking right from A0: the 2R leg in parallel with the 2R terminator is R.",
           ("rl2", {"fill": "accent"}), ("rt", {"fill": "accent"}), ("rr", {"text": "right of A0: 2R || 2R = R"}))
    s.step("Looking right from A1: R in series with that R is 2R, in parallel with A1's 2R leg: R again.",
           ("rl2", {"fill": "none"}), ("rt", {"fill": "none"}), ("rs1", {"fill": "accent"}), ("rl1", {"fill": "accent"}),
           ("rr", {"text": "right of A1: 2R || (R + R) = R"}))
    s.step(f"The same holds at A2, so V_ref sees R: I = V_ref / R = {d(vref)} V / {d(R)} kΩ = {d(base['iref'])} mA, for every code.",
           ("rs1", {"fill": "none"}), ("rl1", {"fill": "none"}), ("rl0", {"fill": "accent"}), ("rs0", {"fill": "accent"}),
           ("rr", {"text": "right of A2: R, so I = V_ref / R"}), ("iref", {"text": f"I{' = ' if s.wd else '='}{d(base['iref'])} mA", "tone": "accent"}))
    legs = [d(x) for x in base["legs"]]
    s.step(f"Each node splits its current equally (2R down, 2R to the right): legs carry {legs[0]}, {legs[1]}, {legs[2]} mA; the terminator {d(base['term'])} mA.",
           ("rl0", {"fill": "none"}), ("rs0", {"fill": "none"}),
           ("rr", {"text": s.v("", "currents in mA"), "tone": "muted"}),          # the narrow layout drops the unit
           *[(f"nv{k}", {"text": f"{d(base['volts'][k])} V"}) for k in range(n)],
           *[(f"il{k}", {"text": legs[k] + s.v(" mA", "")}) for k in range(n)], ("it", {"text": d(base["term"]) + s.v(" mA", "")}))
    for code, cap in ((0b001, "Code 001 sends only the LSB leg to OUT: I_out = {i} mA and V_o = {v} V (the corrected numbers: not 25 mA, not −0.3125 V)."),
                      (0b101, "Code 101: I_out = {i} mA, V_o = {v} V = −5 × 5/8. The reference current is still {r} mA; the rest goes to ground."),
                      (0b111, "Code 111: I_out = {i} mA, V_o = {v} V = 7/8 of −V_ref. Full scale is one step short of V_ref: the terminator keeps {t} mA.")):
        Lc, ps = code_patches(code)
        assert Lc["iref"] == base["iref"] and Lc["volts"] == base["volts"]
        s.step(cap.format(i=d(Lc["iout"]), v=d(Lc["vo"]), r=d(Lc["iref"]), t=d(Lc["term"])), *ps)
    H = s.v(yout + 70, yout + 64)
    return s.done("The R-2R ladder halves the current at every node", (W, H), (NW, H),
                  f"A current-switched 3-bit R-2R ladder: V_ref = {d(vref)} V, R = {d(R)} kΩ, 2R legs switched to ground or to the "
                  "summing node OUT of an inverting amplifier with R_f = R.")
