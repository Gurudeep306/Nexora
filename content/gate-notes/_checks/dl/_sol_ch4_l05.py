"""Teacher-style v2 solutions for the PYQs of Digital Logic Chapter 4, Lesson 5 (ROM, PLA and PAL).

Merged by _sol_ch4.py; every number is recomputed from comblib.multiplier_rom in l4_05_rom_pla.py.
The animations are small tables built from comblib, so no size can drift from the check.
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import comblib as cl  # noqa: E402
from _sol_ch1_fp import opt  # noqa: E402

SOLUTIONS = {}


def size_table(n, title):
    """A table frame: the count of address bits, words, width and total for an n × n multiplier ROM."""
    words, width, total = cl.multiplier_rom(n)
    return {
        "kind": "table",
        "title": title,
        "cols": ["Quantity", "Count", "Why"],
        "rows": [
            ["Address bits", 2 * n, f"{n} + {n} (both operands)"],
            ["Words", words, f"2^{2 * n}"],
            ["Bits per word", width, f"largest product {(2 ** n - 1) ** 2} has {width} bits"],
            ["Total bits", total, f"{words} × {width}"],
        ],
        "reveal": 0,
    }


def sample_rows(n):
    """A few rows of an n × n multiplier ROM: address A B and the stored product."""
    out = []
    for a, b in ((0, 0), (1, 1), (3, 5), (2 ** n - 1, 2 ** n - 1)):
        out.append([format(a, f"0{n}b"), format(b, f"0{n}b"), format(a * b, f"0{2 * n}b"), a * b])
    return out


# ── 1993: M and N ──────────────────────────────────────────────────────────
w4, b4, t4 = cl.multiplier_rom(4)
SOLUTIONS["cse-1993-ii-a-6-6"] = {
    "approach": "Concept tested: **sizing a ROM that stores a multiplication table**. The address is both 4-bit operands together, and each word holds the full product, whose width is the bit-length of the largest product.",
    "concepts": ["ROM sizing", "Multiplier ROM", "Product width"],
    "given": "A ROM holds the truth table of a unit that multiplies two 4-bit numbers. Find $M$ (words) and $N$ (bits per word).",
    "steps": [
        {"title": "The address is both operands", "body": "A truth table needs one row for every input combination. The inputs are $A_3A_2A_1A_0$ and $B_3B_2B_1B_0$: 8 bits in all, so the ROM address has 8 bits and the ROM has $2^8 = 256$ words. A ROM addressed by only one operand (16 words) could not tell $3 \\times 5$ from $3 \\times 7$.", "scene": {"reveal": 6}},
        {"title": "The width is the largest product", "body": "Each word stores the product. The largest is $15 \\times 15 = 225 = 11100001_2$, which needs 8 bits, and no product can need more because $(2^4 - 1)^2 < 2^8$. So every word is 8 bits wide: the product of two $n$-bit numbers needs exactly $2n$ bits.", "scene": {"reveal": 9, "hl": [{"r": 2, "c": 1, "tone": "accent"}]}},
        {"title": "Read off M and N", "body": "$M = 2^8 = 256$ words and $N = 8$ bits, a $256 \\times 8$ ROM holding $256 \\times 8 = 2048$ bits.", "scene": {"reveal": 12, "hl": [{"r": 1, "c": 1, "tone": "success"}, {"r": 2, "c": 1, "tone": "success"}]}},
    ],
    "answer": {"value": "$M = 256$, $N = 8$ (a $256 \\times 8$ ROM, 2048 bits)", "matchesKey": True},
    "shortcut": "For an $n$-bit × $n$-bit multiplier: $2^{2n}$ words of $2n$ bits. With $n = 4$: $2^8 \\times 8$.",
    "pitfalls": [
        "Using one operand as the address: 16 words is far too few, since the ROM must hold a row for every pair of operands.",
        "Giving the word the operand width (4 bits): products up to 225 need 8 bits.",
        "Answering $2n + 1 = 9$ bits by analogy with addition: a product never reaches $2^{2n}$."
    ],
    "verification": "Rows of the stored table: address $0000\\,0000 \\to 00000000$, $0011\\,0101 \\to 00001111$ (3 × 5 = 15), $1111\\,1111 \\to 11100001$ (225). 256 addresses, 8-bit words.",
    "animation": size_table(4, "A ROM for a 4-bit × 4-bit multiplier"),
}

# ── 1996: 8-bit × 8-bit, words × bits ──────────────────────────────────────
SOLUTIONS["cse-1996-a-21"] = {
    "approach": "Concept tested: **multiplier ROM size and the product-width theorem**. Both 8-bit operands form a 16-bit address, and the product of two 8-bit numbers needs exactly 16 bits.",
    "concepts": ["ROM sizing", "Multiplier ROM", "Product width"],
    "given": "A ROM stores the multiplication table of two 8-bit unsigned integers.",
    "steps": [
        {"title": "Words", "body": "The ROM must hold a word for every pair $(A, B)$: $8 + 8 = 16$ address bits, so $2^{16} = 65536 = 64\\text{K}$ words (with $1\\text{K} = 1024$).", "scene": {"reveal": 6}},
        {"title": "Width", "body": "The largest product is $255 \\times 255 = 65025$. Since $2^{15} = 32768 \\le 65025 < 65536 = 2^{16}$, it needs exactly 16 bits. In general $(2^n - 1)^2 < 2^{2n}$ (so $2n$ bits suffice) and $(2^n - 1)^2 \\ge 2^{2n-1}$ for $n \\ge 2$ (so $2n - 1$ do not).", "scene": {"reveal": 9, "hl": [{"r": 2, "c": 1, "tone": "accent"}]}},
        {"title": "Size", "body": "$64\\text{K} \\times 16$, which is $2^{20}$ bits = 1 Mbit.", "scene": {"reveal": 12, "hl": [{"r": 1, "c": 1, "tone": "success"}, {"r": 2, "c": 1, "tone": "success"}]}},
    ],
    "answer": {"value": "(D) $64\\text{K} \\times 16$", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$256 \\times 16$ has only 8 address bits, enough for one 8-bit operand; the ROM must be addressed by both operands (16 bits)."),
        opt("B", False, "$64\\text{K} \\times 8$ has the right number of words but 8-bit words keep only the low byte of each product; $16 \\times 16 = 256$ would read as 0."),
        opt("C", False, "$4\\text{K} \\times 16$ has 12 address bits, four short of the 16 the two operands need, so many pairs would share a word."),
        opt("D", True, "16 address bits ($2^{16} = 64\\text{K}$ words) and a 16-bit product."),
    ],
    "shortcut": "Words $= 2^{\\text{total operand bits}}$, width = sum of the operand widths: $2^{8+8} \\times (8 + 8)$.",
    "pitfalls": [
        "Treating the word as operand-sized (8 bits): option B.",
        "Addressing with one operand: option A.",
        "Reading 64K as 64 000; it is $2^{16} = 65536$."
    ],
    "verification": "$255^2 = 65025 = 1111111000000001_2$: 16 digits. Capacity $2^{16} \\cdot 16 = 2^{20}$ bits.",
    "animation": size_table(8, "A ROM for an 8-bit × 8-bit multiplier"),
}

# ── IT 2004: the same, minimum size ────────────────────────────────────────
SOLUTIONS["it-2004-it-10"] = {
    "approach": "Concept tested: **the minimum ROM for a multiplier table**. Count the address bits (both operands) and the product bits; the minimum is exactly $2^{16}$ words of 16 bits, no more and no less.",
    "concepts": ["ROM sizing", "Multiplier ROM", "Product width"],
    "given": "Store the complete truth table of an 8-bit × 8-bit multiplier in the smallest ROM.",
    "steps": [
        {"title": "Address bits", "body": "The truth table has a row for each pair of 8-bit operands: $2^{8} \\cdot 2^{8} = 2^{16}$ rows, so 16 address bits and $64\\text{K}$ words. Fewer words (say $32\\text{K} = 2^{15}$) would leave one input bit unconnected, so two different rows would share a word.", "scene": {"reveal": 6}},
        {"title": "Product bits", "body": "The largest product is $255^2 = 65025$; since $2^{15} \\le 65025 < 2^{16}$ it needs exactly 16 bits, and no product needs more. 32-bit words would store 16 bits that are always 0.", "scene": {"reveal": 9, "hl": [{"r": 2, "c": 1, "tone": "accent"}]}},
        {"title": "Minimum size", "body": "$64\\text{K} \\times 16$ bits. It is the minimum because both counts are forced: every row needs its own word, and every one of the 16 product bits is 1 for some pair and 0 for another (none is constant), and none is a copy of an input bit, so no column can be wired instead of stored.", "scene": {"reveal": 12, "hl": [{"r": 1, "c": 1, "tone": "success"}, {"r": 2, "c": 1, "tone": "success"}]}},
    ],
    "answer": {"value": "(B) $64\\text{K} \\times 16$ bits", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$32\\text{K} = 2^{15}$ words gives 15 address bits; the two operands have 16."),
        opt("B", True, "$2^{16}$ words (both operands) of 16 bits (the largest product, 65025, needs 16)."),
        opt("C", False, "$16\\text{K} \\times 32$: only 14 address bits, and 32-bit words are twice the product width. It also has only a quarter of the 64K words needed."),
        opt("D", False, "$64\\text{K} \\times 32$ works but is not minimum: the upper 16 bits of every word would always be 0."),
    ],
    "shortcut": "$n \\times n$ multiplier: $2^{2n} \\times 2n$. Here $2^{16} \\times 16 = 64\\text{K} \\times 16$.",
    "pitfalls": [
        "Doubling the width twice (32 bits): the product of two 8-bit numbers is 16 bits, not 32.",
        "Taking $2^{15}$ words because the largest product is below $2^{16}$: that confuses the address (inputs) with the data (outputs)."
    ],
    "verification": "Total $2^{16} \\cdot 16 = 2^{20}$ bits = 1 Mbit; option D would be 2 Mbit with half of it constant 0.",
    "animation": size_table(8, "Minimum ROM for an 8-bit × 8-bit multiplier"),
}

# ── 2012: total bits ───────────────────────────────────────────────────────
SOLUTIONS["cse-2012-cs-19"] = {
    "approach": "Concept tested: **ROM capacity in bits**. A 4-bit multiplier ROM is $256 \\times 8$; the question asks for the amount of ROM, so multiply and convert with $1\\text{K} = 1024$.",
    "concepts": ["ROM sizing", "Multiplier ROM", "Bits vs words"],
    "given": "A ROM implements a 4-bit (× 4-bit) multiplier. Find the number of bits.",
    "steps": [
        {"title": "Words", "body": "The two 4-bit operands form an 8-bit address: $2^8 = 256$ words.", "scene": {"reveal": 6}},
        {"title": "Width", "body": "The largest product, $15 \\times 15 = 225$, needs 8 bits, so each word is 8 bits.", "scene": {"reveal": 9, "hl": [{"r": 2, "c": 1, "tone": "accent"}]}},
        {"title": "Amount in bits", "body": "$256 \\times 8 = 2048$ bits $= 2 \\times 1024$ bits $= 2$ Kbits.", "scene": {"reveal": 12, "hl": [{"r": 3, "c": 1, "tone": "success"}]}},
    ],
    "answer": {"value": "(D) 2 Kbits", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "64 bits $= 8 \\times 8$: it takes 8 (the address width) as the number of words."),
        opt("B", False, "128 bits $= 16 \\times 8$: one 4-bit operand used as the address."),
        opt("C", False, "1 Kbit $= 256 \\times 4$: the product stored in 4 bits, losing its upper half."),
        opt("D", True, "$256 \\times 8 = 2048$ bits $= 2$ Kbits."),
    ],
    "shortcut": "$2^{2n} \\cdot 2n$ bits with $n = 4$: $2^8 \\cdot 8 = 2^{11}$ bits = 2 Kbits.",
    "pitfalls": [
        "Answering in words (256) when the question asks for the amount of ROM.",
        "Using $1\\text{K} = 1000$: 2048 bits is exactly 2 Kbits only because $1\\text{K} = 1024$."
    ],
    "verification": "$2^{11} = 2048$; the options are $2^6, 2^7, 2^{10}, 2^{11}$ bits, and only $2^{11}$ equals $2^{8}$ words × $2^{3}$ bits.",
    "animation": size_table(4, "Amount of ROM for a 4-bit multiplier"),
}

assert (w4, b4, t4) == (256, 8, 2048)
assert sample_rows(4)[3] == ["1111", "1111", "11100001", 225]
assert format(255 * 255, "b") == "1111111000000001"
