"""Converter Bench (Chapter 7 Live Lab) test vectors.

The lab's logic lives in client/src/gate/notes/labs/convLogic.ts, the TypeScript twin of convlib.py.
This check computes, with convlib, everything that module claims, writes it to lab_vectors_ch7.json
(every exact value as the string of a Fraction, e.g. "-5/8"), and fails if the committed file is
stale; tests/gate-notes.test.js then checks the TypeScript against the same file:

- decimal parsing (convlib.frac) of the kinds of text the lab accepts;
- the current-switched R-2R ladder by nodal analysis for n = 1 … 8 (several V_ref, R, R_f, codes;
  every code for n ≤ 3): node voltages, leg, terminator and series currents, I_ref, I_out, I_gnd, V_o;
  the voltage-switched ladder and the binary-weighted DAC on the same cases; the staircase of every code;
- step size, full scale and resolution for n = 1 … 8;
- the over-range test (V_in >= V_ref, or >= V_ref - LSB/2 with the offset), including the top half-step;
- the SAR search step by step (seeded random n = 3 … 8, V_ref, V_in up to 110 % of V_ref, with and
  without the 1/2-LSB offset, plus ties on exact levels and the lab presets), the ideal code, the flash
  thermometer code, the counter ADC and the dual-slope count;
- the lab presets (SAR and DAC), which must match convLogic's SAR_PRESETS and DAC_PRESETS.

    python3 content/gate-notes/_checks/dl/l7_lab_vectors.py --write   # refresh the JSON
"""
import json
import pathlib
import random
import sys
from fractions import Fraction as F

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import convlib as cv  # noqa: E402

OUT = pathlib.Path(__file__).parent / "lab_vectors_ch7.json"
S = str

SAR_PRESETS = [
    {"id": "easy", "label": "3 bits, 8 V, V_in = 5.3 V", "n": 3, "vref": "8", "vin": "5.3", "offset": False},
    {"id": "lesson", "label": "4 bits, 10 V, V_in = 6.4 V", "n": 4, "vref": "10", "vin": "6.4", "offset": False},
    {"id": "byte", "label": "8 bits, 5.12 V, V_in = 3.37 V", "n": 8, "vref": "5.12", "vin": "3.37", "offset": False},
    {"id": "tie", "label": "Tie: 4 bits, 16 V, V_in = 10 V", "n": 4, "vref": "16", "vin": "10", "offset": False},
    {"id": "round", "label": "½-LSB offset: 4 bits, 10 V, 6.6 V", "n": 4, "vref": "10", "vin": "6.6", "offset": True},
    {"id": "over", "label": "Over range with the ½-LSB offset: 4 bits, 8 V, 7.9 V", "n": 4, "vref": "8", "vin": "7.9", "offset": True},
]
DAC_PRESETS = [
    {"id": "c397", "label": "3 bits, 5 V, R = R_f = 2 kΩ, code 001", "n": 3, "vref": "5", "r": "2", "rf": "2", "code": 1},
    {"id": "full", "label": "Same ladder, code 111", "n": 3, "vref": "5", "r": "2", "rf": "2", "code": 7},
    {"id": "four", "label": "4 bits, 10 V, R = R_f = 5 kΩ, code 0101", "n": 4, "vref": "10", "r": "5", "rf": "5", "code": 5},
    {"id": "byte", "label": "8 bits, 2.56 V, R = R_f = 10 kΩ, code 10000000", "n": 8, "vref": "2.56", "r": "10", "rf": "10", "code": 128},
]
# The presets show the lesson's numbers.
assert [cv.sar(p["n"], p["vref"], p["vin"], p["offset"])["code"] for p in SAR_PRESETS] == [5, 10, 168, 10, 11, 15]
# The "over" preset is over range only because of the offset (7.75 V <= 7.9 V < 8 V).
assert [cv.over_range(p["n"], p["vref"], p["vin"], p["offset"]) for p in SAR_PRESETS] == [False] * 5 + [True]
assert not cv.over_range(4, "8", "7.9", False)
assert [S(cv.ladder(p["n"], p["code"], p["vref"], p["r"], p["rf"])["vo"]) for p in DAC_PRESETS] == ["-5/8", "-35/8", "-25/8", "-32/25"]


def strs(xs):
    return [S(x) for x in xs]


def ladder_case(n, code, vref, r, rf):
    L = cv.ladder(n, code, vref, r, rf)
    V = cv.ladder_voltage_mode(n, code, vref, r)
    W = cv.weighted(n, code, vref, r, rf)
    return {"n": n, "code": code, "vref": vref, "r": r, "rf": rf, "bits": L["bits"], "volts": strs(L["volts"]), "legs": strs(L["legs"]),
            "term": S(L["term"]), "series": strs(L["series"]), "iref": S(L["iref"]), "iout": S(L["iout"]), "ignd": S(L["ignd"]), "vo": S(L["vo"]),
            "vm": {"volts": strs(V["volts"]), "vout": S(V["vout"])},
            "w": {"resistors": strs(W["resistors"]), "currents": strs(W["currents"]), "iout": S(W["iout"]), "vo": S(W["vo"]), "spread": S(W["spread"])},
            "ideal": S(cv.dac_ideal(n, code, vref))}


def dac_vectors():
    rnd = random.Random(2027)
    params = [("5", "2", "2"), ("10", "5", "2.5"), ("3.3", "1", "4.7"), ("2.56", "10", "10"), ("12", "0.5", "1.5")]
    out = []
    for n in range(1, 9):
        for vref, r, rf in params:
            codes = range(2 ** n) if n <= 3 else sorted({0, 1, 2 ** n - 1, 2 ** (n - 1), *(rnd.randrange(2 ** n) for _ in range(3))})
            for c in codes:
                out.append(ladder_case(n, c, vref, r, rf))
    for p in DAC_PRESETS:
        out.append(ladder_case(p["n"], p["code"], p["vref"], p["r"], p["rf"]))
    stairs = [{"n": n, "vref": vref, "r": r, "rf": rf, "vo": strs(cv.staircase(n, vref, r, rf))}
              for n in (1, 2, 3, 4, 6) for vref, r, rf in params[:3]]
    sizes = [{"n": n, "vref": vref, "step": S(cv.step_size(n, vref)), "full": S(cv.full_scale(n, vref)), "res": S(cv.resolution_percent(n))}
             for n in range(1, 9) for vref in ("10", "5.12", "3.3")]
    return out, stairs, sizes


def sar_case(n, vref, vin, offset):
    s = cv.sar(n, vref, vin, offset)
    f = cv.flash(n, vref, vin, offset) if n <= 6 else None
    c = cv.counter_adc(n, vref, vin) if not offset else None
    row = {"n": n, "vref": vref, "vin": vin, "offset": offset, "lsb": S(s["lsb"]),
           "steps": [{"bit": t["bit"], "trial": t["trial"], "v": S(t["v"]), "keep": t["keep"], "code": t["code"], "range": list(t["range"])} for t in s["steps"]],
           "code": s["code"], "vq": S(s["vq"]), "err": S(s["err"]), "errLsb": S(s["errLsb"]), "ideal": cv.ideal_code(n, vref, vin, offset),
           "over": cv.over_range(n, vref, vin, offset)}
    assert row["code"] == row["ideal"]
    if f:
        row["flash"] = {"thresholds": strs(f["thresholds"]), "outputs": f["outputs"], "code": f["code"]}
        assert f["code"] == row["code"]
    if c and n <= 6:
        row["counter"] = {"code": c["code"], "clocks": c["clocks"], "levels": strs(c["levels"])}
    elif c:
        row["counter"] = {"code": c["code"], "clocks": c["clocks"]}
    return row


def adc_vectors():
    rnd = random.Random(2028)
    out = []
    for p in SAR_PRESETS:
        out.append(sar_case(p["n"], p["vref"], p["vin"], p["offset"]))
    vrefs = ["10", "5.12", "3.3", "8", "2.56", "1", "16"]
    for i in range(240):
        n = 3 + i % 6
        vref = vrefs[rnd.randrange(len(vrefs))]
        vin = cv.frac(vref) * rnd.randint(0, 1100) / 1000
        vin_s = cv.dec(vin, 6) if rnd.random() < 0.7 else f"{float(vin):.3f}"
        out.append(sar_case(n, vref, vin_s, i % 2 == 1))
    for n in (3, 4, 5):
        for k in (0, 1, 2 ** (n - 1), 2 ** n - 1):              # exact levels: a comparator tie keeps the bit
            v = cv.dec(cv.lsb(n, "8") * k)
            out.append(sar_case(n, "8", v, False))
            out.append(sar_case(n, "8", cv.dec(cv.lsb(n, "8") * k - cv.lsb(n, "8") / 2), True))
    for n, vref in ((4, "8"), (5, "10"), (8, "2.56")):          # the top half-step: over range only with the offset
        q, top = cv.lsb(n, vref), cv.frac(vref)
        for v in (top - q / 2, top - q / 5, top - q / 2 - F(1, 1000), top):
            for off in (False, True):
                out.append(sar_case(n, vref, cv.dec(v), off))
    assert any(r["over"] and r["offset"] and cv.frac(r["vin"]) < cv.frac(r["vref"]) for r in out)
    assert any(not r["over"] and not r["offset"] and cv.frac(r["vin"]) >= cv.frac(r["vref"]) - F(r["lsb"]) / 2 for r in out)
    assert any(r["vin"] == "0" for r in out) and any(cv.frac(r["vin"]) > cv.frac(r["vref"]) for r in out)
    duals = [{"n1": n1, "vref": vref, "vin": vin, **{k: (S(v) if k == "exact" else v) for k, v in cv.dual_slope(n1, vref, vin).items()}}
             for n1 in (100, 1000, 4096) for vref, vin in (("2", "0.75"), ("1", "0.3333"), ("5", "4.999"), ("2.5", "0"))]
    return out, duals


def build():
    dac, stairs, sizes = dac_vectors()
    adc, duals = adc_vectors()
    parse = [{"text": t, "value": S(cv.frac(t))} for t in ("3.37", "-0.5", ".25", "7", "10.", "0.000001", "−2.5", "+4", "5.120")]
    return {"parse": parse, "dac": dac, "stairs": stairs, "sizes": sizes, "adc": adc, "dual": duals,
            "sarPresets": SAR_PRESETS, "dacPresets": DAC_PRESETS}


data = build()
text = json.dumps(data, separators=(",", ":"), ensure_ascii=False) + "\n"
if "--write" in sys.argv:
    OUT.write_text(text)
    print(f"wrote {OUT.name}")
assert OUT.exists() and OUT.read_text() == text, "lab_vectors_ch7.json is stale: run with --write"
print(f"l7_lab_vectors: {len(data['parse'])} parses, {len(data['dac'])} ladder/weighted DAC cases, {len(data['stairs'])} staircases, "
      f"{len(data['adc'])} SAR/flash/counter conversions, {len(data['dual'])} dual-slope counts, presets OK")
