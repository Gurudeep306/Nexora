
/* NexoraGuru dry-run runtime for Swift (appended to the student's program by
   src/dryrun/swift.js). It writes the same JSON events as the Python tracer
   (format: src/dryrun/index.js) to stderr after the marker "\u{1E}NXT ".
   It never prints: print below counts what the program prints and passes it
   on unchanged. Only static members are used, so nothing here depends on the
   order top-level code runs in. */
#if canImport(Glibc)
import Glibc
#elseif canImport(Darwin)
import Darwin
#endif

func print(_ items: Any..., separator: String = " ", terminator: String = "\n") {
    let s = items.map { String(describing: $0) }.joined(separator: separator) + terminator
    __Nx.outn += s.unicodeScalars.count
    Swift.print(s, terminator: "")
}
func print<Target: TextOutputStream>(_ items: Any..., separator: String = " ", terminator: String = "\n", to output: inout Target) {
    Swift.print(items.map { String(describing: $0) }.joined(separator: separator), terminator: terminator, to: &output)
}

enum __Nx {
    static var on = true
    static var outn = 0
    static var events = 0
    static var bytes = 0
    static let MAXEV = 3000
    static let MAXB = 1500000
    static let MAXOBJ = 300
    static var calls = 0
    static var depth = 0
    static var nextId = 0
    static var top: F? = nil
    static var ids: [ObjectIdentifier: Int] = [:]
    static var keep: [AnyObject] = []
    static var lastObj: [Int: String] = [:]
    static var seen: [(Int, String)] = []
    static var seenIds = Set<Int>()
    /** A crash (index out of range, nil unwrapped…) is a signal: report it on its line, then stop as before. */
    static let ready: Bool = {
        for s in [SIGILL, SIGTRAP, SIGABRT, SIGSEGV, SIGBUS, SIGFPE] {
            signal(s) { sig in __Nx.trap(sig) }
        }
        return true
    }()
    static func trap(_ sig: Int32) {
        if let f = top { f.crash() }
        signal(sig, SIG_DFL)
        raise(sig)
    }

    /** name, value, name, value… */
    static func v(_ nv: Any...) -> [Any] { nv }

    /* ── JSON ── */
    static func str(_ w: inout String, _ s: String) {
        w += "\""
        var n = 0
        for c in s.unicodeScalars {
            n += 1
            if n > 300 { w += "…"; break }
            switch c {
            case "\"": w += "\\\""
            case "\\": w += "\\\\"
            default:
                if c.value < 0x20 { w += "\\u" + String(format4(c.value)) } else { w.unicodeScalars.append(c) }
            }
        }
        w += "\""
    }
    static func format4(_ v: UInt32) -> String {
        let h = String(v, radix: 16)
        return String(repeating: "0", count: max(0, 4 - h.count)) + h
    }
    static func num(_ w: inout String, _ d: Double) {
        if d.isNaN { w += "{\"t\":\"num\",\"s\":\"nan\"}" }
        else if d.isInfinite { w += d > 0 ? "{\"t\":\"num\",\"s\":\"inf\"}" : "{\"t\":\"num\",\"s\":\"-inf\"}" }
        else if d == d.rounded() && abs(d) < 1e15 { w += String(Int64(d)) }
        else { w += String(d) }
    }
    static func blank(_ x: Any) -> Bool {
        let m = Mirror(reflecting: x)
        if m.displayStyle == .optional { return m.children.isEmpty }
        if let i = x as? Int { return i == 0 }
        if let d = x as? Double { return d == 0 }
        if let b = x as? Bool { return !b }
        if m.displayStyle == .collection { return m.children.isEmpty }
        return false
    }
    static func items(_ w: inout String, _ xs: [Any], _ t: String) {
        w += "{\"t\":\"\(t)\",\"n\":\(xs.count),\"i\":["
        // A big array (Array(repeating: 0, count: 200005)) shows the part in use.
        var k = xs.count
        if k > 80 {
            k = 0
            for i in 0..<min(xs.count, 10000) where !blank(xs[i]) { k = i + 1 }
            if k == 0 { k = 10 }
        }
        for i in 0..<min(k, 80) {
            if i > 0 { w += "," }
            if !ser(&w, xs[i]) { w += "null" }
        }
        w += "]}"
    }
    static func userType(_ t: Any.Type) -> Bool {
        let n = String(reflecting: t)
        return !(n.hasPrefix("Swift.") || n.hasPrefix("Foundation.") || n.hasPrefix("__C.") || n.hasPrefix("_") || n.contains(".__Nx"))
    }

    static func ser(_ w: inout String, _ v: Any) -> Bool {
        let m = Mirror(reflecting: v)
        if m.displayStyle == .optional {
            guard let inner = m.children.first?.value else { w += "null"; return true }
            return ser(&w, inner)
        }
        switch v {
        case let b as Bool: w += b ? "true" : "false"; return true
        case let i as Int:
            if abs(Double(i)) > 9007199254740992.0 { w += "{\"t\":\"big\",\"s\":\"\(i)\"}" } else { w += String(i) }
            return true
        case let i as Int64: w += abs(Double(i)) > 9007199254740992.0 ? "{\"t\":\"big\",\"s\":\"\(i)\"}" : String(i); return true
        case let i as UInt64: w += Double(i) > 9007199254740992.0 ? "{\"t\":\"big\",\"s\":\"\(i)\"}" : String(i); return true
        case let i as Int32: w += String(i); return true
        case let i as UInt: w += String(i); return true
        case let i as UInt8: w += String(i); return true
        case let d as Double: num(&w, d); return true
        case let d as Float: num(&w, Double(d)); return true
        case let s as String: str(&w, s); return true
        case let s as Substring: str(&w, String(s)); return true
        case let c as Character: str(&w, String(c)); return true
        default: break
        }
        switch m.displayStyle {
        case .collection?:
            items(&w, m.children.map { $0.value }, "list")
            return true
        case .set?:
            let xs = m.children.map { $0.value }.sorted { String(describing: $0) < String(describing: $1) }
            items(&w, xs, "set")
            return true
        case .dictionary?:
            var pairs: [(Any, Any)] = []
            for c in m.children {
                let kv = Array(Mirror(reflecting: c.value).children)
                if kv.count == 2 { pairs.append((kv[0].value, kv[1].value)) }
            }
            // A dictionary's order changes from run to run: show it sorted.
            pairs.sort { a, b in
                if let x = a.0 as? Int, let y = b.0 as? Int { return x < y }
                return String(describing: a.0) < String(describing: b.0)
            }
            w += "{\"t\":\"dict\",\"n\":\(pairs.count),\"k\":["
            for (i, p) in pairs.prefix(80).enumerated() {
                if i > 0 { w += "," }
                w += "["
                if !ser(&w, p.0) { w += "null" }
                w += ","
                if !ser(&w, p.1) { w += "null" }
                w += "]"
            }
            w += "]}"
            return true
        case .tuple?:
            items(&w, m.children.map { $0.value }, "tuple")
            return true
        case .class?:
            guard userType(type(of: v)) else { return false }
            return ref(&w, v as AnyObject, m)
        case .struct?, .enum?:
            guard userType(type(of: v)) else {
                // Ranges and the like: their text.
                let s = String(describing: v)
                if s.count <= 60 { str(&w, s); return true }
                return false
            }
            str(&w, String(describing: v))
            return true
        default:
            return false
        }
    }

    /* ── objects: by identity, so links between them can be drawn ── */
    static func ref(_ w: inout String, _ o: AnyObject, _ m: Mirror) -> Bool {
        let oid = ObjectIdentifier(o)
        let id: Int
        if let known = ids[oid] { id = known } else { nextId += 1; id = nextId; ids[oid] = id; keep.append(o) }
        w += "{\"t\":\"ref\",\"id\":\(id)}"
        if seenIds.contains(id) || seenIds.count >= MAXOBJ { return true }
        seenIds.insert(id)
        var b = "{\"c\":"
        str(&b, String(describing: type(of: o)))
        b += ",\"f\":{"
        var first = true
        var mm: Mirror? = m
        while let cur = mm {
            for c in cur.children {
                guard let label = c.label, !label.hasPrefix("$"), !label.hasPrefix("_") else { continue }
                var t = ""
                if !ser(&t, c.value) { continue }
                if !first { b += "," }
                first = false
                str(&b, label)
                b += ":" + t
            }
            mm = cur.superclassMirror
        }
        b += "}}"
        seen.append((id, b))
        return true
    }

    static func emit(_ s: String) {
        if !on { return }
        events += 1
        bytes += s.utf8.count
        if events > MAXEV || bytes > MAXB {
            on = false
            fputs("\u{1E}NXT {\"e\":\"cap\"}\n", stderr)
            return
        }
        fputs("\u{1E}NXT " + s + "\n", stderr)
    }
    static func heapDelta() -> String {
        var h = ""
        for (id, json) in seen {
            if lastObj[id] == json { continue }
            lastObj[id] = json
            if !h.isEmpty { h += "," }
            h += "\"\(id)\":" + json
        }
        seen.removeAll()
        seenIds.removeAll()
        return h
    }
    /** name/value pairs → [(name, JSON)], leaving out what can't be drawn. */
    static func vars(_ nv: [Any]?) -> [(String, String)] {
        guard let nv = nv else { return [] }
        var out: [(String, String)] = []
        var i = 0
        while i + 1 < nv.count {
            var w = ""
            if let name = nv[i] as? String, ser(&w, nv[i + 1]) {
                out.removeAll { $0.0 == name }
                out.append((name, w))
            }
            i += 2
        }
        return out
    }

    final class F {
        let k: Int
        var pend = -1
        var line: Int
        let up: F?
        var last: [String: String] = [:]
        var retv: String? = nil

        init(_ fn: String, _ l: Int, _ nv: [Any]?) {
            _ = __Nx.ready
            calls += 1
            k = calls
            line = l
            up = top
            top = self
            if on {
                var ch = ""
                for (key, value) in vars(nv) {
                    last[key] = value
                    if !ch.isEmpty { ch += "," }
                    ch += "\"\(key)\":" + value
                }
                var ev = "{\"e\":\"call\",\"f\":"
                str(&ev, fn)
                ev += ",\"k\":\(k),\"d\":\(depth),\"l\":\(l),\"o\":\(outn)"
                if !ch.isEmpty { ev += ",\"v\":{" + ch + "}" }
                let h = heapDelta()
                if !h.isEmpty { ev += ",\"h\":{" + h + "}" }
                emit(ev + "}")
            }
            depth += 1
        }
        func flush(_ nv: [Any]?, _ withVars: Bool) {
            if pend < 0 { return }
            var ch = ""
            var gone = ""
            if withVars {
                let now = vars(nv)
                var names = Set<String>()
                for (key, value) in now {
                    names.insert(key)
                    if last[key] == value { continue }
                    last[key] = value
                    if !ch.isEmpty { ch += "," }
                    ch += "\"\(key)\":" + value
                }
                for n in last.keys.sorted() where !names.contains(n) {
                    if !gone.isEmpty { gone += "," }
                    gone += "\"\(n)\""
                    last[n] = nil
                }
            }
            var ev = "{\"e\":\"line\",\"l\":\(pend),\"k\":\(k),\"o\":\(outn)"
            if !ch.isEmpty { ev += ",\"v\":{" + ch + "}" }
            if !gone.isEmpty { ev += ",\"x\":[" + gone + "]" }
            let h = heapDelta()
            if !h.isEmpty { ev += ",\"h\":{" + h + "}" }
            emit(ev + "}")
            pend = -1
        }
        /** Line l is about to run: the line before it has finished, so send it with the variables as they are now. */
        func at(_ l: Int, _ nv: [Any]?) {
            if !on { return }
            if pend >= 0 { flush(nv, true) }
            pend = l
        }
        /** The top of a loop pass: send the loop line before the body starts. */
        func head(_ nv: [Any]?) { if on && pend >= 0 { flush(nv, true) } }
        /** The end of a loop pass, before the loop moves on. */
        func tail(_ l: Int, _ nv: [Any]?) { at(l, nv) }
        func end(_ nv: [Any]?) { if on && pend >= 0 { line = pend; flush(nv, true) } }
        func ret<T>(_ v: T, _ nv: [Any]?) -> T {
            if on {
                var w = ""
                if ser(&w, v) { retv = w }
                if pend >= 0 { line = pend; flush(nv, true) }
            }
            return v
        }
        /** The program is about to stop on a crash in this call. */
        func crash() {
            var ev = "{\"e\":\"exc\",\"k\":\(k),\"l\":\(pend >= 0 ? pend : line),\"m\":"
            str(&ev, "Swift stopped the program on this line (a crash: often an index out of range, or ! on a nil value)")
            ev += ",\"o\":\(outn)}"
            on = true
            events = min(events, MAXEV - 1)
            emit(ev)
        }
        func exit() {
            depth -= 1
            top = up
            if !on { return }
            let l = pend >= 0 ? pend : line
            flush(nil, false)
            var ev = "{\"e\":\"ret\",\"k\":\(k),\"l\":\(l),\"o\":\(outn)"
            if let r = retv { ev += ",\"r\":" + r }
            let h = heapDelta()
            if !h.isEmpty { ev += ",\"h\":{" + h + "}" }
            emit(ev + "}")
        }
    }
    static func call(_ fn: String, _ l: Int, _ nv: [Any]?) -> F { F(fn, l, nv) }
}
