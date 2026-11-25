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
/*
  Hindi numbers 0–99 each have their own word ("सैंतालीस" = 47), so they are
  listed in full: the standard Devanagari spelling first, then spellings
  speech recognisers also write (पांच/पाँच, इक्यानबे/इक्यानवे), then Hinglish.
  The same table is in src/voice/numwords.js; tests/voice-numbers-full.test.js checks both
  read every number 0–9,999 in English, Hindi and Hinglish.
*/
export const HINDI_NUMBERS: [number, ...string[]][] = [
  [0, "शून्य", "shunya", "sunya"],
  [1, "एक", "ek"],
  [2, "दो", "do"],
  [3, "तीन", "teen"],
  [4, "चार", "char", "chaar"],
  [5, "पाँच", "पांच", "paanch", "panch"],
  [6, "छह", "छः", "छे", "chhah", "chhe", "che"],
  [7, "सात", "saat", "sat"],
  [8, "आठ", "aath", "ath"],
  [9, "नौ", "nau"],
  [10, "दस", "das"],
  [11, "ग्यारह", "gyarah", "gyaarah"],
  [12, "बारह", "barah", "baarah"],
  [13, "तेरह", "terah"],
  [14, "चौदह", "chaudah"],
  [15, "पंद्रह", "पन्द्रह", "pandrah"],
  [16, "सोलह", "solah"],
  [17, "सत्रह", "satrah"],
  [18, "अठारह", "atharah", "athaarah"],
  [19, "उन्नीस", "unnis", "unnees"],
  [20, "बीस", "bees"],
  [21, "इक्कीस", "ikkis", "ikkees"],
  [22, "बाईस", "bais", "baees"],
  [23, "तेईस", "teis", "teees"],
  [24, "चौबीस", "chaubis", "chaubees"],
  [25, "पच्चीस", "pachchis", "pachis", "pachchees"],
  [26, "छब्बीस", "chhabbis", "chhabbees"],
  [27, "सत्ताईस", "sattais", "sattaees"],
  [28, "अट्ठाईस", "अठाईस", "atthais", "athaees"],
  [29, "उनतीस", "उन्तीस", "untis", "untees"],
  [30, "तीस", "tees"],
  [31, "इकतीस", "इकत्तीस", "iktis", "iktees"],
  [32, "बत्तीस", "battis", "battees"],
  [33, "तैंतीस", "तेंतीस", "taintis", "taintees"],
  [34, "चौंतीस", "चौतीस", "chauntis", "chauntees"],
  [35, "पैंतीस", "paintis", "paintees"],
  [36, "छत्तीस", "chhattis", "chhattees"],
  [37, "सैंतीस", "saintis", "saintees"],
  [38, "अड़तीस", "adtis", "adtees", "artees"],
  [39, "उनतालीस", "उन्तालीस", "untalis", "untalees"],
  [40, "चालीस", "chalis", "chaalis", "chalees"],
  [41, "इकतालीस", "iktalis", "iktalees"],
  [42, "बयालीस", "bayalis", "bayalees"],
  [43, "तैंतालीस", "तेंतालीस", "taintalis", "taintalees"],
  [44, "चवालीस", "चौवालीस", "chavalis", "chauvalis", "chawalees"],
  [45, "पैंतालीस", "paintalis", "paintalees"],
  [46, "छियालीस", "chhiyalis", "chhiyalees"],
  [47, "सैंतालीस", "saintalis", "saintalees"],
  [48, "अड़तालीस", "adtalis", "adtalees", "artalees"],
  [49, "उनचास", "unchas", "unchaas"],
  [50, "पचास", "pachas", "pachaas"],
  [51, "इक्यावन", "ikyavan", "ikyawan"],
  [52, "बावन", "bavan", "baawan"],
  [53, "तिरपन", "तिरेपन", "tirpan", "tirepan"],
  [54, "चौवन", "चौव्वन", "chauvan", "chauwan"],
  [55, "पचपन", "pachpan"],
  [56, "छप्पन", "chhappan"],
  [57, "सत्तावन", "sattavan", "sattawan"],
  [58, "अट्ठावन", "अठावन", "atthavan", "athawan"],
  [59, "उनसठ", "unsath"],
  [60, "साठ", "saath"],
  [61, "इकसठ", "iksath"],
  [62, "बासठ", "basath", "baasath"],
  [63, "तिरसठ", "तिरेसठ", "tirsath", "tiresath"],
  [64, "चौंसठ", "चौसठ", "chaunsath"],
  [65, "पैंसठ", "painsath"],
  [66, "छियासठ", "chhiyasath"],
  [67, "सड़सठ", "सरसठ", "sadsath", "sarsath"],
  [68, "अड़सठ", "adsath", "arsath"],
  [69, "उनहत्तर", "unhattar"],
  [70, "सत्तर", "sattar"],
  [71, "इकहत्तर", "ikhattar"],
  [72, "बहत्तर", "bahattar"],
  [73, "तिहत्तर", "tihattar"],
  [74, "चौहत्तर", "chauhattar"],
  [75, "पचहत्तर", "pachhattar", "pachattar"],
  [76, "छिहत्तर", "chhihattar"],
  [77, "सतहत्तर", "sathattar"],
  [78, "अठहत्तर", "athhattar", "athattar"],
  [79, "उन्यासी", "उनासी", "unyasi", "unaasi"],
  [80, "अस्सी", "assi"],
  [81, "इक्यासी", "ikyasi"],
  [82, "बयासी", "bayasi"],
  [83, "तिरासी", "tirasi"],
  [84, "चौरासी", "chaurasi"],
  [85, "पचासी", "pachasi"],
  [86, "छियासी", "chhiyasi"],
  [87, "सत्तासी", "sattasi"],
  [88, "अट्ठासी", "अठासी", "atthasi", "athasi"],
  [89, "नवासी", "navasi"],
  [90, "नब्बे", "nabbe"],
  [91, "इक्यानबे", "इक्यानवे", "ikyanbe", "ikyanve"],
  [92, "बानबे", "बानवे", "baanbe", "banve"],
  [93, "तिरानबे", "तिरानवे", "tiranbe", "tiranve"],
  [94, "चौरानबे", "चौरानवे", "chauranbe", "chauranve"],
  [95, "पंचानबे", "पंचानवे", "पिचानवे", "panchanbe", "panchanve", "pichanve"],
  [96, "छियानबे", "छियानवे", "chhiyanbe", "chhiyanve"],
  [97, "सत्तानबे", "सत्तानवे", "sattanbe", "sattanve"],
  [98, "अट्ठानबे", "अट्ठानवे", "अठानवे", "atthanbe", "atthanve"],
  [99, "निन्यानबे", "निन्यानवे", "ninyanbe", "ninyanve"],
]
for (const [v, ...words] of HINDI_NUMBERS) for (const w of words) ONES[w] = v
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 }
const SCALES: Record<string, number> = { hundred: 100, sau: 100, 'सौ': 100, thousand: 1000, hazaar: 1000, hazar: 1000, 'हज़ार': 1000, 'हजार': 1000, lakh: 100000, lac: 100000, 'लाख': 100000, crore: 10000000, karod: 10000000, karor: 10000000, 'करोड़': 10000000, 'करोड': 10000000 }
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
