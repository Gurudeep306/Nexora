/*
  A spoken number → the digits a numerical-answer box takes ("forty two point
  five" → "42.5", "minus do point paanch" → "-2.5", "बयालीस" → "42").
  Browsers usually write digits already ("42.5"); this covers the times they
  write words, in English, Hinglish or Hindi. No AI.

  Returns a string, not a number, so "0.50" stays as said. Pure and
  type-strippable (tests/voice-number.test.js).
*/

const ONES: Record<string, number> = {
  zero: 0, oh: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  // Hinglish
  shunya: 0, sunya: 0, ek: 1, do: 2, teen: 3, char: 4, chaar: 4, paanch: 5, panch: 5, chhe: 6, chhah: 6, che: 6, saat: 7, sat: 7, aath: 8, ath: 8, nau: 9,
  das: 10, gyarah: 11, barah: 12, terah: 13, chaudah: 14, pandrah: 15, solah: 16, satrah: 17, atharah: 18, unnis: 19, bees: 20, pachchis: 25, pachis: 25, tees: 30, chalis: 40, pachas: 50, pachaas: 50, saath: 60, sattar: 70, assi: 80, nabbe: 90,
  // Hindi
  'शून्य': 0, 'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'पाँच': 5, 'छह': 6, 'छः': 6, 'सात': 7, 'आठ': 8, 'नौ': 9,
  'दस': 10, 'ग्यारह': 11, 'बारह': 12, 'तेरह': 13, 'चौदह': 14, 'पंद्रह': 15, 'सोलह': 16, 'सत्रह': 17, 'अठारह': 18, 'उन्नीस': 19, 'बीस': 20,
  'पच्चीस': 25, 'तीस': 30, 'बयालीस': 42, 'चालीस': 40, 'पचास': 50, 'साठ': 60, 'सत्तर': 70, 'अस्सी': 80, 'नब्बे': 90,
}
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 }
const SCALES: Record<string, number> = { hundred: 100, sau: 100, 'सौ': 100, thousand: 1000, hazaar: 1000, hazar: 1000, 'हज़ार': 1000, 'हजार': 1000, lakh: 100000, lac: 100000, 'लाख': 100000 }
const POINT = new Set(['point', 'dot', 'decimal', 'dashamlav', 'dashmalav', 'दशमलव', 'पॉइंट'])
const MINUS = new Set(['minus', 'negative', 'ऋण', 'माइनस'])
/** Words around the number that carry no value: "the answer is", "jawab hai". */
const FILLER = new Set(['answer', 'ans', 'is', 'the', 'my', 'type', 'enter', 'write', 'likho', 'jawab', 'uttar', 'hai', 'he', 'h', 'it', 's', 'set', 'to', 'put', 'value', 'equals', 'equal', 'and', 'उत्तर', 'जवाब', 'है', 'लिखो', 'a', 'of', 'please'])

const DEV_DIGITS = '०१२३४५६७८९'

/** Words for one whole number (no point, no sign); null if any word isn't a number word. */
function wholeFrom(words: string[]): number | null {
  if (!words.length) return null
  let total = 0
  let part = 0
  let any = false
  for (const w of words) {
    if (/^\d+$/.test(w)) {
      part += Number(w)
      any = true
    } else if (w in ONES) {
      part += ONES[w]
      any = true
    } else if (w in TENS) {
      part += TENS[w]
      any = true
    } else if (w in SCALES) {
      const s = SCALES[w]
      if (s === 100) part = (part || 1) * 100
      else {
        total += (part || 1) * s
        part = 0
      }
      any = true
    } else return null
  }
  return any ? total + part : null
}

/** Digits after the point are read one by one: "point two five" → "25". */
function fractionFrom(words: string[]): string | null {
  if (!words.length) return null
  let out = ''
  for (const w of words) {
    if (/^\d+$/.test(w)) out += w
    else if (w in ONES && ONES[w] <= 9) out += String(ONES[w])
    else return null
  }
  return out
}

/** The number in an utterance, as the answer box would hold it, or null. */
export function spokenNumber(utterance: string): string | null {
  let s = String(utterance || '').normalize('NFC').toLowerCase()
  s = s.replace(/[०-९]/g, (d) => String(DEV_DIGITS.indexOf(d)))
  // "1,024" → "1024"; keep "42.5" and "-3" whole.
  s = s.replace(/(\d),(?=\d{3}\b)/g, '$1')
  s = s.replace(/(^|\s)-\s*(?=\d)/g, '$1minus ')
  s = s.replace(/(\d)\.(\d)/g, '$1 point $2').replace(/\.(\d)/g, ' point $1')
  s = s.replace(/[“”"'`?!,।:;]/g, ' ').replace(/\.(?!\d)/g, ' ')
  const words = s.split(/\s+/).filter((w) => w && !FILLER.has(w))
  if (!words.length) return null
  let sign = ''
  if (MINUS.has(words[0])) {
    sign = '-'
    words.shift()
  }
  const p = words.findIndex((w) => POINT.has(w))
  const whole = wholeFrom(p < 0 ? words : words.slice(0, p))
  // "point five" alone means 0.5.
  const intPart = whole ?? (p === 0 ? 0 : null)
  if (intPart == null) return null
  if (p < 0) return sign + String(intPart)
  const frac = fractionFrom(words.slice(p + 1))
  if (frac == null) return null
  return `${sign}${intPart}.${frac}`
}
