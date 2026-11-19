/*
  Scenes for "Decisions and loops". The while loop below is run here, in
  TypeScript, exactly as Python runs it, and each pass round the loop is one
  step of the animation.
*/
import type { StageElement, StageSpec, StageStep } from '@/ai/stage/spec'

/** balance = 1000, growing 10% a year, until it reaches 2000: each pass of the loop. */
export function doublingRun() {
  let balance = 1000
  let years = 0
  const passes: { years: number; balance: number }[] = []
  while (balance < 2000) {
    balance = Math.round(balance * 1.1 * 100) / 100
    years += 1
    passes.push({ years, balance })
  }
  return { passes, years, balance }
}

type G = Extract<StageElement, { type: 'graph' }>

export function loopScene(): StageSpec {
  const { passes } = doublingRun()
  const nodes: G['nodes'] = [
    { id: 'start', label: 'balance = 1000, years = 0', at: [0, 2.4] },
    { id: 'test', label: 'balance < 2000 ?', at: [0, 0.9], r: 0.45, tone: 'warning' },
    { id: 'body', label: 'balance *= 1.1, years += 1', at: [3.3, 0.9] },
    { id: 'end', label: 'print(years)', at: [0, -0.8] },
  ]
  const edges: G['edges'] = [
    { from: 'start', to: 'test' },
    { from: 'test', to: 'body', label: 'yes' },
    { from: 'body', to: 'test', label: 'back to the test', dashed: true },
    { from: 'test', to: 'end', label: 'no' },
  ]
  const rows = (k: number) => passes.slice(0, k).map((p) => [p.years, p.balance.toFixed(2)])
  const steps: StageStep[] = [
    { label: 'Start', caption: 'Put ₹1000 in a bank that adds 10% a year. How many years until it doubles? The loop keeps going while the answer is "not yet".', set: [{ id: 'g', set: { lit: ['start'], flow: 0 } }], ms: 1300 },
  ]
  passes.forEach((p, i) => {
    steps.push({
      label: `Pass ${i + 1}`,
      caption: i === 0 ? 'Test: is the balance below 2000? Yes, so run the body: add 10% and count a year. Then go back to the test.' : `Back at the test with ₹${passes[i - 1].balance.toFixed(2)}: still below 2000, so round again.`,
      tex: `\\text{balance} = ${(i ? passes[i - 1].balance : 1000).toFixed(2)} \\times 1.1 = ${p.balance.toFixed(2)},\\quad \\text{years} = ${p.years}`,
      set: [
        { id: 'g', set: { lit: ['test', 'body'], flow: 1, flowEdges: [1, 2] } },
        { id: 'tab', set: { rows: rows(i + 1), highlight: [[i, 1]] } },
      ],
      ms: i < 2 ? 1500 : 800,
    })
    steps.push({ label: `Pass ${i + 1}`, caption: steps[steps.length - 1].caption, set: [{ id: 'g', set: { flow: 0 } }], ms: 120 })
  })
  const last = passes[passes.length - 1]
  steps.push({
    label: 'Done',
    caption: `Now the balance is ₹${last.balance.toFixed(2)}, not below 2000: the test says no, the loop ends, and the line after it runs. It took ${last.years} years.`,
    tex: `1000 \\times 1.1^{${last.years}} \\ge 2000`,
    set: [{ id: 'g', set: { lit: ['test', 'end'], flow: 1, flowEdges: [3] } }],
    pause: true,
    ms: 1500,
  })
  return {
    version: 1,
    title: 'A while loop goes round until its test says no',
    description: `A flowchart of a while loop. ₹1000 grows by 10% a year; each pass tests whether the balance is below 2000, and if so adds 10% and counts a year, then goes back to the test. A table records every pass. After ${last.years} passes the balance is ₹${last.balance.toFixed(2)}, the test fails and the loop ends.`,
    dim: 2,
    camera: { position: [2.6, 8.4, 2.6], target: [2.6, 0, -0.8] },
    elements: [
      { id: 'g', type: 'graph', directed: true, nodes, edges, flow: 0, flowEdges: [0] },
      { id: 'tab', type: 'table', header: ['years', 'balance'], rows: [['0', '1000.00']], at: [7.2, 0.6, 0] },
    ],
    steps,
  }
}
