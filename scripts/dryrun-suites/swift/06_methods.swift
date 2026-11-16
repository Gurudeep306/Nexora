enum E: Error { case bad(Int) }

final class Stack<T> {
    private var items: [T] = []
    var count: Int { items.count }
    func push(_ x: T) { items.append(x) }
    func pop() -> T? { items.popLast() }
}

struct UF {
    var p: [Int]
    init(_ n: Int) { p = Array(0..<n) }
    mutating func find(_ x: Int) -> Int {
        if p[x] != x { p[x] = find(p[x]) }
        return p[x]
    }
}

var adj = [[Int]](repeating: [], count: 4)
func dfs(_ u: Int, _ seen: inout [Bool]) -> Int {
    seen[u] = true
    var total = 1
    for v in adj[u] where !seen[v] {
        total += dfs(v, &seen)
    }
    return total
}

func check(_ x: Int) throws -> Int {
    func half(_ y: Int) -> Int { y / 2 }
    if x < 0 { throw E.bad(x) }
    return half(x)
}

let st = Stack<Int>()
st.push(1); st.push(2)
_ = st.pop()
var uf = UF(4)
uf.p[1] = 0
adj[0] = [1, 2]; adj[1] = [3]
var seen = [Bool](repeating: false, count: 4)
let reach = dfs(0, &seen)
var msg = ""
do {
    _ = try check(-1)
} catch E.bad(let v) {
    msg = "bad \(v)"
}
print(st.count, uf.find(1), reach, try! check(10), msg)
