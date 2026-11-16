struct P: Comparable {
    var x: Int
    static func < (l: P, r: P) -> Bool { l.x < r.x }
}

struct Counter {
    var c = 0
    mutating func inc() -> Int { c += 1; return c }
}

enum Util {
    static func gcd(_ a: Int, _ b: Int) -> Int {
        guard b != 0 else { return a }
        return gcd(b, a % b)
    }
}

func classify(_ v: Int) -> String {
    switch v {
    case 0: return "zero"
    case let k where k < 0: return "neg"
    default: return "pos"
    }
}

var seen = Set<Int>()
var i = 0
repeat { seen.insert(i * i % 5); i += 1 } while i < 6
let ps = [P(x: 2), P(x: 1)].sorted()
var c = Counter()
_ = c.inc(); _ = c.inc()
var s = 0
outer: for a in 0..<3 {
    for b in 0..<3 {
        if b > a { continue outer }
        s += a * b
    }
}
func sq(_ v: Int) -> Int { return v * v }
var opt: Int? = nil
if let o = opt { s += o } else { opt = 4 }
let word = String("abc".reversed())
print(word)
print(Util.gcd(12, 18), seen.count, ps[0].x, c.c, s, sq(3), opt!, classify(-2), terminator: "!\n")
