class Node {
    var v: Int
    var next: Node?
    init(_ v: Int, _ next: Node?) { self.v = v; self.next = next }
}

func fib(_ n: Int) -> Int { n < 2 ? n : fib(n - 1) + fib(n - 2) }

func reverse(_ head: Node?) -> Node? {
    var prev: Node? = nil
    var cur = head
    while let c = cur {
        let nxt = c.next
        c.next = prev
        prev = c
        cur = nxt
    }
    return prev
}

var st: [Int] = []
st.append(1); st.append(2); st.removeLast()
var q = [3, 4]
q.removeFirst()
var d: [String: Int] = [:]
for w in "a b a".split(separator: " ") { d[String(w), default: 0] += 1 }
var head: Node? = nil
for i in stride(from: 3, through: 1, by: -1) { head = Node(i, head) }
head = reverse(head)
let total: Int
total = fib(6)
var grid = Array(repeating: Array(repeating: 0, count: 3), count: 2)
grid[1][2] = 5
let (x, y) = (7, 8)
print(st.last!, q.first!, d["a"]!, head!.v, total, grid[1][2], x + y)
