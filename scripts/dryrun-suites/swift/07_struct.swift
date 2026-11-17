struct UF {
    var p: [Int]
    var count: Int
    init(_ n: Int) { p = Array(0..<n); count = n }
    mutating func find(_ x: Int) -> Int { p[x] == x ? x : find(p[x]) }
    mutating func unite(_ a: Int, _ b: Int) {
        let ra = find(a), rb = find(b)
        if ra != rb { p[ra] = rb; count -= 1 }
    }
}
var uf = UF(5)
uf.unite(0, 1)
uf.unite(2, 3)
uf.unite(1, 3)
print(uf.count)
