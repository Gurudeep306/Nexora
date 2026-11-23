/*
  Hindi → sounds for our own voice server (src/voice/hindi-ipa.js): Kokoro's
  Hindi voices speak what this writes, so it must follow how Hindi is said
  (the inherent "a" dropped where Hindi drops it, nasals) and use only symbols
  Kokoro knows.
*/
const test = require('node:test');
const assert = require('node:assert/strict');
const { wordToIpa, toVoiceInput, hasDevanagari } = require('../src/voice/hindi-ipa');

// Kokoro-82M's phoneme vocabulary (onnx-community/Kokoro-82M-v1.0-ONNX-timestamped, tokenizer.json).
const KOKORO = new Set(" !\"$(),.:;?AIOQSTWYabcdefhijklmnopqrstuvwxyzæçðøŋœɐɑɒɔɕɖəɚɛɜɟɡɣɤɥɨɪɯɰɲɳɴɸɹɻɽɾʁʂʃʈʊʋʌʎʒʔʝʣʤʥʦʧʨʰʲˈˌː̃βθχᵊᵝᵻ—“”…→↓↗↘ꭧ");

const WORDS = {
  नमस्ते: 'nəməsteː', // Hindi keeps the ə before a cluster here
  कमल: 'kəməl', // final ə dropped
  समझना: 'səməʤʰnaː', // medial ə dropped (VC_CV)
  करना: 'kəɾnaː',
  मित्र: 'mɪtɾə', // kept after a cluster ending in r
  वाक्य: 'ʋaːkjə', // … or in y
  सर्च: 'səɾʧ', // dropped after other clusters
  शब्द: 'ʃəbd',
  हिंदी: 'hɪndiː', // anusvara before d → n
  अंक: 'əŋk', // before k → ŋ
  संख्या: 'səŋkʰjaː',
  माँ: 'maː̃', // chandrabindu nasalises
  पढ़ाई: 'pəɽʰaːiː', // nukta
  ज़रूर: 'zəɾuːɾ',
  अच्छा: 'əʧʧʰaː',
  उत्तर: 'ʊttəɾ',
  दिखाता: 'dɪkʰaːtaː',
};

test('Hindi words become the sounds Hindi speakers say', () => {
  for (const [w, ipa] of Object.entries(WORDS)) assert.equal(wordToIpa(w), ipa, w);
});

test('only symbols Kokoro knows are produced', () => {
  const text = 'नमस्ते! मैं आपकी टीचर हूँ। बाइनरी सर्च बहुत आसान है। बीच वाला नंबर देखो, और जो आधा हिस्सा काम का नहीं है, उसे छोड़ दो। क़लम, ख़ाना, ग़लत, फ़ायदा, ऋषि, ऑफ़िस, दुःख, ०१२३४५६७८९';
  for (const item of toVoiceInput(text)) {
    if (item.type !== 'phonetic') continue;
    for (const ch of item.value) assert.ok(KOKORO.has(ch), `"${ch}" (U+${ch.codePointAt(0).toString(16)}) in ${item.subtitles}`);
  }
});

test('mixed Hinglish: Hindi runs become sounds with their own words as subtitles; English stays text', () => {
  const items = toVoiceInput('Binary search में mid देखो।');
  assert.deepEqual(items, [
    { type: 'text', value: 'Binary search ' },
    { type: 'phonetic', value: 'meː̃', subtitles: 'में' },
    { type: 'text', value: ' mid ' },
    { type: 'phonetic', value: 'deːkʰoː.', subtitles: 'देखो।' },
  ]);
  assert.deepEqual(toVoiceInput('Only English here.'), [{ type: 'text', value: 'Only English here.' }]);
  assert.equal(hasDevanagari('mid'), false);
  assert.equal(hasDevanagari('मिड'), true);
});
