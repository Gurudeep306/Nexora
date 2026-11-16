import java.util.*

class Node(val v: Int, var next: Node?)

fun fib(n: Int): Int = if (n < 2) n else fib(n - 1) + fib(n - 2)

fun reverse(head: Node?): Node? {
    var prev: Node? = null
    var cur = head
    while (cur != null) {
        val nxt = cur.next
        cur.next = prev
        prev = cur
        cur = nxt
    }
    return prev
}

fun main() {
    val st = ArrayDeque<Int>()
    st.push(1); st.push(2); st.pop()
    val q: Queue<Int> = LinkedList()
    q.add(3); q.add(4); q.poll()
    val d = HashMap<String, Int>()
    for (w in "a b a".split(" ")) d[w] = (d[w] ?: 0) + 1
    var head: Node? = null
    for (i in 3 downTo 1) head = Node(i, head)
    head = reverse(head)
    val total: Int
    total = fib(6)
    val grid = Array(2) { IntArray(3) }
    grid[1][2] = 5
    val (x, y) = Pair(7, 8)
    println("${st.peek()} ${q.peek()} ${d["a"]} ${head!!.v} $total ${grid[1][2]} ${x + y}")
}
