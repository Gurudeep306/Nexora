"""convlib: data converters for Digital Logic Chapter 7, Lesson 2 (DAC and ADC basics).

Every number in the lesson, its viz scenes, its practice questions and the Converter Bench Live Lab
comes from here, as exact fractions (`fractions.Fraction`). The lab's logic,
client/src/gate/notes/labs/convLogic.ts, is the TypeScript twin of this module (same names in
camelCase, same algorithms, same order of operations); l7_lab_vectors.py writes vectors computed
here and tests/gate-notes.test.js checks the TypeScript against them. Change the two together.

Units: volts, kilo-ohms and milliamperes (V / kΩ = mA), so the numbers stay small.

- `frac`: an exact Fraction from an int, a Fraction or a decimal string ("3.37").
- `solve_nodes`: exact nodal analysis (Kirchhoff's current law at every unknown node, Gaussian
  elimination over the rationals). The DACs below are solved with it, never by their formula,
  so the formulas can be checked against the circuit.
- DACs: `ladder` (current-switched R-2R ladder into an inverting summing amplifier),
  `ladder_voltage_mode` (voltage-switched R-2R ladder, output at the MSB node), `weighted`
  (binary-weighted resistors into a summing amplifier); `dac_ideal`, `step_size`, `full_scale`,
  `resolution_percent`, `staircase`.
- ADCs: `lsb`, `ideal_code` (floor, or round to nearest with the 1/2-LSB offset), `sar` (the
  successive-approximation search, step by step), `flash` (thermometer code from 2^n - 1
  comparators), `counter_adc` (the counter / ramp type), `dual_slope`, `conversion_clocks`.

Conventions (stated in the lesson): bit i has weight 2^i, b_{n-1} is the MSB; a code is an int
0 … 2^n - 1. A DAC's ideal output magnitude is V_ref * code / 2^n. The ADC's LSB is V_ref / 2^n;
its comparator keeps a trial bit when V_in >= V_DAC (a tie keeps the bit).

    python3 content/gate-notes/_checks/dl/convlib.py      # self-test
"""
from fractions import Fraction as F
from math import floor

# ── Exact numbers ──────────────────────────────────────────────────────────


def frac(x):
    """An exact Fraction from an int, a Fraction or a decimal string such as '3.37' or '-0.5'."""
    if isinstance(x, F):
        return x
    if isinstance(x, int):
        return F(x)
    s = str(x).strip().replace("−", "-")
    neg = s.startswith("-")
    s = s.lstrip("+-")
    if "." in s:
        a, b = s.split(".")
        v = F(int(a or "0") * 10 ** len(b) + int(b or "0"), 10 ** len(b))
    else:
        v = F(int(s))
    return -v if neg else v


def bits(code, n):
    """code as n bits, MSB first."""
    return [(code >> (n - 1 - i)) & 1 for i in range(n)]


def bstr(code, n):
    return "".join(map(str, bits(code, n)))


def dec(x, places=6):
    """A Fraction as a short decimal string (exact when it terminates within `places`)."""
    x = frac(x)
    s = f"{float(x):.{places}f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


# ── Nodal analysis ─────────────────────────────────────────────────────────


def solve_nodes(unknown, resistors, fixed):
    """Node voltages of a resistor network. `unknown`: node names to solve for (in order);
    `resistors`: list of (a, b, R) with R > 0; `fixed`: {node: voltage} (sources, ground, virtual
    ground). KCL at each unknown node k: sum over its resistors (V_k - V_other) / R = 0. Returns
    {node: voltage} for every node (fixed and solved)."""
    idx = {u: k for k, u in enumerate(unknown)}
    m = len(unknown)
    G = [[F(0)] * m for _ in range(m)]
    I = [F(0)] * m
    for a, b, r in resistors:
        g = 1 / frac(r)
        for p, q in ((a, b), (b, a)):
            if p not in idx:
                continue
            G[idx[p]][idx[p]] += g
            if q in idx:
                G[idx[p]][idx[q]] -= g
            else:
                I[idx[p]] += g * frac(fixed[q])
    # Gaussian elimination, pivot = first row (from the diagonal down) with a non-zero entry.
    for c in range(m):
        p = next(r for r in range(c, m) if G[r][c] != 0)
        G[c], G[p] = G[p], G[c]
        I[c], I[p] = I[p], I[c]
        for r in range(m):
            if r != c and G[r][c] != 0:
                f = G[r][c] / G[c][c]
                for k in range(c, m):
                    G[r][k] -= f * G[c][k]
                I[r] -= f * I[c]
    out = {k: frac(v) for k, v in fixed.items()}
    for u, k in idx.items():
        out[u] = I[k] / G[k][k]
    return out


# ── DACs ───────────────────────────────────────────────────────────────────


def ladder(n, code, vref, r, rf):
    """Current-switched R-2R ladder. V_ref drives node A_{n-1} (the MSB end); series R from A_i to
    A_{i-1}; every node A_i has a 2R leg to switch b_i, which goes to the amplifier's summing node
    OUT (virtual ground, 0 V) when b_i = 1 and to ground when b_i = 0; A_0 also has the 2R
    terminator to ground. The amplifier gives V_o = -R_f * I_out.

    Returns node voltages and leg currents MSB first (index 0 = A_{n-1}), the terminator current,
    the series currents (from A_i to A_{i-1}, MSB first), the reference current I_ref drawn from
    V_ref, I_out (into the summing node), I_gnd (into ground) and V_o."""
    vref, r, rf = frac(vref), frac(r), frac(rf)
    b = bits(code, n)
    names = [f"A{i}" for i in range(n - 1, -1, -1)]          # MSB first
    res = []
    for k in range(n - 1):
        res.append((names[k], names[k + 1], r))
    for k in range(n):
        res.append((names[k], "OUT" if b[k] else "GND", 2 * r))
    res.append((names[-1], "GND", 2 * r))                       # terminator
    v = solve_nodes(names[1:], res, {names[0]: vref, "OUT": 0, "GND": 0})
    volts = [v[x] for x in names]
    legs = [volts[k] / (2 * r) for k in range(n)]
    term = volts[-1] / (2 * r)
    series = [(volts[k] - volts[k + 1]) / r for k in range(n - 1)]
    iref = legs[0] + (series[0] if n > 1 else term)
    iout = sum((legs[k] for k in range(n) if b[k]), F(0))
    ignd = sum((legs[k] for k in range(n) if not b[k]), F(0)) + term
    return {"n": n, "code": code, "bits": b, "volts": volts, "legs": legs, "term": term, "series": series,
            "iref": iref, "iout": iout, "ignd": ignd, "vo": -rf * iout}


def ladder_voltage_mode(n, code, vref, r):
    """Voltage-switched R-2R ladder: node N_0 (LSB end) has a 2R terminator to ground, series R from
    N_i to N_{i+1}, and every node N_i has a 2R leg to V_ref (b_i = 1) or ground (b_i = 0). The
    output is the open-circuit voltage of N_{n-1} (the MSB node), buffered."""
    vref, r = frac(vref), frac(r)
    b = bits(code, n)
    names = [f"N{i}" for i in range(n - 1, -1, -1)]
    res = [(names[k], names[k + 1], r) for k in range(n - 1)]
    res += [(names[k], "REF" if b[k] else "GND", 2 * r) for k in range(n)]
    res.append((names[-1], "GND", 2 * r))
    v = solve_nodes(names, res, {"REF": vref, "GND": 0})
    return {"volts": [v[x] for x in names], "vout": v[names[0]]}


def weighted(n, code, vref, r, rf):
    """Binary-weighted resistor DAC: bit i (MSB i = n-1) has resistor R * 2^(n-1-i) from its switch
    (V_ref when b_i = 1, ground when 0) to the summing node (virtual ground); V_o = -R_f * I_out."""
    vref, r, rf = frac(vref), frac(r), frac(rf)
    b = bits(code, n)
    rs = [r * 2 ** k for k in range(n)]                         # MSB first: R, 2R, 4R, …
    v = solve_nodes([], [], {"REF": vref, "SUM": 0})
    cur = [(v["REF"] - v["SUM"]) / rs[k] if b[k] else F(0) for k in range(n)]
    iout = sum(cur, F(0))
    return {"resistors": rs, "currents": cur, "iout": iout, "vo": -rf * iout, "spread": rs[-1] / rs[0]}


def dac_ideal(n, code, vref):
    """The ideal output magnitude V_ref * code / 2^n."""
    return frac(vref) * code / 2 ** n


def step_size(n, vref):
    return frac(vref) / 2 ** n


def full_scale(n, vref):
    """Largest output: all bits 1, (2^n - 1) steps = V_ref (1 - 2^-n)."""
    return frac(vref) * (2 ** n - 1) / 2 ** n


def resolution_percent(n):
    """One step as a percentage of the full-scale output: 100 / (2^n - 1)."""
    return F(100, 2 ** n - 1)


def staircase(n, vref, r, rf):
    """V_o of the current-switched ladder for every code 0 … 2^n - 1 (by nodal analysis)."""
    return [ladder(n, c, vref, r, rf)["vo"] for c in range(2 ** n)]


# ── ADCs ───────────────────────────────────────────────────────────────────


def lsb(n, vref):
    return frac(vref) / 2 ** n


def ideal_code(n, vref, vin, offset=False):
    """The code an ideal n-bit converter gives: floor(V_in / LSB) (no offset) or floor(V_in / LSB + 1/2)
    (the 1/2-LSB offset: round to nearest, halves up), clipped to 0 … 2^n - 1."""
    q = frac(vin) / lsb(n, vref) + (F(1, 2) if offset else 0)
    return max(0, min(2 ** n - 1, floor(q)))


def sar(n, vref, vin, offset=False):
    """Successive approximation. The register starts at 0; for bit k = n-1 down to 0 the logic sets bit
    k (the trial code), the DAC produces trial * LSB (minus 1/2 LSB with the offset) and the comparator
    keeps the bit if V_in >= V_DAC, else clears it. One bit per clock: n clocks."""
    vref, vin = frac(vref), frac(vin)
    q = lsb(n, vref)
    code, steps = 0, []
    lo, hi = 0, 2 ** n                                          # the codes still possible: lo ≤ code < hi
    for k in range(n - 1, -1, -1):
        trial = code | (1 << k)
        v = trial * q - (q / 2 if offset else 0)
        keep = vin >= v
        before = (lo, hi)
        if keep:
            code, lo = trial, trial
        else:
            hi = trial
        steps.append({"bit": k, "trial": trial, "v": v, "keep": keep, "code": code, "range": before})
    vq = code * q
    return {"n": n, "lsb": q, "steps": steps, "code": code, "vq": vq, "err": vin - vq, "errLsb": (vin - vq) / q}


def flash(n, vref, vin, offset=False):
    """Flash ADC: 2^n resistors divide V_ref into thresholds k * LSB (k = 1 … 2^n - 1; minus 1/2 LSB with
    the offset); comparator k outputs 1 when V_in >= its threshold. The outputs form a thermometer
    code (listed from the top comparator down); a priority encoder turns it into the count of 1s."""
    q = lsb(n, vref)
    vin = frac(vin)
    th = [k * q - (q / 2 if offset else 0) for k in range(1, 2 ** n)]
    c = [1 if vin >= t else 0 for t in th]
    return {"thresholds": th, "outputs": c[::-1], "code": sum(c), "comparators": 2 ** n - 1, "resistors": 2 ** n}


def counter_adc(n, vref, vin):
    """Counter (ramp) ADC: the counter starts at 0; before each clock the comparator checks whether the
    next DAC step (count + 1) * LSB is still <= V_in, and if so the clock advances the counter. Code k
    therefore costs k clocks, at most 2^n - 1."""
    q = lsb(n, vref)
    vin = frac(vin)
    count, levels = 0, [F(0)]
    while count < 2 ** n - 1 and (count + 1) * q <= vin:
        count += 1
        levels.append(count * q)
    return {"code": count, "clocks": count, "levels": levels}


def dual_slope(n1, vref, vin):
    """Dual-slope ADC: integrate V_in for a fixed N1 clocks, then integrate -V_ref until the integrator
    is back at zero; that takes N2 = N1 * V_in / V_ref clocks (counted: floor)."""
    exact = n1 * frac(vin) / frac(vref)
    return {"exact": exact, "count": floor(exact), "total": n1 + floor(exact)}


def conversion_clocks(kind, n, code=None):
    """Clocks for one conversion: flash 1, SAR n, counter type the code itself (worst case 2^n - 1)."""
    if kind == "flash":
        return 1
    if kind == "sar":
        return n
    if kind == "counter":
        return 2 ** n - 1 if code is None else code
    raise ValueError(kind)


# ── Self-test ──────────────────────────────────────────────────────────────


def _selftest():
    import random

    assert frac("3.37") == F(337, 100) and frac("-0.5") == F(-1, 2) and frac(".25") == F(1, 4) and frac("7") == 7
    # R-2R ladder theorem: every node is half the one before, the leg currents are I * 2^(i-n), I = V_ref / R
    # for every code, and V_o = -V_ref (R_f / R) code / 2^n.
    for n in range(1, 9):
        for vref, r, rf in ((5, 2, 2), ("10", "5", "2.5"), ("3.3", "1", "4.7")):
            vref_, r_, rf_ = frac(vref), frac(r), frac(rf)
            for code in sorted({0, 1, 2 ** n - 1, 2 ** (n - 1), random.Random(n).randrange(2 ** n)}):
                L = ladder(n, code, vref, r, rf)
                assert L["volts"] == [vref_ / 2 ** k for k in range(n)]
                assert L["legs"] == [vref_ / r_ * F(1, 2 ** (k + 1)) for k in range(n)]
                assert L["iref"] == vref_ / r_ and L["iout"] + L["ignd"] == L["iref"]
                assert L["vo"] == -vref_ * rf_ / r_ * F(code, 2 ** n)
                assert ladder_voltage_mode(n, code, vref, r)["vout"] == vref_ * F(code, 2 ** n)
                W = weighted(n, code, vref, r, rf)
                assert W["vo"] == -vref_ * rf_ / r_ * F(2 * code, 2 ** n) and W["spread"] == 2 ** (n - 1)
    # The C 397 numbers: V = 5 V, R = R_f = 2 kΩ, 3 bits, only the I/8 leg selected.
    L = ladder(3, 0b001, 5, 2, 2)
    assert L["iref"] == F(5, 2) and L["iout"] == F(5, 16) and L["vo"] == F(-5, 8)
    # ADCs: SAR = ideal floor (or round with the offset) = flash = counter, for every input on a fine grid.
    for n in range(1, 7):
        for vref in (8, "5.12", "3.3"):
            q = lsb(n, vref)
            for t in range(0, 4 * 2 ** n + 6):
                vin = q * F(t, 4)
                for off in (False, True):
                    s = sar(n, vref, vin, off)
                    assert s["code"] == ideal_code(n, vref, vin, off) == flash(n, vref, vin, off)["code"]
                    assert len(s["steps"]) == n
                    if not off and vin < frac(vref):
                        assert 0 <= s["err"] < q
                    if off and vin < frac(vref) - q / 2:
                        assert -q / 2 <= s["err"] < q / 2
                c = counter_adc(n, vref, vin)
                assert c["code"] == ideal_code(n, vref, vin) and c["clocks"] == c["code"] <= 2 ** n - 1
    assert dual_slope(1000, 2, "0.75")["count"] == 375
    assert resolution_percent(8) == F(100, 255) and full_scale(4, 10) == F(75, 8) and step_size(4, 10) == F(5, 8)


if __name__ == "__main__":
    _selftest()
    print("convlib: nodal analysis of R-2R (current and voltage mode) and weighted DACs, SAR = flash = counter = ideal code, self-test OK")
