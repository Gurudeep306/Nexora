fun get(a: IntArray, i: Int): Int {
    return a[i]
}
fun main() {
    val a = intArrayOf(1, 2, 3)
    println(get(a, 1))
    println(get(a, 5))
}
