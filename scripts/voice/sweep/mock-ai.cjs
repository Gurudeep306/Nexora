// For scripts/voice/sweep/sweep.cjs. A stand-in OpenAI-compatible model: replies with what it was given, so the test can see persona and memory.
const http = require('http')
http.createServer((req, res) => {
  let body = ''
  req.on('data', (c) => (body += c))
  req.on('end', () => {
    if (!/chat\/completions/.test(req.url)) return res.writeHead(404).end()
    const j = JSON.parse(body || '{}')
    const sys = j.messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n')
    const who = (sys.match(/You are (\w+)/) || [])[1]
    const talk = /spoken conversation/.test(sys)
    const turns = j.messages.filter((m) => m.role === 'user' || m.role === 'assistant').length - 1
    const last = j.messages[j.messages.length - 1].content
    if (/^Explain on the whiteboard:/.test(last)) {
      const lesson = { title: 'Binary search', steps: [
        { say: 'We search a sorted array. Here are seven numbers, already in order.', draw: [{ t: 'text', id: 't', x: 4, y: 7, text: 'Binary search: find 23', size: 3.6 }, { t: 'array', id: 'a', x: 15, y: 22, values: [3, 8, 12, 17, 23, 31, 40], label: 'sorted array' }] },
        { say: 'Low starts at the left end, high at the right end.', draw: [{ t: 'array', id: 'a', x: 15, y: 22, values: [3, 8, 12, 17, 23, 31, 40], pointers: [{ i: 0, label: 'low' }, { i: 6, label: 'high' }], label: 'sorted array' }] },
        { say: 'Mid is the middle, index three, value seventeen. Twenty three is bigger, so throw away the left half.', draw: [{ t: 'array', id: 'a', x: 15, y: 22, values: [3, 8, 12, 17, 23, 31, 40], highlight: [3], pointers: [{ i: 3, label: 'mid' }], label: 'sorted array' }, { t: 'text', x: 15, y: 48, text: '23 > 17, go right', size: 3, color: 'accent' }] },
        { say: 'Now low is index four. The new mid is index five, thirty one. Twenty three is smaller, so go left, and we find it at index four.', draw: [{ t: 'array', id: 'a', x: 15, y: 22, values: [3, 8, 12, 17, 23, 31, 40], highlight: [4], pointers: [{ i: 4, label: 'found' }], label: 'sorted array' }, { t: 'box', x: 64, y: 44, w: 30, h: 9, label: 'O(log n) steps', color: 'good' }] },
      ] }
      res.writeHead(200, { 'content-type': 'application/json' })
      return res.end(JSON.stringify({ id: 'x', choices: [{ index: 0, message: { role: 'assistant', content: 'Here you go:\n```json\n' + JSON.stringify(lesson) + '\n```' }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } }))
    }
    // Memory checks: what the system messages carry (study facts yes, the remembered name never).
    const mem = /What you remember about this student/.test(sys) ? ` [memory: ${/preparing for GATE/.test(sys) ? 'goal' : 'no-goal'}${/Asha/.test(sys) ? ', NAME-IN-PROMPT' : ''}]` : ''
    const reply = `Achha, I am ${who}. You said: ${last}. I remember ${turns} earlier turns${talk ? ', talking' : ''}.${mem}`
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ id: 'x', choices: [{ index: 0, message: { role: 'assistant', content: reply }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } }))
  })
}).listen(3199, '127.0.0.1')
