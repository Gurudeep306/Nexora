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

test('numbers beside Hindi words are said in Hindi, every number 0–9,999, with Kokoro’s symbols only', (t) => {
  const bad = [];
  for (let n = 0; n <= 9999; n++) {
    const items = toVoiceInput(`कुल ${n} सवाल हैं।`);
    if (items.length !== 1 || items[0].type !== 'phonetic') bad.push(`${n}: not one Hindi piece ${JSON.stringify(items)}`);
    else {
      if (items[0].subtitles !== `कुल ${n} सवाल हैं।`) bad.push(`${n}: captions changed`);
      if (/\d/.test(items[0].value)) bad.push(`${n}: digits left in the sounds`);
      for (const ch of items[0].value) if (!KOKORO.has(ch)) bad.push(`${n}: "${ch}"`);
    }
  }
  t.diagnostic('numbers spoken in Hindi: 10000');
  assert.equal(bad.length, 0, bad.slice(0, 20).join('\n'));
});

test('how numbers sound in Hindi speech; code stays code', () => {
  const sound = (s) => toVoiceInput(s).filter((i) => i.type === 'phonetic').map((i) => i.value).join(' | ');
  assert.match(sound('मेरे पास 47 किताबें'), /sɛːntaːliːs/);
  assert.match(sound('साल 2026 में'), /doː həzaːɾ ʧʰəbbiːs/);
  assert.match(sound('पाई लगभग 3.14 है'), /tiːn dəʃəmləʋ eːk ʧaːɾ/);
  assert.match(sound('कुल ४७ सवाल'), /sɛːntaːliːs/);
  assert.match(sound('1,024 बाइट'), /eːk həzaːɾ ʧɔːbiːs/);
  // Inside code, or with no Hindi word beside it, a number is left for the English rules.
  assert.deepEqual(toVoiceInput('a[47] को देखो')[0], { type: 'text', value: 'a[47] ' });
  assert.deepEqual(toVoiceInput('x2 मान है')[0], { type: 'text', value: 'x2 ' });
  assert.deepEqual(toVoiceInput('answer is 42'), [{ type: 'text', value: 'answer is 42' }]);
  assert.deepEqual(toVoiceInput('4.5f देखो')[0], { type: 'text', value: '4.5f ' });
});

/* ── more words, as Hindi speakers say them (written down separately from the rules) ── */

const EVERYDAY = {
  पानी: 'paːniː', किताब: 'kɪtaːb', लड़का: 'ləɽkaː', लड़की: 'ləɽkiː', घर: 'ɡʰəɾ', दिन: 'dɪn', रात: 'ɾaːt', सड़क: 'səɽək', बादल: 'baːdəl',
  कमरा: 'kəmɾaː', जानवर: 'ʤaːnʋəɾ', सरकार: 'səɾkaːɾ', मदद: 'mədəd', अदरक: 'ədɾək', बोलना: 'boːlnaː', पढ़ना: 'pəɽʰnaː', लिखना: 'lɪkʰnaː',
  चलना: 'ʧəlnaː', सवाल: 'səʋaːl', जवाब: 'ʤəʋaːb', प्रश्न: 'pɾəʃn', विद्यार्थी: 'ʋɪdjaːɾtʰiː', अध्यापक: 'ədʰjaːpək', कंप्यूटर: 'kəmpjuːʈəɾ',
  गणित: 'ɡəɳɪt', विज्ञान: 'ʋɪɡjaːn', ज्ञान: 'ɡjaːn', श्री: 'ʃɾiː', धन्यवाद: 'dʰənjəʋaːd', आसान: 'aːsaːn', मुश्किल: 'mʊʃkɪl', ज़रूरी: 'zəɾuːɾiː',
  फ़ायदा: 'faːjdaː', ग़लत: 'ɣələt', क़लम: 'qələm', ख़ाना: 'χaːnaː', सबसे: 'səbseː', करते: 'kəɾteː', कहानी: 'kəhaːniː', पहला: 'pəhlaː',
  दोस्त: 'doːst', मैं: 'mɛː̃', हाँ: 'haː̃', नहीं: 'nəhiː̃', ठीक: 'ʈʰiːk', समय: 'səməj', अगला: 'əɡlaː', पिछला: 'pɪʧʰlaː', बिल्कुल: 'bɪlkʊl',
};

test('everyday Hindi words sound the way Hindi speakers say them', () => {
  const wrong = [];
  for (const [w, ipa] of Object.entries(EVERYDAY)) if (wordToIpa(w) !== ipa) wrong.push(`${w}: ${wordToIpa(w)} (want ${ipa})`);
  assert.equal(wrong.length, 0, wrong.join('\n'));
});

test('every consonant with every vowel sign, nukta, virama, anusvara and chandrabindu: Kokoro symbols only, nothing left unread', (t) => {
  const CONS = [...'कखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसहळ'];
  const SIGNS = ['', 'ा', 'ि', 'ी', 'ु', 'ू', 'ृ', 'े', 'ै', 'ो', 'ौ', 'ॉ', 'ॅ', '्'];
  const MARKS = ['', 'ं', 'ँ', 'ः'];
  let n = 0;
  const bad = [];
  for (const c of CONS) {
    for (const nukta of ['', '़']) {
      for (const sgn of SIGNS) {
        for (const m of MARKS) {
          // The syllable on its own, and inside a word, before another consonant.
          for (const w of [c + nukta + sgn + m, 'क' + c + nukta + sgn + m + 'ल', c + nukta + sgn + m + 'त']) {
            if (sgn === '्' && m) continue;
            n++;
            const ipa = wordToIpa(w);
            if (!ipa) bad.push(`${w}: empty`);
            for (const ch of ipa) if (!KOKORO.has(ch)) bad.push(`${w}: "${ch}"`);
            if (/[ऀ-ॿ]/.test(ipa)) bad.push(`${w}: Devanagari left in ${ipa}`);
          }
        }
      }
    }
  }
  t.diagnostic(`syllables and words: ${n}`);
  assert.equal(bad.length, 0, bad.slice(0, 20).join('\n'));
});
