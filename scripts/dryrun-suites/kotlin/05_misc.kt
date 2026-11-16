import java.util.PriorityQueue

data class P(val x: Int, val y: Int)

object Util {
    var calls = 0
    fun gcd(a: Long, b: Long): Long { calls++; return if (b == 0L) a else gcd(b, a % b) }
}

class Counter {
    private var c = 0
    fun inc(): Int { c++; return c }
    override fun toString() = "C$c"
}

fun main() {
    val pq = PriorityQueue<Int>(compareByDescending { it })
    pq.add(1); pq.add(5); pq.add(3)
    val seen = mutableSetOf<Int>()
    var i = 0
    do { seen.add(i * i % 5); i++ } while (i < 6)
    val cs = "abc".toCharArray()
    cs.reverse()
    val ps = mutableListOf(P(2, 1), P(1, 2)).sortedBy { it.x }
    val c = Counter()
    c.inc(); c.inc()
    var s = 0
    outer@ for (a in 0 until 3) {
        for (b in 0 until 3) {
            if (b > a) continue@outer
            s += a * b
        }
    }
    when {
        s > 3 -> s *= 2
        else -> { s-- }
    }
    fun sq(v: Int) = v * v
    val sb = StringBuilder()
    sb.append("x")
    print(cs)
    println()
    println("${Util.gcd(12, 18)} ${pq.poll()} ${seen.size} ${ps[0]} $c $s ${sq(3)} $sb ${Util.calls}")
}
