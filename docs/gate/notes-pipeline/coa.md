# Computer Organisation & Architecture (`coa`): build plan

**State today:** nothing written. Start at N0. PYQs: **272** (`coa/cache` 75,
`coa/pipeline` 56, `coa/isa` 53, `coa/io` 37, `coa/memory` 27,
`coa/datapath` 17, `coa/perf` 7; 29 flagged `needsReview`, 16 with figures).
Also check the 167 `legacy` PYQs (topic `microprocessor` etc.): list any that
belong to COA in the outline as "legacy, optional" — do not re-tag the bank.

**Official GATE CSE syllabus (verify against the current PDF):** machine
instructions and addressing modes; ALU, data-path and control unit; instruction
pipelining, pipeline hazards; memory hierarchy: cache, main memory and
secondary storage; I/O interface (interrupt and DMA mode).

**Already taught in Digital Logic — link, never re-teach:** number systems,
2's complement, IEEE-754 floating point and its arithmetic, Booth's
multiplication, adders (ripple, carry look-ahead), array multipliers,
flip-flops, registers, counters, ROM/PLA. Use `[…](/gate/notes/dl/<id>)` links
and a one-paragraph reminder at most.

## Suggested chapter structure (confirm or improve in N1)

| # | Chapter | Main topics |
|---|---|---|
| 1 | Basic computer organisation | Von Neumann model, the instruction cycle (fetch–decode–execute), registers (PC, IR, MAR, MDR, AC), bus organisation, performance: CPI, MIPS, execution time, Amdahl's law |
| 2 | Instruction set architecture | Instruction formats (0/1/2/3-address), opcode design and expanding opcodes (counting instructions from bit budgets — a GATE favourite), addressing modes with effective-address computation, RISC vs CISC, stack machines, subroutine call and return |
| 3 | Data path and control unit | Single-bus and multi-bus data paths, register transfer and micro-operations, control signals per step; hardwired vs microprogrammed control, control word formats (horizontal/vertical), control memory size calculations |
| 4 | Pipelining | Pipeline stages and timing, speedup and efficiency, structural/data/control hazards, stalls and forwarding (bypassing), load-use hazards, branch penalty and prediction, delayed branch, non-uniform stage delays and latch overhead, the pipeline timing (space–time) diagram |
| 5 | Memory hierarchy and main memory | Locality, hierarchy levels, average memory access time (hierarchical vs simultaneous access), memory organisation (chips, banks, interleaving), address decoding, RAM/ROM types |
| 6 | Cache memory | Direct-mapped, fully associative, k-way set-associative; tag/index/offset split; replacement (LRU, FIFO, optimal); write-through vs write-back, write-allocate; hit/miss counting on address traces; multi-level caches; cache size and tag-memory calculations; 3 Cs of misses |
| 7 | Secondary storage and virtual memory (COA view) | Disk geometry, seek/rotation/transfer time, capacity and formatting; TLB and page tables as GATE asks them in COA (link `os` for the OS side) |
| 8 | I/O organisation | I/O interfaces, programmed I/O, interrupt-driven I/O (vectored, priority, daisy chain), DMA (burst, cycle stealing, transparent), data transfer rates and CPU-time-percentage calculations |

## Live Labs (build in N3; register in `index.ts` and `LAB_TABS`)

| Lab id | Chapter | Tabs | What the reader does |
|---|---|---|---|
| `cpu-cycle-lab` | 1, 3 | `cycle`, `datapath` | Step a tiny accumulator machine through fetch–decode–execute: registers and buses lighting, RTL per step, control signals listed |
| `isa-lab` | 2 | `encode`, `modes` | Design an instruction format from a bit budget (expanding opcodes, count of instructions); compute effective addresses for each addressing mode on a memory snapshot |
| `pipeline-lab` | 4 | `timing`, `hazards`, `branches` | Enter an instruction sequence (or pick a PYQ-style one); see the space–time diagram, hazards detected, stalls inserted, forwarding paths drawn; toggle forwarding/prediction and watch cycles change |
| `cache-lab` | 6 | `map`, `trace`, `size` | Choose cache size, block size, associativity, replacement and write policy; split an address into tag/index/offset; run an address trace with hits/misses, evictions and LRU order animating; compute tag-memory and total cache bits |
| `memory-lab` | 5, 7 | `amat`, `disk`, `interleave` | AMAT calculator for 1–3 levels (hierarchical vs simultaneous); disk access time; memory interleaving and chip-array building |
| `io-lab` | 8 | `interrupt`, `dma` | Timeline of programmed vs interrupt-driven vs DMA transfer, with CPU busy percentage computed; interrupt priority and daisy chain |

Viz engine upgrades needed first (see `animations.md` §3): **`wave`** (timing
and space–time diagrams), **`code`** (instruction sequences), **`stack`**
(subroutine calls), `state` (control FSM).

## Animations every lesson set must include (≥ 6 per lesson; this list is the floor)
- The instruction cycle: PC → MAR → memory → MDR → IR → decode → execute, with
  the bus and registers lighting in order.
- Effective-address computation for each addressing mode on the same memory.
- Expanding opcodes: the bit budget splitting into instruction groups.
- Stack machine evaluating an expression with push/pop.
- Single-bus data path executing one instruction micro-operation by micro-operation.
- Hardwired control as an FSM; microprogrammed control stepping through
  control memory with the micro-PC.
- The pipeline space–time diagram filling cycle by cycle; ideal vs with stalls.
- Data hazard detected → stall bubbles inserted → the same with forwarding
  arrows (EX→EX, MEM→EX); load-use stall that forwarding cannot remove.
- Branch penalty and flushed instructions; delayed branch slot.
- Non-uniform stages: the clock set by the slowest stage plus latch delay.
- Locality: an access pattern lighting memory cells over time.
- AMAT computed level by level (both access models).
- Address split into tag/index/offset for each mapping.
- A cache trace for direct-mapped, 2-way and fully associative caches on the
  same trace (hits/misses, evictions, LRU order).
- Write-through vs write-back: memory traffic counted.
- Multi-level cache miss path.
- Memory interleaving: consecutive words across banks.
- Disk: platter, track, sector; seek + rotational latency + transfer.
- TLB hit/miss path into the page table.
- Interrupt handling sequence (save PC, vector, ISR, return); daisy-chain priority.
- DMA cycle stealing vs burst on a bus timeline, CPU percentage computed.

## Verification (`_checks/coa/`)
Write `coalib.py`: CPI/MIPS/speedup calculators, an instruction-format counter,
an EA evaluator, a pipeline simulator (stages, hazards, stall rules with and
without forwarding, branch handling) that outputs the space–time table, a cache
simulator (mapping, replacement, write policies, multi-level) that outputs
per-access hit/miss and the final contents, AMAT, disk and DMA calculators.
Every number, trace and diagram in lessons and PYQs is recomputed; pipeline and
cache scenes are generated from these simulators.

**Pipeline PYQs are ambiguous by nature** (whether writes and reads share a
cycle, whether forwarding exists, where branches resolve). For each one, state
the assumptions the official key uses before solving, and verify the key under
those assumptions.

## Textbooks and free sources (fact-checking only)
Hamacher–Vranesic–Zaky, *Computer Organization*; Patterson–Hennessy,
*Computer Organization and Design*; Hennessy–Patterson, *Computer Architecture:
A Quantitative Approach*; Mano, *Computer System Architecture*; Stallings,
*Computer Organization and Architecture*; NPTEL Computer Architecture
(IIT Madras/Kharagpur); MIT 6.004 notes (free); Berkeley CS61C notes (free).

## Traps the PYQs keep testing (make each a `:::trap`)
Byte vs word addressing changes every address split; cache "size" usually
excludes tag and valid bits — read the question; LRU vs FIFO differ only on a
hit; direct-mapped conflict misses on alternating blocks; k-way: index bits =
log2(sets), not log2(lines); speedup of a k-stage pipeline approaches k only for
n ≫ k, and never with stalls; the slowest stage plus latch delay sets the
clock; load-use needs a stall even with forwarding; hierarchical vs
simultaneous AMAT formulas; disk rotational latency is half a rotation on
average; DMA cycle stealing vs burst changes the CPU percentage; interrupt
latency includes saving state; expanding-opcode counting must leave room for
every group.
