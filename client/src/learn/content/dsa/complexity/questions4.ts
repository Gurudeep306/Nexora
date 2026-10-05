import type { Question } from '../../../questions/types'

const T = 'complexity'

/** Quiz questions for expected-time analysis and the three amortized methods. */
export const questions4: Question[] = [
  // ── Expected analysis
  {
    id: 'cx-q-exp-linearity', topic: T, page: 'expected-analysis', kind: 'mcq', difficulty: 'easy',
    title: 'What linearity needs',
    prompt: 'For random variables X and Y, when is $E[X + Y] = E[X] + E[Y]$?',
    options: ['Only when X and Y are independent', 'Always', 'Only when X and Y are indicator variables', 'Only when E[X] = E[Y]'],
    answer: 1,
    explain: 'Linearity of expectation holds for any random variables — the proof just splits the sum Σ(X+Y)·Pr. Independence is needed for E[XY] = E[X]E[Y], not for sums. That is why indicator decompositions work even when the events depend on each other.',
  },
  {
    id: 'cx-q-exp-hiring', topic: T, page: 'expected-analysis', kind: 'numeric', difficulty: 'medium',
    title: 'Expected updates of the maximum',
    prompt: 'Scanning a uniformly random permutation of 4 distinct numbers, how many times is "the maximum so far" updated, in expectation? (Count the first element as an update. Give 3 decimals.)',
    answer: 2.083,
    tolerance: 0.002,
    explain: 'E = H₄ = 1 + 1/2 + 1/3 + 1/4 = 25/12 ≈ 2.083. Element i is a new maximum with probability 1/i, since each of the first i is equally likely to be the largest of them.',
  },
  {
    id: 'cx-q-exp-inversions', topic: T, page: 'expected-analysis', kind: 'numeric', difficulty: 'medium',
    title: 'Average inversions',
    prompt: 'What is the expected number of inversions in a uniformly random permutation of 10 distinct numbers?',
    answer: 22.5,
    explain: 'Each of the C(10,2) = 45 pairs is inverted with probability ½, so 45/2 = 22.5. Insertion sort makes exactly that many swaps on average: n(n−1)/4, still Θ(n²).',
  },
  {
    id: 'cx-q-exp-geometric', topic: T, page: 'expected-analysis', kind: 'numeric', difficulty: 'easy',
    title: 'Waiting for a six',
    prompt: 'You roll a fair die until you get a 6. What is the expected number of rolls?',
    answer: 6,
    explain: 'Each roll succeeds with p = 1/6, independently; the expected number of attempts until the first success is 1/p = 6 (first-step analysis: E = p·1 + (1−p)(1 + E)).',
  },
  {
    id: 'cx-q-exp-quickselect', topic: T, page: 'expected-analysis', kind: 'mcq', difficulty: 'medium',
    title: 'Quickselect’s costs',
    prompt: 'Randomised quickselect (random pivot, recurse into one side) has which expected and worst-case running times?',
    options: ['Expected O(n log n), worst O(n²)', 'Expected O(n), worst O(n²)', 'Expected O(n), worst O(n)', 'Expected O(log n), worst O(n)'],
    answer: 1,
    explain: 'Phases of geometrically shrinking size, each lasting ≤ 2 partitions in expectation, give ≤ 8n expected. A long run of extreme pivots still costs n + (n−1) + … = Θ(n²) — unlikely, but possible. (Median-of-medians gives O(n) worst case.)',
  },
  {
    id: 'cx-q-exp-avg-vs-exp', topic: T, page: 'expected-analysis', kind: 'mcq', difficulty: 'medium',
    title: 'Average case or expected time?',
    prompt: 'Why is "randomised quicksort is O(n log n) expected" a stronger promise than "last-element quicksort is O(n log n) on average"?',
    options: [
      'Because random numbers are faster to compute',
      'The expected bound holds for every input (it averages over the algorithm’s coin flips); the average-case bound assumes the input itself is random',
      'They are the same promise',
      'Because the average case ignores comparisons',
    ],
    answer: 1,
    explain: 'An adversary (or a judge) chooses inputs — sorted arrays break last-element quicksort. Nobody controls the algorithm’s own coin flips, so the expected bound holds on every input.',
  },
  {
    id: 'cx-q-exp-markov', topic: T, page: 'expected-analysis', kind: 'numeric', difficulty: 'medium',
    title: 'Markov’s bound',
    prompt: 'A randomised algorithm has expected running time T. By Markov’s inequality, at most what probability can a run take 5T or longer?',
    answer: 0.2,
    explain: 'Pr[X ≥ t·E[X]] ≤ 1/t with t = 5: at most 0.2. Restarting after 5T makes k consecutive failures happen with probability ≤ 0.2ᵏ.',
  },
  {
    id: 'cx-q-exp-birthday', topic: T, page: 'expected-analysis', kind: 'numeric', difficulty: 'medium',
    title: 'Expected collisions',
    prompt: '20 keys are hashed independently and uniformly into 100 buckets. What is the expected number of pairs of keys that share a bucket?',
    answer: 1.9,
    explain: 'C(20, 2) = 190 pairs, each colliding with probability 1/100: 190/100 = 1.9. Collisions appear long before the table is full — the birthday effect.',
  },

  // ── Amortized methods
  {
    id: 'cx-q-am-counter-total', topic: T, page: 'amortized-methods', kind: 'numeric', difficulty: 'easy',
    title: 'Total flips',
    prompt: 'A binary counter starts at 0 and is incremented 16 times. How many bit flips happen in total?',
    answer: 31,
    explain: 'Bit i flips ⌊16/2ⁱ⌋ times: 16 + 8 + 4 + 2 + 1 = 31 < 2·16. The 16th increment alone (01111 → 10000) flips 5 bits.',
  },
  {
    id: 'cx-q-am-counter-bit', topic: T, page: 'amortized-methods', kind: 'numeric', difficulty: 'easy',
    title: 'One bit’s flips',
    prompt: 'During 100 increments from 0, how many times does bit 3 (worth 8) flip?',
    answer: 12,
    explain: 'Bit i flips every 2ⁱ increments: ⌊100/8⌋ = 12 times.',
  },
  {
    id: 'cx-q-am-telescoping', topic: T, page: 'amortized-methods', kind: 'mcq', difficulty: 'medium',
    title: 'Why Φ must stay non-negative',
    prompt: 'In the potential method, why do we require Φ(Dᵢ) ≥ Φ(D₀) = 0 for every i?',
    options: [
      'So that Σ amortized = Σ actual + Φ(Dₙ) − Φ(D₀) is at least Σ actual — the amortized costs then really bound the actual ones',
      'So that every amortized cost is positive',
      'Because potentials are probabilities',
      'It is not required',
    ],
    answer: 0,
    explain: 'The sum telescopes. If Φ could end below its start, the amortized total could be smaller than the real total, and the "bound" would be false. (Individual amortized costs may be negative — e.g. a pop with Φ = stack size — that is fine.)',
  },
  {
    id: 'cx-q-am-multipop', topic: T, page: 'amortized-methods', kind: 'mcq', difficulty: 'easy',
    title: 'Multipop total',
    prompt: 'Any sequence of n push / pop / multipop operations on an initially empty stack costs at most…',
    options: ['n', '2n', 'n log n', 'n²/2'],
    answer: 1,
    explain: 'Each item is popped at most once after its single push, so total pops ≤ total pushes ≤ n, and total cost ≤ 2n. One multipop may cost n, but it can only happen after n cheap pushes.',
  },
  {
    id: 'cx-q-am-thrash', topic: T, page: 'amortized-methods', kind: 'mcq', difficulty: 'medium',
    title: 'Shrink at ½ or at ¼?',
    prompt: 'A dynamic table doubles when full. Why is "halve when half full" a bad shrinking rule?',
    options: [
      'It wastes memory',
      'Alternating push and pop at the boundary resizes on every operation, costing Θ(n) each',
      'Halving is impossible in C',
      'It breaks the doubling rule',
    ],
    answer: 1,
    explain: 'At exactly half full, a push doubles (no — it is full first) … more precisely: when full at size c, a push doubles to 2c with c+1 items; a pop then brings it to c = half of 2c and halves it back; repeat. Each operation copies Θ(n). Shrinking at ¼ leaves a gap of Θ(n) cheap operations between resizes.',
  },
  {
    id: 'cx-q-am-phi-push', topic: T, page: 'amortized-methods', kind: 'numeric', difficulty: 'hard',
    title: 'Amortized cost of a doubling push',
    prompt: 'With Φ = 2s − c (s = size, c = capacity), a push arrives when s = c = 64: the table doubles (copying 64 items) and the new item is written. What is the amortized cost of this push?',
    answer: 3,
    explain: 'Actual cost 64 + 1 = 65. Φ before: 2·64 − 64 = 64. Φ after: 2·65 − 128 = 2. Amortized = 65 + (2 − 64) = 3.',
  },
  {
    id: 'cx-q-am-two-stacks', topic: T, page: 'amortized-methods', kind: 'numeric', difficulty: 'medium',
    title: 'Count the moves',
    prompt: 'A queue built from two stacks performs: push 1, push 2, push 3, pop, push 4, pop, pop, pop. How many items are moved from the in-stack to the out-stack in total?',
    answer: 4,
    explain: 'First pop: out is empty, move 1, 2, 3 (3 moves), pop 1. Push 4 goes to in. Next two pops take 2 and 3 from out. Last pop: out is empty, move 4 (1 move). Total 4 — each item is moved exactly once.',
  },
  {
    id: 'cx-q-am-method-match', topic: T, page: 'amortized-methods', kind: 'match', difficulty: 'medium',
    title: 'Name the method',
    prompt: 'Match each argument with the amortized-analysis method it uses.',
    left: ['"Bit i flips ⌊n/2ⁱ⌋ times, so the total is < 2n"', '"Charge 2 per push; 1 coin waits on the item to pay for its pop"', '"Let Φ = number of 1-bits; then ĉ = (t+1) + (1−t) = 2"'],
    right: ['aggregate', 'accounting', 'potential'],
    explain: 'Aggregate bounds the total directly; accounting stores credit on specific items; potential stores it in one function of the whole structure.',
  },
  {
    id: 'cx-q-am-latency', topic: T, page: 'amortized-methods', kind: 'multi', difficulty: 'hard',
    title: 'When amortized is not enough',
    prompt: 'In which situations is an amortized O(1) bound **insufficient**? Select all.',
    options: [
      'A real-time audio callback that must finish every call within 1 ms',
      'Summing the total time of a batch job that does 10⁷ pushes',
      'A structure that supports undo, letting a client repeat the same expensive resize many times',
      'A contest problem that only checks total running time',
    ],
    answers: [0, 2],
    explain: 'Amortized bounds cap the total, not each operation: a single O(n) spike can still break a per-call deadline. With undo/persistence the credit gets "spent" repeatedly, so the total bound itself fails. Batch jobs and contest totals are exactly what amortized bounds are for.',
  },
]
