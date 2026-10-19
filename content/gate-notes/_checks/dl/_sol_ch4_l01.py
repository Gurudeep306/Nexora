"""Teacher-style v2 solutions for the PYQs of Digital Logic Chapter 4, Lesson 1 (half/full adders,
subtractors and ripple-carry adders). Merged by _sol_ch4.py; every key and answer text is re-derived
in l4_01_ripple.py (arithlib netlists, arrival times, the transport-delay simulation and the
pipeline model)."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import arithlib as al  # noqa: E402
from _sol_ch1_fp import opt  # noqa: E402

SOLUTIONS = {}

# ── cse-1999-a-41: half and full adders for a 16-bit adder (MSQ, key B) ─────
SOLUTIONS["cse-1999-a-41"] = {
    "approach": "Concept tested: **how many half and full adders an n-bit ripple adder needs**. Without a carry in, the least significant column adds only two bits (a half adder suffices) and every other column adds two bits plus a carry (a full adder).",
    "concepts": ["Half adder", "Full adder", "Ripple-carry adder"],
    "given": "Two 16-bit numbers are added (no carry in is mentioned).",
    "steps": [
        {"title": "Column 0", "body": "Bit 0 has no incoming carry: $a_0 + b_0$ is a two-bit sum, exactly a **half adder** ($S = a_0 \\oplus b_0$, $C = a_0b_0$)."},
        {"title": "Columns 1 to 15", "body": "Each of the other 15 columns adds $a_i$, $b_i$ and the carry $c_i$ from the column below: three bits, so a **full adder**."},
        {"title": "Total", "body": "1 half adder + 15 full adders. Only option B lists that."},
    ],
    "answer": {"value": "B: 1 half adder and 15 full adders", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "8 + 8 has the right total of 16 cells, but 8 half adders could serve only columns that never receive a carry; only column 0 is like that."),
        opt("B", True, "Column 0 needs only a half adder; columns 1–15 each add a carry, so 15 full adders."),
        opt("C", False, "A half adder has no carry input, so 16 half adders alone cannot pass carries between columns (it would need extra OR gates, i.e. full adders in disguise)."),
        opt("D", False, "4 half adders would leave columns 1–3 unable to accept their carries."),
    ],
    "shortcut": "n-bit adder without carry in: 1 HA + (n − 1) FA. With a carry in: n FA.",
    "pitfalls": [
        "Answering 16 full adders: correct only if a carry in $c_0$ must be added.",
        "Thinking half adders alone can do it: two half adders make a full adder only with an extra OR gate.",
    ],
    "verification": "l4_01_ripple.py builds the adder as one half adder plus 15 full adders and checks it against integer addition on 3000 random 16-bit pairs (and exhaustively at 4 bits).",
}

# ── cse-2002-b-56-a: the pipelined adder's outputs (DESC) ───────────────────
Z = al.pipeline_2002([6, 3, 7, 5, 0, 0, 0, 0], [5, 5, 3, 6, 0, 0, 0, 0])
ROWS = []
R0 = R1 = R2 = None
for k, (a, b) in enumerate(zip([6, 3, 7, 5, 0, 0, 0, 0], [5, 5, 3, 6, 0, 0, 0, 0]), 1):
    R2, R1, R0 = R1, R0, (a, b)
    ROWS.append([str(k), f"{a:03b}+{b:03b}", f"{R1[0]:03b}+{R1[1]:03b}" if R1 else "0", f"{R2[0]:03b}+{R2[1]:03b}" if R2 else "0", Z[k - 1]])

SOLUTIONS["cse-2002-b-56-a"] = {
    "approach": "Concept tested: **a pipelined ripple adder traced clock by clock**. Each register stage holds one operand pair; full adder $i$ adds bit $i$ using the carry saved by the stage before. A pair entering R0 at clock $k$ reaches R2 at clock $k + 2$, and $Z$ (read from R2 and the last full adder) is its sum.",
    "concepts": ["Pipelined adder", "Full adder", "Latency", "Throughput"],
    "given": "R0 ← $(A, B)$; FA0 adds $a_0 + b_0$; R1 ← $a_2 a_1 b_2 b_1$, $s_0$, $c_1$; FA1 adds $a_1 + b_1 + c_1$; R2 ← $a_2 b_2$, $s_0$, $s_1$, $c_2$; FA2 adds $a_2 + b_2 + c_2$ giving $z_3 z_2$; $z_1 z_0 = s_1 s_0$ from R2. All registers load on the same falling edge; initially all 0.",
    "steps": [
        {"title": "Clock 1", "body": "R0 ← 110, 101. R1 and R2 still hold zeros (they load the old contents of R0 and R1, which were 0), so $Z = 0000$."},
        {"title": "Clock 2", "body": "R1 ← the first pair with $s_0 = 0 \\oplus 1 = 1$ and $c_1 = 0$; R0 ← 011, 101; R2 still holds zeros: $Z = 0000$."},
        {"title": "Clock 3", "body": "R2 ← the first pair with $s_0 = 1$, $s_1 = 1 \\oplus 0 \\oplus 0 = 1$, $c_2 = 0$; FA2: $1 + 1 + 0 = 10$, so $z_3 z_2 = 10$. $Z = 1011 = 11 = 6 + 5$."},
        {"title": "Clocks 4–6", "body": "Each clock one more pair reaches R2: $3 + 5 = 8 = 1000$, $7 + 3 = 10 = 1010$, $5 + 6 = 11 = 1011$."},
        {"title": "Clocks 7–8", "body": "The pairs entered at clocks 5 and 6 are 000 + 000, so $Z = 0000$, $0000$."},
    ],
    "answer": {"value": "Z after clocks 1 … 8: 0000, 0000, 1011, 1000, 1010, 1011, 0000, 0000", "matchesKey": True},
    "shortcut": "Latency 3: the output after clock $k$ is the sum of the inputs applied at clock $k - 2$ (zeros before that). So write the four sums 11, 8, 10, 11 shifted right by two clocks.",
    "pitfalls": [
        "Showing 1011 already after clock 1: the pair needs three register loads before $Z$ shows its full sum.",
        "Mixing bits of different pairs: $z_0$ and $z_1$ of a result travel with it through R1 and R2.",
        "Forgetting that 7 + 3 = 10 needs the carries $c_1 = 1$, $c_2 = 1$ saved in the registers.",
    ],
    "verification": "l4_01_ripple.py simulates the three registers and full adders clock by clock (arithlib.pipeline_2002) and checks every Z against the sum of the pair applied two clocks earlier.",
    "animation": {"kind": "table", "title": "Register contents after each clock", "cols": ["clock", "R0", "R1", "R2", "Z"], "rows": ROWS, "mono": True},
}

# ── cse-2002-b-56-b: what the circuit implements (DESC) ─────────────────────
SOLUTIONS["cse-2002-b-56-b"] = {
    "approach": "Concept tested: **recognising a pipelined adder**: full adders separated by registers, each stage adding one bit position and passing its carry and the unused operand bits to the next stage.",
    "concepts": ["Pipelined adder", "Ripple-carry adder", "Registers"],
    "given": "The circuit of part (a): three registers R0, R1, R2 and three full adders, one per bit position, with the carry of each stage stored in the next register.",
    "steps": [
        {"title": "Remove the registers", "body": "Without R1 and R2, the three full adders are chained carry-out to carry-in: a 3-bit **ripple-carry adder** producing a 4-bit sum $z_3 z_2 z_1 z_0$."},
        {"title": "Put the registers back", "body": "The registers cut the carry chain into three stages, one full adder each, and carry the high operand bits and the low sum bits along so that all bits of one result stay together."},
        {"title": "Behaviour", "body": "Part (a) showed latency 3 clocks and then one new sum per clock. That is a **3-stage pipelined 3-bit adder**: the same additions as a ripple adder, overlapped."},
    ],
    "answer": {"value": "A 3-bit binary adder, pipelined in three stages (one full adder per stage): $Z = A + B$ with a latency of 3 clocks and one result per clock", "matchesKey": True},
    "pitfalls": [
        "Calling it a serial adder: a serial adder reuses one full adder on bits of one number over time; here three full adders work on three different pairs at once.",
        "Calling it a carry-save or look-ahead adder: the carry still ripples, just one stage per clock.",
    ],
    "verification": "Part (a)'s trace: every Z equals the sum of the pair applied two clocks earlier (l4_01_ripple.py).",
}

# ── cse-2015-2-cs-48: 4-bit ripple adder delay (NAT, key 19.2) ───────────────
t = al.arrival(al.rca(4), al.inputs_of(4), {"XOR": 2, "AND": 1, "OR": 1})
GATE_LEVEL = round(max(t["c4"], max(t[f"s{i}"] for i in range(4))) * 1.2, 2)
assert GATE_LEVEL == 12.0

SOLUTIONS["cse-2015-2-cs-48"] = {
    "approach": "Concept tested: **the delay of a ripple-carry adder under the block model**. The full adder's internals are given only to work out its delay (4.8 µs); the 4-bit adder is then \"four full adders\" in a chain, each counted at its full delay.",
    "concepts": ["Full adder from half adders", "Ripple-carry adder", "Propagation delay", "Delay models"],
    "given": "XOR delay $= 2 \\times$ AND/OR delay $= 2.4$ µs; AND/OR $= 1.2$ µs. Half adder = XOR + AND; full adder = 2 half adders + OR. 4-bit ripple adder of four full adders.",
    "steps": [
        {"title": "Delay of one full adder", "body": "Sum path: XOR (HA1) then XOR (HA2) $= 2.4 + 2.4 = 4.8$ µs. Carry path: XOR (HA1) → AND (HA2) → OR $= 2.4 + 1.2 + 1.2 = 4.8$ µs. So $t_{FA} = 4.8$ µs."},
        {"title": "Block model (the official key)", "body": "Each full adder is treated as one box that completes in 4.8 µs, and stage $i$ starts when stage $i - 1$ is complete: $4 \\times 4.8 = 19.2$ µs."},
        {"title": "What a gate-level count gives", "body": "Inside the chain the carry in of a stage reaches its carry out through only AND + OR $= 2.4$ µs (the stage's XOR of $a_i, b_i$ was done in parallel). So $c_4 = 4.8 + 3 \\times 2.4 = 12$ µs, and $s_3 = c_3 + 2.4 = 9.6 + 2.4 = 12$ µs."},
        {"title": "Which to answer", "body": "The official answer is 19.2, the block model. The question invites it by describing the adder as \"implemented by using four full adders\" after giving the full adder's delay. Answer 19.2; know that 12 is the true critical path."},
    ],
    "answer": {"value": "19.2 µs (four full adders of 4.8 µs each)", "number": 19.2, "matchesKey": True,
               "keyNote": "The key uses the block model (each full adder contributes its full 4.8 µs). A gate-level critical path gives 4.8 + 3 × 2.4 = 12 µs; the lesson teaches both."},
    "shortcut": "$t_{FA} = \\max(2t_{XOR},\\; t_{XOR} + t_{AND} + t_{OR}) = 4.8$; block model: $n \\cdot t_{FA} = 19.2$.",
    "pitfalls": [
        "Using the 1.2 µs gate delay for the XORs too (forgetting XOR = 2 × AND): 3.6 µs per full adder.",
        "Mixing the models: e.g. $4 \\times 2.4 = 9.6$ (carry path only, even for stage 0).",
        "Answering 12 here: correct gate-level timing, but not the key for this question.",
    ],
    "verification": "l4_01_ripple.py computes the static arrival times of the 4-bit netlist with XOR = 2, AND = OR = 1 (units of 1.2 µs): $c_4$ and $s_3$ at 10 units = 12 µs, and the full adder's slowest output at 4 units = 4.8 µs, so the block model gives 19.2.",
    "animation": {"kind": "gantt", "title": "Block model: four full adders of 4.8 µs",
                  "lanes": [{"label": f"FA{i}", "bars": [{"start": round(4.8 * i, 1), "end": round(4.8 * (i + 1), 1), "label": "4.8", "tone": "accent" if i == 3 else "default"}]} for i in range(4)],
                  "marks": [{"t": 12.0, "label": "gate level 12", "tone": "info"}, {"t": 19.2, "label": "block 19.2", "tone": "success"}]},
}

# ── cse-2016-2-cs-7: the slowest B with A = 1 (NAT, key −1) ─────────────────
SOLUTIONS["cse-2016-2-cs-7"] = {
    "approach": "Concept tested: **the longest carry chain of a ripple-carry adder**. The sum takes longest to settle when a carry generated in the lowest column propagates through every column above it.",
    "concepts": ["Ripple-carry adder", "Carry propagation", "Two's complement"],
    "given": "8-bit ripple-carry adder, two's-complement operands, $A = 1 = 0000\\,0001$.",
    "steps": [
        {"title": "Where can a carry start?", "body": "A column generates a carry only if both its bits are 1. $A$ has a 1 only in bit 0, so only column 0 can generate: that needs $b_0 = 1$."},
        {"title": "How far can it travel?", "body": "Column $k \\ge 1$ has $a_k = 0$; it propagates the carry iff $b_k = 1$ (0 + 1 + carry = 10) and kills it iff $b_k = 0$. To reach the top every $b_k$ must be 1."},
        {"title": "Read B", "body": "$B = 1111\\,1111$, which is $-1$ in 8-bit two's complement. Then $A + B = 0$: every sum bit first shows $a_k \\oplus b_k = 1$ and flips to 0 only when the carry arrives."},
    ],
    "answer": {"value": "−1", "number": -1, "matchesKey": True},
    "shortcut": "Slowest partner of $A$: generate at the lowest 1 of $A$, then propagate everywhere above, i.e. $b_k = \\bar a_k$ above it. For $A = 1$: all ones $= -1$.",
    "pitfalls": [
        "Answering 255: the operands are two's complement, so the pattern 1111 1111 is $-1$.",
        "Answering $-128$ or 127: 127 = 0111 1111 stops the chain at bit 7; $-128$ = 1000 0000 has $b_0 = 0$, so no carry is generated at all.",
    ],
    "verification": "l4_01_ripple.py runs the transport-delay simulation of the 8-bit netlist for all 256 values of B (from all-zero inputs): B = −1 alone settles last (carry out at 16 gate delays).",
}
