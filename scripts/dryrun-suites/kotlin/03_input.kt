import java.io.*

fun main() {
    val br = BufferedReader(InputStreamReader(System.`in`))
    val n = br.readLine().trim().toInt()
    val a = br.readLine().trim().split(" ").map { it.toInt() }
    var best = 0
    var cur = 0
    for (v in a) {
        cur = maxOf(v, cur + v)
        best = maxOf(best, cur)
    }
    val out = PrintWriter(BufferedWriter(OutputStreamWriter(System.out)))
    out.println("$n $best")
    out.flush()
}
