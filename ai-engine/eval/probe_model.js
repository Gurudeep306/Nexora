// Probe the REAL model with different inputs. Prints raw output so you can judge quality yourself.
const { kronosChat } = require('../../src/kronos-engine');

const SECRET_OK = true;
const tests = [
  ['chat: BFS vs DFS', [{ role: 'user', content: 'Explain BFS vs DFS in 3 sentences.' }], {}],
  ['chat: heap', [{ role: 'user', content: 'Why is building a binary heap O(n) and not O(n log n)?' }], {}],
  ['animate: bubble sort on [5,2,8,1]', [{
    role: 'user',
    content: 'Return ONLY JSON {"title":str,"frames":[{"step":int,"explanation":str,"cells":[{"id":str,"v":int}],"pointers":{},"codeLine":int}]} ' +
      'tracing this code step by step on arr=[5,2,8,1], 6 frames max:\nfor i in range(n):\n for j in range(n-i-1):\n  if a[j]>a[j+1]: swap(a[j],a[j+1])',
  }], { maxTokens: 1500, temperature: 0.1 }],
];

(async () => {
  for (const [name, msgs, opts] of tests) {
    const t = Date.now();
    const r = await kronosChat(null, msgs, opts);
    console.log(`\n===== ${name}  (${((Date.now() - t) / 1000).toFixed(1)}s, ok=${r.ok}) =====`);
    console.log(r.ok ? r.content : r.error);
  }
})();
