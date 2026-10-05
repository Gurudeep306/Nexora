import { trace } from '../../../engine/tracer'
import type { Algorithm, Scalar } from '../../../engine/types'
import { list, rarr, rint } from '../../../algorithms/util'

/* Complexity topic — animations, part 4: amortized analysis (counter, multipop, potential), hidden machine costs, and exponential / pseudo-polynomial algorithms. */

const r2 = (x: number) => Math.round(x * 100) / 100

/* ───────────────────────── 1. Binary counter ───────────────────────── */

export const cxBinaryCounter: Algorithm = {
  id: 'cx-binary-counter',
  title: 'Binary counter — one increment can flip k bits, n increments flip < 2n',
  blurb: 'Bit i flips once every 2ⁱ increments. With potential Φ = number of 1s, every increment costs exactly 2 amortized.',
  legend: { removed: '1 → 0 (carry)', write: '0 → 1', active: 'bits examined', new: 'this increment' },
  inputs: [
    { name: 'm', label: 'Increments', type: 'number', default: '12', min: 1, max: 40 },
    { name: 'k', label: 'Bits', type: 'number', default: '5', min: 2, max: 8 },
  ],
  random: () => ({ m: String(rint(8, 20)), k: String(rint(4, 6)) }),
  code: {
    pseudo: `
function increment(A)          // A[0] is the lowest bit
  i ← 0
  while i < k and A[i] = 1     // a carry ripples left
    A[i] ← 0; i ← i + 1        // @reset
  if i < k: A[i] ← 1           // @set
// actual cost = t + 1 flips; ΔΦ = 1 − t; amortized = 2   @inc
// n increments: < 2n flips in total                     @done`,
    cpp: `
int increment(vector<int>& A) {           // returns the number of bit flips
    int i = 0, flips = 0;                                   // @inc
    while (i < (int)A.size() && A[i] == 1) { A[i] = 0; i++; flips++; }   // @reset
    if (i < (int)A.size()) { A[i] = 1; flips++; }           // @set
    return flips;
}
// total over n calls < 2n                                  @done`,
    java: `
static int increment(int[] A) {
    int i = 0, flips = 0;                                   // @inc
    while (i < A.length && A[i] == 1) { A[i] = 0; i++; flips++; }   // @reset
    if (i < A.length) { A[i] = 1; flips++; }                // @set
    return flips;
}
// total over n calls < 2n                                  @done`,
    python: `
def increment(A):
    i = flips = 0                          # @inc
    while i < len(A) and A[i] == 1:        # @reset
        A[i] = 0; i += 1; flips += 1
    if i < len(A):                         # @set
        A[i] = 1; flips += 1
    return flips
# total over n calls < 2n                  @done`,
    js: `
function increment(A) {
  let i = 0, flips = 0;                                     // @inc
  while (i < A.length && A[i] === 1) { A[i] = 0; i++; flips++; }   // @reset
  if (i < A.length) { A[i] = 1; flips++; }                  // @set
  return flips;
}
// total over n calls < 2n                                  @done`,
    c: `
int increment(int *A, int k) {
    int i = 0, flips = 0;                                   // @inc
    while (i < k && A[i] == 1) { A[i] = 0; i++; flips++; }  // @reset
    if (i < k) { A[i] = 1; flips++; }                       // @set
    return flips;
}
/* total over n calls < 2n */                               // @done`,
  },
  run: ({ m, k }) =>
    trace((t) => {
      const M = Math.floor(m as number)
      const K = Math.floor(k as number)
      // draw the highest bit on the left, like a number is written
      const bits = t.array('bits', Array(K).fill(0), { label: 'counter bits — the index under each box is the bit number (bit 0 = lowest, worth 1)' })
      const pos = (i: number) => i
      const costs = t.array('cost', [], { label: 'flips per increment', bars: true, capacity: M })
      const tot = t.meter('flips', 'Total flips', [
        { label: 'n', value: M },
        { label: '2n', value: 2 * M },
        { label: 'n·k (naive bound)', value: M * K },
      ])
      const A = Array(K).fill(0)
      let ones = 0
      t.step('inc', `A ${K}-bit counter at 0. The naive bound says each increment flips up to k = ${K} bits, so n increments cost O(nk). Watch how rarely the high bits move.`, { value: 0, 'Φ = #1s': 0 })
      for (let x = 1; x <= M; x++) {
        let i = 0
        let flips = 0
        const phiBefore = ones
        bits.clear()
        t.step('inc', `Increment #${x}.`, { value: x - 1, 'Φ = #1s': ones })
        while (i < K && A[i] === 1) {
          A[i] = 0
          bits.set(pos(i), 0)
          bits.role(pos(i), 'removed')
          ones--
          flips++
          tot.add(1)
          t.step('reset', `Bit ${i} is 1: flip it to 0 and carry. (${flips} flip${flips > 1 ? 's' : ''} so far.)`, { value: x - 1, 'Φ = #1s': ones })
          i++
        }
        if (i < K) {
          A[i] = 1
          bits.set(pos(i), 1)
          bits.role(pos(i), 'write')
          ones++
          flips++
          tot.add(1)
        }
        costs.push(flips)
        costs.clear().role(costs.length - 1, 'new')
        const dPhi = ones - phiBefore
        t.step('set', i < K ? `Bit ${i} is 0: set it to 1. Actual cost ${flips} = t + 1 with t = ${flips - 1} carries; ΔΦ = ${dPhi >= 0 ? '+' : ''}${dPhi}; amortized = ${flips} + (${dPhi}) = ${flips + dPhi}.` : `Overflow: every bit was 1 and is now 0 (the counter wrapped).`, { value: x % 2 ** K, 'Φ = #1s': ones, actual: flips, amortized: flips + dPhi })
      }
      bits.clear()
      tot.role = 'done'
      t.step('done', `${M} increments, ${tot.value} flips < 2n = ${2 * M}. Aggregate view: bit i flips ⌊n/2ⁱ⌋ times, and n + n/2 + n/4 + … < 2n. Potential view: each increment clears t ones and sets one, so cost (t + 1) + ΔΦ (1 − t) = 2.`, { flips: tot.value, 'per increment': r2(tot.value / M) })
    }),
}

/* ───────────────────────── 2. Multipop stack ───────────────────────── */

export const cxMultipop: Algorithm = {
  id: 'cx-multipop',
  title: 'Multipop stack — an O(n) operation that is O(1) amortized',
  blurb: 'Each element is pushed once and popped at most once, so all pops together never cost more than all pushes.',
  legend: { new: 'pushed', removed: 'popped', active: 'top' },
  inputs: [{ name: 'ops', label: 'Ops (P x push, O pop, M k multipop)', type: 'string', default: 'P4 P7 P1 P9 M2 P3 P8 P5 P6 O M10 P2' }],
  random: () => {
    const ops: string[] = []
    for (let i = 0; i < rint(8, 12); i++) {
      const r = Math.random()
      ops.push(r < 0.6 ? `P${rint(1, 9)}` : r < 0.75 ? 'O' : `M${rint(1, 5)}`)
    }
    return { ops: ops.join(' ') }
  },
  code: {
    pseudo: `
push(x):      S.push(x)                         // cost 1      @push
pop():        if S not empty: S.pop()           // cost 1      @pop
multipop(k):  while S not empty and k > 0       // cost min(k, |S|)
                S.pop(); k ← k − 1              // @multipop
// Φ = |S|: push 1 + 1 = 2, pop 1 − 1 = 0, multipop k' − k' = 0   @done`,
    cpp: `
void push(vector<int>& S, int x) { S.push_back(x); }               // @push
void pop(vector<int>& S) { if (!S.empty()) S.pop_back(); }         // @pop
void multipop(vector<int>& S, int k) {
    while (!S.empty() && k-- > 0) S.pop_back();                     // @multipop
}
// n operations cost ≤ 2n in total                                  @done`,
    java: `
static void push(Deque<Integer> S, int x) { S.push(x); }            // @push
static void pop(Deque<Integer> S) { if (!S.isEmpty()) S.pop(); }   // @pop
static void multipop(Deque<Integer> S, int k) {
    while (!S.isEmpty() && k-- > 0) S.pop();                        // @multipop
}
// n operations cost ≤ 2n in total                                  @done`,
    python: `
def push(S, x): S.append(x)                # @push
def pop(S):
    if S: S.pop()                          # @pop
def multipop(S, k):
    while S and k > 0:                     # @multipop
        S.pop(); k -= 1
# n operations cost <= 2n in total         @done`,
    js: `
const push = (S, x) => S.push(x);                                  // @push
const pop = (S) => { if (S.length) S.pop(); };                     // @pop
function multipop(S, k) {
  while (S.length && k-- > 0) S.pop();                             // @multipop
}
// n operations cost ≤ 2n in total                                 @done`,
    c: `
void push(int *S, int *top, int x) { S[(*top)++] = x; }            // @push
void pop(int *top) { if (*top > 0) (*top)--; }                     // @pop
void multipop(int *top, int k) {
    while (*top > 0 && k-- > 0) (*top)--;                          // @multipop
}
/* n operations cost <= 2n in total */                             // @done`,
  },
  run: ({ ops }) =>
    trace((t) => {
      const toks = String(ops).trim().split(/\s+/).filter(Boolean)
      if (!toks.length) throw new Error('Give some operations, e.g. P4 P7 M2.')
      const parsed = toks.map((tok) => {
        const c = tok[0].toUpperCase()
        const v = Number(tok.slice(1))
        if (c === 'P' && Number.isFinite(v) && tok.length > 1) return { c, v }
        if (c === 'O' && tok.length === 1) return { c, v: 1 }
        if (c === 'M' && Number.isInteger(v) && v >= 0) return { c, v }
        throw new Error(`Cannot read "${tok}": use P<x>, O or M<k>.`)
      })
      if (parsed.length > 20) throw new Error('At most 20 operations keep the animation readable.')
      const S = t.stack('s', 'stack')
      const costs = t.array('cost', [], { label: 'actual cost of each operation', bars: true, capacity: parsed.length })
      const tot = t.meter('tot', 'Total actual cost', [
        { label: 'operations', value: parsed.length },
        { label: '2 × operations', value: 2 * parsed.length },
      ])
      t.step('push', `${parsed.length} operations on an empty stack. A multipop can cost as much as the stack is tall, so the naive bound is O(n) per operation, O(n²) in total.`, { 'Φ = size': 0 })
      parsed.forEach((op, idx) => {
        let cost = 0
        const before = S.length
        if (op.c === 'P') {
          S.push(op.v)
          S.clear().role(S.length - 1, 'new')
          cost = 1
          tot.add(1)
          costs.push(1)
          costs.clear().role(costs.length - 1, 'new')
          t.step('push', `#${idx + 1} push ${op.v}: cost 1. Φ goes up by 1, so amortized 2 — one unit pays now, one is saved to pay for this element's pop later.`, { 'Φ = size': S.length, actual: 1, amortized: 2 })
        } else {
          const want = op.c === 'O' ? 1 : op.v
          const k = Math.min(want, before)
          for (let q = 0; q < k; q++) {
            S.clear().role(S.length - 1, 'removed')
            t.step(op.c === 'O' ? 'pop' : 'multipop', `#${idx + 1} ${op.c === 'O' ? 'pop' : `multipop ${want}`}: pop ${S.items[S.length - 1].v}.`, { 'Φ = size': S.length, popped: q })
            S.pop()
            cost++
            tot.add(1)
          }
          costs.push(cost)
          costs.clear().role(costs.length - 1, cost > 1 ? 'removed' : 'new')
          S.clear()
          if (S.length) S.role(S.length - 1, 'active')
          t.step(
            op.c === 'O' ? 'pop' : 'multipop',
            k === 0 ? `#${idx + 1}: the stack is empty — nothing to pop, cost 0.` : `#${idx + 1} cost ${cost}${cost > 1 ? ' — expensive!' : ''} But each popped element was pushed earlier and paid for its own pop: Φ fell by ${k}, so amortized ${cost} − ${k} = 0.`,
            { 'Φ = size': S.length, actual: cost, amortized: 0 },
          )
        }
      })
      tot.role = 'done'
      t.step('done', `Total ${tot.value} for ${parsed.length} operations — never above 2 × ${parsed.length}. Pops (single or multi) can remove only what pushes put in, so total pops ≤ total pushes ≤ n: O(n) for the whole sequence, O(1) amortized each.`, { total: tot.value })
    }),
}

/* ───────────────────────── 3. Dynamic array with grow AND shrink: the potential method ───────────────────────── */

export const cxDynPotential: Algorithm = {
  id: 'cx-dyn-potential',
  title: 'Dynamic array that grows and shrinks — the potential function at work',
  blurb: 'Double when full, halve when only a quarter full. Φ stores prepaid work; amortized cost = actual + ΔΦ ≤ 3.',
  legend: { new: 'pushed', removed: 'popped / expensive', write: 'copied', compare: 'amortized cost' },
  inputs: [{ name: 'ops', label: 'Ops (+ push, − pop)', type: 'string', default: '+ + + + + + + + + - - - - -' }],
  random: () => {
    const ops: string[] = []
    let size = 0
    for (let i = 0; i < rint(10, 15); i++) {
      const push = size === 0 || Math.random() < 0.6
      ops.push(push ? '+' : '-')
      size += push ? 1 : -1
    }
    return { ops: ops.join(' ') }
  },
  code: {
    pseudo: `
push(x): if size = cap: resize(2·cap)      // copy size items   @grow
         a[size] ← x; size ← size + 1      // @push
pop():   size ← size − 1                    // @pop
         if size = cap/4 and cap > 1: resize(cap/2)   // @shrink
// Φ = 2·size − cap   if size ≥ cap/2
//     cap/2 − size   otherwise   →  amortized ≤ 3     @done`,
    cpp: `
struct DynArray {
    int *a = new int[2]; int size = 0, cap = 2;
    void resize(int c) {
        int *b = new int[c];
        for (int i = 0; i < size; i++) b[i] = a[i];        // copies
        delete[] a; a = b; cap = c;
    }
    void push(int x) {
        if (size == cap) resize(2 * cap);                   // @grow
        a[size++] = x;                                      // @push
    }
    void pop() {
        size--;                                             // @pop
        if (cap > 2 && size == cap / 4) resize(cap / 2);    // @shrink
    }
};  // amortized O(1) per operation                         @done`,
    java: `
class DynArray {
    int[] a = new int[2]; int size = 0;
    void resize(int c) { a = Arrays.copyOf(a, c); }        // copies size items
    void push(int x) {
        if (size == a.length) resize(2 * a.length);         // @grow
        a[size++] = x;                                      // @push
    }
    void pop() {
        size--;                                             // @pop
        if (a.length > 2 && size == a.length / 4) resize(a.length / 2);   // @shrink
    }
}   // amortized O(1) per operation                         @done`,
    python: `
class DynArray:
    def __init__(self): self.a, self.size = [None] * 2, 0
    def resize(self, c):
        b = [None] * c
        b[:self.size] = self.a[:self.size]     # copies
        self.a = b
    def push(self, x):
        if self.size == len(self.a):
            self.resize(2 * len(self.a))       # @grow
        self.a[self.size] = x; self.size += 1  # @push
    def pop(self):
        self.size -= 1                         # @pop
        if len(self.a) > 2 and self.size == len(self.a) // 4:
            self.resize(len(self.a) // 2)      # @shrink
# amortized O(1) per operation                 @done`,
    js: `
class DynArray {
  constructor() { this.a = new Array(2); this.size = 0; }
  resize(c) { const b = new Array(c); for (let i = 0; i < this.size; i++) b[i] = this.a[i]; this.a = b; }
  push(x) {
    if (this.size === this.a.length) this.resize(2 * this.a.length);   // @grow
    this.a[this.size++] = x;                                         // @push
  }
  pop() {
    this.size--;                                                     // @pop
    if (this.a.length > 2 && this.size === this.a.length >> 2) this.resize(this.a.length >> 1);   // @shrink
  }
}   // amortized O(1) per operation                                  @done`,
    c: `
typedef struct { int *a; int size, cap; } DynArray;   /* start: a = malloc(2 * sizeof(int)), cap = 2 */
void resize(DynArray *d, int c) { d->a = realloc(d->a, c * sizeof(int)); d->cap = c; }   /* copies */
void push(DynArray *d, int x) {
    if (d->size == d->cap) resize(d, 2 * d->cap);            // @grow
    d->a[d->size++] = x;                                     // @push
}
void pop(DynArray *d) {
    d->size--;                                               // @pop
    if (d->cap > 2 && d->size == d->cap / 4) resize(d, d->cap / 2);   // @shrink
}
/* amortized O(1) per operation */                           // @done`,
  },
  run: ({ ops }) =>
    trace((t) => {
      const toks = String(ops).replace(/−/g, '-').trim().split(/\s+/).filter(Boolean)
      if (!toks.length || toks.some((x) => x !== '+' && x !== '-')) throw new Error('Use + for push and − (or -) for pop, separated by spaces.')
      if (toks.length > 15) throw new Error('At most 15 operations keep the animation readable.')
      let cap = 2
      let size = 0
      const phi = () => (2 * size >= cap ? 2 * size - cap : cap / 2 - size)
      const buf = t.array('buf', [], { label: 'buffer (capacity 2)', capacity: 2 })
      const act = t.array('act', [], { label: 'actual cost per operation', bars: true, capacity: toks.length })
      const amo = t.array('amo', [], { label: 'amortized cost = actual + ΔΦ', bars: true, capacity: toks.length })
      const meter = t.meter('phi', 'Potential Φ (prepaid work in the bank)', [{ label: 'cap', value: 2 }])
      const setPhi = () => {
        meter.value = phi()
        meter.marks = [{ label: 'cap', value: cap }]
      }
      setPhi()
      let next = 1
      t.step('push', 'Start: capacity 2, empty, Φ = 1. Φ = 2·size − cap when at least half full, cap/2 − size otherwise: it is 0 when the array is exactly half full (just after a resize) and grows as we drift toward the next resize.', { size, cap, 'Φ': phi() })
      toks.forEach((op, idx) => {
        const before = phi()
        let cost = 0
        if (op === '+') {
          if (size === cap) {
            cap *= 2
            buf.capacity = cap
            buf.opts.label = `buffer (capacity ${cap})`
            buf.clear()
            for (let q = 0; q < size; q++) buf.role(q, 'write')
            cost += size
            setPhi()
            t.step('grow', `#${idx + 1} push: full (${size}/${size}). Allocate ${cap} and copy ${size} items — cost ${size}. Φ before was ${before}: exactly enough prepaid work to cover the copies.`, { size, cap, 'Φ': phi() })
          }
          buf.push(next++)
          size++
          cost += 1
          buf.clear().role(size - 1, 'new')
          setPhi()
          act.push(cost)
          amo.push(cost + phi() - before)
          act.clear().role(act.length - 1, cost > 1 ? 'removed' : 'new')
          amo.clear().role(amo.length - 1, 'compare')
          t.step('push', `#${idx + 1} push: actual ${cost}, ΔΦ = ${phi() - before >= 0 ? '+' : ''}${phi() - before}, amortized ${cost + phi() - before}.`, { size, cap, 'Φ': phi() })
        } else {
          if (size === 0) {
            act.push(0)
            amo.push(0)
            t.step('pop', `#${idx + 1} pop on an empty array: nothing happens.`, { size, cap, 'Φ': phi() })
            return
          }
          buf.clear().role(size - 1, 'removed')
          t.step('pop', `#${idx + 1} pop: remove the last item (cost 1).`, { size, cap, 'Φ': phi() })
          buf.remove(size - 1)
          size--
          cost = 1
          if (cap > 2 && size === cap / 4) {
            cap /= 2
            buf.capacity = cap
            buf.opts.label = `buffer (capacity ${cap})`
            buf.clear()
            for (let q = 0; q < size; q++) buf.role(q, 'write')
            cost += size
            setPhi()
            t.step('shrink', `Only a quarter full (${size}/${cap * 2}): halve to ${cap} and copy ${size} item${size === 1 ? '' : 's'}. Shrinking at ¼ — not ½ — leaves room on both sides, so no sequence can force a resize every step.`, { size, cap, 'Φ': phi() })
          }
          buf.clear()
          setPhi()
          act.push(cost)
          amo.push(cost + phi() - before)
          act.clear().role(act.length - 1, cost > 1 ? 'removed' : 'new')
          amo.clear().role(amo.length - 1, 'compare')
          t.step('pop', `#${idx + 1} pop: actual ${cost}, ΔΦ = ${phi() - before >= 0 ? '+' : ''}${phi() - before}, amortized ${cost + phi() - before}.`, { size, cap, 'Φ': phi() })
        }
      })
      const totalAct = (act.values() as number[]).reduce((s, x) => s + x, 0)
      const maxAmo = Math.max(...(amo.values() as number[]))
      act.clear()
      amo.clear()
      t.step('done', `Total actual cost ${totalAct} for ${toks.length} operations. Every amortized bar is ≤ ${maxAmo} ≤ 3, and Σ actual = Σ amortized − Φ_end + Φ_start ≤ Σ amortized + 1 because Φ ≥ 0 and Φ_start = 1. So any n operations cost at most 3n + 1.`, { total: totalAct, size, cap })
    }),
}

/* ───────────────────────── 4. String building: immutable concat vs builder ───────────────────────── */

export const cxStringConcat: Algorithm = {
  id: 'cx-string-concat',
  title: 's = s + c in a loop copies Θ(n²) characters',
  blurb: 'Immutable strings are rebuilt on every +. A builder appends into a growing buffer: Θ(n) in total.',
  legend: { write: 'copied', new: 'new character' },
  inputs: [{ name: 's', label: 'Characters to append', type: 'string', default: 'ALGORITHMS' }],
  random: () => ({ s: ['COMPLEXITY', 'BIGOH', 'AMORTIZED', 'RECURSION', 'LOGARITHM'][rint(0, 4)] }),
  code: {
    pseudo: `
s ← ""
for each c: s ← s + c   // a NEW string of |s|+1 chars   @concat
b ← builder
for each c: b.append(c)  // amortized O(1)               @append
// copies: 1 + 2 + … + n = n(n+1)/2  vs  < 3n              @done`,
    cpp: `
// std::string += is in place (amortized O(1)), but
string s;
for (char c : text) s = s + c;          // builds a new string each time   @concat
string b;
for (char c : text) b += c;             // appends in place                @append
// O(n²) vs O(n)                                                           @done`,
    java: `
String s = "";
for (char c : text.toCharArray()) s = s + c;          // @concat
StringBuilder b = new StringBuilder();
for (char c : text.toCharArray()) b.append(c);        // @append
// O(n²) vs O(n)                                         @done`,
    python: `
s = ""
for c in text:
    s = s + c                # @concat
parts = []
for c in text:
    parts.append(c)          # @append
b = "".join(parts)           # O(n²) vs O(n)   @done`,
    js: `
let s = "";
for (const c of text) s = s + c;     // engines may optimise; not guaranteed   @concat
const parts = [];
for (const c of text) parts.push(c); // @append
const b = parts.join("");            // O(n²) worst vs O(n)                     @done`,
    c: `
char *s = calloc(1, 1);
for (int i = 0; i < n; i++) {                       /* new buffer every time */
    char *t = malloc(i + 2); memcpy(t, s, i); t[i] = text[i]; t[i + 1] = 0;
    free(s); s = t;                                 // @concat
}
char *b = malloc(n + 1); int len = 0;
for (int i = 0; i < n; i++) b[len++] = text[i];    // @append
b[len] = 0;                                         /* O(n²) vs O(n) */   // @done`,
  },
  run: ({ s }) =>
    trace((t) => {
      const text = String(s).replace(/\s+/g, '').slice(0, 14)
      if (!text.length) throw new Error('Type a few characters.')
      const n = text.length
      const naive = t.meter('naive', 'Characters copied by s = s + c', [
        { label: 'n', value: n },
        { label: 'n(n+1)/2', value: (n * (n + 1)) / 2 },
      ])
      let cur = t.array('s0', [], { label: 's (length 0)' })
      t.step('concat', `Append ${n} characters to an immutable string. Each + allocates a new string and copies the old one into it.`, {})
      for (let i = 0; i < n; i++) {
        const nxt = t.array(`s${i + 1}`, [...text.slice(0, i + 1)], { label: `new s (length ${i + 1})` })
        t.drop(cur)
        t.drop(naive)
        t.last(naive)
        for (let q = 0; q < i; q++) nxt.role(q, 'write')
        nxt.role(i, 'new')
        naive.add(i + 1)
        t.step('concat', `s + '${text[i]}': copy the ${i} old character${i === 1 ? '' : 's'} and write 1 new one — ${i + 1} operations. The old string is garbage now.`, { i, copied: naive.value })
        cur = nxt
      }
      t.drop(cur)
      const fast = t.meter('fast', 'Operations with a builder', [
        { label: 'n', value: n },
        { label: '3n', value: 3 * n },
      ])
      let cap = 1
      const b = t.array('b', [], { label: 'builder buffer (capacity 1)', capacity: 1 })
      t.last(naive)
      t.last(fast)
      for (let i = 0; i < n; i++) {
        let cost = 1
        b.clear()
        if (b.length === cap) {
          cap *= 2
          b.capacity = cap
          b.opts.label = `builder buffer (capacity ${cap})`
          for (let q = 0; q < b.length; q++) b.role(q, 'write')
          cost += b.length
        }
        b.push(text[i])
        b.role(b.length - 1, 'new')
        fast.add(cost)
        t.step('append', cost > 1 ? `append '${text[i]}': buffer full — double to ${cap}, copying ${cost - 1}. Rare, and it pays for itself.` : `append '${text[i]}': write into spare capacity, cost 1.`, { i, ops: fast.value })
      }
      b.clear()
      naive.role = 'removed'
      fast.role = 'done'
      t.step('done', `Concatenation copied ${naive.value} characters (≈ n²/2); the builder did ${fast.value} operations (< 3n). At n = 10⁵ that is 5·10⁹ against 3·10⁵ — a timeout against nothing.`, { naive: naive.value, builder: fast.value })
    }),
}

/* ───────────────────────── 5. Cache lines: row-major vs column-major traversal ───────────────────────── */

export const cxCache: Algorithm = {
  id: 'cx-cache',
  title: 'Same O(R·C) loop, very different speed — the cache',
  blurb: 'Memory moves in lines of 4 neighbours. Row order uses every loaded line fully; column order throws them away.',
  legend: { active: 'reading now', found: 'hit (line was cached)', removed: 'miss (load a line)', window: 'in cache' },
  inputs: [
    { name: 'R', label: 'rows', type: 'number', default: '4', min: 2, max: 6 },
    { name: 'C', label: 'cols', type: 'number', default: '8', min: 4, max: 8 },
    { name: 'lines', label: 'cache lines', type: 'number', default: '2', min: 1, max: 4 },
  ],
  random: () => ({ R: String(rint(3, 5)), C: String(rint(4, 8)), lines: String(rint(1, 3)) }),
  code: {
    pseudo: `
// a is stored row by row: a[r][c] at address r·C + c
for r: for c: s ← s + a[r][c]     // neighbours in memory   @row
for c: for r: s ← s + a[r][c]     // jumps C apart           @col
// same count, different number of cache misses             @done`,
    cpp: `
long long rowMajor(const vector<vector<int>>& a) {
    long long s = 0;
    for (size_t r = 0; r < a.size(); r++)
        for (size_t c = 0; c < a[0].size(); c++) s += a[r][c];   // @row
    return s;
}
long long colMajor(const vector<vector<int>>& a) {
    long long s = 0;
    for (size_t c = 0; c < a[0].size(); c++)
        for (size_t r = 0; r < a.size(); r++) s += a[r][c];      // @col
    return s;
}   // often 3–10× slower on big matrices                        @done`,
    java: `
static long rowMajor(int[][] a) {
    long s = 0;
    for (int r = 0; r < a.length; r++)
        for (int c = 0; c < a[0].length; c++) s += a[r][c];      // @row
    return s;
}
static long colMajor(int[][] a) {
    long s = 0;
    for (int c = 0; c < a[0].length; c++)
        for (int r = 0; r < a.length; r++) s += a[r][c];         // @col
    return s;
}   // often 3–10× slower on big matrices                        @done`,
    python: `
def row_major(a):
    return sum(a[r][c] for r in range(len(a)) for c in range(len(a[0])))   # @row
def col_major(a):
    return sum(a[r][c] for c in range(len(a[0])) for r in range(len(a)))   # @col
# (with numpy arrays the gap is dramatic)                                   @done`,
    js: `
function rowMajor(a) {
  let s = 0;
  for (let r = 0; r < a.length; r++)
    for (let c = 0; c < a[0].length; c++) s += a[r][c];          // @row
  return s;
}
function colMajor(a) {
  let s = 0;
  for (let c = 0; c < a[0].length; c++)
    for (let r = 0; r < a.length; r++) s += a[r][c];             // @col
  return s;
}   // slower on big matrices                                    @done`,
    c: `
long long row_major(int R, int C, int a[R][C]) {
    long long s = 0;
    for (int r = 0; r < R; r++)
        for (int c = 0; c < C; c++) s += a[r][c];                // @row
    return s;
}
long long col_major(int R, int C, int a[R][C]) {
    long long s = 0;
    for (int c = 0; c < C; c++)
        for (int r = 0; r < R; r++) s += a[r][c];                // @col
    return s;
}   /* often 3-10x slower on big matrices */                     // @done`,
  },
  run: ({ R, C, lines }) =>
    trace((t) => {
      const RR = Math.floor(R as number)
      const CC = Math.floor(C as number)
      const L = Math.floor(lines as number)
      const LINE = 4
      const G = t.grid('a', Array.from({ length: RR }, (_, r) => Array.from({ length: CC }, (_, c) => r * CC + c)), {
        label: `a[${RR}][${CC}] — the number in each cell is its memory address; a line holds 4 consecutive addresses`,
        rowLabels: Array.from({ length: RR }, (_, r) => `r${r}`),
        colLabels: Array.from({ length: CC }, (_, c) => `c${c}`),
      })
      const Q = t.queue('cache', `cache (${L} line${L > 1 ? 's' : ''}, least recently used at the front)`)
      const mRow = t.meter('mr', 'Misses, row order', [{ label: 'R·C/4', value: (RR * CC) / LINE }, { label: 'R·C', value: RR * CC }])
      const mCol = t.meter('mc', 'Misses, column order', [{ label: 'R·C/4', value: (RR * CC) / LINE }, { label: 'R·C', value: RR * CC }])
      const run = (order: 'row' | 'col', meter: typeof mRow) => {
        Q.items = []
        const cached: number[] = []
        const cells: [number, number][] = []
        if (order === 'row') for (let r = 0; r < RR; r++) for (let c = 0; c < CC; c++) cells.push([r, c])
        else for (let c = 0; c < CC; c++) for (let r = 0; r < RR; r++) cells.push([r, c])
        for (const [r, c] of cells) {
          const addr = r * CC + c
          const line = Math.floor(addr / LINE)
          const hit = cached.includes(line)
          if (hit) {
            cached.splice(cached.indexOf(line), 1)
            cached.push(line)
          } else {
            meter.add(1)
            cached.push(line)
            if (cached.length > L) cached.shift()
          }
          Q.items = cached.map((ln) => ({ id: `ln${ln}`, v: `${ln * LINE}–${ln * LINE + LINE - 1}` }))
          Q.clear().role(Q.length - 1, hit ? 'found' : 'removed')
          G.clear()
          for (const ln of cached)
            for (let a2 = ln * LINE; a2 < ln * LINE + LINE && a2 < RR * CC; a2++) G.role(Math.floor(a2 / CC), a2 % CC, 'window')
          G.role(r, c, hit ? 'found' : 'removed')
          t.step(order, hit ? `a[${r}][${c}] (address ${addr}) is in a cached line: hit, nearly free.` : `a[${r}][${c}] (address ${addr}) is not cached: miss — load the line ${line * LINE}–${line * LINE + LINE - 1}${cached.length >= L && order === 'col' ? ', evicting a line we will need again later' : ''}.`, { r, c, address: addr })
        }
      }
      run('row', mRow)
      t.step('row', `Row order: ${mRow.value} misses for ${RR * CC} reads — one per line, every loaded line fully used.`, {})
      run('col', mCol)
      G.clear()
      mRow.role = 'done'
      mCol.role = 'removed'
      t.step('done', `Column order: ${mCol.value} misses for the same ${RR * CC} reads. Both loops are Θ(R·C) — Big-O cannot see the difference — but a miss costs ~100× a hit. On a 4000×4000 matrix the column loop is several times slower.`, { 'row misses': mRow.value, 'col misses': mCol.value })
    }),
}

/* ───────────────────────── 6. Hash table worst case: every key collides ───────────────────────── */

export const cxHashCollide: Algorithm = {
  id: 'cx-hash-collide',
  title: 'Hashing’s worst case — when every key lands in one bucket',
  blurb: 'With h(k) = k mod m, multiples of m all collide. Each insert scans the whole chain: Θ(n²) for n inserts.',
  legend: { active: 'bucket h(k)', compare: 'compared (is it a duplicate?)', new: 'inserted', removed: 'quadratic total', done: 'linear total' },
  inputs: [
    { name: 'arr', label: 'Keys', type: 'array', default: '0 8 16 24 32 40 48', maxLen: 10 },
    { name: 'm', label: 'Buckets m', type: 'number', default: '8', min: 2, max: 11 },
  ],
  random: () => {
    const m = rint(5, 9)
    return { arr: list(Math.random() < 0.5 ? Array.from({ length: 7 }, (_, i) => i * m) : rarr(7, 0, 60)), m: String(m) }
  },
  code: {
    pseudo: `
function insert(T, k)
  b ← k mod m                          // @hash
  for each x in T[b]: if x = k: return // scan the chain   @probe
  append k to T[b]                     // @insert
// adversarial keys: chain grows 1, 2, …, n → n²/2 probes   @done`,
    cpp: `
// unordered_set with a predictable hash can be attacked the same way
void insert(vector<vector<long long>>& T, long long k) {
    size_t b = k % T.size();                         // @hash
    for (long long x : T[b]) if (x == k) return;     // @probe
    T[b].push_back(k);                               // @insert
}
// defence: a random seed in the hash (e.g. splitmix64 ^ seed)   @done`,
    java: `
static void insert(List<List<Long>> T, long k) {
    int b = (int) (k % T.size());                    // @hash
    for (long x : T.get(b)) if (x == k) return;      // @probe
    T.get(b).add(k);                                 // @insert
}
// HashMap turns long chains into trees: O(log n) worst case   @done`,
    python: `
def insert(T, k):
    b = k % len(T)              # @hash
    for x in T[b]:              # @probe
        if x == k: return
    T[b].append(k)              # @insert
# CPython randomises str hashes per process; ints are not   @done`,
    js: `
function insert(T, k) {
  const b = k % T.length;                        // @hash
  for (const x of T[b]) if (x === k) return;     // @probe
  T[b].push(k);                                  // @insert
}
// worst case Θ(n) per operation                  @done`,
    c: `
void insert(Node **T, int m, long long k) {
    int b = (int)(k % m);                                  // @hash
    for (Node *p = T[b]; p; p = p->next) if (p->key == k) return;   // @probe
    Node *nd = malloc(sizeof *nd); nd->key = k; nd->next = T[b]; T[b] = nd;   // @insert
}
/* worst case Θ(n) per operation */                        // @done`,
  },
  run: ({ arr, m }) =>
    trace((t) => {
      const keys = (arr as number[]).map((x) => Math.abs(Math.floor(x)))
      const M = Math.floor(m as number)
      const n = keys.length
      if (!n) throw new Error('Give some keys.')
      const H = t.hash('h', M, { label: `h(k) = k mod ${M}` })
      const meter = t.meter('probes', 'Key comparisons', [
        { label: 'n (ideal)', value: n },
        { label: 'n(n−1)/2', value: (n * (n - 1)) / 2 },
      ])
      t.step('hash', `${n} inserts into ${M} buckets. With a good spread each chain stays short and an insert is O(1) on average.`, {})
      for (const k of keys) {
        const b = k % M
        H.clear().role(b, null, 'active')
        t.step('hash', `${k} mod ${M} = ${b}.`, { key: k, bucket: b, 'chain length': H.buckets[b].length })
        let dup = false
        for (let i = 0; i < H.buckets[b].length; i++) {
          meter.add(1)
          H.clear().role(b, null, 'active').role(b, i, 'compare')
          const same = H.buckets[b][i].v === k
          t.step('probe', `Compare with ${H.buckets[b][i].v}: ${same ? 'same key — already present.' : 'different, keep scanning.'}`, { key: k, bucket: b, compared: meter.value })
          if (same) {
            dup = true
            break
          }
        }
        if (!dup) {
          const i = H.insert(b, k)
          H.clear().role(b, i, 'new')
          t.step('insert', i === 0 ? `Bucket ${b} was empty: ${k} goes straight in.` : `${k} joins bucket ${b}'s chain, now ${i + 1} long.`, { key: k, bucket: b, compared: meter.value })
        }
      }
      H.clear()
      const longest = Math.max(...H.buckets.map((c) => c.length))
      meter.role = longest > 2 ? 'removed' : 'done'
      t.step('done', longest > 2 ? `${meter.value} comparisons: the chain grew to ${longest}, so inserts cost 0, 1, 2, … — Θ(n²) in total. Contest "anti-hash" tests do exactly this to unordered_map. Defences: a randomised hash (seeded at runtime), or a balanced tree (Java 8+ HashMap trees long chains).` : `${meter.value} comparisons: the keys spread out and chains stayed short — the O(1) average case.`, { compared: meter.value, longest })
    }),
}

/* ───────────────────────── 7. Exponential: all subsets (subset sum by brute force) ───────────────────────── */

export const cxSubsets: Algorithm = {
  id: 'cx-subsets',
  title: 'Exponential time — subset sum tries all 2ⁿ subsets',
  blurb: 'Each item doubles the tree: take it or skip it. One more item, twice the work.',
  legend: { active: 'current call', found: 'subset hits the target', done: 'explored', dim: 'leaf: no match' },
  inputs: [
    { name: 'arr', label: 'Items', type: 'array', default: '3 5 6 7', maxLen: 4 },
    { name: 'target', label: 'Target', type: 'number', default: '13' },
  ],
  random: () => ({ arr: list(rarr(4, 1, 9)), target: String(rint(5, 18)) }),
  code: {
    pseudo: `
function count(i, sum)
  if i = n                           // a full decision: one subset
    return 1 if sum = target else 0  // @leaf
  return count(i+1, sum) + count(i+1, sum + a[i])   // skip / take   @call
// 2ⁿ leaves, 2ⁿ⁺¹ − 1 calls: Θ(2ⁿ)       @done`,
    cpp: `
int countSubsets(const vector<int>& a, int i, int sum, int target) {
    if (i == (int)a.size()) return sum == target;                  // @leaf
    return countSubsets(a, i + 1, sum, target)                     // @call
         + countSubsets(a, i + 1, sum + a[i], target);
}   // Θ(2ⁿ)                                                       @done`,
    java: `
static int countSubsets(int[] a, int i, int sum, int target) {
    if (i == a.length) return sum == target ? 1 : 0;               // @leaf
    return countSubsets(a, i + 1, sum, target)                     // @call
         + countSubsets(a, i + 1, sum + a[i], target);
}   // Θ(2ⁿ)                                                       @done`,
    python: `
def count_subsets(a, i, s, target):
    if i == len(a):                                   # @leaf
        return 1 if s == target else 0
    return (count_subsets(a, i + 1, s, target)        # @call
            + count_subsets(a, i + 1, s + a[i], target))
# Θ(2^n)                                              @done`,
    js: `
function countSubsets(a, i, sum, target) {
  if (i === a.length) return sum === target ? 1 : 0;              // @leaf
  return countSubsets(a, i + 1, sum, target)                      // @call
       + countSubsets(a, i + 1, sum + a[i], target);
}   // Θ(2ⁿ)                                                      @done`,
    c: `
int count_subsets(const int *a, int n, int i, int sum, int target) {
    if (i == n) return sum == target;                              // @leaf
    return count_subsets(a, n, i + 1, sum, target)                 // @call
         + count_subsets(a, n, i + 1, sum + a[i], target);
}   /* Θ(2^n) */                                                   // @done`,
  },
  run: ({ arr, target }) =>
    trace((t) => {
      const a = arr as number[]
      const n = a.length
      const X = target as number
      if (n < 1 || n > 4) throw new Error('Use 1 to 4 items (the tree has 2ⁿ leaves).')
      const T = t.tree('rt', { label: 'decision tree: left = skip, right = take (node shows the sum so far)', binary: true })
      const m = t.meter('calls', 'Calls made', [
        { label: '2ⁿ⁺¹ − 1', value: 2 ** (n + 1) - 1 },
      ])
      let hits = 0
      const go = (i: number, s: number, parent: string | null, side: number): void => {
        const id = T.node(s)
        if (parent) T.setChild(parent, side, id, side ? `+${a[i - 1]}` : 'skip')
        else T.setRoot(id)
        m.add(1)
        T.keep('done', 'found', 'dim').role(id, 'active')
        if (i === n) {
          const ok = s === X
          if (ok) hits++
          T.role(id, ok ? 'found' : 'dim')
          t.step('leaf', ok ? `Leaf: sum ${s} = ${X}. A subset that works!` : `Leaf: sum ${s} ≠ ${X}.`, { i, sum: s, found: hits })
          return
        }
        t.step('call', `Item ${i + 1} (${a[i]}): try skipping it, then taking it. Two calls — the tree doubles at every level.`, { i, sum: s, found: hits })
        T.role(id, 'done')
        go(i + 1, s, id, 0)
        go(i + 1, s + a[i], id, 1)
      }
      go(0, 0, null, 0)
      m.role = 'done'
      t.step('done', `${hits} subset${hits === 1 ? '' : 's'} sum to ${X}; ${m.value} calls for n = ${n}. Each extra item doubles it: n = 30 needs about 2·10⁹ calls, n = 60 about 2·10¹⁸ — out of reach forever. Subset sum is NP-complete: no polynomial algorithm is known.`, { found: hits })
    }),
}

/* ───────────────────────── 8. Pseudo-polynomial: 0/1 knapsack table ───────────────────────── */

export const cxKnapsack: Algorithm = {
  id: 'cx-knapsack',
  title: 'Pseudo-polynomial time — the knapsack table is n × W',
  blurb: 'The DP is O(n·W): polynomial in the value W, exponential in the number of bits needed to write W.',
  legend: { active: 'cell being filled', compare: 'cells it reads', found: 'best value' },
  inputs: [
    { name: 'w', label: 'Weights', type: 'array', default: '2 3 4 5', maxLen: 4, min: 1, max: 9 },
    { name: 'v', label: 'Values', type: 'array', default: '3 4 5 6', maxLen: 4 },
    { name: 'W', label: 'Capacity W', type: 'number', default: '7', min: 1, max: 10 },
  ],
  random: () => ({ w: list(rarr(4, 1, 5)), v: list(rarr(4, 1, 9)), W: String(rint(5, 10)) }),
  code: {
    pseudo: `
dp[0][c] ← 0 for every c
for i ← 1 to n
  for c ← 0 to W
    dp[i][c] ← dp[i−1][c]                              // skip item i   @skip
    if w[i] ≤ c: dp[i][c] ← max(dp[i][c], dp[i−1][c−w[i]] + v[i])   // @take
return dp[n][W]   // (n+1)(W+1) cells                   @done`,
    cpp: `
int knapsack(const vector<int>& w, const vector<int>& v, int W) {
    int n = w.size();
    vector<vector<int>> dp(n + 1, vector<int>(W + 1, 0));
    for (int i = 1; i <= n; i++)
        for (int c = 0; c <= W; c++) {
            dp[i][c] = dp[i - 1][c];                                     // @skip
            if (w[i - 1] <= c) dp[i][c] = max(dp[i][c], dp[i - 1][c - w[i - 1]] + v[i - 1]);   // @take
        }
    return dp[n][W];                                                     // @done
}`,
    java: `
static int knapsack(int[] w, int[] v, int W) {
    int n = w.length;
    int[][] dp = new int[n + 1][W + 1];
    for (int i = 1; i <= n; i++)
        for (int c = 0; c <= W; c++) {
            dp[i][c] = dp[i - 1][c];                                     // @skip
            if (w[i - 1] <= c) dp[i][c] = Math.max(dp[i][c], dp[i - 1][c - w[i - 1]] + v[i - 1]);   // @take
        }
    return dp[n][W];                                                     // @done
}`,
    python: `
def knapsack(w, v, W):
    n = len(w)
    dp = [[0] * (W + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for c in range(W + 1):
            dp[i][c] = dp[i - 1][c]                                      # @skip
            if w[i - 1] <= c:
                dp[i][c] = max(dp[i][c], dp[i - 1][c - w[i - 1]] + v[i - 1])   # @take
    return dp[n][W]                                                      # @done`,
    js: `
function knapsack(w, v, W) {
  const n = w.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(W + 1).fill(0));
  for (let i = 1; i <= n; i++)
    for (let c = 0; c <= W; c++) {
      dp[i][c] = dp[i - 1][c];                                           // @skip
      if (w[i - 1] <= c) dp[i][c] = Math.max(dp[i][c], dp[i - 1][c - w[i - 1]] + v[i - 1]);   // @take
    }
  return dp[n][W];                                                       // @done
}`,
    c: `
int knapsack(const int *w, const int *v, int n, int W) {
    static int dp[101][100001];
    for (int c = 0; c <= W; c++) dp[0][c] = 0;
    for (int i = 1; i <= n; i++)
        for (int c = 0; c <= W; c++) {
            dp[i][c] = dp[i - 1][c];                                     // @skip
            if (w[i - 1] <= c && dp[i - 1][c - w[i - 1]] + v[i - 1] > dp[i][c])
                dp[i][c] = dp[i - 1][c - w[i - 1]] + v[i - 1];           // @take
        }
    return dp[n][W];                                                     // @done
}`,
  },
  run: ({ w, v, W }) =>
    trace((t) => {
      const ws = w as number[]
      const vs = v as number[]
      const cap = Math.floor(W as number)
      const n = ws.length
      if (!n || n !== vs.length) throw new Error('Give the same number of weights and values (1 to 4).')
      const rows: Scalar[][] = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: cap + 1 }, () => (i === 0 ? 0 : null)))
      const G = t.grid('dp', rows, {
        label: 'dp[i][c] = best value using items 1…i with capacity c',
        rowLabels: ['none', ...ws.map((x, i) => `w${x} v${vs[i]}`)],
        colLabels: Array.from({ length: cap + 1 }, (_, c) => `c=${c}`),
      })
      const m = t.meter('cells', 'Cells filled', [{ label: 'n·W', value: n * cap }, { label: '(n+1)(W+1)', value: (n + 1) * (cap + 1) }])
      m.add(cap + 1)
      t.step('skip', `Row 0 (no items) is all zeros. One cell per (item, capacity) pair: (n+1)(W+1) = ${(n + 1) * (cap + 1)} cells, O(1) work each.`, { n, W: cap })
      for (let i = 1; i <= n; i++)
        for (let c = 0; c <= cap; c++) {
          const skip = G.rows[i - 1][c] as number
          let best = skip
          G.clear().role(i, c, 'active').role(i - 1, c, 'compare')
          G.arrow([i - 1, c], [i, c], 'skip')
          if (ws[i - 1] <= c) {
            const take = (G.rows[i - 1][c - ws[i - 1]] as number) + vs[i - 1]
            G.role(i - 1, c - ws[i - 1], 'compare').arrow([i - 1, c - ws[i - 1]], [i, c], `+${vs[i - 1]}`, take > skip ? 'found' : undefined)
            best = Math.max(skip, take)
            G.set(i, c, best)
            m.add(1)
            t.step('take', `dp[${i}][${c}] = max(skip ${skip}, take ${G.rows[i - 1][c - ws[i - 1]]} + ${vs[i - 1]} = ${take}) = ${best}.`, { i, c, value: best })
          } else {
            G.set(i, c, best)
            m.add(1)
            t.step('skip', `Item ${i} (weight ${ws[i - 1]}) does not fit in ${c}: dp[${i}][${c}] = dp[${i - 1}][${c}] = ${best}.`, { i, c, value: best })
          }
        }
      G.clear().role(n, cap, 'found')
      m.role = 'done'
      const bits = Math.max(1, Math.ceil(Math.log2(cap + 1)))
      t.step('done', `Best value ${G.rows[n][cap]} in ${m.value} cells. O(n·W) looks polynomial, but W is a number written in about log₂ W = ${bits} bits. Add 30 bits to W (W ≈ 10⁹·W) and the table grows a billion times: exponential in the input length. That is "pseudo-polynomial" — and why knapsack is still NP-hard.`, { best: G.rows[n][cap] as number })
    }),
}

export const algorithms4: Algorithm[] = [cxBinaryCounter, cxMultipop, cxDynPotential, cxStringConcat, cxCache, cxHashCollide, cxSubsets, cxKnapsack]
