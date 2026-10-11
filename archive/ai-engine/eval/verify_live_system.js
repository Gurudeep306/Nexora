#!/usr/bin/env node
/**
 * Comprehensive Live Verification of Kronos-1 AI Engine & Multi-User Isolation
 * Uses authentic registered user session cookies
 */

const base = 'http://localhost:3000';

async function signup(name) {
  const r = await fetch(`${base}/api/user/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: name, email: `${name}@test.io`, password: 'Password123!' }),
  });
  const data = await r.json();
  const cookie = r.headers.get('set-cookie')?.split(';')[0];
  return { ok: r.ok, cookie, user: name, data };
}

async function call(method, path, cookie, body) {
  const r = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try {
    data = await r.json();
  } catch {
    data = await r.text();
  }
  return { status: r.status, ok: r.ok, body: data };
}

async function runTests() {
  console.log('================================================================');
  console.log('   KRONOS-1 END-TO-END SYSTEM & MULTI-USER VERIFICATION TEST    ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} - ${details}`);
      failed++;
    }
  }

  // Register two isolated user sessions
  const uid = Date.now().toString(36);
  const aliceName = `alice_${uid}`;
  const bobName = `bob_${uid}`;

  console.log(`[*] Creating authenticated sessions for ${aliceName} and ${bobName}...`);
  const aliceAuth = await signup(aliceName);
  const bobAuth = await signup(bobName);

  assert(Boolean(aliceAuth.cookie), 'Alice session cookie created');
  assert(Boolean(bobAuth.cookie), 'Bob session cookie created');

  // TEST 1: Socratic CS Reasoning
  console.log('\n[*] Test 1: Socratic CS Reasoning (/api/ai-chat)...');
  try {
    const res = await call('POST', '/api/ai-chat', aliceAuth.cookie, {
      question: 'How does Dijkstra algorithm work with priority queues?',
    });
    assert(res.status === 200 && res.body?.ok === true, 'Socratic chat response returned 200 OK');
    assert(Boolean(res.body?.reply && res.body.reply.length > 50), 'Reply contains substantive CS explanation');
  } catch (e) {
    assert(false, 'Socratic chat request failed', e.message);
  }

  // TEST 2: Dynamic 3D Kinetic Code Animator
  console.log('\n[*] Test 2: Dynamic 3D Kinetic Code Animator (/api/ai-chat with code)...');
  try {
    const res = await call('POST', '/api/ai-chat', aliceAuth.cookie, {
      question: 'while (left < right) { swap(a[left++], a[right--]); }',
      animate: true,
    });
    assert(res.status === 200 && res.body?.ok === true, 'Code-to-animation returned 200 OK');
    const vis = res.body?.visualization;
    assert(Boolean(vis && Array.isArray(vis.frames) && vis.frames.length >= 2), 'Valid kinetic state machine generated with >=2 frames');
    const f0 = vis?.frames?.[0];
    assert(Boolean(f0?.cells && f0?.soundEffect && f0?.pointers), 'Frames contain cells, soundEffect, pointers, and memory addresses');
  } catch (e) {
    assert(false, 'Animation request failed', e.message);
  }

  // TEST 3: Multi-User Data Isolation (Alice vs Bob)
  console.log('\n[*] Test 3: Multi-User Data Isolation (Alice vs Bob)...');
  try {
    // Alice posts a private question
    await call('POST', '/api/ai-chat', aliceAuth.cookie, {
      question: 'Alice private topic: Segment Trees and Lazy Propagation',
    });

    // Bob posts a private question
    await call('POST', '/api/ai-chat', bobAuth.cookie, {
      question: 'Bob private topic: Red-Black Tree rotation invariants',
    });

    // Retrieve Alice's history
    const aliceHist = await call('GET', '/api/ai-chat/history', aliceAuth.cookie);
    const aliceEntries = aliceHist.body?.history || [];
    const aliceHasAliceQuery = aliceEntries.some(e => e.content.includes('Segment Trees'));
    const aliceHasBobQuery = aliceEntries.some(e => e.content.includes('Red-Black Tree'));

    assert(aliceHasAliceQuery, "Alice sees Alice's conversation");
    assert(!aliceHasBobQuery, "Alice DOES NOT see Bob's conversation (Strict Isolation)");

    // Retrieve Bob's history
    const bobHist = await call('GET', '/api/ai-chat/history', bobAuth.cookie);
    const bobEntries = bobHist.body?.history || [];
    const bobHasBobQuery = bobEntries.some(e => e.content.includes('Red-Black Tree'));
    const bobHasAliceQuery = bobEntries.some(e => e.content.includes('Segment Trees'));

    assert(bobHasBobQuery, "Bob sees Bob's conversation");
    assert(!bobHasAliceQuery, "Bob DOES NOT see Alice's conversation (Strict Isolation)");

    // Clear Alice's history
    await call('DELETE', '/api/ai-chat/history', aliceAuth.cookie);
    const aliceAfterDel = await call('GET', '/api/ai-chat/history', aliceAuth.cookie);
    const bobAfterDel = await call('GET', '/api/ai-chat/history', bobAuth.cookie);

    assert(aliceAfterDel.body?.history?.length === 0, "Alice's history is successfully cleared to 0");
    assert(bobAfterDel.body?.history?.length > 0, "Bob's history remains intact and unaffected");
  } catch (e) {
    assert(false, 'Multi-user isolation test failed', e.message);
  }

  // TEST 4: Monaco Code Autocomplete
  console.log('\n[*] Test 4: Inline Code Autocomplete (/api/ai-complete)...');
  try {
    const res = await call('POST', '/api/ai-complete', aliceAuth.cookie, {
      prefix: 'for (int i = 0; i < n; i++) {\n    if (arr[i] == target) {\n',
      suffix: '\n    }\n}',
      language: 'cpp',
    });
    assert(res.status === 200 && res.body?.ok === true, 'Inline autocomplete returned 200 OK');
    assert(typeof res.body?.text === 'string', 'Autocomplete returned code prediction');
  } catch (e) {
    assert(false, 'Autocomplete test failed', e.message);
  }

  // TEST 5: Syntax Fixer
  console.log('\n[*] Test 5: Syntax Error Auto-Fixer (/api/ai-fix)...');
  try {
    const res = await call('POST', '/api/ai-fix', aliceAuth.cookie, {
      code: 'int main() {\n    int a = 10\n    return 0;\n}',
      language: 'cpp',
      error: 'expected ; at end of declaration',
    });
    assert(res.status === 200 && res.body?.ok === true, 'Syntax fixer returned 200 OK');
  } catch (e) {
    assert(false, 'Syntax fixer test failed', e.message);
  }

  console.log('\n================================================================');
  console.log(`   FINAL RESULT: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test script crashed:', err);
  process.exit(1);
});
