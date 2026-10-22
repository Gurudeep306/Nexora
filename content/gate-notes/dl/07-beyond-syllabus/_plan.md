# Chapter 7 plan: Beyond the core syllabus (optional)

Internal planning file (the build skips it). Same house style as Chapters 1–6 (`_style.md`): the full
arc for every concept, an :::intuition before every new idea, at least 4 step-format worked examples per
"Worked examples" section (easy → medium → GATE-style → "Edge case:"), :::theorem + :::proof or
:::derivation for every rule used, a recap note per section, animation wherever motion teaches, every block
with an `#id` and a `depth`. The chapter is **optional**: the official GATE CSE syllabus no longer lists
memory chips, converters or logic families, but old papers (1991–1998) asked about logic families and the
sets cover all three topics. Every lesson opens with "*Optional: beyond the core GATE syllabus.*" and the
chapter summary says so. Lessons are lighter (5–7k words, ≥ 12 worked examples) but complete.

- Folder: `content/gate-notes/dl/07-beyond-syllabus/`; `chapter: beyond-syllabus`; difficulty `basic`.
- Check scripts (`content/gate-notes/_checks/dl/`): `beyondlib.py` (memory organisation: address lines,
  chip counts, word/size expansion, decoder sizes, address ranges; logic families: switch-level evaluation of
  MOS networks with strong/weak/floating levels, CMOS gates from series/parallel networks, transmission
  gates, noise margins, fan-out, dynamic power C·V²·f, family comparison data) and `convlib.py` (R-2R and
  weighted-resistor DACs solved by exact nodal analysis with fractions, resolution and full scale, SAR ADC
  binary search step by step, counter/ramp ADC conversion times, flash comparator counts, quantisation
  error). One check per lesson, `l7_01_memory.py`, `l7_02_converters.py`, `l7_03_families.py`;
  `lessons_ch7.py`, `pyq_ch7.py`, `viz_ch7.py`, `l7_lab_vectors.py`.
- Viz: `_viz_ch7.py` (per-lesson modules `_viz_ch7_l01.py` … `_l03.py`, shared helpers from
  `_viz_ch6_base.py`); two layouts, captions on every step.
- Live Lab: **Converter Bench** (`:::lab{lab="converter-bench"}`, tabs `sar` and `dac`): a SAR ADC
  stepping through its binary search beside an R-2R DAC staircase; logic in `convLogic.ts`, the twin of
  `convlib.py`, tested against `lab_vectors_ch7.json`.
- Sources: our own text; facts checked against Mano and Ciletti, *Digital Design* (memory, ROM/RAM
  organisation), Rabaey, Chandrakasan and Nikolić, *Digital Integrated Circuits* (CMOS, pass transistors,
  power), Sedra and Smith, *Microelectronic Circuits* (logic families, DACs and ADCs). Errata: X4 (NAND is
  faster than NOR in CMOS), C 392 / C 343 (SRAM needs no refresh; loose claims), C 394–397 (the DAC current
  example: 2.5 mA, −0.625 V; MSB/LSB labelling), C 398 (fan-in is the number of gate inputs).

| # | Lesson id | Title | PYQs | Time |
|---|---|---|---|---|
| 1 | `dl-07-01-memory-devices` | Semiconductor memory organisation | 0 | 25 min |
| 2 | `dl-07-02-data-converters` | DAC and ADC basics | 0 | 25 min |
| 3 | `dl-07-03-logic-families` | Logic families and switch-level circuits | 4 | 30 min |

Files: `01-memory-devices.md` (`memory-devices`), `02-data-converters.md` (`data-converters`),
`03-logic-families.md` (`logic-families`). Practice ids `nx-dl-07-NN-qMM` (8 per lesson; MCQ keys spread).

**Key audit:** `cse-1991-a-1-i` ($f = \bar a b x + a \bar b y$: x passes through PMOS(a) and NMOS(b), so
when $a = 0, b = 1$; y through NMOS(a) and PMOS(b), so when $a = 1, b = 0$; otherwise f floats — say so),
`cse-1991-a-3-i` (A: lower static power; CMOS is not faster than nMOS, is larger and needs more masks),
`cse-1994-a-3-10` ((i)–(c), (ii)–(a), (iii)–(d), (iv)–(b)), `cse-1998-a-15` (key D; scan `GATE1998.pdf`
p. 2 Q15 matches the bank. Standard TTL $V_{IH} = 2.0$ V, so no option states the threshold itself; D is the
only option that describes voltages that are all valid logic 1s (2.8 V to $V_{CC}$, inside 2.0–5.0 V): A is
unbounded above $V_{CC}$, B and C include logic-0 and undefined levels. Teach the real numbers and this
reading; the flag is cleared through `src/gate/fixes/cse-1998.json`).

## Lesson 1 · `dl-07-01-memory-devices` (0 PYQs)
Radar (no PYQs; why it still matters: COA memory questions use the same arithmetic). Intuition (a library:
shelves = words, slots per shelf = bits). Sequence: memory vocabulary (word, address, capacity 2ᵏ × m; ROM,
PROM, EPROM, EEPROM, flash, SRAM, DRAM; volatile vs not; refresh) `#memory-types`; chip organisation
(address decoder + cell array; 2-D decoding: row and column decoders, √ splitting) `#chip-organisation`
with a theorem on address lines k = log₂(words) and the 2-D decoder saving + proof; SRAM cell (two
cross-coupled inverters = Chapter 6 latch) vs DRAM cell (capacitor, refresh) `#sram-dram` (erratum C 392:
SRAM needs no refresh); expansion `#word-expansion` (more bits per word: chips side by side, same address
lines) and `#capacity-expansion` (more words: a decoder on the high address bits drives chip selects)
with a derivation of the chip count (W/w)·(M/m) and the decoder size; address maps `#address-map`; link to
COA. Worked examples (≥ 4 + 4): address lines and data lines of a chip; 8K×8 from 1K×4; 64K×16 from 16K×8
with the decoder; edge case: a non-power-of-two layout (24K from 8K chips, a partly used decoder); address
ranges of each chip; which chip holds a given address; edge case: incomplete decoding (aliasing).
Viz: `chip-array-expansion` (animate: chips added in rows and columns, the decoder selecting a row for a
given address). Lab: none (the Converter Bench is in lesson 2). Practice: 8.

## Lesson 2 · `dl-07-02-data-converters` (0 PYQs)
Radar. Intuition (a staircase and a guessing game). DAC: definition, resolution, full scale, step size
`#dac-basics`; weighted-resistor DAC `#weighted-dac` (derivation, why resistor spread is a problem); R-2R
ladder `#r2r` (theorem: every node sees R looking right, so the current halves at each node; proof by
induction from the end; output $V_o = -V_{ref}\,\frac{R_f}{R} \sum b_i 2^{i-n}$ with the stated convention;
erratum C 397 numbers: 2.5 mA and −0.625 V); ADCs `#adc-basics` (quantisation, LSB, error ±½ LSB);
flash `#flash-adc` (2ⁿ − 1 comparators), counter/ramp `#counter-adc` (up to 2ⁿ − 1 clocks), successive
approximation `#sar-adc` (n clocks, binary search; theorem + proof that n steps give the floor code),
dual-slope (brief, deep). Worked examples: DAC outputs (≥ 4), ADC codes and conversion times (≥ 4), SAR
traces (≥ 4). Viz: `sar-binary-search` (animate), `r2r-ladder-currents` (animate). Lab:
`:::lab{lab="converter-bench" tab="sar"}` and `tab="dac"`. Practice: 8.

## Lesson 3 · `dl-07-03-logic-families` (4 PYQs: cse-1991-a-1-i, cse-1991-a-3-i, cse-1994-a-3-10, cse-1998-a-15)
Radar. Intuition (MOS transistor as a voltage-controlled switch; NMOS passes strong 0, PMOS strong 1).
Sequence: switch model `#mos-switch` (NMOS on when gate = 1, PMOS on when gate = 0; strong/weak levels);
pass-transistor networks `#pass-transistor` (series = AND of conditions, parallel = OR; floating output
when no path — the 1991 network) and transmission gates `#transmission-gate`; CMOS inverter and gates
`#cmos-gates` (complementary pull-up/pull-down, series NMOS ↔ parallel PMOS; theorem: the two networks are
duals so exactly one conducts for every input, hence no static current + proof); why NAND is preferred
over NOR `#nand-vs-nor` (erratum X4); voltage levels and noise margins `#noise-margins` (V_OH, V_OL, V_IH,
V_IL; NM_H, NM_L; TTL 2.4/0.4/2.0/0.8; CMOS) with the 1998 trap `#trap-ttl-threshold`; fan-out and fan-in
`#fan-out` (erratum C 398); power and speed `#power-speed` (static vs dynamic power, P = C V² f,
power-delay product); family comparison `#families` (TTL, ECL, CMOS, nMOS, GaAs: bipolar vs unipolar,
speed, power, density; the 1994 match; the 1991 CMOS vs nMOS MSQ `#cmos-vs-nmos`); unused inputs (brief).
Worked examples: switch networks (≥ 4 incl. the 1991 pattern and an edge case with a floating output),
CMOS gate design (≥ 4), noise margins / fan-out / power (≥ 4). Viz: `cmos-inverter-switch` (animate),
`pass-transistor-paths` (animate: the 1991 network for each (a, b)). Lab: none. Practice: 8.

PYQ → block map: cse-1991-a-1-i → `pass-transistor`, `mos-switch`; cse-1991-a-3-i → `cmos-vs-nmos`,
`power-speed`; cse-1994-a-3-10 → `families`; cse-1998-a-15 → `noise-margins`, `trap-ttl-threshold`.
